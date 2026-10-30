import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  Anvil, ChevronDown, ChevronRight, Copy, GitCommit, LogOut, Plus, RotateCcw,
  Search, Trash2, TriangleAlert, X,
} from 'lucide-react'
import { RequireAdmin } from '@/components/editor/RequireAdmin'
import { TagInput } from '@/components/editor/TagInput'
import { ToastView, type Toast } from '@/components/editor/ToastView'
import { getToken, signOut } from '@/lib/github-auth'
import { clearFileCache, commitMultiFile, EDITOR_REPO, getFile } from '@/lib/github-client'
import { SET_BONUSES } from '@/types/editor'
import {
  ANY_CLASS, CLASS_SLUGS, EQUIPMENT_HEADERS, GENDERS, LIST_SEP, STAT_HEADERS,
  TYPE_BY_LABEL, labelFor, newItemId, typeTree,
} from '@/lib/item-types'
import {
  FILE_PATH, cell, changeType, emptyRec, isBlank, listOf, parseBoth, sameRec, serializeFile,
  setList, summarize, takenIds, validate, withCell, type Change, type Issue, type Rec,
} from '@/lib/items-v2'
import { LEGACY_ROOT, LEGACY_SOURCES, migrateLegacy } from '@/lib/equipment-migrate'
import { parseEquipmentCsv } from '@/lib/equipment-v2'

// ── Look (same as the other editor pages) ──
const inputCls =
  'w-full rounded border border-ash/20 bg-crypt-300 px-2 py-2 text-sm text-ivory outline-none focus:border-gilt focus:ring-1 focus:ring-gilt/40'
const labelCls = 'mb-1 block font-ui text-xs font-semibold text-ivory/80'
const sectionCls = 'mt-5 mb-2 border-b border-ash/20 pb-1 font-heading text-xs font-bold uppercase tracking-wider text-gilt'
const btnCls = 'inline-flex items-center gap-1.5 rounded border border-ash/30 px-3 py-2 text-sm text-ivory hover:border-gilt hover:text-gilt disabled:opacity-50'

const DRAFT_KEY = 'unoraItemsV2Draft'
const PAGE = 150
const CLASS_TOKENS: string[] = [ANY_CLASS, ...CLASS_SLUGS.filter((c) => c !== 'peasant')]
const CORE_STATS = ['HP', 'MP', 'AC', 'MR', 'STR', 'INT', 'WIS', 'CON', 'DEX', 'DMG', 'HIT']
const BONUS_STATS = STAT_HEADERS.filter((h) => !CORE_STATS.includes(h))

interface Published {
  eqText: string
  itemsText: string
  recs: Rec[]
  headers: { equipment: string[]; items: string[] }
}

interface Draft { rows: Rec[]; baseEq: string; baseItems: string; firstCommit: boolean }

type Filter =
  | { kind: 'all' }
  | { kind: 'section'; section: string }
  | { kind: 'group'; section: string; group: string }
  | { kind: 'type'; type: string }
  | { kind: 'attention' }
  | { kind: 'unsorted' }
  | { kind: 'edited' }

type LoadState = { kind: 'loading' } | { kind: 'needs-migration' } | { kind: 'ready' } | { kind: 'error'; msg: string }

interface Editing { rec: Rec; isNew: boolean; originalId: string }

interface Preview {
  files: { path: string; before: string; after: string }[]
  changes: Change[]
  issues: Issue[]
  firstCommit: boolean
  stale: boolean
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const levelNumber = (rec: Rec) => {
  const n = Number(cell(rec.row, 'LVL'))
  return Number.isFinite(n) && cell(rec.row, 'LVL') !== '' ? n : 99999
}

export function AdminItems() {
  const dryRun = new URLSearchParams(window.location.hash.split('?')[1] || '').get('dryRun') === '1'
  return (
    <RequireAdmin>
      {(login) => <ItemsShell login={login} dryRun={dryRun} />}
    </RequireAdmin>
  )
}

function ItemsShell({ login, dryRun }: { login: string; dryRun: boolean }) {
  const [load, setLoad] = useState<LoadState>({ kind: 'loading' })
  const [base, setBase] = useState<Published | null>(null)
  const [recs, setRecs] = useState<Rec[]>([])
  const [firstCommit, setFirstCommit] = useState(false)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>({ kind: 'all' })
  const [sortBy, setSortBy] = useState<'file' | 'name' | 'level' | 'type'>('file')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [shown, setShown] = useState(PAGE)
  const [toast, setToast] = useState<Toast>(null)
  const [busy, setBusy] = useState<'idle' | 'migrating' | 'preview' | 'committing'>('idle')
  const [progress, setProgress] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [removedOpen, setRemovedOpen] = useState(false)
  const dirtyRef = useRef(false)

  // ── Loading from GitHub ──
  const fetchPublished = useCallback(async (): Promise<{ eq: string | null; items: string }> => {
    const token = getToken()
    if (!token) throw new Error('Not signed in')
    clearFileCache()
    const [eq, items] = await Promise.all([
      getFile(token, EDITOR_REPO.owner, EDITOR_REPO.repo, FILE_PATH.equipment, EDITOR_REPO.branch),
      getFile(token, EDITOR_REPO.owner, EDITOR_REPO.repo, FILE_PATH.items, EDITOR_REPO.branch),
    ])
    return { eq: eq ? eq.content : null, items: items ? items.content : '' }
  }, [])

  const loadAll = useCallback(async (keepDraft: boolean) => {
    setLoad({ kind: 'loading' })
    try {
      const { eq, items } = await fetchPublished()
      let draft: Draft | null = null
      try {
        const raw = localStorage.getItem(DRAFT_KEY)
        if (raw && keepDraft) draft = JSON.parse(raw) as Draft
        if (!keepDraft) localStorage.removeItem(DRAFT_KEY)
      } catch { /* a broken draft is simply ignored */ }

      if (eq === null) {
        // The new files do not exist yet: offer to create them from the old CSVs.
        const parsed = parseBoth('', items)
        setBase({ eqText: '', itemsText: items, recs: [], headers: { equipment: [...EQUIPMENT_HEADERS], items: parsed.headers.items } })
        if (draft && draft.firstCommit && draft.rows.length > 0) {
          setRecs(draft.rows)
          setFirstCommit(true)
          setLoad({ kind: 'ready' })
          setToast({ kind: 'info', msg: 'Restored your unsaved draft.' })
        } else {
          setRecs(parsed.recs)
          setFirstCommit(false)
          setLoad({ kind: 'needs-migration' })
        }
        return
      }

      const parsed = parseBoth(eq, items)
      setBase({ eqText: eq, itemsText: items, recs: parsed.recs, headers: parsed.headers })
      if (draft && !draft.firstCommit && draft.baseEq === eq && draft.baseItems === items) {
        setRecs(draft.rows)
        setToast({ kind: 'info', msg: 'Restored your unsaved draft.' })
      } else {
        if (draft) setToast({ kind: 'info', msg: 'The files on GitHub changed, so your older unsaved draft was dropped.' })
        setRecs(parsed.recs)
      }
      setFirstCommit(false)
      setLoad({ kind: 'ready' })
    } catch (e) {
      setLoad({ kind: 'error', msg: e instanceof Error ? e.message : String(e) })
    }
  }, [fetchPublished])

  useEffect(() => { void loadAll(true) }, [loadAll])

  // ── Derived data ──
  const baseById = useMemo(() => new Map((base?.recs ?? []).map((r) => [cell(r.row, 'ID'), r])), [base])
  const issues = useMemo(() => validate(recs), [recs])
  const issueIds = useMemo(() => new Set(issues.map((i) => i.id)), [issues])
  const errorCount = issues.filter((i) => i.level === 'error').length

  const statusOf = useCallback((r: Rec): 'new' | 'edited' | '' => {
    if (firstCommit) return ''
    const b = baseById.get(cell(r.row, 'ID'))
    if (!b) return 'new'
    return sameRec(b, r) ? '' : 'edited'
  }, [baseById, firstCommit])

  const removed = useMemo(() => {
    if (!base || firstCommit) return []
    const have = new Set(recs.map((r) => cell(r.row, 'ID')))
    return base.recs.filter((r) => !have.has(cell(r.row, 'ID')))
  }, [base, recs, firstCommit])

  const typeCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of recs) m.set(cell(r.row, 'Type'), (m.get(cell(r.row, 'Type')) ?? 0) + 1)
    return m
  }, [recs])
  const tree = useMemo(() => typeTree(), [])
  const unsortedCount = typeCounts.get('Weapon') ?? 0
  const editedCount = useMemo(() => recs.filter((r) => statusOf(r) !== '').length, [recs, statusOf])

  // ── Keeping the draft across page reloads ──
  useEffect(() => {
    if (load.kind !== 'ready' || !base) return
    if (!dirtyRef.current) { dirtyRef.current = true; return }
    const t = setTimeout(() => {
      try {
        // Nothing changed compared to GitHub: there is no draft worth keeping.
        if (!firstCommit && editedCount === 0 && removed.length === 0) { localStorage.removeItem(DRAFT_KEY); return }
        const d: Draft = { rows: recs, baseEq: base.eqText, baseItems: base.itemsText, firstCommit }
        localStorage.setItem(DRAFT_KEY, JSON.stringify(d))
      } catch { /* storage full or blocked: the draft just will not survive a reload */ }
    }, 400)
    return () => clearTimeout(t)
  }, [recs, base, firstCommit, load.kind, editedCount, removed.length])

  const useSuggestions = useMemo(() => {
    const all = new Set<string>()
    for (const r of recs) for (const u of listOf(r.row, 'Uses')) all.add(u)
    return [...all].sort((a, b) => a.localeCompare(b))
  }, [recs])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const words = q ? q.split(/\s+/) : []
    const out = recs.filter((r) => {
      const type = cell(r.row, 'Type')
      const info = TYPE_BY_LABEL.get(type.toLowerCase())
      switch (filter.kind) {
        case 'section': if (info?.section !== filter.section) return false; break
        case 'group': if (info?.section !== filter.section || info.group !== filter.group) return false; break
        case 'type': if (type !== filter.type) return false; break
        case 'attention': if (!issueIds.has(cell(r.row, 'ID'))) return false; break
        case 'unsorted': if (type !== 'Weapon') return false; break
        case 'edited': if (statusOf(r) === '') return false; break
        default: break
      }
      if (!words.length) return true
      const hay = [
        cell(r.row, 'Name'), type, cell(r.row, 'Class'), cell(r.row, 'Gender'), cell(r.row, 'LOC'),
        cell(r.row, 'Set'), cell(r.row, 'Uses'), cell(r.row, 'Description'),
      ].join(' ').toLowerCase()
      return words.every((w) => hay.includes(w))
    })
    if (sortBy === 'name') out.sort((a, b) => cell(a.row, 'Name').localeCompare(cell(b.row, 'Name')))
    else if (sortBy === 'level') out.sort((a, b) => levelNumber(a) - levelNumber(b) || cell(a.row, 'Name').localeCompare(cell(b.row, 'Name')))
    else if (sortBy === 'type') out.sort((a, b) => cell(a.row, 'Type').localeCompare(cell(b.row, 'Type')) || cell(a.row, 'Name').localeCompare(cell(b.row, 'Name')))
    return out
  }, [recs, search, filter, sortBy, issueIds, statusOf])

  useEffect(() => { setShown(PAGE) }, [search, filter, sortBy])

  // A shortcut filter whose list has become empty (after a commit, say) would just show "Nothing matches".
  useEffect(() => {
    if ((filter.kind === 'edited' && editedCount === 0)
      || (filter.kind === 'attention' && issues.length === 0)
      || (filter.kind === 'unsorted' && unsortedCount === 0)) setFilter({ kind: 'all' })
  }, [filter, editedCount, issues.length, unsortedCount])

  // ── Editing ──
  const openNew = (type = 'Ring') => {
    const rec = emptyRec(type, takenIds(recs))
    setEditing({ rec, isNew: true, originalId: cell(rec.row, 'ID') })
  }
  const openEdit = (r: Rec) => setEditing({ rec: { ...r, row: { ...r.row } }, isNew: false, originalId: cell(r.row, 'ID') })
  const duplicate = (r: Rec) => {
    const taken = takenIds(recs)
    const name = `${cell(r.row, 'Name')} (copy)`
    const copy: Rec = { ...r, row: { ...r.row, Name: name, ID: newItemId(name, taken) } }
    setEditing({ rec: copy, isNew: true, originalId: cell(copy.row, 'ID') })
  }

  const saveEditing = () => {
    if (!editing) return
    const name = cell(editing.rec.row, 'Name')
    if (!name) { setToast({ kind: 'error', msg: 'Give it a name first.' }); return }
    if (!TYPE_BY_LABEL.has(cell(editing.rec.row, 'Type').toLowerCase())) { setToast({ kind: 'error', msg: 'Pick a type first.' }); return }
    const id = cell(editing.rec.row, 'ID')
    setRecs((prev) => {
      if (editing.isNew) return [...prev, editing.rec]
      return prev.map((r) => (cell(r.row, 'ID') === editing.originalId ? editing.rec : r))
    })
    setEditing(null)
    setToast({ kind: 'success', msg: `Saved “${name}” to your draft (${id}).` })
  }

  const deleteRec = (r: Rec) => {
    const id = cell(r.row, 'ID')
    const index = recs.findIndex((x) => cell(x.row, 'ID') === id)
    setRecs((prev) => prev.filter((x) => cell(x.row, 'ID') !== id))
    setSelected((s) => { const n = new Set(s); n.delete(id); return n })
    if (editing?.originalId === id) setEditing(null)
    setToast({
      kind: 'info',
      msg: `Deleted “${cell(r.row, 'Name')}”`,
      action: {
        label: 'Undo',
        onClick: () => { setRecs((prev) => { const n = [...prev]; n.splice(Math.min(index, n.length), 0, r); return n }); setToast(null) },
      },
    })
  }

  const restoreRemoved = (r: Rec) => setRecs((prev) => [...prev, r])
  const revert = (r: Rec) => {
    const b = baseById.get(cell(r.row, 'ID'))
    if (!b) return
    setRecs((prev) => prev.map((x) => (cell(x.row, 'ID') === cell(r.row, 'ID') ? b : x)))
    setEditing(null)
  }

  // ── Bulk edit ──
  const applyBulk = (field: string, value: string) => {
    let count = 0
    setRecs((prev) => prev.map((r) => {
      if (!selected.has(cell(r.row, 'ID'))) return r
      let next = r
      switch (field) {
        case 'Type': next = changeType(r, value); break
        case 'AddClass': if (r.file === 'equipment') { const l = listOf(r.row, 'Class'); if (!l.includes(value)) next = { ...r, row: setList(r.row, 'Class', [...l, value]) } } break
        case 'RemoveClass': if (r.file === 'equipment') next = { ...r, row: setList(r.row, 'Class', listOf(r.row, 'Class').filter((c) => c !== value)) }; break
        case 'Gender': if (r.file === 'equipment') next = { ...r, row: { ...r.row, Gender: value } }; break
        case 'LOC': next = withCell(r, 'LOC', value); break
        case 'LVL': if (r.file === 'equipment') next = withCell(r, 'LVL', value); break
        case 'Set': if (r.file === 'equipment') next = withCell(r, 'Set', value); break
        default: break
      }
      if (next !== r) count++
      return next
    }))
    setToast({ kind: 'success', msg: `Bulk edit applied to ${selected.size} selected (see Preview Changes for what actually changed).` })
    return count
  }
  const deleteSelected = () => {
    if (!confirm(`Delete ${selected.size} selected item(s) from your draft? You can still restore them from “Removed” until you commit.`)) return
    setRecs((prev) => prev.filter((r) => !selected.has(cell(r.row, 'ID'))))
    setSelected(new Set())
  }

  // ── Creating the new files from the old CSVs ──
  const runMigration = async () => {
    const token = getToken()
    if (!token) { setToast({ kind: 'error', msg: 'Not signed in' }); return }
    setBusy('migrating')
    try {
      const texts = new Map<string, string | null>()
      const queue = [...LEGACY_SOURCES]
      let done = 0
      const worker = async () => {
        for (let s = queue.shift(); s; s = queue.shift()) {
          const f = await getFile(token, EDITOR_REPO.owner, EDITOR_REPO.repo, `${LEGACY_ROOT}/${s.path}`, EDITOR_REPO.branch)
          texts.set(s.path, f ? f.content : null)
          done++
          if (done % 10 === 0) setProgress(`Reading the old files… ${done} of ${LEGACY_SOURCES.length}`)
        }
      }
      await Promise.all(Array.from({ length: 6 }, worker))
      setProgress('Converting…')
      const result = migrateLegacy((p) => texts.get(p) ?? null)
      const migrated: Rec[] = result.rows.map((row) => ({ file: 'equipment' as const, row }))
      // Safety check: building the site list from the new rows must give as many entries as the old files had.
      const text = serializeFile('equipment', migrated, [...EQUIPMENT_HEADERS])
      const check = parseEquipmentCsv(text)
      if (check.problems.length) throw new Error(`The converted file has problems: ${check.problems.slice(0, 3).join('; ')}`)
      if (check.entries.length !== result.legacyRows) {
        throw new Error(`Expected ${result.legacyRows} entries but the converted file gives ${check.entries.length}. Nothing was changed.`)
      }
      setRecs([...migrated, ...recs.filter((r) => r.file === 'items')])
      setFirstCommit(true)
      setLoad({ kind: 'ready' })
      setToast({
        kind: 'success',
        msg: `Converted ${result.legacyRows} old rows from ${result.filesRead.length} files into ${migrated.length} records. Check it, then Preview Changes to publish.`,
      })
    } catch (e) {
      setToast({ kind: 'error', msg: `Conversion failed: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setBusy('idle'); setProgress('')
    }
  }

  // ── Preview and commit ──
  const openPreview = async () => {
    if (!base) return
    setBusy('preview')
    try {
      const now = await fetchPublished()
      const stale = (now.eq ?? '') !== base.eqText || now.items !== base.itemsText
      const eqAfter = serializeFile('equipment', recs, base.headers.equipment)
      const itemsAfter = serializeFile('items', recs, base.headers.items)
      const files = [
        { path: FILE_PATH.equipment, before: base.eqText, after: eqAfter },
        { path: FILE_PATH.items, before: base.itemsText, after: itemsAfter },
      ].filter((f) => f.before !== f.after)
      setPreview({
        files,
        changes: firstCommit ? [] : summarize(base.recs, recs),
        issues,
        firstCommit,
        stale,
      })
    } catch (e) {
      setToast({ kind: 'error', msg: `Could not build the preview: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setBusy('idle')
    }
  }

  const doCommit = async (message: string) => {
    if (!preview || !base) return
    const token = getToken()
    if (!token) return
    setBusy('committing')
    try {
      const trailer = '\n\nCo-Authored-By: True <true@unora.local>'
      if (dryRun) {
        console.log('[dryRun] would commit', message, preview.files.map((f) => f.path))
        setToast({ kind: 'success', msg: 'Dry-run logged to the browser console.' })
      } else {
        const res = await commitMultiFile(
          token, EDITOR_REPO.owner, EDITOR_REPO.repo, EDITOR_REPO.branch,
          preview.files.map((f) => ({ path: f.path, content: f.after })), message + trailer,
        )
        clearFileCache()
        const eqAfter = preview.files.find((f) => f.path === FILE_PATH.equipment)?.after ?? base.eqText
        const itemsAfter = preview.files.find((f) => f.path === FILE_PATH.items)?.after ?? base.itemsText
        const parsed = parseBoth(eqAfter, itemsAfter)
        setBase({ eqText: eqAfter, itemsText: itemsAfter, recs: parsed.recs, headers: parsed.headers })
        setRecs(parsed.recs)
        setFirstCommit(false)
        try { localStorage.removeItem(DRAFT_KEY) } catch { /* nothing to clear */ }
        setToast({ kind: 'success', msg: `Committed ${res.sha.slice(0, 7)}. The site rebuilds in about 2 minutes.` })
      }
      setPreview(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setToast({ kind: 'error', msg: msg.includes('409') || msg.includes('422') ? 'Another edit landed first. Reload and try again.' : `Commit failed: ${msg}` })
    } finally {
      setBusy('idle')
    }
  }

  const discardDraft = () => {
    if (!confirm('Throw away all unsaved changes and reload from GitHub?')) return
    void loadAll(false)
  }

  // ── Screens ──
  if (load.kind === 'loading') {
    return <Centered>Loading the item files from GitHub…</Centered>
  }
  if (load.kind === 'error') {
    return (
      <Centered>
        <p className="mb-3 text-ignis">Could not load: {load.msg}</p>
        <button className={btnCls} onClick={() => void loadAll(true)}>Try again</button>
      </Centered>
    )
  }
  if (load.kind === 'needs-migration') {
    return (
      <Centered wide>
        <h1 className="mb-2 font-heading text-xl font-bold text-gilt">One-time setup</h1>
        <p className="mb-3 text-sm text-ivory/90">
          The new item files do not exist yet. This button reads your current equipment CSVs from GitHub
          ({LEGACY_SOURCES.length} possible files), converts them into the single new <code>equipment.csv</code>, and checks
          that it gives exactly as many entries as before. Nothing is saved to GitHub until you click Preview Changes
          and commit, and the old files are left alone.
        </p>
        {progress && <p className="mb-3 text-sm text-gilt">{progress}</p>}
        <div className="flex flex-wrap gap-2">
          <button className="rounded bg-gilt px-4 py-2 text-sm font-semibold text-ink hover:bg-gilt/90 disabled:opacity-50" disabled={busy !== 'idle'} onClick={() => void runMigration()}>
            {busy === 'migrating' ? 'Converting…' : 'Create the new item files from my current CSVs'}
          </button>
          <Link to="/admin-editor" className={btnCls}>Back to the recipe editor</Link>
        </div>
        {toast && <ToastView toast={toast} onDismiss={() => setToast(null)} />}
      </Centered>
    )
  }

  const queued = recs.length === 0 ? 0 : editedCount + removed.length
  const allShownSelected = visible.slice(0, shown).length > 0 && visible.slice(0, shown).every((r) => selected.has(cell(r.row, 'ID')))

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col bg-obsidian text-ivory">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-ash/20 bg-crypt-400 px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="font-heading text-base font-bold text-gilt sm:text-xl">Unora Item Editor</h1>
          <span className="rounded-full bg-gilt/20 px-2 py-0.5 font-ui text-[10px] font-semibold uppercase tracking-wider text-gilt">Items &amp; Equipment</span>
          {dryRun && <span className="rounded bg-ignis/20 px-2 py-0.5 font-ui text-[10px] font-semibold uppercase text-ignis">Dry Run</span>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="hidden font-ui text-xs text-ash sm:inline">@{login}</span>
          <Link to="/admin-editor" className={btnCls}><Anvil className="h-4 w-4" aria-hidden="true" />Recipes &amp; professions</Link>
          <button className={btnCls} onClick={discardDraft} disabled={busy !== 'idle'} title="Throw away unsaved changes and reload from GitHub">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />Reload
          </button>
          <button
            onClick={() => void openPreview()}
            disabled={busy !== 'idle' || (queued === 0 && !firstCommit)}
            className="inline-flex items-center gap-1.5 rounded bg-gilt px-3 py-2 text-sm font-semibold text-ink hover:bg-gilt/90 disabled:opacity-50"
          >
            <GitCommit className="h-4 w-4" aria-hidden="true" />
            {busy === 'preview' ? 'Building…' : `Preview Changes${firstCommit ? '' : queued ? ` (${queued})` : ''}`}
          </button>
          <button onClick={() => { signOut(); window.location.reload() }} className={`${btnCls} text-ash`}>
            <LogOut className="h-4 w-4" aria-hidden="true" />Sign out
          </button>
        </div>
      </header>

      {firstCommit && (
        <div className="border-b border-gilt/30 bg-gilt/10 px-4 py-2 font-ui text-sm text-gilt">
          Converted from your old CSVs and not published yet. Look it over, then click Preview Changes to create the new files.
          Until you commit, the wiki still uses the old files.
        </div>
      )}

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[250px_1fr]">
        {/* Type tree */}
        <aside className="border-b border-ash/20 bg-crypt-400 p-3 lg:border-b-0 lg:border-r">
          <TreeButton active={filter.kind === 'all'} onClick={() => setFilter({ kind: 'all' })} label="Everything" count={recs.length} />
          {issues.length > 0 && (
            <TreeButton active={filter.kind === 'attention'} onClick={() => setFilter({ kind: 'attention' })} label="Needs attention" count={issueIds.size} tone="warn" />
          )}
          {editedCount > 0 && (
            <TreeButton active={filter.kind === 'edited'} onClick={() => setFilter({ kind: 'edited' })} label="Changed in my draft" count={editedCount} />
          )}
          {unsortedCount > 0 && (
            <TreeButton active={filter.kind === 'unsorted'} onClick={() => setFilter({ kind: 'unsorted' })} label="Weapons not sorted yet" count={unsortedCount} />
          )}
          {tree.map((s) => (
            <div key={s.section} className="mt-3">
              <button
                className={`block w-full text-left font-heading text-xs font-bold uppercase tracking-wider ${filter.kind === 'section' && filter.section === s.section ? 'text-gilt' : 'text-ash hover:text-ivory'}`}
                onClick={() => setFilter({ kind: 'section', section: s.section })}
              >
                {s.section}
              </button>
              {s.groups.map((g) => (
                <div key={g.group} className="mt-1 pl-2">
                  <button
                    className={`block w-full py-0.5 text-left font-ui text-sm font-semibold ${filter.kind === 'group' && filter.group === g.group && filter.section === s.section ? 'text-gilt' : 'text-ivory/90 hover:text-gilt'}`}
                    onClick={() => setFilter({ kind: 'group', section: s.section, group: g.group })}
                  >
                    {g.group}
                  </button>
                  <div className="pl-3">
                    {g.types.map((t) => (
                      <TreeButton key={t} small active={filter.kind === 'type' && filter.type === t} onClick={() => setFilter({ kind: 'type', type: t })} label={t} count={typeCounts.get(t) ?? 0} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {removed.length > 0 && (
            <div className="mt-5 border-t border-ash/20 pt-3">
              <button className="flex w-full items-center gap-1 font-ui text-sm font-semibold text-ignis" onClick={() => setRemovedOpen((o) => !o)}>
                {removedOpen ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
                Removed ({removed.length})
              </button>
              {removedOpen && (
                <ul className="mt-2 space-y-1">
                  {removed.map((r) => (
                    <li key={cell(r.row, 'ID')} className="flex items-center justify-between gap-2 font-ui text-xs text-ivory/80">
                      <span className="truncate" title={cell(r.row, 'Name')}>{cell(r.row, 'Name')}</span>
                      <button className="shrink-0 rounded border border-gilt/40 px-2 py-0.5 text-gilt hover:bg-gilt/20" onClick={() => restoreRemoved(r)}>Restore</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </aside>

        {/* List */}
        <main className="min-w-0 p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ash" aria-hidden="true" />
              <input className={`${inputCls} pl-8`} placeholder="Search name, type, class, location, set, uses…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className={`${inputCls} w-auto`} value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} aria-label="Sort">
              <option value="file">Order in file</option>
              <option value="name">Name</option>
              <option value="level">Level</option>
              <option value="type">Type</option>
            </select>
            <button className="inline-flex items-center gap-1.5 rounded bg-gilt px-3 py-2 text-sm font-semibold text-ink hover:bg-gilt/90" onClick={() => openNew(defaultNewType(filter))}>
              <Plus className="h-4 w-4" aria-hidden="true" />New item
            </button>
          </div>

          <div className="mb-2 flex flex-wrap items-center gap-3 font-ui text-sm text-ash">
            <span>{visible.length} shown of {recs.length}</span>
            {errorCount > 0 && <span className="rounded bg-ignis/20 px-2 py-0.5 text-[11px] text-ignis">{errorCount} error{errorCount === 1 ? '' : 's'} to fix before publishing</span>}
            {issues.length - errorCount > 0 && <span className="rounded bg-gilt/15 px-2 py-0.5 text-[11px] text-gilt">{issues.length - errorCount} warning{issues.length - errorCount === 1 ? '' : 's'}</span>}
          </div>

          {selected.size > 0 && (
            <BulkBar count={selected.size} onApply={applyBulk} onDelete={deleteSelected} onClear={() => setSelected(new Set())} />
          )}

          <div className="overflow-x-auto rounded border border-ash/20">
            <table className="w-full min-w-[640px] text-left font-ui text-sm">
              <thead className="bg-crypt-300 text-xs uppercase tracking-wider text-ash">
                <tr>
                  <th className="w-8 px-2 py-2">
                    <input
                      type="checkbox"
                      aria-label="Select all shown"
                      checked={allShownSelected}
                      onChange={(e) => {
                        const ids = visible.slice(0, shown).map((r) => cell(r.row, 'ID'))
                        setSelected((s) => { const n = new Set(s); for (const id of ids) { if (e.target.checked) n.add(id); else n.delete(id) } return n })
                      }}
                    />
                  </th>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Class</th>
                  <th className="px-2 py-2">Gender</th>
                  <th className="px-2 py-2">Lvl</th>
                  <th className="px-2 py-2">Location</th>
                  <th className="w-24 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {visible.slice(0, shown).map((r) => {
                  const id = cell(r.row, 'ID')
                  const status = statusOf(r)
                  const bad = issueIds.has(id)
                  return (
                    <tr key={id} className={`border-t border-ash/10 hover:bg-crypt-300/60 ${editing?.originalId === id ? 'bg-gilt/10' : ''}`}>
                      <td className="px-2 py-1.5"><input type="checkbox" aria-label={`Select ${cell(r.row, 'Name')}`} checked={selected.has(id)} onChange={(e) => setSelected((s) => { const n = new Set(s); if (e.target.checked) n.add(id); else n.delete(id); return n })} /></td>
                      <td className="cursor-pointer px-2 py-1.5 font-semibold text-ivory" onClick={() => openEdit(r)}>
                        {cell(r.row, 'Name') || <em className="text-ash">(no name)</em>}
                        {status === 'new' && <span className="ml-2 rounded bg-gilt/25 px-1.5 py-0.5 text-[10px] text-gilt">NEW</span>}
                        {status === 'edited' && <span className="ml-2 rounded bg-ignis/20 px-1.5 py-0.5 text-[10px] text-ignis">EDITED</span>}
                        {bad && <TriangleAlert className="ml-2 inline h-3.5 w-3.5 text-ignis" aria-label="Needs attention" />}
                      </td>
                      <td className="px-2 py-1.5 text-ivory/80">{cell(r.row, 'Type')}</td>
                      <td className="px-2 py-1.5 text-ivory/80">{listOf(r.row, 'Class').join(', ')}</td>
                      <td className="px-2 py-1.5 text-ivory/80">{listOf(r.row, 'Gender').join(', ')}</td>
                      <td className="px-2 py-1.5 text-ivory/80">{isBlank(r.row.LVL) ? '' : cell(r.row, 'LVL')}</td>
                      <td className="max-w-[220px] truncate px-2 py-1.5 text-ivory/70" title={cell(r.row, 'LOC')}>{isBlank(r.row.LOC) ? '' : cell(r.row, 'LOC')}</td>
                      <td className="px-2 py-1.5">
                        <div className="flex justify-end gap-1">
                          <button className="rounded border border-ash/30 p-1.5 text-ash hover:border-gilt hover:text-gilt" title="Duplicate" aria-label={`Duplicate ${cell(r.row, 'Name')}`} onClick={() => duplicate(r)}><Copy className="h-3.5 w-3.5" aria-hidden="true" /></button>
                          <button className="rounded border border-ignis/40 p-1.5 text-ignis hover:bg-ignis/20" title="Delete" aria-label={`Delete ${cell(r.row, 'Name')}`} onClick={() => deleteRec(r)}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {visible.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center italic text-ash">Nothing matches.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {visible.length > shown && (
            <div className="mt-3 text-center">
              <button className={btnCls} onClick={() => setShown((n) => n + PAGE)}>Show {Math.min(PAGE, visible.length - shown)} more ({visible.length - shown} left)</button>
            </div>
          )}
        </main>
      </div>

      {editing && (
        <Drawer
          editing={editing}
          setEditing={setEditing}
          recs={recs}
          baseHas={(id) => baseById.has(id)}
          useSuggestions={useSuggestions}
          issues={issues.filter((i) => i.id === cell(editing.rec.row, 'ID'))}
          canRevert={!editing.isNew && statusOf(editing.rec) !== '' && baseById.has(editing.originalId)}
          onSave={saveEditing}
          onClose={() => setEditing(null)}
          onRevert={() => revert(editing.rec)}
          onDuplicate={() => duplicate(editing.rec)}
          onDelete={() => deleteRec(editing.rec)}
        />
      )}

      {preview && (
        <PreviewDialog
          preview={preview}
          busy={busy === 'committing'}
          onClose={() => setPreview(null)}
          onReload={() => { setPreview(null); void loadAll(false) }}
          onConfirm={(m) => void doCommit(m)}
        />
      )}

      {toast && <ToastView toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

function defaultNewType(f: Filter): string {
  if (f.kind === 'type' && f.type !== 'Weapon') return f.type
  return 'Ring'
}

function Centered({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-obsidian p-6 text-ivory">
      <div className={`${wide ? 'max-w-xl' : ''} rounded-lg border border-ash/30 bg-crypt-400 p-6 text-center font-ui ${wide ? 'text-left' : ''}`}>{children}</div>
    </div>
  )
}

function TreeButton({ label, count, active, onClick, small, tone }: { label: string; count: number; active: boolean; onClick: () => void; small?: boolean; tone?: 'warn' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded px-2 ${small ? 'py-0.5 text-[13px]' : 'py-1 text-sm'} font-ui ${active ? 'bg-gilt/20 text-gilt' : tone === 'warn' ? 'text-ignis hover:bg-ignis/10' : 'text-ivory/85 hover:bg-crypt-300'}`}
    >
      <span className="truncate">{label}</span>
      <span className="ml-2 shrink-0 text-[11px] text-ash">{count}</span>
    </button>
  )
}

// ── Bulk edit bar ──
function BulkBar({ count, onApply, onDelete, onClear }: { count: number; onApply: (field: string, value: string) => number; onDelete: () => void; onClear: () => void }) {
  const [field, setField] = useState('Type')
  const [value, setValue] = useState('')
  const textFields = new Set(['LOC', 'LVL', 'Set'])
  const choose = (f: string) => { setField(f); setValue(f === 'Gender' ? 'male' : '') }
  return (
    <div className="mb-3 flex flex-wrap items-end gap-2 rounded border border-gilt/40 bg-gilt/10 p-2">
      <span className="font-ui text-sm font-semibold text-gilt">{count} selected</span>
      <div>
        <label className={labelCls}>Change</label>
        <select className={`${inputCls} w-auto`} value={field} onChange={(e) => choose(e.target.value)}>
          <option value="Type">Type</option>
          <option value="AddClass">Add a class</option>
          <option value="RemoveClass">Remove a class</option>
          <option value="Gender">Gender</option>
          <option value="LOC">Location / source</option>
          <option value="LVL">Level</option>
          <option value="Set">Set bonus</option>
        </select>
      </div>
      <div className="min-w-[160px]">
        <label className={labelCls}>To</label>
        {field === 'Type' ? <TypeSelect value={value} onChange={setValue} /> : null}
        {field === 'AddClass' || field === 'RemoveClass' ? (
          <select className={inputCls} value={value} onChange={(e) => setValue(e.target.value)}>
            <option value="">Choose…</option>
            {CLASS_TOKENS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        ) : null}
        {field === 'Gender' ? (
          <select className={inputCls} value={value} onChange={(e) => setValue(e.target.value)}>
            <option value="male">male</option>
            <option value="female">female</option>
            <option value="unisex">unisex</option>
            <option value={['male', 'female'].join(LIST_SEP)}>male + female</option>
            <option value="">(none)</option>
          </select>
        ) : null}
        {textFields.has(field) ? <input className={inputCls} value={value} onChange={(e) => setValue(e.target.value)} /> : null}
      </div>
      <button className="rounded bg-gilt px-3 py-2 text-sm font-semibold text-ink hover:bg-gilt/90 disabled:opacity-50" disabled={field !== 'Gender' && !textFields.has(field) && !value} onClick={() => onApply(field, value)}>Apply</button>
      <button className="rounded border border-ignis/40 px-3 py-2 text-sm text-ignis hover:bg-ignis/15" onClick={onDelete}>Delete selected</button>
      <button className={btnCls} onClick={onClear}>Clear selection</button>
    </div>
  )
}

function TypeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const tree = useMemo(() => typeTree(), [])
  const known = TYPE_BY_LABEL.has(value.toLowerCase())
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      {!value && <option value="">Choose a type…</option>}
      {value === 'Weapon' && <option value="Weapon">Weapon (not sorted yet)</option>}
      {value && !known && <option value={value}>{value} (unknown)</option>}
      {tree.map((s) => s.groups.map((g) => (
        <optgroup key={`${s.section}-${g.group}`} label={`${s.section} › ${g.group}`}>
          {g.types.map((t) => <option key={t} value={t}>{t}</option>)}
        </optgroup>
      )))}
    </select>
  )
}

// ── The edit form ──
interface DrawerProps {
  editing: Editing
  setEditing: (e: Editing) => void
  recs: Rec[]
  baseHas: (id: string) => boolean
  useSuggestions: string[]
  issues: Issue[]
  canRevert: boolean
  onSave: () => void
  onClose: () => void
  onRevert: () => void
  onDuplicate: () => void
  onDelete: () => void
}

function Drawer({ editing, setEditing, recs, baseHas, useSuggestions, issues, canRevert, onSave, onClose, onRevert, onDuplicate, onDelete }: DrawerProps) {
  const rec = editing.rec
  const row = rec.row
  const info = TYPE_BY_LABEL.get(cell(row, 'Type').toLowerCase())
  const isEquipment = rec.file === 'equipment'
  const set = (header: string, value: string) => setEditing({ ...editing, rec: withCell(rec, header, value) })

  const setName = (name: string) => {
    // A record that has never been published follows its name; a published one keeps its ID for good.
    let next = withCell(rec, 'Name', name)
    if (editing.isNew && !baseHas(cell(row, 'ID'))) {
      const taken = takenIds(recs.filter((r) => cell(r.row, 'ID') !== editing.originalId))
      next = withCell(next, 'ID', newItemId(name || 'new item', taken))
    }
    setEditing({ ...editing, rec: next })
  }
  const setType = (type: string) => setEditing({ ...editing, rec: changeType(rec, type) })

  const classes = listOf(row, 'Class')
  const genders = listOf(row, 'Gender').map((g) => g.toLowerCase())
  const toggleGender = (g: string) => {
    const next = genders.includes(g) ? genders.filter((x) => x !== g) : [...genders, g]
    next.sort((a, b) => GENDERS.indexOf(a as typeof GENDERS[number]) - GENDERS.indexOf(b as typeof GENDERS[number]))
    set('Gender', next.join(LIST_SEP))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-obsidian/70" onClick={onClose}>
      <form
        className="flex h-full w-full max-w-xl flex-col border-l border-gilt/30 bg-crypt-400 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); onSave() }}
      >
        <div className="flex items-center justify-between border-b border-ash/20 bg-crypt-300 px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate font-heading text-lg font-bold text-gilt">{editing.isNew ? 'New item' : cell(row, 'Name') || 'Edit item'}</h2>
            <p className="font-ui text-[11px] text-ash">ID: {cell(row, 'ID')}{editing.isNew ? '' : ' (never changes)'} · saved in {FILE_PATH[rec.file].split('/').pop()}</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="text-ash hover:text-ivory"><X className="h-5 w-5" aria-hidden="true" /></button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {issues.length > 0 && (
            <ul className="mb-3 space-y-1">
              {issues.map((i, n) => (
                <li key={n} className={`rounded px-2 py-1 font-ui text-xs ${i.level === 'error' ? 'bg-ignis/15 text-ignis' : 'bg-gilt/10 text-gilt'}`}>{i.msg}</li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>Name</label>
              <input className={inputCls} value={row.Name ?? ''} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Type</label>
              <TypeSelect value={cell(row, 'Type')} onChange={setType} />
              {info && <p className="mt-1 font-ui text-[11px] text-ash">{info.section} › {info.group}</p>}
            </div>
          </div>

          {isEquipment ? (
            <>
              <h3 className={sectionCls}>Who can use it</h3>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Class</label>
                  <TagInput
                    value={classes}
                    onChange={(v) => set('Class', v.join(LIST_SEP))}
                    suggestions={CLASS_TOKENS}
                    placeholder="Type a class and press Enter (any = everyone)"
                  />
                </div>
                <div>
                  <label className={labelCls}>Gender</label>
                  <div className="flex gap-2">
                    {GENDERS.map((g) => (
                      <button
                        type="button"
                        key={g}
                        onClick={() => toggleGender(g)}
                        className={`rounded border px-3 py-1.5 font-ui text-sm ${genders.includes(g) ? 'border-gilt bg-gilt/20 text-gilt' : 'border-ash/30 text-ivory/80 hover:border-gilt'}`}
                      >
                        {titleCase(g)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <h3 className={sectionCls}>Basics</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Text label="Level" value={row.LVL} onChange={(v) => set('LVL', v)} />
                <Text label="Weight" value={row.WGT} onChange={(v) => set('WGT', v)} />
                <Text label="Value" value={row.Value} onChange={(v) => set('Value', v)} />
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Text label={labelFor('LOC')} value={row.LOC} onChange={(v) => set('LOC', v)} />
                <Text label={labelFor('LOC_LINK')} value={row.LOC_LINK} onChange={(v) => set('LOC_LINK', v)} placeholder="/quests/… or a wiki link" />
              </div>

              <h3 className={sectionCls}>Stats</h3>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {CORE_STATS.map((h) => <Text key={h} label={labelFor(h)} value={row[h]} onChange={(v) => set(h, v)} />)}
              </div>
              <h3 className={sectionCls}>Bonuses</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {BONUS_STATS.map((h) => <Text key={h} label={labelFor(h)} value={row[h]} onChange={(v) => set(h, v)} />)}
              </div>

              <h3 className={sectionCls}>Set bonus</h3>
              <input className={inputCls} list="item-set-names" value={row.Set ?? ''} onChange={(e) => set('Set', e.target.value)} placeholder="Leave empty if it is not part of a set" />
              <datalist id="item-set-names">{SET_BONUSES.map((s) => <option key={s} value={s} />)}</datalist>
            </>
          ) : (
            <>
              <h3 className={sectionCls}>Where to get it</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Text label={labelFor('LOC')} value={row.LOC} onChange={(v) => set('LOC', v)} />
                <Text label={labelFor('LOC_LINK')} value={row.LOC_LINK} onChange={(v) => set('LOC_LINK', v)} placeholder="/quests/… or a wiki link" />
              </div>
              <h3 className={sectionCls}>About</h3>
              <label className={labelCls}>Description</label>
              <textarea className={inputCls} rows={4} value={row.Description ?? ''} onChange={(e) => set('Description', e.target.value)} />
              <div className="mt-3">
                <label className={labelCls}>Uses</label>
                <TagInput
                  value={listOf(row, 'Uses')}
                  onChange={(v) => set('Uses', v.join(LIST_SEP))}
                  suggestions={useSuggestions}
                  allowCustom
                  placeholder="e.g. Alchemy, Cooking. Press Enter to add each one"
                />
              </div>
              <h3 className={sectionCls}>Prices</h3>
              <div className="grid grid-cols-2 gap-3">
                <Text label={labelFor('Buy')} value={row.Buy} onChange={(v) => set('Buy', v)} />
                <Text label={labelFor('Sell')} value={row.Sell} onChange={(v) => set('Sell', v)} />
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ash/20 bg-crypt-300 p-3">
          <div className="flex flex-wrap gap-2">
            {!editing.isNew && <button type="button" className={btnCls} onClick={onDuplicate}><Copy className="h-4 w-4" aria-hidden="true" />Duplicate</button>}
            {canRevert && <button type="button" className={btnCls} onClick={onRevert}><RotateCcw className="h-4 w-4" aria-hidden="true" />Undo my edits</button>}
            {!editing.isNew && <button type="button" className="inline-flex items-center gap-1.5 rounded border border-ignis/40 px-3 py-2 text-sm text-ignis hover:bg-ignis/15" onClick={onDelete}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</button>}
          </div>
          <div className="flex gap-2">
            <button type="button" className={btnCls} onClick={onClose}>Cancel</button>
            <button type="submit" className="rounded bg-gilt px-4 py-2 text-sm font-semibold text-ink hover:bg-gilt/90">{editing.isNew ? 'Add to draft' : 'Save to draft'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}

function Text({ label, value, onChange, placeholder }: { label: string; value: string | undefined; onChange: (v: string) => void; placeholder?: string }) {
  const shown = value === '-' ? '' : value ?? ''
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input className={inputCls} value={shown} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

// ── What a commit will do, in plain words ──
function PreviewDialog({ preview, busy, onClose, onReload, onConfirm }: {
  preview: Preview
  busy: boolean
  onClose: () => void
  onReload: () => void
  onConfirm: (message: string) => void
}) {
  const added = preview.changes.filter((c) => c.kind === 'added')
  const changed = preview.changes.filter((c) => c.kind === 'changed')
  const removed = preview.changes.filter((c) => c.kind === 'removed')
  const errors = preview.issues.filter((i) => i.level === 'error')
  const warns = preview.issues.filter((i) => i.level === 'warn')
  const defaultMessage = preview.firstCommit
    ? 'chore(data): move equipment into the new item database (data-source/items)'
    : `chore(data): update items via editor (${added.length} added, ${changed.length} changed, ${removed.length} removed)`
  const [message, setMessage] = useState(defaultMessage)
  const [raw, setRaw] = useState(false)

  const rawLines = useMemo(() => {
    if (!raw) return []
    const out: string[] = []
    for (const f of preview.files) {
      const before = new Set(f.before.split('\n'))
      const after = new Set(f.after.split('\n'))
      out.push(`── ${f.path}`)
      for (const l of f.before.split('\n')) if (!after.has(l) && l.trim()) out.push(`- ${l}`)
      for (const l of f.after.split('\n')) if (!before.has(l) && l.trim()) out.push(`+ ${l}`)
    }
    return out
  }, [raw, preview.files])

  const blocked = errors.length > 0 || preview.stale || preview.files.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/80 p-2 sm:p-4">
      <div className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-gilt/40 bg-crypt-400 shadow-2xl">
        <div className="flex items-center justify-between border-b border-ash/20 bg-crypt-300 px-4 py-3">
          <h2 className="font-heading text-lg font-bold text-gilt">Review changes</h2>
          <button onClick={onClose} className="text-xl text-ash hover:text-ivory" disabled={busy} aria-label="Close">×</button>
        </div>

        <div className="flex-1 space-y-4 overflow-auto p-4 font-ui text-sm">
          {preview.stale && (
            <div className="rounded border border-ignis/50 bg-ignis/10 p-3 text-ignis">
              The item files on GitHub changed after you opened the editor (someone else committed). Committing now could overwrite their work.
              <div className="mt-2"><button className={btnCls} onClick={onReload}>Reload from GitHub (drops this draft)</button></div>
            </div>
          )}
          {errors.length > 0 && (
            <div className="rounded border border-ignis/50 bg-ignis/10 p-3">
              <p className="mb-1 font-semibold text-ignis">Fix these before publishing ({errors.length})</p>
              <ul className="list-disc space-y-0.5 pl-5 text-ignis">{errors.slice(0, 15).map((i, n) => <li key={n}><strong>{i.name}</strong>: {i.msg}</li>)}</ul>
              {errors.length > 15 && <p className="mt-1 text-xs text-ignis">…and {errors.length - 15} more (use “Needs attention” in the list).</p>}
            </div>
          )}
          {warns.length > 0 && (
            <details className="rounded border border-gilt/30 bg-gilt/5 p-3">
              <summary className="cursor-pointer font-semibold text-gilt">{warns.length} warning{warns.length === 1 ? '' : 's'} (you can still publish)</summary>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-ivory/85">{warns.slice(0, 40).map((i, n) => <li key={n}><strong>{i.name}</strong>: {i.msg}</li>)}</ul>
            </details>
          )}

          {preview.firstCommit ? (
            <div className="rounded border border-gilt/40 bg-gilt/10 p-3 text-ivory">
              <p className="font-semibold text-gilt">First publish of the new item database</p>
              <p className="mt-1">This creates {preview.files.map((f) => f.path.split('/').pop()).join(' and ')} and from then on the wiki is built from them.
                The old per-class CSV files are left in place but no longer used.
                The site gets exactly the same equipment entries as before.</p>
            </div>
          ) : (
            <>
              <p className="text-ivory">
                <span className="font-semibold text-gilt">{added.length}</span> added · <span className="font-semibold text-gilt">{changed.length}</span> changed · <span className="font-semibold text-ignis">{removed.length}</span> removed
              </p>
              {preview.files.length === 0 && <p className="italic text-ash">No changes compared to GitHub.</p>}
              <ChangeList title="Added" items={added} tone="text-gilt" />
              <ChangeList title="Changed" items={changed} tone="text-ivory" />
              <ChangeList title="Removed (also removed from the wiki)" items={removed} tone="text-ignis" />
            </>
          )}

          <div>
            <button className="text-xs text-ash underline hover:text-gilt" onClick={() => setRaw((r) => !r)}>{raw ? 'Hide' : 'Show'} the exact file lines that change</button>
            {raw && (
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre rounded border border-ash/20 bg-crypt-300 p-2 text-[11px] text-ivory/80">
                {rawLines.slice(0, 300).join('\n')}{rawLines.length > 300 ? `\n… ${rawLines.length - 300} more lines` : ''}
              </pre>
            )}
          </div>
        </div>

        <div className="border-t border-ash/20 bg-crypt-300 p-3">
          <label className="mb-1 block text-[11px] uppercase tracking-wider text-ash">Commit message</label>
          <input className={inputCls} value={message} onChange={(e) => setMessage(e.target.value)} />
          <div className="mt-3 flex justify-end gap-2">
            <button className={btnCls} onClick={onClose} disabled={busy}>Cancel</button>
            <button
              className="rounded bg-gilt px-4 py-2 text-sm font-semibold text-ink hover:bg-gilt/90 disabled:opacity-50"
              disabled={busy || blocked || !message.trim()}
              onClick={() => onConfirm(message.trim())}
            >
              {busy ? 'Committing…' : 'Commit to GitHub'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChangeList({ title, items, tone }: { title: string; items: Change[]; tone: string }) {
  if (items.length === 0) return null
  const cap = 200
  return (
    <div>
      <h3 className={`mb-1 font-heading text-xs font-bold uppercase tracking-wider ${tone}`}>{title} ({items.length})</h3>
      <ul className="space-y-1.5">
        {items.slice(0, cap).map((c) => (
          <li key={c.id} className="rounded bg-crypt-300 px-3 py-1.5">
            <span className="font-semibold text-ivory">{c.name || c.id}</span> <span className="text-ash">· {c.type}</span>
            {c.details.length > 0 && <ul className="mt-0.5 list-disc pl-5 text-xs text-ivory/80">{c.details.map((d, n) => <li key={n}>{d}</li>)}</ul>}
          </li>
        ))}
      </ul>
      {items.length > cap && <p className="mt-1 text-xs text-ash">…and {items.length - cap} more.</p>}
    </div>
  )
}

export default AdminItems
