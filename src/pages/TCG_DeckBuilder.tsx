import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  ArrowDownUp,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileUp,
  Hand,
  Shuffle,
  Trash2,
  Upload,
  Wand2,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { CardArt, CardFacts, CardFilterBar } from '@/components/tcg/TcgCard'
import { HypergeometricCalculator } from '@/components/tcg/HypergeometricCalculator'
import {
  CARDS,
  ELEMENTS,
  TYPES,
  cardBySlug,
  chip,
  chipActive,
  chipIdle,
  galleryLink,
  panelClass,
  rarityColor,
  selectClass,
  useCardFilters,
  type Card,
  type Element,
  type SortKey,
} from '@/lib/tcg'
import {
  CURVE_MAX,
  DECK_SIZE,
  HAND_SIZE,
  MAX_COPIES,
  capCopies,
  checkLegality,
  countCopies,
  deckListText,
  deckStats,
  decodeDeck,
  parseImport,
  randomDeck,
  shareUrl,
  shuffle,
  sortDeck,
  type Deck,
} from '@/lib/tcg-deck'

const STORAGE_KEY = 'unora-tcg-deck-v1'

interface SavedDeck {
  name: string
  deck: Deck
}

function loadSaved(): SavedDeck {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SavedDeck>
      return {
        name: typeof parsed.name === 'string' ? parsed.name : '',
        deck: Array.isArray(parsed.deck) ? capCopies(parsed.deck.filter((s) => typeof s === 'string' && cardBySlug(s))).deck : [],
      }
    }
  } catch {
    // Storage blocked or corrupt: start empty.
  }
  return { name: '', deck: [] }
}

const iconButton = `${chip} ${chipIdle} inline-flex items-center gap-1.5`

// ── Small building blocks ────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    ref.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        className={`${panelClass} max-h-[90vh] w-full max-w-3xl overflow-y-auto outline-none`}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="m-0 font-heading text-xl font-semibold text-gilt">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className={`${chip} ${chipIdle} px-2`}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt('Copy this:', text)
    }
  }
  return (
    <button type="button" onClick={copy} className={iconButton}>
      {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : label}
    </button>
  )
}

/** A card the player can click, with an optional copy-count badge. `maxed` dims a card already at the copy limit. */
function CardButton({
  card,
  onClick,
  label,
  badge,
  maxed = false,
}: {
  card: Card
  onClick: () => void
  label: string
  badge?: ReactNode
  maxed?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`relative block rounded-[3px] p-0.5 transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-gilt ${
        maxed ? 'cursor-not-allowed bg-transparent opacity-50 hover:translate-y-0' : 'bg-transparent hover:bg-gilt/60'
      }`}
    >
      <CardArt card={card} scale={1} />
      {badge !== undefined && (
        <span
          className={`absolute -right-1.5 -top-1.5 min-w-6 rounded-full border px-1.5 text-center font-ui text-xs font-semibold leading-5 shadow ${
            maxed ? 'border-ash bg-obsidian text-ivory' : 'border-gilt bg-obsidian text-gilt'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

// ── Panels ───────────────────────────────────────────────────────────────────

interface LastAction {
  slug: string
  /** 'limit' means the player tried to add a copy past MAX_COPIES */
  action: 'added' | 'removed' | 'limit'
}

function LastCardPanel({ last, copies }: { last: LastAction | null; copies: number }) {
  if (!last) {
    return (
      <div className={`${panelClass} font-ui text-sm text-parchment-600 dark:text-ash`}>
        Click a card in the card list to add it to your deck, or a card in your deck to remove it. The last
        card you clicked shows here; select it to open it in the Card Gallery.
      </div>
    )
  }
  const card = cardBySlug(last.slug)
  if (!card) return null
  return (
    <Link
      to={galleryLink(card.slug)}
      className={`${panelClass} group flex gap-4 no-underline transition-colors hover:border-gilt dark:hover:border-gilt`}
      aria-label={`${card.name}: open in the Card Gallery`}
    >
      <CardArt card={card} scale={1} eager />
      <div className="min-w-0 flex-1">
        <p
          className={`m-0 font-ui text-xs font-semibold uppercase tracking-wider ${
            last.action === 'added' ? 'text-verdant' : last.action === 'removed' ? 'text-ignis' : 'text-gilt'
          }`}
        >
          {last.action === 'limit'
            ? `Not added · already ${copies} in deck (max ${MAX_COPIES})`
            : `${last.action === 'added' ? 'Added' : 'Removed'} · ${copies} in deck`}
        </p>
        <h2 className="m-0 font-heading text-lg font-semibold leading-tight text-gilt">{card.name}</h2>
        <p className="mb-2 mt-0.5 font-subtitle text-sm" style={{ color: rarityColor(card.rarity) }}>
          <span className="rounded bg-obsidian/80 px-1.5 py-0.5">{card.rarity}</span>
        </p>
        <CardFacts card={card} compact />
        <p className="mb-0 mt-2 inline-flex items-center gap-1 font-ui text-xs text-astral group-hover:underline dark:text-[#9C86E8]">
          Open in Card Gallery <ExternalLink size={12} />
        </p>
      </div>
    </Link>
  )
}

function DeckStats({ deck }: { deck: Deck }) {
  const stats = useMemo(() => deckStats(deck), [deck])
  const peak = Math.max(1, ...stats.curve)
  return (
    <div className="grid gap-4 font-ui text-xs sm:grid-cols-3">
      <div>
        <h3 className="mb-1 font-ui text-xs font-semibold uppercase tracking-wider text-parchment-600 dark:text-ash">Card types</h3>
        <ul className="m-0 list-none space-y-0.5 p-0">
          {TYPES.map((t) => (
            <li key={t} className="flex justify-between gap-2">
              <span>{t}s</span>
              <span className="font-semibold">{stats.byType[t]}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-1 font-ui text-xs font-semibold uppercase tracking-wider text-parchment-600 dark:text-ash">Elements</h3>
        <ul className="m-0 list-none space-y-0.5 p-0">
          {ELEMENTS.filter((e) => stats.byElement[e.key]).map((e) => (
            <li key={e.key} className="flex justify-between gap-2">
              <span style={{ color: e.color }}>{e.label}</span>
              <span className="font-semibold">{stats.byElement[e.key]}</span>
            </li>
          ))}
          {deck.length === 0 && <li className="text-ash">None yet</li>}
        </ul>
        <p className="mb-0 mt-2">
          Craft cost: <span className="font-semibold">{stats.dust.toLocaleString()} Dust</span>
          {stats.uncraftable > 0 && <span className="text-ash"> + {stats.uncraftable} uncraftable</span>}
        </p>
      </div>
      <div>
        <h3 className="mb-1 font-ui text-xs font-semibold uppercase tracking-wider text-parchment-600 dark:text-ash">
          Mana curve <span className="normal-case tracking-normal text-ash">(avg {stats.averageCost.toFixed(1)})</span>
        </h3>
        <div className="flex h-20 items-end gap-1" role="img" aria-label={`Mana curve: ${stats.curve.map((n, i) => `${n} at ${i}${i === CURVE_MAX ? '+' : ''}`).join(', ')}`}>
          {stats.curve.map((n, i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-0.5">
              <span className="text-[10px] leading-none text-ash">{n || ''}</span>
              <div className="w-full rounded-t-sm bg-gilt/70" style={{ height: `${(n / peak) * 52}px` }} />
              <span className="text-[10px] leading-none">{i === CURVE_MAX ? `${CURVE_MAX}+` : i}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Dialog = 'import' | 'export' | 'hand' | null
type DeckView = 'grouped' | 'individual'

export function TCGDeckBuilder() {
  const [params, setParams] = useSearchParams()
  const [initial] = useState(() => {
    // A shared link (?deck=...&name=...) wins over the deck saved in this browser.
    const shared = params.get('deck')
    const deck = shared ? decodeDeck(shared) : null
    return deck ? { name: params.get('name') ?? '', deck, fromLink: true } : { ...loadSaved(), fromLink: false }
  })
  const [name, setName] = useState(initial.name)
  const [deck, setDeck] = useState<Deck>(initial.deck)
  const [last, setLast] = useState<LastAction | null>(null)
  const [elements, setElements] = useState<Element[]>(ELEMENTS.map((e) => e.key))
  const [view, setView] = useState<DeckView>('grouped')
  const [dialog, setDialog] = useState<Dialog>(null)
  const filters = useCardFilters(elements)

  // Drop the share params once loaded, so later edits aren't overwritten on reload.
  useEffect(() => {
    if (initial.fromLink) setParams({}, { replace: true })
  }, [initial.fromLink, setParams])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, deck } satisfies SavedDeck))
    } catch {
      // Private mode or storage full: the deck still works for this visit.
    }
  }, [name, deck])

  const counts = useMemo(() => countCopies(deck), [deck])
  const legality = useMemo(() => checkLegality(deck), [deck])

  function add(card: Card) {
    if ((counts.get(card.slug) ?? 0) >= MAX_COPIES) {
      setLast({ slug: card.slug, action: 'limit' })
      return
    }
    // Re-check inside the update in case of rapid clicks before a re-render.
    setDeck((d) => (d.filter((s) => s === card.slug).length >= MAX_COPIES ? d : [...d, card.slug]))
    setLast({ slug: card.slug, action: 'added' })
  }

  function removeAt(index: number) {
    const slug = deck[index]
    setDeck((d) => d.filter((_, i) => i !== index))
    setLast({ slug, action: 'removed' })
  }

  function removeOne(slug: string) {
    removeAt(deck.lastIndexOf(slug))
  }

  function replaceDeck(next: Deck, nextName?: string) {
    setDeck(next)
    if (nextName !== undefined) setName(nextName)
    setLast(null)
  }

  function clear() {
    if (deck.length === 0 || window.confirm(`Remove all ${deck.length} cards from this deck?`)) replaceDeck([])
  }

  function randomize() {
    if (deck.length === 0 || window.confirm('Replace your current deck with a random one?')) replaceDeck(randomDeck())
  }

  const grouped = useMemo(() => {
    const seen = new Set<string>()
    return deck.filter((s) => !seen.has(s) && seen.add(s))
  }, [deck])

  const statusClass = legality.legal
    ? 'border-verdant/60 bg-verdant/15 text-verdant'
    : 'border-gilt/50 bg-gilt/10 text-parchment-800 dark:text-gilt'

  return (
    <div>
      <PageHeader
        title="Deck Builder"
        description={`Build an Unora Card Battle TCG deck. Legal decks have exactly ${DECK_SIZE} cards with at most ${MAX_COPIES} copies of each, and you can't add more than ${MAX_COPIES} of a card, but you can go past ${DECK_SIZE} cards and cut down from there.`}
        accent="astral"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Unora Card Battle TCG', to: '/tcg' },
          { label: 'Deck Builder' },
        ]}
      />

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Deck name"
          aria-label="Deck name"
          maxLength={60}
          className={`${selectClass} min-w-48 flex-1 basis-56 font-heading`}
        />
        <button type="button" onClick={() => setDialog('import')} className={iconButton}>
          <Upload size={14} /> Import
        </button>
        <button type="button" onClick={() => setDialog('export')} disabled={deck.length === 0} className={iconButton}>
          <Download size={14} /> Export
        </button>
        <label className="inline-flex items-center gap-1.5">
          <ArrowDownUp size={14} className="text-ash" aria-hidden="true" />
          <select
            aria-label="Sort deck"
            value=""
            disabled={deck.length === 0}
            onChange={(e) => e.target.value && setDeck((d) => sortDeck(d, e.target.value as SortKey | 'type'))}
            className={selectClass}
          >
            <option value="">Sort deck…</option>
            <option value="cost">By element &amp; cost</option>
            <option value="mana">By mana cost</option>
            <option value="type">By card type</option>
            <option value="name">By name</option>
            <option value="rarity">By rarity</option>
          </select>
        </label>
        <button type="button" onClick={() => setDeck((d) => shuffle(d))} disabled={deck.length < 2} className={iconButton}>
          <Shuffle size={14} /> Shuffle
        </button>
        <button type="button" onClick={() => setDialog('hand')} disabled={deck.length === 0} className={iconButton}>
          <Hand size={14} /> Draw hand
        </button>
        <button type="button" onClick={randomize} className={iconButton}>
          <Wand2 size={14} /> Randomize
        </button>
        <button type="button" onClick={clear} disabled={deck.length === 0} className={iconButton}>
          <Trash2 size={14} /> Clear
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start xl:grid-cols-[minmax(0,1fr)_460px]">
        {/* Last clicked card */}
        <section className="order-1 lg:col-start-2 lg:row-start-1" aria-label="Last clicked card" aria-live="polite">
          <LastCardPanel last={last} copies={last ? counts.get(last.slug) ?? 0 : 0} />
        </section>

        {/* Deck */}
        <section className={`${panelClass} order-2 lg:col-start-1 lg:row-span-2 lg:row-start-1`} aria-label="Your deck">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="m-0 font-heading text-xl font-semibold text-gilt">
              Main Deck{' '}
              <span className={`font-ui text-base ${deck.length === DECK_SIZE ? 'text-verdant' : 'text-parchment-700 dark:text-ivory/80'}`}>
                {deck.length} / {DECK_SIZE}
              </span>
            </h2>
            <div className="flex gap-1.5" role="group" aria-label="Deck view">
              {(['grouped', 'individual'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  className={`${chip} px-2 py-0.5 text-xs capitalize ${view === v ? chipActive : chipIdle}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className={`mb-4 rounded-md border px-3 py-2 font-ui text-sm ${statusClass}`}>
            {legality.legal ? (
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <Check size={15} /> Legal for play
              </span>
            ) : (
              <>
                <span className="font-semibold">Not legal for play yet</span>
                <ul className="mb-0 mt-1 list-disc space-y-0.5 pl-5 text-xs">
                  {legality.problems.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </>
            )}
          </div>

          <div className="mb-5 border-b border-parchment-300 pb-4 dark:border-ash/10">
            <DeckStats deck={deck} />
          </div>

          {deck.length === 0 ? (
            <p className="py-12 text-center font-ui text-sm text-ash">
              Your deck is empty. Click cards in the card list to add them, or use Import or Randomize.
            </p>
          ) : (
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(128px,1fr))] justify-items-center gap-3 p-0">
              {view === 'grouped'
                ? grouped.map((slug) => {
                    const card = cardBySlug(slug)
                    if (!card) return null
                    const n = counts.get(slug) ?? 0
                    return (
                      <li key={slug}>
                        <CardButton
                          card={card}
                          onClick={() => removeOne(slug)}
                          label={`Remove one ${card.name} (${n} in deck)`}
                          badge={`×${n}`}
                        />
                      </li>
                    )
                  })
                : deck.map((slug, i) => {
                    const card = cardBySlug(slug)
                    if (!card) return null
                    return (
                      <li key={`${slug}-${i}`}>
                        <CardButton
                          card={card}
                          onClick={() => removeAt(i)}
                          label={`Remove ${card.name}`}
                        />
                      </li>
                    )
                  })}
            </ul>
          )}
        </section>

        {/* Card list */}
        <section className={`${panelClass} order-3 lg:col-start-2 lg:row-start-2`} aria-label="Card list">
          <h2 className="mb-3 mt-0 font-heading text-xl font-semibold text-gilt">Card List</h2>
          <CardFilterBar elements={elements} onElements={setElements} filters={filters} compact />
          <p className="mb-2 font-ui text-xs text-ash">
            {filters.filtered.length} of {CARDS.length} cards · click to add (up to {MAX_COPIES} of each)
          </p>
          <div className="max-h-[70vh] overflow-y-auto pr-1 pt-2">
            {filters.filtered.length === 0 ? (
              <p className="py-8 text-center font-ui text-sm text-ash">
                {elements.length === 0 ? 'No elements selected. Pick one or more elements above.' : 'No cards match these filters.'}
              </p>
            ) : (
              <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(128px,1fr))] justify-items-center gap-3 p-0">
                {filters.filtered.map((c) => {
                  const n = counts.get(c.slug) ?? 0
                  const maxed = n >= MAX_COPIES
                  return (
                    <li key={c.slug}>
                      <CardButton
                        card={c}
                        onClick={() => add(c)}
                        label={maxed ? `${c.name}: ${n} in deck, the maximum` : `Add ${c.name}${n ? ` (${n} in deck)` : ''}`}
                        badge={n ? (maxed ? `${n}/${MAX_COPIES}` : `×${n}`) : undefined}
                        maxed={maxed}
                      />
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      <HypergeometricCalculator deck={deck} />

      {dialog === 'import' && (
        <ImportDialog
          onClose={() => setDialog(null)}
          onImport={(next, nextName) => {
            replaceDeck(next, nextName)
            setDialog(null)
          }}
        />
      )}
      {dialog === 'export' && <ExportDialog deck={deck} name={name} onClose={() => setDialog(null)} />}
      {dialog === 'hand' && <HandDialog deck={deck} onClose={() => setDialog(null)} />}
    </div>
  )
}

// ── Dialogs ──────────────────────────────────────────────────────────────────

function ImportDialog({ onClose, onImport }: { onClose: () => void; onImport: (deck: Deck, name?: string) => void }) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit() {
    const result = parseImport(text)
    if (!result || result.deck.length === 0) {
      setError(result?.unknown.length ? `No cards recognised. Unknown: ${result.unknown.join(', ')}` : 'Nothing to import. Paste a share link or a deck list.')
      return
    }
    const notes = [
      result.unknown.length ? `These lines weren't recognised and will be skipped:\n${result.unknown.join('\n')}` : '',
      result.trimmed.length ? `Decks can hold at most ${MAX_COPIES} copies of a card, so these will be cut down to ${MAX_COPIES}:\n${result.trimmed.join('\n')}` : '',
    ].filter(Boolean)
    if (notes.length && !window.confirm(`${notes.join('\n\n')}\n\nImport the rest?`)) return
    onImport(result.deck, result.name)
  }

  async function readFile(file: File) {
    setText(await file.text())
    setError(null)
  }

  return (
    <Modal title="Import deck" onClose={onClose}>
      <p className="mt-0 font-ui text-sm text-parchment-700 dark:text-ivory/70">
        Paste a share link or a deck list (one card per line, like <code>3x Ancient Draco</code>), or load a
        <code> .txt</code> deck file. This replaces your current deck.
      </p>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setError(null)
        }}
        rows={10}
        aria-label="Share link or deck list"
        className={`${selectClass} w-full font-mono text-xs`}
        placeholder={'# My Deck (40 cards)\n3x Ancient Draco\n2x Fireball\n...'}
      />
      {error && <p className="font-ui text-sm text-ignis">{error}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={submit} className={`${chip} ${chipActive} inline-flex items-center gap-1.5`}>
          <Upload size={14} /> Import
        </button>
        <label className={`${iconButton} cursor-pointer`}>
          <FileUp size={14} /> Load file
          <input type="file" accept=".txt,text/plain" className="sr-only" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
        </label>
      </div>
    </Modal>
  )
}

function ExportDialog({ deck, name, onClose }: { deck: Deck; name: string; onClose: () => void }) {
  const link = shareUrl(deck, name)
  const list = deckListText(deck, name)
  const fileName = `${(name.trim() || 'unora-deck').replace(/[^\w-]+/g, '_')}.txt`

  function download() {
    const url = URL.createObjectURL(new Blob([list], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Modal title="Export deck" onClose={onClose}>
      <h3 className="mb-1 mt-0 font-ui text-sm font-semibold">Share link</h3>
      <p className="mt-0 font-ui text-xs text-ash">Anyone who opens this link gets a copy of this deck in their builder.</p>
      <div className="mb-5 flex gap-2">
        <input readOnly value={link} aria-label="Share link" onFocus={(e) => e.target.select()} className={`${selectClass} min-w-0 flex-1 font-mono text-xs`} />
        <CopyButton text={link} label="Copy link" />
      </div>
      <h3 className="mb-1 mt-0 font-ui text-sm font-semibold">Deck list</h3>
      <textarea readOnly value={list} rows={12} aria-label="Deck list" className={`${selectClass} w-full font-mono text-xs`} />
      <div className="mt-2 flex flex-wrap gap-2">
        <CopyButton text={list} label="Copy list" />
        <button type="button" onClick={download} className={iconButton}>
          <Download size={14} /> Download .txt
        </button>
      </div>
    </Modal>
  )
}

function HandDialog({ deck, onClose }: { deck: Deck; onClose: () => void }) {
  const draw = () => shuffle(deck).slice(0, HAND_SIZE)
  const [hand, setHand] = useState(draw)
  return (
    <Modal title="Opening hand" onClose={onClose}>
      <p className="mt-0 font-ui text-sm text-parchment-700 dark:text-ivory/70">
        A random {Math.min(HAND_SIZE, deck.length)}-card opening hand from your {deck.length}-card deck. Each player starts with {HAND_SIZE} cards
        and may mulligan once.
      </p>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(124px,1fr))] justify-items-center gap-3 p-0">
        {hand.map((slug, i) => {
          const card = cardBySlug(slug)
          return card ? (
            <li key={`${slug}-${i}`} title={card.name}>
              <CardArt card={card} scale={1} eager />
            </li>
          ) : null
        })}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3 font-ui text-xs text-ash">
        <button type="button" onClick={() => setHand(draw())} className={`${chip} ${chipActive} inline-flex items-center gap-1.5`}>
          <Shuffle size={14} /> Draw again
        </button>
        <span>
          {TYPES.map((t) => `${hand.filter((s) => cardBySlug(s)?.type === t).length} ${t}`).join(' · ')}
        </span>
      </div>
    </Modal>
  )
}
