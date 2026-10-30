import { useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  /** Names offered while typing. */
  suggestions: readonly string[]
  /** Allow tags that are not in the suggestions (e.g. Uses). Classes only allow known names. */
  allowCustom?: boolean
  placeholder?: string
}

/**
 * Tag box: type a name, press Enter (or comma) to add it, keep typing to add more.
 * Backspace on an empty box removes the last tag. Suggestions appear as you type.
 */
export function TagInput({ value, onChange, suggestions, allowCustom = false, placeholder }: Props) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [note, setNote] = useState('')
  const [navigated, setNavigated] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const taken = useMemo(() => new Set(value.map((v) => v.toLowerCase())), [value])
  const matches = useMemo(() => {
    const q = text.trim().toLowerCase()
    return suggestions
      .filter((s) => !taken.has(s.toLowerCase()) && (q === '' || s.toLowerCase().includes(q)))
      .sort((a, b) => {
        const aw = a.toLowerCase().startsWith(q) ? 0 : 1
        const bw = b.toLowerCase().startsWith(q) ? 0 : 1
        return aw - bw || a.localeCompare(b)
      })
      .slice(0, 8)
  }, [suggestions, taken, text])

  const add = (raw: string) => {
    const t = raw.trim()
    if (!t) return
    const known = suggestions.find((s) => s.toLowerCase() === t.toLowerCase())
    const finalName = known ?? t
    if (!known && !allowCustom) {
      setNote(`"${t}" is not in the list.`)
      return
    }
    setNote('')
    if (!taken.has(finalName.toLowerCase())) onChange([...value, finalName])
    setText('')
    setActive(0)
    setNavigated(false)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (text.trim() === '') return
      // Arrow keys + Enter picks the highlighted suggestion. Otherwise Enter adds what was typed
      // (any text if custom tags are allowed, otherwise the best matching suggestion).
      const pick = matches[active]
      if (navigated && pick) add(pick)
      else if (allowCustom) add(text)
      else add(pick ?? text)
    } else if (e.key === 'Backspace' && text === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault(); setOpen(true); setNavigated(true); setActive((a) => Math.min(a + 1, Math.max(matches.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setNavigated(true); setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <div
        className="flex min-h-[38px] flex-wrap items-center gap-1 rounded border border-ash/20 bg-crypt-300 px-1.5 py-1 focus-within:border-gilt focus-within:ring-1 focus-within:ring-gilt/40"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded bg-gilt/20 px-2 py-0.5 font-ui text-xs font-semibold text-gilt">
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={(e) => { e.stopPropagation(); onChange(value.filter((v) => v !== tag)) }}
              className="text-gilt/70 hover:text-ivory"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => { setText(e.target.value); setOpen(true); setActive(0); setNavigated(false); setNote('') }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder={value.length === 0 ? placeholder : ''}
          className="min-w-[8ch] flex-1 bg-transparent px-1 py-1 text-sm text-ivory outline-none placeholder:text-ash/60"
        />
      </div>
      {note && <p className="mt-1 font-ui text-[11px] text-ignis">{note}</p>}
      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded border border-ash/30 bg-crypt-400 py-1 shadow-xl">
          {matches.map((m, i) => (
            <li key={m}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); add(m); inputRef.current?.focus() }}
                className={`block w-full px-3 py-1.5 text-left font-ui text-sm ${i === active ? 'bg-gilt/20 text-gilt' : 'text-ivory hover:bg-crypt-300'}`}
              >
                {m}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
