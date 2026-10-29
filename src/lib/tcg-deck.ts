import { CARDS, TYPES, cardBySlug, compareCards, type Card, type CardType, type Element, type SortKey } from '@/lib/tcg'

/*
 * Deck rules (from the TCG starting guide): a legal deck has exactly 40 cards and no more than
 * 3 copies of any card. The builder never allows a 4th copy, but does let players go over 40
 * so they can cut down from a bigger pile ("subtractive deckbuilding"); it just reports the
 * deck as not yet legal.
 */
export const DECK_SIZE = 40
export const MAX_COPIES = 3
export const HAND_SIZE = 7

/** A deck is an ordered list of card slugs, one entry per copy. */
export type Deck = string[]

export function countCopies(deck: Deck) {
  const counts = new Map<string, number>()
  for (const slug of deck) counts.set(slug, (counts.get(slug) ?? 0) + 1)
  return counts
}

/** Drops copies past MAX_COPIES, keeping deck order. Returns the names of cards that were trimmed. */
export function capCopies(deck: Deck): { deck: Deck; trimmed: string[] } {
  const seen = new Map<string, number>()
  const trimmed = new Set<string>()
  const kept = deck.filter((slug) => {
    const n = (seen.get(slug) ?? 0) + 1
    seen.set(slug, n)
    if (n > MAX_COPIES) trimmed.add(cardBySlug(slug)?.name ?? slug)
    return n <= MAX_COPIES
  })
  return { deck: kept, trimmed: [...trimmed] }
}

export function deckCards(deck: Deck) {
  return deck.map(cardBySlug).filter((c): c is Card => c !== undefined)
}

export interface Legality {
  legal: boolean
  problems: string[]
}

export function checkLegality(deck: Deck): Legality {
  const problems: string[] = []
  if (deck.length < DECK_SIZE) problems.push(`Add ${DECK_SIZE - deck.length} more card${DECK_SIZE - deck.length === 1 ? '' : 's'} (decks must be exactly ${DECK_SIZE}).`)
  if (deck.length > DECK_SIZE) problems.push(`Remove ${deck.length - DECK_SIZE} card${deck.length - DECK_SIZE === 1 ? '' : 's'} (decks must be exactly ${DECK_SIZE}).`)
  for (const [slug, n] of countCopies(deck)) {
    if (n > MAX_COPIES) problems.push(`${cardBySlug(slug)?.name ?? slug}: ${n} copies (max ${MAX_COPIES}).`)
  }
  return { legal: problems.length === 0, problems }
}

export function sortDeck(deck: Deck, sort: SortKey | 'type'): Deck {
  const byCard = compareCards(sort === 'type' ? 'cost' : sort)
  return [...deck].sort((a, b) => {
    const ca = cardBySlug(a)
    const cb = cardBySlug(b)
    if (!ca || !cb) return 0
    if (sort === 'type') return TYPES.indexOf(ca.type) - TYPES.indexOf(cb.type) || byCard(ca, cb)
    return byCard(ca, cb)
  })
}

export function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// ── Share codes ──────────────────────────────────────────────────────────────
// Compact and URL-safe: "<art>x<count>" pairs joined by "-", e.g. "1x3-15x2-111x1".
// Art numbers are the stable tcgartNNN ids, so codes survive card renames.

const BY_ART = new Map(CARDS.map((c) => [c.art, c]))

export function encodeDeck(deck: Deck): string {
  return [...countCopies(deck)]
    .map(([slug, n]) => [cardBySlug(slug)?.art, n] as const)
    .filter((p): p is readonly [number, number] => p[0] !== undefined)
    .sort((a, b) => a[0] - b[0])
    .map(([art, n]) => `${art}x${n}`)
    .join('-')
}

export function decodeDeck(code: string): Deck | null {
  const pairs = code.trim().split('-').filter(Boolean)
  if (pairs.length === 0) return null
  const deck: Deck = []
  for (const pair of pairs) {
    const m = pair.match(/^(\d+)x(\d+)$/)
    const card = m && BY_ART.get(Number(m[1]))
    if (!m || !card) return null
    for (let i = 0; i < Math.min(Number(m[2]), MAX_COPIES); i++) deck.push(card.slug)
  }
  return deck
}

export function shareUrl(deck: Deck, name: string) {
  const params = new URLSearchParams({ deck: encodeDeck(deck) })
  if (name.trim()) params.set('name', name.trim())
  return `${window.location.origin}${window.location.pathname}#/tcg/deck_builder?${params}`
}

// ── Deck lists ───────────────────────────────────────────────────────────────

export function deckListText(deck: Deck, name: string) {
  const counts = countCopies(deck)
  const unique = sortDeck([...counts.keys()], 'type')
  const lines = [`# ${name.trim() || 'Unora TCG Deck'} (${deck.length} cards)`]
  for (const type of TYPES) {
    const ofType = unique.filter((s) => cardBySlug(s)?.type === type)
    if (ofType.length === 0) continue
    const total = ofType.reduce((n, s) => n + (counts.get(s) ?? 0), 0)
    lines.push('', `## ${type}s (${total})`)
    for (const slug of ofType) lines.push(`${counts.get(slug)}x ${cardBySlug(slug)?.name}`)
  }
  return lines.join('\n')
}

export interface ImportResult {
  deck: Deck
  name?: string
  unknown: string[]
  /** Cards listed more than MAX_COPIES times, cut down to MAX_COPIES */
  trimmed: string[]
}

const BY_NAME = new Map(CARDS.map((c) => [c.name.toLowerCase(), c]))

/** Accepts a share link, a bare share code, or a deck list ("3x Card Name" per line). */
export function parseImport(input: string): ImportResult | null {
  const text = input.trim()
  if (!text) return null

  const linkMatch = text.match(/[?&]deck=([0-9x-]+)/)
  if (linkMatch) {
    const deck = decodeDeck(linkMatch[1])
    if (!deck) return null
    const nameMatch = text.match(/[?&]name=([^&\s]+)/)
    return { deck, name: nameMatch ? decodeURIComponent(nameMatch[1].replace(/\+/g, ' ')) : undefined, unknown: [], trimmed: [] }
  }
  if (/^[0-9x-]+$/.test(text)) {
    const deck = decodeDeck(text)
    return deck ? { deck, unknown: [], trimmed: [] } : null
  }

  const deck: Deck = []
  const unknown: string[] = []
  let name: string | undefined
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('#')) {
      // "# Name (40 cards)" is the deck name; "## Creatures (24)" headings are skipped.
      if (!line.startsWith('##') && name === undefined) name = line.replace(/^#\s*/, '').replace(/\s*\(\d+ cards?\)\s*$/, '')
      continue
    }
    const m = line.match(/^(\d+)\s*[x×]?\s+(.+)$/i) ?? line.match(/^(.+?)\s+[x×]\s*(\d+)$/i)
    const [count, cardName] = m ? (/^\d+$/.test(m[1]) ? [Number(m[1]), m[2]] : [Number(m[2]), m[1]]) : [1, line]
    const card = BY_NAME.get(cardName.trim().toLowerCase())
    if (!card) {
      unknown.push(cardName.trim())
      continue
    }
    for (let i = 0; i < Math.min(count, 99); i++) deck.push(card.slug)
  }
  if (deck.length === 0 && unknown.length === 0) return null
  const capped = capCopies(deck)
  return { deck: capped.deck, name, unknown, trimmed: capped.trimmed }
}

// ── Randomizer ───────────────────────────────────────────────────────────────

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]

/**
 * A random legal deck: one or two elements plus Neutral, about 24 creatures and 16 other
 * cards, 1-3 copies each, never more than 3 of a card.
 */
export function randomDeck(): Deck {
  const elements = shuffle<Element>(['fire', 'water', 'wind', 'earth']).slice(0, Math.random() < 0.5 ? 1 : 2)
  const pool = CARDS.filter((c) => c.element === 'neutral' || elements.includes(c.element))
  const counts = new Map<string, number>()
  const deck: Deck = []
  const add = (filter: (c: Card) => boolean, target: number) => {
    const candidates = pool.filter(filter)
    let guard = 0
    while (deck.length < target && guard++ < 1000) {
      const card = pick(candidates)
      const have = counts.get(card.slug) ?? 0
      const copies = Math.min(MAX_COPIES - have, 1 + Math.floor(Math.random() * MAX_COPIES), target - deck.length)
      for (let i = 0; i < copies; i++) deck.push(card.slug)
      if (copies > 0) counts.set(card.slug, have + copies)
    }
  }
  add((c) => c.type === 'Creature', 24)
  add((c) => c.type !== 'Creature', DECK_SIZE)
  add(() => true, DECK_SIZE) // top up if a small pool ran out of non-creatures
  return sortDeck(deck, 'cost')
}

// ── Hypergeometric odds ──────────────────────────────────────────────────────
// Chance of drawing exactly k copies of a card when drawing n cards from a deck of
// `population` cards that holds K copies: C(K, k) · C(N − K, n − k) / C(N, n).

function choose(n: number, k: number) {
  if (k < 0 || k > n) return 0
  k = Math.min(k, n - k)
  let result = 1
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i
  return result
}

export function hypergeometricPmf(population: number, successes: number, draws: number, k: number) {
  const total = choose(population, draws)
  return total === 0 ? 0 : (choose(successes, k) * choose(population - successes, draws - k)) / total
}

export interface HypergeometricOdds {
  exactly: number
  fewer: number
  atMost: number
  more: number
  atLeast: number
  /** P(X = i) for i = 0 … min(draws, successes) */
  distribution: number[]
}

export function hypergeometricOdds(population: number, successes: number, draws: number, k: number): HypergeometricOdds {
  const top = Math.min(draws, successes)
  const distribution = Array.from({ length: top + 1 }, (_, i) => hypergeometricPmf(population, successes, draws, i))
  const sum = (from: number, to: number) => distribution.slice(Math.max(0, from), Math.max(0, to + 1)).reduce((a, b) => a + b, 0)
  const exactly = k >= 0 && k <= top ? distribution[k] : 0
  const fewer = sum(0, k - 1)
  const atMost = sum(0, k)
  return { exactly, fewer, atMost, more: Math.max(0, 1 - atMost), atLeast: Math.max(0, 1 - fewer), distribution }
}

// ── Stats ────────────────────────────────────────────────────────────────────

export const CURVE_MAX = 7 // the mana curve's last bar is "7+"

export function deckStats(deck: Deck) {
  const cards = deckCards(deck)
  const byType = Object.fromEntries(TYPES.map((t) => [t, 0])) as Record<CardType, number>
  const byElement: Partial<Record<Element, number>> = {}
  const curve = Array.from({ length: CURVE_MAX + 1 }, () => 0)
  let dust = 0
  let uncraftable = 0
  let costSum = 0
  for (const c of cards) {
    byType[c.type]++
    byElement[c.element] = (byElement[c.element] ?? 0) + 1
    const cost = Object.values(c.cost).reduce((a, b) => a + (b ?? 0), 0)
    costSum += cost
    curve[Math.min(cost, CURVE_MAX)]++
    if (c.craft === null) uncraftable++
    else dust += c.craft
  }
  return { byType, byElement, curve, dust, uncraftable, averageCost: cards.length ? costSum / cards.length : 0 }
}
