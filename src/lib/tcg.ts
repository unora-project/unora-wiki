import { useEffect, useMemo, useState } from 'react'
import cardsData from '@/data/tcg/cards.json'

/*
 * Shared data and helpers for the TCG pages (Card Gallery, Deck Builder).
 *
 * Card images are the game's own 120x168 sprites, exported as two layers per version by
 * render_cards.py --web: <slug>_<variant>_base.png (frame + art) and <slug>_<variant>_text.png
 * (name, mana, rules text), in public/images/tcg/. They're used as plain PNGs rather than
 * through OptimizedImage, since lossy WebP/AVIF would smear the pixel art, and are scaled
 * up with crisp pixels. Keeping the layers apart lets the foil tint sit between them, as it
 * does in game.
 */

export type Element = 'fire' | 'water' | 'wind' | 'earth' | 'neutral'
export type ManaElement = Exclude<Element, 'neutral'>
export type Variant = 'normal' | 'extended' | 'full' | 'full_notext'
export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Legendary' | 'Mythic'
export type CardType = 'Creature' | 'Spell' | 'Instant' | 'Trap'
export type SortKey = 'cost' | 'mana' | 'name' | 'rarity'

export interface Card {
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

const data = cardsData as CardData
export const CARDS = data.cards
export const KEYWORDS = data.keywords
const BY_SLUG = new Map(CARDS.map((c) => [c.slug, c]))
export const cardBySlug = (slug: string) => BY_SLUG.get(slug)

export const CARD_W = 120
export const CARD_H = 168
export const IMAGE_BASE = `${import.meta.env.BASE_URL}images/tcg/`

export const ELEMENTS: { key: Element; label: string; color: string }[] = [
  { key: 'fire', label: 'Fire', color: '#E63419' },
  { key: 'water', label: 'Water', color: '#2A8FD4' },
  { key: 'wind', label: 'Wind', color: '#5BA12C' },
  { key: 'earth', label: 'Earth', color: '#9A6B3C' },
  { key: 'neutral', label: 'Neutral', color: '#8A8590' },
]
export const ELEMENT_ORDER = ELEMENTS.map((e) => e.key)
export const elementInfo = (key: Element) => ELEMENTS.find((e) => e.key === key)!

// Mana square colours as drawn on the cards in game
export const MANA_COLORS: Record<ManaElement, string> = {
  fire: 'rgb(176, 60, 36)',
  water: 'rgb(44, 96, 180)',
  wind: 'rgb(104, 168, 104)',
  earth: 'rgb(140, 100, 56)',
}

// Rarity label colours from the in-game Card Binder
export const RARITIES: { key: Rarity; color: string }[] = [
  { key: 'Common', color: '#B9B4AC' },
  { key: 'Uncommon', color: '#3FCB3B' },
  { key: 'Rare', color: '#E9E1C9' },
  { key: 'Legendary', color: '#F0A43A' },
  { key: 'Mythic', color: '#B48CFF' },
]
export const rarityColor = (r: Rarity) => RARITIES.find((x) => x.key === r)?.color ?? 'inherit'
const rarityRank = (r: Rarity) => RARITIES.findIndex((x) => x.key === r)

export const TYPES: CardType[] = ['Creature', 'Spell', 'Instant', 'Trap']

export const VARIANT_LABELS: Record<Variant, string> = {
  normal: 'Normal',
  extended: 'Extended',
  full: 'Full Art',
  full_notext: 'Full Art (no text)',
}

export const totalCost = (c: Card) => Object.values(c.cost).reduce((a, b) => a + (b ?? 0), 0)

/**
 * Sort comparator. 'cost' matches the in-game binder: element, then mana cost, then name.
 * 'mana' is mana cost alone (ties broken by name), across all elements.
 */
export function compareCards(sort: SortKey) {
  return (a: Card, b: Card) => {
    const byElement = ELEMENT_ORDER.indexOf(a.element) - ELEMENT_ORDER.indexOf(b.element)
    const byName = a.name.localeCompare(b.name)
    if (sort === 'name') return byName
    if (sort === 'mana') return totalCost(a) - totalCost(b) || byName
    if (sort === 'rarity') return rarityRank(b.rarity) - rarityRank(a.rarity) || byElement || byName
    return byElement || totalCost(a) - totalCost(b) || byName
  }
}

export const galleryLink = (slug: string) => `/tcg/card_gallery?card=${encodeURIComponent(slug)}`

/**
 * Search, type, rarity and sort state for a card list, plus the filtered result.
 * `elements` is one element, a set of elements (empty shows nothing), or null for all.
 */
export function useCardFilters(elements: Element | readonly Element[] | null) {
  const elementKey = elements === null ? 'all' : typeof elements === 'string' ? elements : [...elements].sort().join(',')
  const [query, setQuery] = useState('')
  const [type, setType] = useState<CardType | ''>('')
  const [rarity, setRarity] = useState<Rarity | ''>('')
  const [sort, setSort] = useState<SortKey>('cost')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const allowed = elementKey === 'all' ? null : new Set(elementKey.split(','))
    return CARDS.filter(
      (c) =>
        (!allowed || allowed.has(c.element)) &&
        (!type || c.type === type) &&
        (!rarity || c.rarity === rarity) &&
        (!q || c.name.toLowerCase().includes(q) || c.text.toLowerCase().includes(q)),
    ).sort(compareCards(sort))
  }, [elementKey, type, rarity, query, sort])

  return { query, setQuery, type, setType, rarity, setRarity, sort, setSort, filtered }
}

export type CardFilterState = ReturnType<typeof useCardFilters>

/** 3 on wide screens, 2 otherwise: the integer scale for a featured card. */
export function useDetailScale() {
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

// ── Shared button / input styles ─────────────────────────────────────────────

export const chip =
  'rounded-md border px-3 py-1 font-ui text-sm transition-colors focus-visible:outline-2 focus-visible:outline-gilt disabled:cursor-not-allowed disabled:opacity-50'
export const chipIdle =
  'border-parchment-300 bg-parchment-100 text-parchment-700 hover:border-gilt dark:border-ash/20 dark:bg-ink dark:text-ivory/70 dark:hover:border-gilt'
export const chipActive = 'border-gilt bg-gilt/15 text-parchment-900 dark:text-gilt'
export const selectClass =
  'rounded-md border border-parchment-300 bg-parchment-100 px-2 py-1.5 font-ui text-sm text-parchment-800 dark:border-ash/20 dark:bg-ink dark:text-ivory/80'
export const panelClass =
  'rounded-xl border border-parchment-300 bg-parchment-100 p-4 shadow-sm dark:border-ash/10 dark:bg-ink'

// ── Foil ─────────────────────────────────────────────────────────────────────
// Measured from an in-game recording: a rainbow tint is blended over the frame and art
// (not the text), sweeping toward the bottom-right on a 4 s loop, with white plus-shaped
// sparkles twinkling at fixed spots.

export const FOIL_LOOP_S = 4
export const FOIL_FRAMES = 80
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
export const FOIL_SPARKLES: [number, number, number[]][] = [
  [62, 28, [37, 69]], [92, 30, [37, 69]], [84, 46, [11, 39, 71]], [23, 108, [37, 69]],
  [18, 34, [1, 17, 49]], [52, 53, [3, 19, 51]], [76, 70, [0, 16, 48]], [22, 121, [14, 46, 78]],
  [66, 122, [14, 46, 78]], [16, 50, [9, 28, 60]],
]
export const SPARKLE_FRAMES = 13

// The pattern moves toward +u over time, so the stops run backwards through the palette.
export const FOIL_GRADIENT = `repeating-linear-gradient(${FOIL_ANGLE}deg, ${FOIL_PALETTE.map((_, i) => {
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

export const FOIL_CSS = `
@keyframes tcg-foil-sweep { from { transform: translate(0, 0) } to { transform: translate(${FOIL_SHIFT.x.toFixed(2)}px, ${FOIL_SHIFT.y.toFixed(2)}px) } }
${sparkleKeyframes('tcg-sparkle-centre', (a) => a)}
${sparkleKeyframes('tcg-sparkle-arms', (a) => Math.max(0, (a - 0.25) / 0.75) * 0.88)}
.tcg-foil-sweep { animation: tcg-foil-sweep ${FOIL_LOOP_S}s linear infinite; }
.tcg-sparkle { opacity: 0; animation-duration: ${FOIL_LOOP_S}s; animation-iteration-count: infinite; animation-timing-function: linear; }
@media (prefers-reduced-motion: reduce) {
  .tcg-foil-sweep, .tcg-sparkle { animation: none; }
}
`
