import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router'
import type Fuse from 'fuse.js'
import { searchIndex, loadFullSearchIndex, getCachedFullSearchIndex, type SearchItem } from '@/lib/searchIndex'

export function SearchModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [index, setIndex] = useState<SearchItem[]>(() => getCachedFullSearchIndex() ?? searchIndex)
  const [fuse, setFuse] = useState<Fuse<SearchItem> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Debounce query → debouncedQuery
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 120)
    return () => clearTimeout(t)
  }, [query])

  // On first modal open, lazy-load Fuse + full index
  useEffect(() => {
    if (!isOpen || fuse) return
    let alive = true
    Promise.all([
      import('fuse.js').then((m) => m.default),
      loadFullSearchIndex(),
    ]).then(([FuseCtor, full]) => {
      if (!alive) return
      setIndex(full)
      setFuse(new FuseCtor(full, { keys: ['title', 'category'], threshold: 0.4 }))
    })
    return () => { alive = false }
  }, [isOpen, fuse])

  const results = useMemo(() => {
    if (!debouncedQuery) return index.slice(0, 8)
    if (!fuse) {
      const q = debouncedQuery.toLowerCase()
      return index.filter((i) => i.title.toLowerCase().includes(q)).slice(0, 10)
    }
    return fuse.search(debouncedQuery, { limit: 10 }).map((r) => r.item)
  }, [debouncedQuery, fuse, index])

  useEffect(() => {
    function handleOpen() {
      setIsOpen(true)
      setQuery('')
      setDebouncedQuery('')
      setSelectedIndex(0)
    }

    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        handleOpen()
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('open-search', handleOpen)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('open-search', handleOpen)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  // Focus trap — keep Tab within the modal
  useEffect(() => {
    if (!isOpen) return
    function trapFocus(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const modal = modalRef.current
      if (!modal) return
      const focusable = modal.querySelectorAll<HTMLElement>('input, button, [tabindex]:not([tabindex="-1"])')
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', trapFocus)
    return () => document.removeEventListener('keydown', trapFocus)
  }, [isOpen])

  function handleNavigate(path: string) {
    setIsOpen(false)
    navigate(path)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleNavigate(results[selectedIndex].path)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 pt-[15vh] backdrop-blur-sm"
      onClick={() => setIsOpen(false)}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="w-full max-w-lg overflow-hidden rounded-xl border border-parchment-300 bg-parchment-50 shadow-2xl dark:border-ash/20 dark:bg-ink"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center border-b border-parchment-200 px-4 dark:border-ash/10">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ash">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Search pages..."
            className="w-full bg-transparent px-3 py-4 font-ui text-sm text-parchment-900 outline-none placeholder:text-ash dark:text-ivory dark:placeholder:text-ash"
          />
          <kbd className="rounded bg-parchment-200 px-1.5 py-0.5 font-ui text-xs text-ash dark:bg-obsidian dark:text-ash">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ash">
              No results found
            </div>
          ) : (
            results.map((item, i) => (
              <button
                key={item.path + '|' + item.title}
                onClick={() => handleNavigate(item.path)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  i === selectedIndex
                    ? 'bg-gilt/10 text-gilt dark:bg-gilt/10 dark:text-gilt'
                    : 'text-parchment-700 hover:bg-parchment-200 dark:text-ivory/80 dark:hover:bg-obsidian'
                }`}
              >
                <span className="flex-1 font-medium">{item.title}</span>
                <span className="rounded bg-parchment-200 px-2 py-0.5 font-ui text-xs text-ash dark:bg-obsidian dark:text-ash">
                  {item.category}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
