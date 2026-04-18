import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Pencil, Trash2, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react'
import type { EditorItem, EditorRecipe } from '@/types/editor'

type ItemListTab = 'items' | 'jewelcrafting' | 'armorsmithing' | 'weaponsmithing'

interface Props {
  tab: ItemListTab
  rows: (EditorItem | EditorRecipe)[]
  onEdit: (index: number) => void
  onDelete: (index: number) => void
}

const PAGE_SIZES = [25, 50, 100, 250]

type SortDir = 'asc' | 'desc'
type ColKind = 'num' | 'str'
type Col = { key: string; label: string; kind: ColKind; get: (r: any) => unknown; show: (r: any) => string; craftOnly?: boolean; itemOnly?: boolean; cellCls?: string }

const recipeStr = (r: EditorRecipe) => r.recipe?.map((x) => `${x.qty}x ${x.name}`).join(', ') || ''

const COLS: Col[] = [
  { key: 'item_name', label: 'Name', kind: 'str', get: (r) => r.item_name, show: (r) => r.item_name ?? '', cellCls: 'font-semibold text-gilt' },
  { key: 'craft_rank', label: 'Rank', kind: 'str', get: (r) => r.craft_rank, show: (r) => r.craft_rank ?? '', craftOnly: true },
  { key: 'recipe', label: 'Recipe', kind: 'str', get: (r) => recipeStr(r), show: (r) => recipeStr(r), craftOnly: true },
  { key: 'type', label: 'Type', kind: 'str', get: (r) => r.type, show: (r) => r.type ?? '' },
  { key: 'class', label: 'Class', kind: 'str', get: (r) => r.class, show: (r) => r.class ?? '' },
  { key: 'gender', label: 'Gen', kind: 'str', get: (r) => r.gender, show: (r) => r.gender ?? '' },
  { key: 'location', label: 'Loc', kind: 'str', get: (r) => r.location, show: (r) => r.location ?? '', itemOnly: true },
  { key: 'level', label: 'Lvl', kind: 'num', get: (r) => r.level, show: (r) => r.level },
  { key: 'weight', label: 'Wgt', kind: 'num', get: (r) => r.weight, show: (r) => r.weight },
  { key: 'value', label: 'Val', kind: 'num', get: (r) => r.value, show: (r) => r.value },
  { key: 'hp', label: 'HP', kind: 'num', get: (r) => r.hp, show: (r) => r.hp },
  { key: 'mp', label: 'MP', kind: 'num', get: (r) => r.mp, show: (r) => r.mp },
  { key: 'ac', label: 'AC', kind: 'num', get: (r) => r.ac, show: (r) => r.ac },
  { key: 'mr', label: 'MR', kind: 'num', get: (r) => r.mr, show: (r) => r.mr },
  { key: 'str', label: 'STR', kind: 'num', get: (r) => r.str, show: (r) => r.str },
  { key: 'int', label: 'INT', kind: 'num', get: (r) => r.int, show: (r) => r.int },
  { key: 'wis', label: 'WIS', kind: 'num', get: (r) => r.wis, show: (r) => r.wis },
  { key: 'con', label: 'CON', kind: 'num', get: (r) => r.con, show: (r) => r.con },
  { key: 'dex', label: 'DEX', kind: 'num', get: (r) => r.dex, show: (r) => r.dex },
  { key: 'dmg', label: 'DMG', kind: 'num', get: (r) => r.dmg, show: (r) => r.dmg },
  { key: 'hit', label: 'HIT', kind: 'num', get: (r) => r.hit, show: (r) => r.hit },
  { key: 'set_bonus', label: 'Set', kind: 'str', get: (r) => r.set_bonus, show: (r) => r.set_bonus ?? '', itemOnly: true },
]

const cmp = (a: unknown, b: unknown, kind: ColKind): number => {
  const aEmpty = a === '' || a == null
  const bEmpty = b === '' || b == null
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1
  if (kind === 'num') {
    const an = Number(a)
    const bn = Number(b)
    const aBad = Number.isNaN(an)
    const bBad = Number.isNaN(bn)
    if (aBad && bBad) return String(a).localeCompare(String(b))
    if (aBad) return 1
    if (bBad) return -1
    return an - bn
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

export function ItemList({ tab, rows, onEdit, onDelete }: Props) {
  const isCraft = tab !== 'items'
  const [query, setQuery] = useState('')
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(0)
  const [sortKey, setSortKey] = useState<string | null>('level')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  useEffect(() => { setPage(0); setQuery(''); setSortKey('level'); setSortDir('asc') }, [tab])

  const visibleCols = useMemo(
    () => COLS.filter((c) => (isCraft ? !c.itemOnly : !c.craftOnly)),
    [isCraft]
  )

  const deferredQuery = useDeferredValue(query)

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    const indexed = rows.map((r, i) => ({ r: r as any, i }))
    if (!q) return indexed
    return indexed.filter(({ r }) => {
      const name = String(r.item_name ?? '').toLowerCase()
      const type = String(r.type ?? '').toLowerCase()
      const loc = String(r.location ?? '').toLowerCase()
      return name.includes(q) || type.includes(q) || loc.includes(q)
    })
  }, [rows, deferredQuery])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    const col = visibleCols.find((c) => c.key === sortKey)
    if (!col) return filtered
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => dir * cmp(col.get(a.r), col.get(b.r), col.kind))
  }, [filtered, visibleCols, sortKey, sortDir])

  useEffect(() => { setPage(0) }, [query, pageSize, sortKey, sortDir])

  const total = sorted.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const start = safePage * pageSize
  const slice = sorted.slice(start, start + pageSize)

  const dash = (v: unknown) => (v === '' || v == null ? '-' : String(v))

  const toggleSort = (key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); return }
    if (sortDir === 'asc') { setSortDir('desc'); return }
    setSortKey(null); setSortDir('asc')
  }

  const sortIcon = (key: string) => {
    if (sortKey !== key) return <span className="ml-0.5 text-ash/40">↕</span>
    return <span className="ml-0.5 text-gilt">{sortDir === 'asc' ? '▲' : '▼'}</span>
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Filter by name, type, location…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-[180px] flex-1 rounded border border-ash/20 bg-crypt-300 px-3 py-2 text-sm text-ivory outline-none focus:border-gilt focus:ring-1 focus:ring-gilt/40"
        />
        <label className="flex items-center gap-2 font-ui text-sm text-ash">
          Per page
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded border border-ash/20 bg-crypt-300 px-2 py-1.5 text-sm text-ivory outline-none focus:border-gilt"
          >
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      {total === 0 ? (
        <div className="rounded-lg border border-ash/20 bg-crypt-400 p-8 text-center font-ui text-sm italic text-ash">
          {rows.length === 0 ? 'No entries in this category.' : 'No matches for filter.'}
        </div>
      ) : (
        <>
          <div className="overflow-auto rounded-lg border border-ash/20 bg-crypt-400">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-crypt-200 text-gilt">
                <tr>
                  <th className="w-[90px] px-3 py-2.5">Act</th>
                  {visibleCols.map((c) => (
                    <th key={c.key} className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className="flex items-center gap-0.5 text-left font-semibold text-gilt hover:text-gilt/80"
                        title={`Sort by ${c.label}`}
                      >
                        {c.label}{sortIcon(c.key)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slice.map(({ r, i }) => (
                  <tr
                    key={i}
                    className="border-t border-ash/10 text-ivory/90 odd:bg-crypt-400 even:bg-crypt-400/60 hover:bg-crypt-200/50"
                  >
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit(i)}
                          title="Edit"
                          aria-label="Edit entry"
                          className="inline-flex h-8 w-8 items-center justify-center rounded border border-gilt/40 bg-gilt/10 text-gilt hover:bg-gilt/25 focus:outline-none focus:ring-2 focus:ring-gilt/60"
                        ><Pencil className="h-4 w-4" aria-hidden="true" /></button>
                        <button
                          type="button"
                          onClick={() => onDelete(i)}
                          title="Delete"
                          aria-label="Delete entry"
                          className="inline-flex h-8 w-8 items-center justify-center rounded border border-ignis/40 bg-ignis/10 text-ignis hover:bg-ignis/25 focus:outline-none focus:ring-2 focus:ring-ignis/60"
                        ><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                      </div>
                    </td>
                    {visibleCols.map((c) => {
                      const text = dash(c.show(r))
                      const truncCls =
                        c.key === 'recipe' ? 'max-w-[240px] truncate' :
                        c.key === 'location' ? 'max-w-[180px] truncate' : ''
                      return (
                        <td
                          key={c.key}
                          className={`px-3 py-2.5 ${c.cellCls ?? ''} ${truncCls}`}
                          title={truncCls ? text : undefined}
                        >
                          {text}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 font-ui text-sm text-ash">
            <span>
              Showing {start + 1}–{Math.min(start + pageSize, total)} of {total}
              {query && ` (filtered from ${rows.length})`}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(0)}
                disabled={safePage === 0}
                aria-label="First page"
                className="inline-flex min-h-[32px] items-center gap-1 rounded border border-ash/30 px-3 py-1.5 hover:border-gilt hover:text-gilt disabled:opacity-30"
              ><ChevronsLeft className="h-4 w-4" aria-hidden="true" />First</button>
              <button
                onClick={() => setPage(safePage - 1)}
                disabled={safePage === 0}
                aria-label="Previous page"
                className="inline-flex min-h-[32px] items-center gap-1 rounded border border-ash/30 px-3 py-1.5 hover:border-gilt hover:text-gilt disabled:opacity-30"
              ><ChevronLeft className="h-4 w-4" aria-hidden="true" />Prev</button>
              <span className="px-2 text-ivory">
                {safePage + 1} / {pageCount}
              </span>
              <button
                onClick={() => setPage(safePage + 1)}
                disabled={safePage >= pageCount - 1}
                aria-label="Next page"
                className="inline-flex min-h-[32px] items-center gap-1 rounded border border-ash/30 px-3 py-1.5 hover:border-gilt hover:text-gilt disabled:opacity-30"
              >Next<ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
              <button
                onClick={() => setPage(pageCount - 1)}
                disabled={safePage >= pageCount - 1}
                aria-label="Last page"
                className="inline-flex min-h-[32px] items-center gap-1 rounded border border-ash/30 px-3 py-1.5 hover:border-gilt hover:text-gilt disabled:opacity-30"
              >Last<ChevronsRight className="h-4 w-4" aria-hidden="true" /></button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
