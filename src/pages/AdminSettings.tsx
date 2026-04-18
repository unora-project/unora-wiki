import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ArrowLeft, Archive, CloudUpload, Download, Upload, RotateCcw,
  LogOut, AlertTriangle, FileJson, Loader2,
} from 'lucide-react'
import { RequireAdmin } from '@/components/editor/RequireAdmin'
import { ToastView, type Toast } from '@/components/editor/ToastView'
import { getToken, getCachedUser, signOut } from '@/lib/github-auth'
import { EDITOR_REPO, listDirectory, getFile, type DirEntry } from '@/lib/github-client'
import { seedFromPublished, loadFromLocal, saveToLocal } from '@/lib/editor-seed'
import {
  BACKUP_DIR,
  commitBackup,
  parseBackup,
  serializeBackup,
  downloadBlob,
  emptyDb,
  type BackupFile,
} from '@/lib/backup'

export function AdminSettings() {
  const dryRun = new URLSearchParams(window.location.search).get('dryRun') === '1'
  return (
    <RequireAdmin>
      {(login) => <SettingsShell login={login} dryRun={dryRun} />}
    </RequireAdmin>
  )
}

type ListState =
  | { kind: 'loading' }
  | { kind: 'ok'; entries: DirEntry[] }
  | { kind: 'error'; message: string }

type Busy =
  | 'idle'
  | 'backing-up-local'
  | 'backing-up-published'
  | 'listing'
  | 'downloading'
  | 'restoring'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

function prettyFilename(name: string): string {
  // backup-2026-04-17T14-30-12Z.json  ->  2026-04-17 14:30:12 UTC
  const m = name.match(/^backup-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})Z\.json$/)
  if (!m) return name
  return `${m[1]} ${m[2]}:${m[3]}:${m[4]} UTC`
}

function SettingsShell({ login, dryRun }: { login: string; dryRun: boolean }) {
  const navigate = useNavigate()
  const [toast, setToast] = useState<Toast>(null)
  const [busy, setBusy] = useState<Busy>('idle')
  const [listState, setListState] = useState<ListState>({ kind: 'loading' })
  const [pending, setPending] = useState<{ source: string; backup: BackupFile } | null>(null)

  const refreshList = async () => {
    const token = getToken()
    if (!token) return
    setListState({ kind: 'loading' })
    try {
      const entries = await listDirectory(token, EDITOR_REPO.owner, EDITOR_REPO.repo, BACKUP_DIR, EDITOR_REPO.branch)
      const files = entries
        .filter((e) => e.type === 'file' && e.name.endsWith('.json'))
        .sort((a, b) => b.name.localeCompare(a.name))
      setListState({ kind: 'ok', entries: files })
    } catch (e: any) {
      setListState({ kind: 'error', message: String(e.message || e) })
    }
  }

  useEffect(() => { void refreshList() }, [])

  const doBackup = async (source: 'local' | 'published') => {
    const token = getToken()
    if (!token) return
    setBusy(source === 'local' ? 'backing-up-local' : 'backing-up-published')
    try {
      const db = source === 'local' ? (loadFromLocal() ?? emptyDb()) : await seedFromPublished()
      const res = await commitBackup(token, db, login ?? getCachedUser(), dryRun)
      if (!res) {
        setToast({ kind: 'error', msg: 'Backup failed: no result' })
        return
      }
      if (dryRun) {
        setToast({ kind: 'success', msg: `Dry-run: would commit ${res.filename} (logged to console)` })
      } else {
        setToast({
          kind: 'success',
          msg: `Committed ${res.sha.slice(0, 7)} — ${res.filename}`,
          action: res.url ? { label: 'Open', onClick: () => window.open(res.url, '_blank', 'noopener') } : undefined,
        })
        void refreshList()
      }
    } catch (e: any) {
      setToast({ kind: 'error', msg: `Backup failed: ${String(e.message || e)}` })
    } finally {
      setBusy('idle')
    }
  }

  const doDownload = async (entry: DirEntry) => {
    const token = getToken()
    if (!token) return
    setBusy('downloading')
    try {
      const file = await getFile(token, EDITOR_REPO.owner, EDITOR_REPO.repo, entry.path, EDITOR_REPO.branch)
      if (!file) throw new Error('Not found')
      downloadBlob(entry.name, file.content)
      setToast({ kind: 'success', msg: `Downloaded ${entry.name}` })
    } catch (e: any) {
      setToast({ kind: 'error', msg: `Download failed: ${String(e.message || e)}` })
    } finally {
      setBusy('idle')
    }
  }

  const openRestoreFromRepo = async (entry: DirEntry) => {
    const token = getToken()
    if (!token) return
    setBusy('restoring')
    try {
      const file = await getFile(token, EDITOR_REPO.owner, EDITOR_REPO.repo, entry.path, EDITOR_REPO.branch)
      if (!file) throw new Error('Not found')
      const backup = parseBackup(file.content)
      setPending({ source: entry.name, backup })
    } catch (e: any) {
      setToast({ kind: 'error', msg: `Load failed: ${String(e.message || e)}` })
    } finally {
      setBusy('idle')
    }
  }

  const openRestoreFromFile = async (file: File) => {
    try {
      const raw = await file.text()
      const backup = parseBackup(raw)
      setPending({ source: file.name, backup })
    } catch (e: any) {
      setToast({ kind: 'error', msg: `Parse failed: ${String(e.message || e)}` })
    }
  }

  const confirmRestore = () => {
    if (!pending) return
    saveToLocal(pending.backup.db)
    setPending(null)
    navigate('/admin-editor')
  }

  const downloadCurrentState = () => {
    const db = loadFromLocal() ?? emptyDb()
    const { filename, json } = serializeBackup(db, login ?? getCachedUser())
    downloadBlob(filename, json)
  }

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col bg-obsidian text-ivory">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-ash/20 bg-crypt-400 px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <Link
            to="/admin-editor"
            className="inline-flex items-center gap-1.5 rounded border border-ash/30 px-2.5 py-1.5 text-sm text-ash hover:border-gilt hover:text-gilt"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Editor
          </Link>
          <h1 className="font-heading text-base font-bold text-gilt sm:text-xl">Settings</h1>
          {dryRun && (
            <span className="rounded bg-ignis/20 px-2 py-0.5 font-ui text-[10px] font-semibold uppercase text-ignis">
              Dry Run
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="hidden font-ui text-xs text-ash sm:inline">@{login}</span>
          <button
            onClick={() => { signOut(); window.location.reload() }}
            className="inline-flex items-center gap-1.5 rounded border border-ash/30 px-3 py-2 text-sm text-ash hover:border-gilt hover:text-gilt"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-4 sm:p-6">
        {/* Create backup */}
        <section className="rounded-lg border border-ash/20 bg-crypt-400 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Archive className="h-5 w-5 text-gilt" aria-hidden="true" />
            <h2 className="font-heading text-lg font-bold text-gilt">Create Backup</h2>
          </div>
          <p className="mb-4 font-ui text-sm text-ash">
            Commits a JSON snapshot of the editor database to{' '}
            <code className="rounded bg-ink px-1 py-0.5 text-xs">{BACKUP_DIR}/</code>.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void doBackup('local')}
              disabled={busy !== 'idle'}
              className="inline-flex items-center gap-1.5 rounded bg-gilt px-3 py-2 text-sm font-semibold text-ink hover:bg-gilt/90 disabled:opacity-50"
            >
              {busy === 'backing-up-local' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" aria-hidden="true" />}
              Backup current local state
            </button>
            <button
              onClick={() => void doBackup('published')}
              disabled={busy !== 'idle'}
              className="inline-flex items-center gap-1.5 rounded border border-ash/30 px-3 py-2 text-sm text-ivory hover:border-gilt hover:text-gilt disabled:opacity-50"
            >
              {busy === 'backing-up-published' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" aria-hidden="true" />}
              Backup from published
            </button>
            <button
              onClick={downloadCurrentState}
              className="inline-flex items-center gap-1.5 rounded border border-ash/30 px-3 py-2 text-sm text-ivory hover:border-gilt hover:text-gilt"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download local state (no commit)
            </button>
          </div>
        </section>

        {/* List backups */}
        <section className="rounded-lg border border-ash/20 bg-crypt-400 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-gilt" aria-hidden="true" />
              <h2 className="font-heading text-lg font-bold text-gilt">Backups in Repo</h2>
            </div>
            <button
              onClick={() => void refreshList()}
              disabled={listState.kind === 'loading'}
              className="inline-flex items-center gap-1.5 rounded border border-ash/30 px-2.5 py-1.5 text-xs text-ash hover:border-gilt hover:text-gilt disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Refresh
            </button>
          </div>

          {listState.kind === 'loading' && (
            <div className="flex items-center gap-2 py-4 font-ui text-sm text-ash">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading backups…
            </div>
          )}
          {listState.kind === 'error' && (
            <div className="flex items-start gap-2 rounded border border-ignis/40 bg-ignis/10 p-3 font-ui text-sm text-ignis">
              <AlertTriangle className="mt-0.5 h-4 w-4" aria-hidden="true" />
              <span>Failed to load: {listState.message}</span>
            </div>
          )}
          {listState.kind === 'ok' && listState.entries.length === 0 && (
            <p className="py-4 font-ui text-sm text-ash">
              No backups yet. Use “Create Backup” above to make the first one.
            </p>
          )}
          {listState.kind === 'ok' && listState.entries.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full font-ui text-sm">
                <thead>
                  <tr className="border-b border-ash/20 text-left text-xs uppercase tracking-wider text-ash">
                    <th className="py-2 pr-2">Backup</th>
                    <th className="py-2 pr-2">Size</th>
                    <th className="py-2 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listState.entries.map((e) => (
                    <tr key={e.sha} className="border-b border-ash/10 last:border-0">
                      <td className="py-2 pr-2">
                        <div className="font-medium text-ivory">{prettyFilename(e.name)}</div>
                        <div className="font-mono text-xs text-ash">{e.name}</div>
                      </td>
                      <td className="py-2 pr-2 text-ash">{formatBytes(e.size)}</td>
                      <td className="py-2 pr-2">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button
                            onClick={() => void doDownload(e)}
                            disabled={busy !== 'idle'}
                            className="inline-flex items-center gap-1 rounded border border-ash/30 px-2 py-1 text-xs text-ivory hover:border-gilt hover:text-gilt disabled:opacity-50"
                          >
                            <Download className="h-3.5 w-3.5" aria-hidden="true" />
                            Download
                          </button>
                          <button
                            onClick={() => void openRestoreFromRepo(e)}
                            disabled={busy !== 'idle'}
                            className="inline-flex items-center gap-1 rounded border border-gilt/60 bg-gilt/10 px-2 py-1 text-xs font-semibold text-gilt hover:bg-gilt/20 disabled:opacity-50"
                          >
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                            Restore
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Restore from file */}
        <section className="rounded-lg border border-ash/20 bg-crypt-400 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Upload className="h-5 w-5 text-gilt" aria-hidden="true" />
            <h2 className="font-heading text-lg font-bold text-gilt">Restore from File</h2>
          </div>
          <p className="mb-3 font-ui text-sm text-ash">
            Upload a backup JSON from your computer. It will be loaded into your local editor state so you can review and commit through the normal editor flow.
          </p>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-ash/30 px-3 py-2 font-ui text-sm text-ivory hover:border-gilt hover:text-gilt">
            <Upload className="h-4 w-4" aria-hidden="true" />
            Choose file…
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(ev) => {
                const f = ev.target.files?.[0]
                ev.target.value = ''
                if (f) void openRestoreFromFile(f)
              }}
            />
          </label>
        </section>
      </main>

      {pending && (
        <ConfirmRestoreDialog
          source={pending.source}
          backup={pending.backup}
          onCancel={() => setPending(null)}
          onConfirm={confirmRestore}
          onDownloadCurrent={downloadCurrentState}
        />
      )}

      {toast && <ToastView toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

function ConfirmRestoreDialog({
  source, backup, onCancel, onConfirm, onDownloadCurrent,
}: {
  source: string
  backup: BackupFile
  onCancel: () => void
  onConfirm: () => void
  onDownloadCurrent: () => void
}) {
  const countEntries = Object.entries(backup.counts) as [keyof typeof backup.counts, number][]
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/80 p-4"
    >
      <div className="w-full max-w-lg rounded-lg border border-ash/30 bg-crypt-400 p-5 shadow-xl">
        <div className="mb-3 flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-ignis" aria-hidden="true" />
          <div>
            <h3 className="font-heading text-lg font-bold text-gilt">Restore backup?</h3>
            <p className="mt-1 font-ui text-sm text-ash">
              This replaces your local editor state with the contents of{' '}
              <span className="font-mono text-ivory">{source}</span>. Unsaved edits will be lost.
            </p>
          </div>
        </div>

        <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-1 rounded border border-ash/20 bg-ink p-3 font-ui text-xs">
          <div className="col-span-2 flex justify-between">
            <dt className="text-ash">Created</dt>
            <dd className="text-ivory">{backup.createdAt}</dd>
          </div>
          <div className="col-span-2 flex justify-between">
            <dt className="text-ash">By</dt>
            <dd className="text-ivory">{backup.createdBy ?? '—'}</dd>
          </div>
          <div className="col-span-2 mt-1 border-t border-ash/20 pt-1 text-[10px] uppercase tracking-wider text-ash">Counts</div>
          {countEntries.map(([k, v]) => (
            <div key={String(k)} className="flex justify-between">
              <dt className="text-ash">{String(k)}</dt>
              <dd className="text-ivory">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap justify-between gap-2">
          <button
            onClick={onDownloadCurrent}
            className="inline-flex items-center gap-1.5 rounded border border-ash/30 px-3 py-2 font-ui text-sm text-ivory hover:border-gilt hover:text-gilt"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download current state first
          </button>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 rounded border border-ash/30 px-3 py-2 font-ui text-sm text-ash hover:border-gilt hover:text-gilt"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="inline-flex items-center gap-1.5 rounded bg-ignis px-3 py-2 font-ui text-sm font-semibold text-ink hover:bg-ignis/90"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Restore
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
