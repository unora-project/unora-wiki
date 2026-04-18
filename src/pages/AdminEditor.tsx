import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  Package, Gem, Shield, Anvil, FlaskConical, FlaskRound,
  UtensilsCrossed, Carrot, Wand, Fish,
  DownloadCloud, Trash2, GitCommit, LogOut, Plus, Save, Eraser,
  X, RotateCcw, Cog,
  type LucideIcon,
} from 'lucide-react'
import { RequireAdmin } from '@/components/editor/RequireAdmin'
import { ItemForm } from '@/components/editor/ItemForm'
import { ItemList } from '@/components/editor/ItemList'
import { GenericForm } from '@/components/editor/GenericForm'
import { GenericList } from '@/components/editor/GenericList'
import { CommitDialog } from '@/components/editor/CommitDialog'
import { ToastView, type Toast } from '@/components/editor/ToastView'
import type { EditorDb, EditorItem, EditorRecipe, EditorTab, GenericRow, GenericTab, TrashEntry } from '@/types/editor'
import { GENERIC_TAB_SCHEMAS } from '@/types/editor'
import { seedFromPublished, seedItemsFromPublished, seedNonItemsFromPublished, loadFromLocal, saveToLocal, clearLocal, loadTrash, saveTrash, type NonItemsTab } from '@/lib/editor-seed'
import { computeDiffs, commitDiffs, countUnresolvedItems, type FileDiff } from '@/lib/editor-commit'
import { getToken, signOut } from '@/lib/github-auth'

const TAB_ICON: Record<EditorTab, LucideIcon> = {
  items: Package,
  jewelcrafting: Gem,
  armorsmithing: Shield,
  weaponsmithing: Anvil,
  'alchemy-recipes': FlaskConical,
  'alchemy-extracts': FlaskRound,
  'cooking-recipes': UtensilsCrossed,
  'cooking-ingredients': Carrot,
  enchanting: Wand,
  fishing: Fish,
}

const GENERIC_TAB_SET: ReadonlySet<EditorTab> = new Set<EditorTab>([
  'alchemy-recipes', 'alchemy-extracts', 'cooking-recipes', 'cooking-ingredients', 'enchanting', 'fishing',
])
const isGenericTab = (t: EditorTab): t is GenericTab => GENERIC_TAB_SET.has(t)

const EMPTY_ITEM = (): EditorItem => ({
  item_name: '', type: 'Weapons', class: 'Peasant', gender: 'Unisex',
  level: '', weight: '', value: '', location: '', set_bonus: '',
})

const EMPTY_RECIPE = (): EditorRecipe => ({
  ...EMPTY_ITEM(), craft_rank: 'Beginner', recipe: [],
})

const TABS: { id: EditorTab; label: string }[] = [
  { id: 'items', label: 'Item Database' },
  { id: 'jewelcrafting', label: 'Jewelcrafting' },
  { id: 'armorsmithing', label: 'Armorsmithing' },
  { id: 'weaponsmithing', label: 'Weaponsmithing' },
  { id: 'alchemy-recipes', label: 'Alchemy Recipes' },
  { id: 'alchemy-extracts', label: 'Alchemy Extracts' },
  { id: 'cooking-recipes', label: 'Cooking Recipes' },
  { id: 'cooking-ingredients', label: 'Cooking Ingredients' },
  { id: 'enchanting', label: 'Enchanting' },
  { id: 'fishing', label: 'Fishing' },
]

function emptyDb(): EditorDb {
  return {
    items: [], jewelcrafting: [], armorsmithing: [], weaponsmithing: [],
    'alchemy-recipes': [], 'alchemy-extracts': [], 'cooking-recipes': [], 'cooking-ingredients': [],
    enchanting: [], fishing: [],
  }
}

function emptyGenericRow(tab: GenericTab): GenericRow {
  const row: GenericRow = {}
  for (const h of GENERIC_TAB_SCHEMAS[tab].headers) row[h] = ''
  return row
}

export function AdminEditor() {
  const dryRun = new URLSearchParams(window.location.hash.split('?')[1] || '').get('dryRun') === '1'
  return (
    <RequireAdmin>
      {(login) => <EditorShell login={login} dryRun={dryRun} />}
    </RequireAdmin>
  )
}

function initialDraft(tab: EditorTab): EditorItem | EditorRecipe | GenericRow {
  if (isGenericTab(tab)) return emptyGenericRow(tab)
  return tab === 'items' ? EMPTY_ITEM() : EMPTY_RECIPE()
}

function EditorShell({ login, dryRun }: { login: string; dryRun: boolean }) {
  const [db, setDb] = useState<EditorDb>(() => loadFromLocal() ?? emptyDb())
  const [tab, setTab] = useState<EditorTab>('items')
  const [draft, setDraft] = useState<EditorItem | EditorRecipe | GenericRow>(() => EMPTY_ITEM())
  const [editIdx, setEditIdx] = useState<number>(-1)
  const [toast, setToast] = useState<Toast>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [diffs, setDiffs] = useState<FileDiff[]>([])
  const [busy, setBusy] = useState<'idle' | 'loading-diff' | 'committing' | 'seeding'>('idle')
  const [trash, setTrash] = useState<TrashEntry[]>(() => loadTrash())
  const [trashOpen, setTrashOpen] = useState(false)
  const [switchOpen, setSwitchOpen] = useState(false)

  const dbFirstRun = useRef(true)
  const dbSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (dbFirstRun.current) { dbFirstRun.current = false; return }
    if (dbSaveTimer.current) clearTimeout(dbSaveTimer.current)
    dbSaveTimer.current = setTimeout(() => {
      dbSaveTimer.current = null
      saveToLocal(db)
    }, 500)
  }, [db])
  useEffect(() => {
    const onUnload = () => {
      if (dbSaveTimer.current) { clearTimeout(dbSaveTimer.current); dbSaveTimer.current = null }
      saveToLocal(db)
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [db])

  const trashFirstRun = useRef(true)
  const trashSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (trashFirstRun.current) { trashFirstRun.current = false; return }
    if (trashSaveTimer.current) clearTimeout(trashSaveTimer.current)
    trashSaveTimer.current = setTimeout(() => {
      trashSaveTimer.current = null
      saveTrash(trash)
    }, 500)
  }, [trash])
  useEffect(() => {
    const onUnload = () => {
      if (trashSaveTimer.current) { clearTimeout(trashSaveTimer.current); trashSaveTimer.current = null }
      saveTrash(trash)
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [trash])

  // Auto-seed non-items tabs on mount (small JSONs, ≈77 KB total).
  // The items tab is deferred until first visit — see effect below.
  useEffect(() => {
    let cancelled = false
    const NON_ITEM_KEYS: NonItemsTab[] = [
      'jewelcrafting', 'armorsmithing', 'weaponsmithing',
      'alchemy-recipes', 'alchemy-extracts', 'cooking-recipes', 'cooking-ingredients', 'enchanting', 'fishing',
    ]
    const emptyKeys = NON_ITEM_KEYS.filter((k) => (db[k]?.length ?? 0) === 0)
    if (emptyKeys.length === 0) return
    setBusy('seeding')
    ;(async () => {
      try {
        const seed = await seedNonItemsFromPublished(emptyKeys)
        if (cancelled) return
        setDb((prev) => {
          const merged = { ...prev }
          for (const k of emptyKeys) {
            if ((prev[k]?.length ?? 0) === 0 && seed[k]) (merged as any)[k] = seed[k]
          }
          return merged
        })
      } catch (e: any) {
        if (!cancelled) setToast({ kind: 'error', msg: `Auto-seed failed: ${e.message || e}` })
      } finally {
        if (!cancelled) setBusy('idle')
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Lazy-seed items tab on first visit (1 MB equipment JSON).
  const itemsSeedingRef = useRef(false)
  useEffect(() => {
    if (tab !== 'items') return
    if (db.items.length > 0) return
    if (itemsSeedingRef.current) return
    itemsSeedingRef.current = true
    let cancelled = false
    setBusy('seeding')
    ;(async () => {
      try {
        const items = await seedItemsFromPublished()
        if (cancelled) return
        setDb((prev) => prev.items.length > 0 ? prev : { ...prev, items })
      } catch (e: any) {
        if (!cancelled) setToast({ kind: 'error', msg: `Items seed failed: ${e.message || e}` })
      } finally {
        itemsSeedingRef.current = false
        if (!cancelled) setBusy('idle')
      }
    })()
    return () => { cancelled = true }
  }, [tab, db.items.length])

  const currentRows = db[tab]
  const generic = isGenericTab(tab)

  useEffect(() => {
    setEditIdx(-1)
    setDraft(initialDraft(tab))
  }, [tab])

  const submit = () => {
    if (generic) {
      const schema = GENERIC_TAB_SCHEMAS[tab as GenericTab]
      const d = draft as GenericRow
      if (!(d[schema.nameKey] ?? '').trim()) { setToast({ kind: 'error', msg: `${schema.nameKey} required` }); return }
      const arr = [...(currentRows as GenericRow[])]
      const next: GenericRow = { ...d }
      if (editIdx === -1) arr.push(next)
      else arr[editIdx] = next
      setDb({ ...db, [tab]: arr })
      setEditIdx(-1)
      setDraft(initialDraft(tab))
      setToast({ kind: 'success', msg: 'Saved to draft' })
      return
    }
    const d = draft as EditorItem | EditorRecipe
    if (!d.item_name?.toString().trim()) { setToast({ kind: 'error', msg: 'Item name required' }); return }
    if (!d.type) { setToast({ kind: 'error', msg: 'Type required' }); return }
    if (tab !== 'items' && (d as EditorRecipe).recipe.length === 0) {
      setToast({ kind: 'error', msg: 'Recipe needs at least one ingredient' }); return
    }
    const arr = [...currentRows] as any[]
    if (editIdx === -1) arr.push({ ...d })
    else arr[editIdx] = { ...d }
    arr.sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0))
    setDb({ ...db, [tab]: arr })
    setEditIdx(-1)
    setDraft(initialDraft(tab))
    setToast({ kind: 'success', msg: 'Saved to draft' })
  }

  const edit = (i: number) => { setEditIdx(i); setDraft({ ...(currentRows[i] as any) }) }

  const entryName = (t: EditorTab, row: any): string => {
    if (isGenericTab(t)) return String(row?.[GENERIC_TAB_SCHEMAS[t].nameKey] ?? '(unnamed)')
    return String(row?.item_name ?? '(unnamed)')
  }

  const restoreTrash = (entry: TrashEntry) => {
    setDb((prev) => {
      const arr = [...(prev[entry.tab] as any[])]
      const insertAt = Math.min(Math.max(entry.index, 0), arr.length)
      arr.splice(insertAt, 0, entry.payload)
      return { ...prev, [entry.tab]: arr } as EditorDb
    })
    setTrash((t) => t.filter((e) => e.id !== entry.id))
  }

  const del = (i: number) => {
    const row = currentRows[i]
    const entry: TrashEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tab,
      index: i,
      name: entryName(tab, row),
      deletedAt: Date.now(),
      payload: row,
    }
    const arr = [...currentRows]
    arr.splice(i, 1)
    setDb({ ...db, [tab]: arr })
    setTrash((t) => [...t, entry])
    setToast({
      kind: 'info',
      msg: `Deleted “${entry.name}”`,
      action: { label: 'Undo', onClick: () => { restoreTrash(entry); setToast(null) } },
    })
  }

  const purgeTrash = (id: string) => setTrash((t) => t.filter((e) => e.id !== id))
  const purgeAllTrash = () => setTrash([])
  const cancel = () => { setEditIdx(-1); setDraft(initialDraft(tab)) }

  const loadPublished = async () => {
    if (!confirm('Reset draft from published data? This overwrites your current working copy.')) return
    setBusy('seeding')
    try {
      const seed = await seedFromPublished()
      setDb(seed)
      clearLocal()
      saveToLocal(seed)
      setToast({ kind: 'success', msg: `Loaded ${seed.items.length} items + recipes` })
    } catch (e: any) {
      setToast({ kind: 'error', msg: `Seed failed: ${e.message || e}` })
    } finally {
      setBusy('idle')
    }
  }

  const previewCommit = async () => {
    const token = getToken()
    if (!token) { setToast({ kind: 'error', msg: 'Not signed in' }); return }
    setBusy('loading-diff')
    try {
      const d = await computeDiffs(token, db)
      setDiffs(d)
      setDialogOpen(true)
      if (d.length === 0) setToast({ kind: 'info', msg: 'No changes vs. GitHub' })
    } catch (e: any) {
      setToast({ kind: 'error', msg: `Diff failed: ${e.message || e}` })
    } finally {
      setBusy('idle')
    }
  }

  const doCommit = async (message: string) => {
    const token = getToken()
    if (!token) return
    setBusy('committing')
    try {
      const trailer = `\n\nCo-Authored-By: True <true@unora.local>`
      const res = await commitDiffs(token, diffs, message + trailer, dryRun)
      if (res) {
        setToast({
          kind: 'success',
          msg: dryRun ? 'Dry-run logged to console' : `Committed ${res.sha.slice(0, 7)} — site rebuild ~2 min`,
        })
        setDialogOpen(false)
      }
    } catch (e: any) {
      const msg = String(e.message || e)
      if (msg.includes('409') || msg.includes('422')) {
        setToast({ kind: 'error', msg: 'Another edit landed first — reload and retry' })
      } else {
        setToast({ kind: 'error', msg: `Commit failed: ${msg}` })
      }
    } finally {
      setBusy('idle')
    }
  }

  const unresolved = useMemo(() => countUnresolvedItems(db), [db])
  const defaultMsg = `chore(data): update ${tab} via editor`

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col bg-obsidian text-ivory">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-ash/20 bg-crypt-400 px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="font-heading text-base font-bold text-gilt sm:text-xl">Unora Database Editor</h1>
          <span className="rounded-full bg-gilt/20 px-2 py-0.5 font-ui text-[10px] font-semibold uppercase tracking-wider text-gilt">
            Editor by True
          </span>
          {dryRun && (
            <span className="rounded bg-ignis/20 px-2 py-0.5 font-ui text-[10px] font-semibold uppercase text-ignis">
              Dry Run
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="hidden font-ui text-xs text-ash sm:inline">@{login}</span>
          <Link
            to="/admin-settings"
            className="inline-flex items-center gap-1.5 rounded border border-ash/30 px-3 py-2 text-sm text-ivory hover:border-gilt hover:text-gilt"
          >
            <Cog className="h-4 w-4" aria-hidden="true" />
            Settings
          </Link>
          <button
            onClick={loadPublished}
            disabled={busy !== 'idle'}
            className="inline-flex items-center gap-1.5 rounded border border-ash/30 px-3 py-2 text-sm text-ivory hover:border-gilt hover:text-gilt disabled:opacity-50"
          >
            <DownloadCloud className="h-4 w-4" aria-hidden="true" />
            {busy === 'seeding' ? 'Loading…' : 'Load Published'}
          </button>
          <button
            onClick={() => setTrashOpen(true)}
            className="inline-flex items-center gap-1.5 rounded border border-ash/30 px-3 py-2 text-sm text-ivory hover:border-gilt hover:text-gilt"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Trash{trash.length > 0 && <span className="ml-0.5 rounded-full bg-ignis/25 px-1.5 py-0.5 text-[10px] font-semibold text-ignis">{trash.length}</span>}
          </button>
          <button
            onClick={previewCommit}
            disabled={busy !== 'idle'}
            className="inline-flex items-center gap-1.5 rounded bg-gilt px-3 py-2 text-sm font-semibold text-ink hover:bg-gilt/90 disabled:opacity-50"
          >
            <GitCommit className="h-4 w-4" aria-hidden="true" />
            {busy === 'loading-diff' ? 'Building…' : 'Preview Changes'}
          </button>
          <button
            onClick={() => { signOut(); window.location.reload() }}
            className="inline-flex items-center gap-1.5 rounded border border-ash/30 px-3 py-2 text-sm text-ash hover:border-gilt hover:text-gilt"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex overflow-x-auto border-b border-ash/20 bg-crypt-300 px-1 sm:px-2">
        {TABS.map((t) => {
          const Icon = TAB_ICON[t.id]
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 font-ui text-sm font-semibold transition-colors ${
                tab === t.id ? 'border-gilt text-gilt' : 'border-transparent text-ash hover:text-ivory'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {t.label}
            </button>
          )
        })}
      </nav>

      {/* Body */}
      <div className="grid flex-1 grid-cols-1 gap-0 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr]">
        <aside className="border-b border-ash/20 bg-crypt-400 lg:border-b-0 lg:border-r">
          <form
            onSubmit={(e) => { e.preventDefault(); submit() }}
            className="flex h-full flex-col"
          >
            <div className="flex-1 overflow-auto p-3 sm:p-4 lg:max-h-[calc(100vh-200px)]">
              {generic ? (
                <GenericForm
                  schema={GENERIC_TAB_SCHEMAS[tab as GenericTab]}
                  value={draft as GenericRow}
                  onChange={(v) => setDraft(v)}
                />
              ) : (
                <ItemForm
                  tab={tab as 'items' | 'jewelcrafting' | 'armorsmithing' | 'weaponsmithing'}
                  value={draft as EditorItem | EditorRecipe}
                  onChange={(v) => setDraft(v)}
                />
              )}
            </div>
            <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-ash/20 bg-crypt-300 p-2 sm:p-3">
              <div className="flex flex-col items-start gap-1">
                <button
                  type="button"
                  onClick={() => setDraft(initialDraft(tab))}
                  className="inline-flex items-center gap-1.5 rounded border border-ash/30 px-3 py-2 text-sm text-ash hover:border-gilt hover:text-gilt"
                >
                  <Eraser className="h-4 w-4" aria-hidden="true" />
                  Clear
                </button>
                {editIdx !== -1 && (
                  <button type="button" onClick={cancel} className="text-xs text-ash underline hover:text-gilt">
                    Cancel edit
                  </button>
                )}
              </div>
              <button
                type="submit"
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-2 text-sm font-semibold sm:px-4 ${
                  editIdx === -1 ? 'bg-gilt text-ink hover:bg-gilt/90' : 'bg-ignis text-ivory hover:bg-ignis/90'
                }`}
              >
                {editIdx === -1 ? <><Plus className="h-4 w-4" aria-hidden="true" />Add Entry</> : <><Save className="h-4 w-4" aria-hidden="true" />Update Entry</>}
              </button>
            </div>
          </form>
        </aside>

        <main className="min-w-0 overflow-auto p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-ui text-sm text-ash">
              {currentRows.length} entries
              {unresolved > 0 && (
                <span className="ml-2 rounded bg-ignis/20 px-2 py-0.5 text-[10px] text-ignis">
                  {unresolved} unresolved path
                </span>
              )}
            </span>
          </div>
          {generic ? (
            <GenericList
              schema={GENERIC_TAB_SCHEMAS[tab as GenericTab]}
              rows={currentRows as GenericRow[]}
              onEdit={edit}
              onDelete={del}
            />
          ) : (
            <ItemList
              tab={tab as 'items' | 'jewelcrafting' | 'armorsmithing' | 'weaponsmithing'}
              rows={currentRows as (EditorItem | EditorRecipe)[]}
              onEdit={edit}
              onDelete={del}
            />
          )}
        </main>
      </div>

      {toast && <ToastView toast={toast} onDismiss={() => setToast(null)} />}

      <CommitDialog
        open={dialogOpen}
        diffs={diffs}
        defaultMessage={defaultMsg}
        onClose={() => setDialogOpen(false)}
        onConfirm={doCommit}
        busy={busy === 'committing'}
      />

      <TrashDialog
        open={trashOpen}
        trash={trash}
        onClose={() => setTrashOpen(false)}
        onRestore={(entry) => restoreTrash(entry)}
        onPurge={purgeTrash}
        onPurgeAll={purgeAllTrash}
      />

      <button
        type="button"
        onClick={() => setSwitchOpen(true)}
        style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
          padding: '10px 16px', background: '#C9A24C', color: '#1A1820',
          fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
          border: 'none', cursor: 'pointer', borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        ← Sveltia CMS
      </button>

      {switchOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-obsidian/80 p-4"
          onClick={() => setSwitchOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-ash/30 bg-crypt-400 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-ash/20 px-4 py-3">
              <h2 className="font-heading text-lg font-bold text-gilt">Switch to Sveltia CMS?</h2>
            </div>
            <div className="space-y-3 px-4 py-4 font-ui text-sm text-ivory">
              <p>
                Saved entries (via <span className="font-semibold text-gilt">Add Entry</span> /{' '}
                <span className="font-semibold text-gilt">Update Entry</span>) and trash persist in
                local storage — they will still be here on return.
              </p>
              <p className="rounded border border-ignis/40 bg-ignis/10 px-3 py-2 text-ignis">
                Warning: the form you are currently typing (unsaved draft) will be lost. Click{' '}
                <span className="font-semibold">Add Entry</span> or{' '}
                <span className="font-semibold">Update Entry</span> first if you want to keep it.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-ash/20 px-4 py-3">
              <button
                type="button"
                onClick={() => setSwitchOpen(false)}
                className="inline-flex items-center gap-1 rounded border border-ash/30 px-3 py-2 text-sm text-ash hover:border-gilt hover:text-gilt"
              >
                Cancel
              </button>
              <a
                href="/admin/"
                className="inline-flex items-center gap-1 rounded bg-gilt px-3 py-2 text-sm font-semibold text-ink hover:bg-gilt/90"
              >
                Switch to Sveltia
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TrashDialog({
  open, trash, onClose, onRestore, onPurge, onPurgeAll,
}: {
  open: boolean
  trash: TrashEntry[]
  onClose: () => void
  onRestore: (entry: TrashEntry) => void
  onPurge: (id: string) => void
  onPurgeAll: () => void
}) {
  if (!open) return null
  const sorted = [...trash].sort((a, b) => b.deletedAt - a.deletedAt)
  const fmt = (ts: number) => {
    const diff = Date.now() - ts
    const m = Math.floor(diff / 60_000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.floor(h / 24)
    return `${d}d ago`
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/80 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg border border-ash/30 bg-crypt-400 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ash/20 px-4 py-3">
          <h2 className="inline-flex items-center gap-2 font-heading text-lg font-bold text-gilt">
            <Trash2 className="h-5 w-5" aria-hidden="true" />
            Trash ({trash.length})
          </h2>
          <div className="flex items-center gap-2">
            {trash.length > 0 && (
              <button
                type="button"
                onClick={() => { if (confirm('Permanently remove all trashed entries?')) onPurgeAll() }}
                className="inline-flex items-center gap-1.5 rounded border border-ignis/40 px-3 py-1.5 text-xs text-ignis hover:bg-ignis/15"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Empty trash
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex items-center gap-1 rounded border border-ash/30 px-3 py-1.5 text-sm text-ash hover:border-gilt hover:text-gilt"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Close
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {sorted.length === 0 ? (
            <div className="p-8 text-center font-ui text-sm italic text-ash">
              Trash is empty.
            </div>
          ) : (
            <ul className="divide-y divide-ash/15">
              {sorted.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="inline-flex items-center gap-1.5 truncate font-ui text-sm font-semibold text-ivory">
                      {(() => {
                        const Icon = TAB_ICON[entry.tab]
                        return <Icon className="h-4 w-4 shrink-0 text-gilt" aria-hidden="true" />
                      })()}
                      {entry.name}
                    </div>
                    <div className="font-ui text-xs text-ash">
                      <span className="text-gilt">{entry.tab}</span> · deleted {fmt(entry.deletedAt)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRestore(entry)}
                    className="inline-flex items-center gap-1.5 rounded border border-gilt/40 bg-gilt/10 px-3 py-1.5 text-xs font-semibold text-gilt hover:bg-gilt/25"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => onPurge(entry.id)}
                    aria-label="Purge entry"
                    title="Remove permanently"
                    className="inline-flex h-8 w-8 items-center justify-center rounded border border-ignis/40 bg-ignis/10 text-ignis hover:bg-ignis/25"
                  ><X className="h-4 w-4" aria-hidden="true" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminEditor
