import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { Search, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import cardsData from '@/data/tcg/cards.json'

/*
 * Card images are the game's own 120x168 sprites, exported as two layers per version by
 * render_cards.py --web: <slug>_<variant>_base.png (frame + art) and <slug>_<variant>_text.png
 * (name, mana, rules text), in public/images/tcg/. They're used as plain PNGs rather than
 * through OptimizedImage, since lossy WebP/AVIF would smear the pixel art, and are scaled
 * up here with crisp pixels. Keeping the layers apart lets the foil tint sit between them,
 * as it does in game.
 */

type Element = 'fire' | 'water' | 'wind' | 'earth' | 'neutral'
type Variant = 'normal' | 'extended' | 'full' | 'full_notext'
type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Legendary' | 'Mythic'
type CardType = 'Creature' | 'Spell' | 'Instant' | 'Trap'

interface Card {
  art: number
  slug: string
  name: string
  element: Element
  rarity: Rarity
  craft: number | null
  cost: Partial<Record<'generic' | Element, number>>
  type: CardType
  text: string
  power?: number
  toughness?: number
  variants: Variant[]
}

interface CardData {
  keywords: string[]
  cards: Card[]
}

const { cards: CARDS, keywords: KEYWORDS } = cardsData as CardData

const CARD_W = 120
const CARD_H = 168
const IMAGE_BASE = `${import.meta.env.BASE_URL}images/tcg/`

const ELEMENTS: { key: Element; label: string; color: string }[] = [
  { key: 'fire', label: 'Fire', color: '#E63419' },
  { key: 'water', label: 'Water', color: '#2A8FD4' },
  { key: 'wind', label: 'Wind', color: '#5BA12C' },
  { key: 'earth', label: 'Earth', color: '#9A6B3C' },
  { key: 'neutral', label: 'Neutral', color: '#8A8590' },
]
const ELEMENT_ORDER = ELEMENTS.map((e) => e.key)
const elementInfo = (key: Element) => ELEMENTS.find((e) => e.key === key)!

// Mana square colours as drawn on the cards in game
const MANA_COLORS: Record<Exclude<Element, 'neutral'>, string> = {
  fire: 'rgb(176, 60, 36)',
  water: 'rgb(44, 96, 180)',
  wind: 'rgb(104, 168, 104)',
  earth: 'rgb(140, 100, 56)',
}

// Rarity label colours from the in-game Card Binder
const RARITIES: { key: Rarity; color: string }[] = [
  { key: 'Common', color: '#B9B4AC' },
  { key: 'Uncommon', color: '#3FCB3B' },
  { key: 'Rare', color: '#E9E1C9' },
  { key: 'Legendary', color: '#F0A43A' },
  { key: 'Mythic', color: '#B48CFF' },
]
const rarityColor = (r: Rarity) => RARITIES.find((x) => x.key === r)?.color ?? 'inherit'

const TYPES: CardType[] = ['Creature', 'Spell', 'Instant', 'Trap']

const VARIANT_LABELS: Record<Variant, string> = {
  normal: 'Normal',
  extended: 'Extended',
  full: 'Full Art',
  full_notext: 'Full Art (no text)',
}

type SortKey = 'cost' | 'name' | 'rarity'

const totalCost = (c: Card) => Object.values(c.cost).reduce((a, b) => a + (b ?? 0), 0)

// ── Foil ───────────────────────────────────────────────────────────────────────
// Measured from an in-game recording: a rainbow tint is blended over the frame and art
// (not the text), sweeping toward the bottom-right on a 4 s loop, with white plus-shaped
// sparkles twinkling at fixed spots.

const FOIL_LOOP_S = 4
const FOIL_FRAMES = 80
// One tint cycle spans 132.7 card pixels along a 121° line (towards the bottom-right).
const FOIL_PERIOD = 132.72
const FOIL_ANGLE = 121
const FOIL_SHIFT = { x: FOIL_PERIOD * 0.8574, y: FOIL_PERIOD * 0.5147 }
// [blend strength, r, g, b] evenly spaced around the cycle
const FOIL_PALETTE: [number, number, number, number][] = [
  [0.35, 211, 139, 108], [0.35, 208, 124, 108], [0.351, 202, 111, 108], [0.35, 197, 104, 112],
  [0.343, 193, 101, 120], [0.336, 189, 99, 128], [0.327, 186, 96, 135], [0.318, 182, 94, 142],
  [0.309, 176, 91, 147], [0.299, 167, 89, 147], [0.286, 157, 87, 145], [0.275, 146, 85, 142],
  [0.265, 136, 84, 137], [0.254, 124, 81, 131], [0.244, 115, 79, 126], [0.236, 108, 79, 122],
  [0.23, 105, 81, 118], [0.228, 101, 84, 116], [0.225, 100, 90, 115], [0.223, 100, 99, 117],
  [0.223, 102, 108, 120], [0.229, 103, 116, 122], [0.233, 106, 128, 126], [0.24, 108, 136, 127],
  [0.247, 110, 144, 126], [0.256, 112, 150, 123], [0.263, 115, 157, 118], [0.271, 118, 165, 113],
  [0.279, 122, 172, 107], [0.294, 126, 174, 101], [0.309, 132, 175, 98], [0.319, 144, 179, 99],
  [0.328, 157, 183, 101], [0.339, 170, 183, 102], [0.346, 183, 185, 103], [0.35, 196, 187, 104],
  [0.353, 205, 185, 106], [0.353, 210, 177, 108], [0.351, 212, 166, 109], [0.351, 212, 152, 108],
]
// Top-left of each sparkle's 2x2 centre, and the loop frames (of 80) it peaks on
const FOIL_SPARKLES: [number, number, number[]][] = [
  [62, 28, [37, 69]], [92, 30, [37, 69]], [84, 46, [11, 39, 71]], [23, 108, [37, 69]],
  [18, 34, [1, 17, 49]], [52, 53, [3, 19, 51]], [76, 70, [0, 16, 48]], [22, 121, [14, 46, 78]],
  [66, 122, [14, 46, 78]], [16, 50, [9, 28, 60]],
]
const SPARKLE_FRAMES = 13

// The pattern moves toward +u over time, so the stops run backwards through the palette.
const FOIL_GRADIENT = `repeating-linear-gradient(${FOIL_ANGLE}deg, ${FOIL_PALETTE.map((_, i) => {
  const [a, r, g, b] = FOIL_PALETTE[(FOIL_PALETTE.length - i) % FOIL_PALETTE.length]
  return `rgba(${r}, ${g}, ${b}, ${a}) ${((i * FOIL_PERIOD) / FOIL_PALETTE.length).toFixed(2)}px`
}).join(', ')}, rgba(${FOIL_PALETTE[0].slice(1).join(', ')}, ${FOIL_PALETTE[0][0]}) ${FOIL_PERIOD}px)`

function sparkleKeyframes(name: string, opacity: (a: number) => number) {
  const steps: string[] = []
  for (let k = 0; k <= SPARKLE_FRAMES; k++) {
    const a = k < SPARKLE_FRAMES ? Math.sin((Math.PI * (k + 0.5)) / SPARKLE_FRAMES) : 0
    steps.push(`${((k * 100) / FOIL_FRAMES).toFixed(3)}% { opacity: ${opacity(a).toFixed(3)} }`)
  }
  return `@keyframes ${name} { ${steps.join(' ')} 100% { opacity: 0 } }`
}

const FOIL_CSS = `
@keyframes tcg-foil-sweep { from { transform: translate(0, 0) } to { transform: translate(${FOIL_SHIFT.x.toFixed(2)}px, ${FOIL_SHIFT.y.toFixed(2)}px) } }
${sparkleKeyframes('tcg-sparkle-centre', (a) => a)}
${sparkleKeyframes('tcg-sparkle-arms', (a) => Math.max(0, (a - 0.25) / 0.75) * 0.88)}
.tcg-foil-sweep { animation: tcg-foil-sweep ${FOIL_LOOP_S}s linear infinite; }
.tcg-sparkle { opacity: 0; animation-duration: ${FOIL_LOOP_S}s; animation-iteration-count: infinite; animation-timing-function: linear; }
@media (prefers-reduced-motion: reduce) {
  .tcg-foil-sweep, .tcg-sparkle { animation: none; }
}
`

const pixelated: CSSProperties = { imageRendering: 'pixelated' }

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
  variant: Variant
  scale: number
  foil?: boolean
  eager?: boolean
}

/** One card drawn at its native 120x168 and scaled by an integer factor. */
function CardArt({ card, variant, scale, foil = false, eager = false }: CardArtProps) {
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

// ── Info panel pieces ────────────────────────────────────────────────────────

function ManaCost({ cost }: { cost: Card['cost'] }) {
  const squares = Object.entries(cost).flatMap(([color, n]) =>
    color === 'generic' ? [] : Array.from({ length: n ?? 0 }, () => color as Exclude<Element, 'neutral'>),
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
function RulesText({ text }: { text: string }) {
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

function useDetailScale() {
  const query = '(min-width: 1280px)'
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setWide(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return wide ? 3 : 2
}

const chip =
  'rounded-md border px-3 py-1 font-ui text-sm transition-colors focus-visible:outline-2 focus-visible:outline-gilt'
const chipIdle =
  'border-parchment-300 bg-parchment-100 text-parchment-700 hover:border-gilt dark:border-ash/20 dark:bg-ink dark:text-ivory/70 dark:hover:border-gilt'
const chipActive = 'border-gilt bg-gilt/15 text-parchment-900 dark:text-gilt'
const selectClass =
  'rounded-md border border-parchment-300 bg-parchment-100 px-2 py-1.5 font-ui text-sm text-parchment-800 dark:border-ash/20 dark:bg-ink dark:text-ivory/80'

function CardDetail({ card }: { card: Card }) {
  const scale = useDetailScale()
  const [variant, setVariant] = useState<Variant>('normal')
  const [foil, setFoil] = useState(false)
  const shown = card.variants.includes(variant) ? variant : 'normal'
  const el = elementInfo(card.element)

  const rows: [string, ReactNode][] = [
    ['Element', <span style={{ color: el.color }} className="font-semibold">{el.label}</span>],
    ['Mana cost', <ManaCost cost={card.cost} />],
    ['Type', card.type],
    ['Text', <RulesText text={card.text} />],
  ]
  if (card.power !== undefined) rows.push(['Power / Toughness', `${card.power} / ${card.toughness}`])
  rows.push(
    ['Craft cost', card.craft === null ? "Can't be crafted" : `${card.craft} Dust`],
    ['Versions', card.variants.filter((v) => v !== 'full_notext').map((v) => VARIANT_LABELS[v]).join(', ')],
  )

  return (
    <div className="rounded-xl border border-parchment-300 bg-parchment-100 p-4 shadow-sm dark:border-ash/10 dark:bg-ink">
      <div className="flex justify-center">
        <div className="rounded-md p-1 shadow-[0_6px_24px_rgba(0,0,0,0.35)]">
          <CardArt key={`${card.slug}-${shown}-${foil}`} card={card} variant={shown} scale={scale} foil={foil} eager />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-1.5" role="group" aria-label="Card version">
        {card.variants.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVariant(v)}
            aria-pressed={shown === v}
            className={`${chip} ${shown === v ? chipActive : chipIdle}`}
          >
            {VARIANT_LABELS[v]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setFoil((f) => !f)}
          aria-pressed={foil}
          className={`${chip} inline-flex items-center gap-1.5 ${foil ? chipActive : chipIdle}`}
        >
          <Sparkles size={14} /> Foil
        </button>
      </div>

      <div className="mt-5">
        <h2 className="font-heading text-2xl font-semibold leading-tight text-gilt">{card.name}</h2>
        <p className="font-subtitle text-base" style={{ color: rarityColor(card.rarity) }}>
          <span className="rounded bg-obsidian/80 px-1.5 py-0.5">{card.rarity}</span>
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 font-ui text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-parchment-600 dark:text-ash">{label}</dt>
            <dd className="m-0 text-parchment-900 dark:text-ivory">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function TCGCardGallery() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<CardType | ''>('')
  const [rarity, setRarity] = useState<Rarity | ''>('')
  const [sort, setSort] = useState<SortKey>('cost')

  const elementParam = params.get('element') as Element | null
  const element = elementParam && ELEMENT_ORDER.includes(elementParam) ? elementParam : null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rarityRank = (r: Rarity) => RARITIES.findIndex((x) => x.key === r)
    return CARDS.filter(
      (c) =>
        (!element || c.element === element) &&
        (!type || c.type === type) &&
        (!rarity || c.rarity === rarity) &&
        (!q || c.name.toLowerCase().includes(q) || c.text.toLowerCase().includes(q)),
    ).sort((a, b) => {
      // The in-game binder groups by element, then sorts by mana cost and name.
      const byElement = ELEMENT_ORDER.indexOf(a.element) - ELEMENT_ORDER.indexOf(b.element)
      const byName = a.name.localeCompare(b.name)
      if (sort === 'name') return byName
      if (sort === 'rarity') return rarityRank(b.rarity) - rarityRank(a.rarity) || byElement || byName
      return byElement || totalCost(a) - totalCost(b) || byName
    })
  }, [element, type, rarity, query, sort])

  const selectedSlug = params.get('card')
  const selected = filtered.find((c) => c.slug === selectedSlug) ?? CARDS.find((c) => c.slug === selectedSlug) ?? filtered[0]

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) next.delete(k)
      else next.set(k, v)
    }
    setParams(next, { replace: true })
  }

  return (
    <div>
      <style>{FOIL_CSS}</style>
      <PageHeader
        title="Card Gallery"
        description={`All ${CARDS.length} cards of Unora Card Battle TCG. Select a card to see every version, its foil, and its crafting cost.`}
        accent="astral"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Unora Card Battle TCG', to: '/tcg' },
          { label: 'Card Gallery' },
        ]}
      />

      {/* Element tabs, as in the Card Binder */}
      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Element">
        {[{ key: null, label: 'All', color: '' }, ...ELEMENTS].map((e) => {
          const active = element === e.key
          return (
            <button
              key={e.label}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => update({ element: e.key })}
              className={`${chip} ${active ? chipActive : chipIdle}`}
              style={active && e.color ? { borderColor: e.color, color: e.color } : undefined}
            >
              {e.label}
            </button>
          )
        })}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
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
          <option value="name">Sort: Name</option>
          <option value="rarity">Sort: Rarity</option>
        </select>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Grid */}
        <section className="order-2 min-w-0 flex-1 lg:order-1" aria-label="Cards">
          <p className="mb-3 font-ui text-xs text-ash">
            Showing {filtered.length} of {CARDS.length} cards
          </p>
          {filtered.length === 0 ? (
            <p className="py-12 text-center font-ui text-sm text-ash">No cards match these filters.</p>
          ) : (
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(124px,1fr))] justify-items-center gap-3 p-0">
              {filtered.map((c) => {
                const active = selected?.slug === c.slug
                return (
                  <li key={c.slug}>
                    <button
                      type="button"
                      onClick={() => update({ card: c.slug })}
                      aria-pressed={active}
                      aria-label={c.name}
                      title={c.name}
                      className={`block rounded-[3px] p-0.5 transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-gilt ${
                        active ? 'bg-gilt shadow-[0_0_12px_rgba(201,162,76,0.6)]' : 'bg-transparent'
                      }`}
                    >
                      <CardArt card={c} variant="normal" scale={1} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Selected card */}
        {selected && (
          <aside className="order-1 lg:sticky lg:top-20 lg:order-2 lg:w-[400px] xl:w-[440px]" aria-label="Selected card">
            <CardDetail key={selected.slug} card={selected} />
          </aside>
        )}
      </div>
    </div>
  )
}
