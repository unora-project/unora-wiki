import { memo, useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type Row,
} from '@tanstack/react-table'

interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T, any>[]
  searchPlaceholder?: string
  initialSorting?: SortingState
}

// Extracts the first numeric value from a string/number (e.g. "25 faith" -> 25,
// "Level 10" -> 10). Returns NaN if none found. Used so mixed text/number
// columns sort numerically instead of lexicographically.
function extractNumber(value: unknown): number {
  if (value == null) return NaN
  if (typeof value === 'number') return value
  const match = String(value).match(/-?\d+(?:\.\d+)?/)
  return match ? parseFloat(match[0]) : NaN
}

function smartSort<T>(rowA: Row<T>, rowB: Row<T>, columnId: string): number {
  const a = rowA.getValue(columnId)
  const b = rowB.getValue(columnId)
  const numA = extractNumber(a)
  const numB = extractNumber(b)
  const aIsNum = !Number.isNaN(numA)
  const bIsNum = !Number.isNaN(numB)
  if (aIsNum && bIsNum) return numA - numB
  // Nullish values sort last
  if (a == null || a === '' || a === '-') return 1
  if (b == null || b === '' || b === '-') return -1
  return String(a).localeCompare(String(b))
}

export function DataTable<T>({ data, columns, searchPlaceholder = 'Search...', initialSorting }: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? [])
  const [globalFilter, setGlobalFilter] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(
    window.innerWidth < 768 ? 'cards' : 'table'
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    defaultColumn: { sortingFn: smartSort as any },
    initialState: { pagination: { pageSize: 20 } },
  })

  return (
    <div>
      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder={searchPlaceholder}
          className="flex-1 rounded-lg border border-parchment-300 bg-parchment-50 px-4 py-2 font-ui text-sm text-parchment-900 outline-none transition-colors placeholder:text-ash focus:border-gilt focus:ring-2 focus:ring-gilt/20 dark:border-ash/20 dark:bg-obsidian dark:text-ivory dark:placeholder:text-ash dark:focus:border-gilt sm:max-w-xs"
        />
        {/* View toggle (visible on small screens) */}
        <div className="flex gap-1 rounded-lg border border-parchment-300 p-0.5 dark:border-ash/20 md:hidden">
          <button
            onClick={() => setViewMode('table')}
            className={`rounded-md px-2.5 py-1 font-ui text-xs font-medium transition-colors ${
              viewMode === 'table'
                ? 'border border-gilt bg-transparent text-gilt'
                : 'text-ash hover:text-gilt'
            }`}
          >
            Table
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`rounded-md px-2.5 py-1 font-ui text-xs font-medium transition-colors ${
              viewMode === 'cards'
                ? 'border border-gilt bg-transparent text-gilt'
                : 'text-ash hover:text-gilt'
            }`}
          >
            Cards
          </button>
        </div>
      </div>

      {/* Table View */}
      <div className={viewMode === 'table' ? 'block' : 'hidden md:block'}>
        <div className="overflow-x-auto rounded-lg dark:shadow-[0_0_20px_rgba(201,162,76,0.02)]">
          <table className="w-full text-left text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-ash/20">
                  {headerGroup.headers.map((header, idx) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={`cursor-pointer select-none px-3 py-2.5 font-heading text-xs font-semibold uppercase tracking-wider text-gilt transition-colors hover:text-gilt/80 ${
                        idx === 0 ? 'sticky left-0 z-10 bg-parchment-50 dark:bg-obsidian' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' && <span>↑</span>}
                        {header.column.getIsSorted() === 'desc' && <span>↓</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-ash">
                    No results found{globalFilter ? ` for "${globalFilter}"` : ''}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-ash/10 transition-colors hover:bg-parchment-100/50 dark:hover:bg-ink/40"
                  >
                    {row.getVisibleCells().map((cell, idx) => (
                      <td
                        key={cell.id}
                        className={`whitespace-nowrap px-3 py-2 text-sm ${
                          idx === 0
                            ? 'sticky left-0 z-10 bg-parchment-50 font-semibold text-gilt shadow-[2px_0_4px_rgba(0,0,0,0.04)] dark:bg-obsidian'
                            : 'text-parchment-800 dark:text-ivory/85'
                        }`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card View (mobile) */}
      <div className={viewMode === 'cards' ? 'block md:hidden' : 'hidden'}>
        {table.getRowModel().rows.length === 0 ? (
          <div className="rounded-lg border border-parchment-300 bg-parchment-100 px-4 py-12 text-center text-sm text-ash dark:border-ash/10 dark:bg-ink">
            No results found{globalFilter ? ` for "${globalFilter}"` : ''}
          </div>
        ) : (
          <div className="grid gap-3">
            {table.getRowModel().rows.map((row) => (
              <CardRow key={row.id} row={row} columns={columns} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between font-ui text-sm">
        <span className="text-ash">
          {table.getFilteredRowModel().rows.length} items
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded-md border border-transparent px-3 py-1.5 text-sm font-medium text-ash transition-colors hover:border-gilt hover:text-gilt disabled:opacity-40"
          >
            Prev
          </button>
          <span className="px-2 text-ash">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded-md border border-transparent px-3 py-1.5 text-sm font-medium text-ash transition-colors hover:border-gilt hover:text-gilt disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

const CardRow = memo(function CardRow({ row }: { row: any; columns: ColumnDef<any, any>[] }) {
  const cells = row.getVisibleCells()
  const name = cells[0]?.getValue() as string
  const statCells = useMemo(
    () =>
      cells.slice(1).filter((cell: any) => {
        const val = cell.getValue()
        return val && val !== '-' && val !== '0' && val !== 0
      }),
    [cells]
  )

  return (
    <div className="rounded-lg border border-parchment-300 bg-parchment-100 p-4 dark:border-ash/10 dark:bg-ink">
      <div className="font-heading text-sm font-semibold text-gilt">
        {name}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {statCells.slice(0, 8).map((cell: any) => (
          <span
            key={cell.id}
            className="inline-flex flex-col rounded border border-parchment-300 bg-parchment-50 px-2 py-0.5 dark:border-ash/10 dark:bg-obsidian"
          >
            <span className="font-ui text-[9px] font-semibold uppercase tracking-wider text-ash">
              {cell.column.columnDef.header as string}
            </span>
            <span className="text-xs font-semibold text-parchment-800 dark:text-ivory">
              {String(cell.getValue())}
            </span>
          </span>
        ))}
      </div>
      {statCells.length > 8 && (
        <details className="mt-2">
          <summary className="cursor-pointer font-ui text-xs font-medium text-gilt">
            +{statCells.length - 8} more stats
          </summary>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {statCells.slice(8).map((cell: any) => (
              <span
                key={cell.id}
                className="inline-flex flex-col rounded border border-parchment-300 bg-parchment-50 px-2 py-0.5 dark:border-ash/10 dark:bg-obsidian"
              >
                <span className="font-ui text-[9px] font-semibold uppercase tracking-wider text-ash">
                  {cell.column.columnDef.header as string}
                </span>
                <span className="text-xs font-semibold text-parchment-800 dark:text-ivory">
                  {String(cell.getValue())}
                </span>
              </span>
            ))}
          </div>
        </details>
      )}
    </div>
  )
})
