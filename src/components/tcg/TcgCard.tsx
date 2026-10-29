import type { CSSProperties, ReactNode } from 'react'
import { Search } from 'lucide-react'
import {
  CARD_H,
  CARD_W,
  ELEMENTS,
  FOIL_CSS,
  FOIL_FRAMES,
  FOIL_GRADIENT,
  FOIL_LOOP_S,
  FOIL_SPARKLES,
  IMAGE_BASE,
  KEYWORDS,
  MANA_COLORS,
  RARITIES,
  SPARKLE_FRAMES,
  TYPES,
  VARIANT_LABELS,
  chip,
  chipActive,
  chipIdle,
  elementInfo,
  selectClass,
  type Card,
  type CardFilterState,
  type CardType,
  type Element,
  type ManaElement,
  type Rarity,
  type SortKey,
  type Variant,
} from '@/lib/tcg'

const pixelated: CSSProperties = { imageRendering: 'pixelated' }

/** The foil keyframes; render once on any page that shows foil cards. */
export function FoilStyles() {
  return <style>{FOIL_CSS}</style>
}

function FoilLayer({ maskUrl }: { maskUrl: string }) {
  // Masked by the base layer so the tint stops at the card's rounded corners.
  const mask = `url("${maskUrl}")`
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ maskImage: mask, WebkitMaskImage: mask, maskSize: '100% 100%', WebkitMaskSize: '100% 100%' }}
    >
      <div className="tcg-foil-sweep absolute" style={{ left: -130, top: -80, width: 260, height: 260, background: FOIL_GRADIENT }} />
    </div>
  )
}

function FoilSparkles() {
  return (
    <>
      {FOIL_SPARKLES.flatMap(([x, y, peaks]) =>
        peaks.map((peak) => {
          const start = (peak - Math.floor(SPARKLE_FRAMES / 2) + FOIL_FRAMES) % FOIL_FRAMES
          const delay = `${((start / FOIL_FRAMES) * FOIL_LOOP_S).toFixed(3)}s`
          return (
            <div key={`${x}-${y}-${peak}`} className="pointer-events-none absolute">
              <div className="tcg-sparkle absolute" style={{ animationName: 'tcg-sparkle-arms', animationDelay: delay }}>
                <div className="absolute bg-white" style={{ left: x - 2, top: y, width: 6, height: 2 }} />
                <div className="absolute bg-white" style={{ left: x, top: y - 2, width: 2, height: 6 }} />
              </div>
              <div
                className="tcg-sparkle absolute bg-white"
                style={{ left: x, top: y, width: 2, height: 2, animationName: 'tcg-sparkle-centre', animationDelay: delay }}
              />
            </div>
          )
        }),
      )}
    </>
  )
}

interface CardArtProps {
  card: Card
  variant?: Variant
  scale: number
  foil?: boolean
  eager?: boolean
}

/** One card drawn at its native 120x168 and scaled by an integer factor. */
export function CardArt({ card, variant = 'normal', scale, foil = false, eager = false }: CardArtProps) {
  const base = `${IMAGE_BASE}${card.slug}_${variant}_base.png`
  const text = `${IMAGE_BASE}${card.slug}_${variant}_text.png`
  const loading = eager ? 'eager' : 'lazy'
  return (
    <div className="relative shrink-0 overflow-hidden" style={{ width: CARD_W * scale, height: CARD_H * scale }}>
      <div
        className="absolute left-0 top-0"
        style={{ width: CARD_W, height: CARD_H, transform: `scale(${scale})`, transformOrigin: '0 0' }}
      >
        <img src={base} alt={card.name} width={CARD_W} height={CARD_H} loading={loading} decoding="async" className="absolute inset-0" style={pixelated} />
        {foil && <FoilLayer maskUrl={base} />}
        <img src={text} alt="" width={CARD_W} height={CARD_H} loading={loading} decoding="async" className="absolute inset-0" style={pixelated} />
        {foil && <FoilSparkles />}
      </div>
    </div>
  )
}

export function ManaCost({ cost }: { cost: Card['cost'] }) {
  const squares = Object.entries(cost).flatMap(([color, n]) =>
    color === 'generic' ? [] : Array.from({ length: n ?? 0 }, () => color as ManaElement),
  )
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      {(cost.generic || squares.length === 0) && (
        <span className="font-ui font-semibold">{cost.generic ?? 0}</span>
      )}
      {squares.map((color, i) => (
        <span
          key={i}
          title={elementInfo(color).label}
          className="inline-block h-3 w-3 rounded-[2px] ring-1 ring-black/30"
          style={{ background: MANA_COLORS[color] }}
        />
      ))}
    </span>
  )
}

const KEYWORD_RE = new RegExp(`\\b(${[...KEYWORDS].sort((a, b) => b.length - a.length).join('|')})\\b`, 'g')

/** Rules text with keywords underlined, like the cards. */
export function RulesText({ text }: { text: string }) {
  if (!text) return <span className="italic text-ash">No rules text</span>
  const parts: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(KEYWORD_RE)) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push(
      <span key={m.index} className="underline decoration-1 underline-offset-2">
        {m[0]}
      </span>,
    )
    last = m.index + m[0].length
  }
  parts.push(text.slice(last))
  return <>{parts}</>
}

/** Element, mana, type, rules text, power/toughness, craft cost and versions as a definition list. */
export function CardFacts({ card, compact = false }: { card: Card; compact?: boolean }) {
  const el = elementInfo(card.element)
  const rows: [string, ReactNode][] = [
    ['Element', <span style={{ color: el.color }} className="font-semibold">{el.label}</span>],
    ['Mana cost', <ManaCost cost={card.cost} />],
    ['Type', card.type],
    ['Text', <RulesText text={card.text} />],
  ]
  if (card.power !== undefined) rows.push([compact ? 'P / T' : 'Power / Toughness', `${card.power} / ${card.toughness}`])
  rows.push(['Craft cost', card.craft === null ? "Can't be crafted" : `${card.craft} Dust`])
  if (!compact) {
    rows.push(['Versions', card.variants.filter((v) => v !== 'full_notext').map((v) => VARIANT_LABELS[v]).join(', ')])
  }
  return (
    <dl className={`m-0 grid grid-cols-[auto_1fr] font-ui ${compact ? 'gap-x-3 gap-y-1 text-xs' : 'gap-x-4 gap-y-2 text-sm'}`}>
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-parchment-600 dark:text-ash">{label}</dt>
          <dd className="m-0 text-parchment-900 dark:text-ivory">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

type ElementFilterProps =
  /** One element at a time (Card Gallery): picking a tab replaces the selection. */
  | { element: Element | null; onElement: (e: Element | null) => void; elements?: never; onElements?: never }
  /** Toggles (Deck Builder): each element switches on or off; "All" switches all five together. */
  | { elements: readonly Element[]; onElements: (e: Element[]) => void; element?: never; onElement?: never }

type CardFilterBarProps = ElementFilterProps & {
  filters: CardFilterState
  compact?: boolean
}

/** Element tabs (as in the Card Binder), search, and type / rarity / sort menus. */
export function CardFilterBar({ filters, compact = false, ...elementProps }: CardFilterBarProps) {
  const { query, setQuery, type, setType, rarity, setRarity, sort, setSort } = filters
  const tabClass = compact ? 'px-2 py-0.5 text-xs' : ''
  const multi = elementProps.elements !== undefined
  const allKeys = ELEMENTS.map((e) => e.key)

  function isActive(key: Element | null) {
    if (elementProps.elements === undefined) return elementProps.element === key
    return key === null ? elementProps.elements.length === allKeys.length : elementProps.elements.includes(key)
  }

  function onClick(key: Element | null) {
    if (elementProps.elements === undefined) return elementProps.onElement(key)
    const current = elementProps.elements
    if (key === null) return elementProps.onElements(current.length === allKeys.length ? [] : allKeys)
    elementProps.onElements(current.includes(key) ? current.filter((k) => k !== key) : allKeys.filter((k) => k === key || current.includes(k)))
  }

  return (
    <div className={compact ? 'mb-3' : 'mb-5'}>
      <div className="mb-3 flex flex-wrap gap-1.5" role={multi ? 'group' : 'tablist'} aria-label={multi ? 'Elements to show' : 'Element'}>
        {[{ key: null, label: 'All', color: '' }, ...ELEMENTS].map((e) => {
          const active = isActive(e.key)
          return (
            <button
              key={e.label}
              type="button"
              {...(multi ? { 'aria-pressed': active } : { role: 'tab', 'aria-selected': active })}
              onClick={() => onClick(e.key)}
              className={`${chip} ${tabClass} ${active ? chipActive : chipIdle}`}
              style={active && e.color ? { borderColor: e.color, color: e.color } : undefined}
            >
              {e.label}
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex-1 basis-56">
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ash" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search names and rules text..."
            aria-label="Search cards"
            className={`${selectClass} w-full pl-8`}
          />
        </label>
        <select aria-label="Card type" value={type} onChange={(e) => setType(e.target.value as CardType | '')} className={selectClass}>
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select aria-label="Rarity" value={rarity} onChange={(e) => setRarity(e.target.value as Rarity | '')} className={selectClass}>
          <option value="">All rarities</option>
          {RARITIES.map((r) => <option key={r.key} value={r.key}>{r.key}</option>)}
        </select>
        <select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={selectClass}>
          <option value="cost">Sort: Element &amp; cost</option>
          <option value="mana">Sort: Mana cost</option>
          <option value="name">Sort: Name</option>
          <option value="rarity">Sort: Rarity</option>
        </select>
      </div>
    </div>
  )
}
