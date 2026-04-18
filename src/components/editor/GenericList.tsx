import { useEffect, useMemo, useState } from 'react'
import { Pencil, Trash2, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react'
import type { GenericRow, GenericTabSchema } from '@/types/editor'

interface Props {
  schema: GenericTabSchema
  rows: GenericRow[]
  onEdit: (index: number) => void
  onDelete: (index: number) => void
}

const PAGE_SIZES = [25, 50, 100, 250]
type SortDir = 'asc' | 'desc'

export function GenericList({ schema, rows, onEdit, onDelete }: Props) {
  const [query, setQuery] = useState('')
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(0)
  const [sortKey, setSortKey] = useState<string | null>(schema.nameKey)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  useEffect(() => { setPage(0); setQuery(''); setSortKey(schema.nameKey); setSortDir('asc') }, [schema.tab, schema.nameKey])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const indexed = rows.map((r, i) => ({ r, i }))
    if (!q) return indexed
    return indexed.filter(({ r }) => schema.headers.some((h) => (r[h] ?? '').toLowerCase().includes(q)))
  }, [rows, query, schema.headers])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    const key = sortKey
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = a.r[key] ?? ''
      const bv = b.r[key] ?? ''
      const an = Number(av)
      const bn = Number(bv)
      if (!Number.isNaN(an) && !Number.isNaN(bn) && av !== '' && bv !== '') return dir * (an - bn)
      return dir * String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' })
    })
  }, [filtered, sortKey, sortDir])

  useEffect(() => { setPage(0) }, [query, pageSize, sortKey, sortDir])

  const total = sorted.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const start = safePage * pageSize
  const slice = sorted.slice(start, start + pageSize)

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
          placeholder={`Filter ${schema.label}…`}
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
                  {schema.headers.map((h) => (
                    <th key={h} className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => toggleSort(h)}
                        className="flex items-center gap-0.5 text-left font-semibold text-gilt hover:text-gilt/80"
                        title={`Sort by ${h}`}
                      >
                        {h}{sortIcon(h)}
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
                    {schema.headers.map((h) => {
                      const text = r[h] ?? ''
                      const isName = h === schema.nameKey
                      const isLong = text.length > 40
                      return (
                        <td
                          key={h}
                          className={`px-3 py-2.5 ${isName ? 'font-semibold text-gilt' : ''} ${isLong ? 'max-w-[320px] truncate' : ''}`}
                          title={isLong ? text : undefined}
                        >
                          {text || '-'}
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
              <span className="px-2 text-ivory">{safePage + 1} / {pageCount}</span>
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
