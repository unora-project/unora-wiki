import { useEffect, useState, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { createColumnHelper, type Row } from '@tanstack/react-table'
import { ChevronRight, Gem, Shield, Swords, type LucideIcon } from 'lucide-react'
import { DataTable } from '@/components/tables/DataTable'
import equipmentUrl from '@/data/equipment/all.json?url'
import jewelRecipesUrl from '@/data/professions/jewelcrafting-recipes.json?url'
import armorRecipesUrl from '@/data/professions/armorsmithing-recipes.json?url'
import enchantsUrl from '@/data/professions/enchanting-enchants.json?url'

interface EquipmentItem {
  name: string
  location: string | null
  locationLink: string | null
  level: number | string | null
  weight: number | null
  category: string
  class: string | null
  gender: string | null
  stats: Record<string, number | null>
  percentages: Record<string, number | null>
}

interface DisplayRow extends EquipmentItem {
  _groupKey: string
  _baseName: string
  _availableTiers: string[]
  _selectedTier: string
  _isVariant: boolean
}

interface CardGroup {
  key: string
  base: DisplayRow
  variants: DisplayRow[]
}

interface ShopEntry {
  town: string
  npc: string
  items: { name: string; type: string; cost: string }[]
}

interface WeaponRecipeRow {
  Name: string
  Level: string
  Type: string
  Materials: string
  'Materials to upgrade': string
  'Upgrade to Great'?: string
  'Upgrade to Grand'?: string
  'Upgrade to Enchanted'?: string
  'Upgrade to Empowered'?: string
}

interface JewelRecipeRow {
  Name: string
  Level?: string
  Materials?: string
}

const categories = [
  { id: 'all', label: 'All' },
  { id: 'weapon', label: 'Weapons' },
  { id: 'armor', label: 'Armor' },
  { id: 'helmet', label: 'Helmets' },
  { id: 'shield', label: 'Shields' },
  { id: 'accessory', label: 'Accessories' },
  { id: 'ring', label: 'Rings' },
  { id: 'earring', label: 'Earrings' },
  { id: 'necklace', label: 'Necklaces' },
  { id: 'belt', label: 'Belts' },
  { id: 'boot', label: 'Boots' },
  { id: 'gauntlet', label: 'Gauntlets' },
  { id: 'greave', label: 'Greaves' },
  { id: 'overarmor', label: 'Overarmor' },
  { id: 'overhelmet', label: 'Overhelmet' },
]

const classGroups = [
  {
    label: 'Temuair',
    options: ['monk', 'priest', 'rogue', 'warrior', 'wizard', 'peasant'],
  },
  {
    label: 'Medenia',
    options: [
      'adept', 'druid', 'plague-doctor', 'bard', 'assassin',
      'archer', 'berserker', 'warlord', 'arcanist', 'elementalist',
    ],
  },
]

const classLabels: Record<string, string> = {
  monk: 'Monk', priest: 'Priest', rogue: 'Rogue', warrior: 'Warrior', wizard: 'Wizard', peasant: 'Peasant',
  adept: 'Adept', druid: 'Druid', 'plague-doctor': 'Plague Doctor', bard: 'Bard', assassin: 'Assassin',
  archer: 'Archer', berserker: 'Berserker', warlord: 'Warlord', arcanist: 'Arcanist', elementalist: 'Elementalist',
}

const statLabels: Record<string, string> = {
  hp: 'HP', mp: 'MP', ac: 'AC', mr: 'MR',
  str: 'STR', int: 'INT', wis: 'WIS', con: 'CON', dex: 'DEX',
  dmg: 'DMG', hit: 'HIT',
}

const percentLabels: Record<string, string> = {
  attackSpeed: 'AS%',
  skillDamage: 'SKD',
  skillDamagePercent: 'SKD%',
  spellDamage: 'SPD',
  spellDamagePercent: 'SPD%',
  flatHealBonus: 'HEAL',
  healBonusPercent: 'HEAL%',
  cooldownReduction: 'CDR%',
}

const TIER_PREFIXES = ['Good', 'Great', 'Grand', 'Enchanted', 'Empowered']
const TIER_ORDER = ['base', 'Good', 'Great', 'Grand', 'Enchanted', 'Empowered']
const TIER_LABELS: Record<string, string> = {
  base: 'Base',
  Good: 'Good',
  Great: 'Great',
  Grand: 'Grand',
  Enchanted: 'Enchanted',
  Empowered: 'Empowered',
}

// Symbol shown beside an item's name. Swap ⚦ for ♂ if you prefer the standard male sign.
const GENDER_BADGE: Record<string, { symbol: string; cls: string; title: string }> = {
  male: { symbol: '♂', cls: 'text-blue-500 dark:text-blue-400', title: 'Male' },
  female: { symbol: '♀', cls: 'text-pink-500 dark:text-pink-400', title: 'Female' },
  unisex: { symbol: '⚥', cls: 'text-purple-500 dark:text-purple-400', title: 'Unisex' },
}

// One color per stat. Change a color here and it updates everywhere on the cards.
// Attributes (STR..DEX) follow the UNORA logo, same as the skill/spell cards.
const STAT_COLORS: Record<string, string> = {
  hp: 'text-red-600 dark:text-red-400',
  mp: 'text-blue-600 dark:text-blue-400',
  ac: 'text-zinc-600 dark:text-zinc-400',
  mr: 'text-parchment-900 dark:text-white',
  str: 'text-ignis',
  int: 'text-tide',
  wis: 'text-verdant',
  con: 'text-amber-700 dark:text-ivory',
  dex: 'text-astral',
  dmg: 'text-orange-600 dark:text-orange-400',
  hit: 'text-orange-600 dark:text-orange-400',
  as: 'text-cyan-600 dark:text-cyan-400',
  cdr: 'text-cyan-600 dark:text-cyan-400',
  skd: 'text-yellow-600 dark:text-yellow-400',
  skdp: 'text-yellow-600 dark:text-yellow-400',
  spd: 'text-fuchsia-600 dark:text-fuchsia-400',
  spdp: 'text-fuchsia-600 dark:text-fuchsia-400',
  heal: 'text-green-600 dark:text-green-400',
  healp: 'text-green-600 dark:text-green-400',
}

// Every stat on a card can be clicked to sort by it. Items missing that stat go last.
const SORT_GETTERS: Record<string, (r: EquipmentItem) => number | null | undefined> = {
  hp: (r) => r.stats.hp,
  mp: (r) => r.stats.mp,
  ac: (r) => r.stats.ac,
  mr: (r) => r.stats.mr,
  str: (r) => r.stats.str,
  int: (r) => r.stats.int,
  wis: (r) => r.stats.wis,
  con: (r) => r.stats.con,
  dex: (r) => r.stats.dex,
  dmg: (r) => r.stats.dmg,
  hit: (r) => r.stats.hit,
  as: (r) => r.percentages.attackSpeed,
  cdr: (r) => r.percentages.cooldownReduction,
  skd: (r) => r.percentages.skillDamage,
  skdp: (r) => r.percentages.skillDamagePercent,
  spd: (r) => r.percentages.spellDamage,
  spdp: (r) => r.percentages.spellDamagePercent,
  heal: (r) => r.percentages.flatHealBonus,
  healp: (r) => r.percentages.healBonusPercent,
}

const SORT_LABELS: Record<string, string> = {
  level: 'Level', name: 'Name',
  hp: 'HP', mp: 'MP', ac: 'AC', mr: 'MR',
  str: 'STR', int: 'INT', wis: 'WIS', con: 'CON', dex: 'DEX',
  dmg: 'DMG', hit: 'HIT', as: 'AS%', cdr: 'CDR%',
  skd: 'SKD', skdp: 'SKD%', spd: 'SPD', spdp: 'SPD%',
  heal: 'HEAL', healp: 'HEAL%',
}

// Stats where the lowest number is best, so the first click sorts lowest first.
const LOWEST_FIRST = new Set(['ac'])

const PAGE_SIZE = 40
// Cards never get narrower than 320px; the row drops a card instead (max 5 per row).
const CARD_GRID = 'grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,max(320px,calc((100%_-_4rem)/5))),1fr))]'
const controlLabelCls = 'text-xs font-medium uppercase tracking-wider text-parchment-500 dark:text-parchment-600'
const selectCls =
  'rounded-lg border border-parchment-300 bg-parchment-100 px-3 py-1.5 text-xs font-medium text-parchment-700 dark:border-ash/20 dark:bg-obsidian dark:text-ash'

const pillCls = (active: boolean) =>
  `rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
    active
      ? 'border border-gilt bg-transparent text-gilt'
      : 'border border-parchment-300 bg-parchment-100 text-parchment-600 hover:border-gilt hover:text-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ash dark:hover:border-gilt'
  }`

function parseTier(name: string): { tier: string; baseName: string } {
  const parts = name.split(' ')
  const first = parts[0]
  if (TIER_PREFIXES.includes(first)) {
    return { tier: first, baseName: parts.slice(1).join(' ') }
  }
  return { tier: 'base', baseName: name }
}

interface ItemGroup {
  key: string
  baseName: string
  tiers: Partial<Record<string, EquipmentItem>>
  availableTiers: string[]
}

function groupEquipment(items: EquipmentItem[]): ItemGroup[] {
  const map = new Map<string, ItemGroup>()
  for (const item of items) {
    const { tier, baseName } =
      item.category === 'weapon' || item.category === 'shield'
        ? parseTier(item.name)
        : { tier: 'base', baseName: item.name }
    const key = `${item.category}|${item.class ?? ''}|${baseName}`
    let group = map.get(key)
    if (!group) {
      group = { key, baseName, tiers: {}, availableTiers: [] }
      map.set(key, group)
    }
    group.tiers[tier] = item
    if (!group.availableTiers.includes(tier)) {
      group.availableTiers.push(tier)
    }
  }
  for (const group of map.values()) {
    group.availableTiers.sort((a, b) => TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b))
  }
  return Array.from(map.values())
}

function makeRow(g: ItemGroup, tier: string, isVariant: boolean): DisplayRow {
  return {
    ...g.tiers[tier]!,
    _groupKey: g.key,
    _baseName: g.baseName,
    _availableTiers: g.availableTiers,
    _selectedTier: tier,
    _isVariant: isVariant,
  }
}

let equipmentCache: EquipmentItem[] | null = null
let equipmentPromise: Promise<EquipmentItem[]> | null = null

function loadEquipment(): Promise<EquipmentItem[]> {
  if (equipmentCache) return Promise.resolve(equipmentCache)
  if (!equipmentPromise) {
    equipmentPromise = fetch(equipmentUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`equipment.json ${r.status}`)
        return r.json() as Promise<EquipmentItem[]>
      })
      .then((data) => {
        equipmentCache = data
        return data
      })
  }
  return equipmentPromise
}

let shopIndexPromise: Promise<Map<string, { npc: string; town: string }>> | null = null

function loadShopIndex(): Promise<Map<string, { npc: string; town: string }>> {
  if (!shopIndexPromise) {
    shopIndexPromise = fetch(`${import.meta.env.BASE_URL}data/shops.json`)
      .then((r) => (r.ok ? (r.json() as Promise<ShopEntry[]>) : []))
      .then((shops) => {
        const index = new Map<string, { npc: string; town: string }>()
        for (const shop of shops) {
          for (const item of shop.items) {
            if (!index.has(item.name)) {
              index.set(item.name, { npc: shop.npc, town: shop.town })
            }
          }
        }
        return index
      })
      .catch(() => new Map())
  }
  return shopIndexPromise
}

let weaponRecipePromise: Promise<Map<string, WeaponRecipeRow>> | null = null

function loadWeaponRecipes(): Promise<Map<string, WeaponRecipeRow>> {
  if (!weaponRecipePromise) {
    weaponRecipePromise = fetch(`${import.meta.env.BASE_URL}data/professions/weaponsmithing-recipes.json`)
      .then((r) => (r.ok ? (r.json() as Promise<WeaponRecipeRow[]>) : []))
      .then((rows) => new Map(rows.map((r) => [r.Name, r])))
      .catch(() => new Map())
  }
  return weaponRecipePromise
}

// Jewelcrafting and armorsmithing recipes (belts are armorsmithing), looked up by item name
// (case and spacing ignored).
const JEWEL_CATEGORIES = new Set(['belt', 'necklace', 'earring', 'ring'])
const recipeKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ')

let jewelRecipePromise: Promise<Map<string, JewelRecipeRow>> | null = null

function loadJewelRecipes(): Promise<Map<string, JewelRecipeRow>> {
  if (!jewelRecipePromise) {
    const load = (url: string) =>
      fetch(url)
        .then((r) => (r.ok ? (r.json() as Promise<JewelRecipeRow[]>) : []))
        .catch(() => [] as JewelRecipeRow[])
    jewelRecipePromise = Promise.all([load(jewelRecipesUrl), load(armorRecipesUrl)]).then(([jewel, armor]) => {
      const map = new Map<string, JewelRecipeRow>()
      // Jewelcrafting first; armorsmithing only fills names it doesn't already have.
      for (const r of [...jewel, ...armor]) {
        if (!r.Name) continue
        const k = recipeKey(r.Name)
        if (!map.has(k)) map.set(k, r)
      }
      return map
    })
  }
  return jewelRecipePromise
}

// The materials shown in the [RECIPE] tooltip for an item, or null if it has none.
function recipeTextFor(
  item: DisplayRow,
  weapons: Map<string, WeaponRecipeRow>,
  jewels: Map<string, JewelRecipeRow>
): string | null {
  if (item.category === 'weapon') return getRecipeDisplay(weapons.get(item._baseName), item._selectedTier)
  if (JEWEL_CATEGORIES.has(item.category)) {
    const mats = jewels.get(recipeKey(item.name))?.Materials?.trim()
    if (!mats || mats === '-' || /cannot be crafted/i.test(mats)) return null
    return mats
  }
  return null
}

function getRecipeDisplay(recipe: WeaponRecipeRow | undefined, tier: string): string | null {
  if (!recipe) return null
  if (tier === 'base') {
    const mats = recipe.Materials
    if (!mats || /cannot be crafted/i.test(mats)) return null
    return mats
  }
  const columnByTier: Record<string, keyof WeaponRecipeRow> = {
    Good: 'Materials to upgrade',
    Great: 'Upgrade to Great',
    Grand: 'Upgrade to Grand',
    Enchanted: 'Upgrade to Enchanted',
    Empowered: 'Upgrade to Empowered',
  }
  const column = columnByTier[tier]
  return column ? recipe[column] || null : null
}

function RecipeTag({ materials }: { materials: string }) {
  const [hovered, setHovered] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)

  const handleEnter = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      const tooltipWidth = 224
      let left = rect.left + rect.width / 2 - tooltipWidth / 2
      left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8))
      setCoords({ top: rect.top - 8, left })
    }
    setHovered(true)
  }

  const isSpecial = /polishing stone|cannot be upgraded/i.test(materials)
  const ingredients = isSpecial ? [materials] : materials.split(',').map((s) => s.trim()).filter(Boolean)

  return (
    <span className="relative inline-block">
      <span
        ref={triggerRef}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setHovered(false)}
        className="ml-1 cursor-help text-xs font-semibold text-verdant underline decoration-dotted"
      >
        [RECIPE]
      </span>
      {hovered && coords && createPortal(
        <div
          className="fixed z-50 w-56 -translate-y-full rounded-lg border border-parchment-300 bg-parchment-100 p-3 text-left shadow-lg dark:border-ash/20 dark:bg-ink"
          style={{ top: coords.top, left: coords.left }}
        >
          <p className="mb-1 font-heading text-sm font-semibold text-gilt">Materials Required</p>
          <div className="space-y-0.5 text-xs text-parchment-700 dark:text-parchment-300">
            {ingredients.map((ing, i) => <p key={i}>{ing}</p>)}
          </div>
        </div>,
        document.body
      )}
    </span>
  )
}

// Includes class and gender so same-named items for different classes don't select together.
// One slot in the Compare window. The same item can sit in several slots (each with its own enchant).
interface CompareEntry {
  uid: string
  item: DisplayRow
}
let compareUidCounter = 0
const newCompareUid = () => `c${++compareUidCounter}`

function compareKey(item: DisplayRow): string {
  return `${item.category}|${item.class ?? ''}|${item.gender ?? ''}|${item.name}|${item._selectedTier}`
}

const hasText = (v: unknown): v is string =>
  typeof v === 'string' && v.trim() !== '' && v.trim() !== '-'

// Shortens long level names so they fit inside the REQ circle.
function shortLevel(level: string): string {
  const cleaned = level.replace(/\s*\(pure\)\s*/gi, ' ').trim()
  if (/^(grand\s*master|gm)$/i.test(cleaned)) return 'GM'
  if (/^master$/i.test(cleaned)) return 'M'
  return cleaned
}

function reqFontClass(level: string): string {
  const n = level.length
  if (n <= 3) return 'text-xl'
  if (n <= 5) return 'text-base'
  if (n <= 8) return 'text-xs'
  return 'text-[9px]'
}

function categoryIcon(category: string): LucideIcon {
  if (category === 'weapon') return Swords
  if (['ring', 'earring', 'necklace', 'accessory'].includes(category)) return Gem
  return Shield
}

interface StatEntry {
  id: string
  label: string
  value: number | null | undefined
  cls: string
}

interface StatGroup {
  id: string
  perRow: 2 | 3 | 4 | 5
  entries: StatEntry[]
}

const TILE_BASIS: Record<number, string> = {
  2: 'basis-1/2',
  3: 'basis-1/3',
  4: 'basis-1/4',
  5: 'basis-1/5',
}

function StatPanel({
  groups,
  sortKey,
  sortDir,
  onSort,
}: {
  groups: StatGroup[]
  sortKey: string
  sortDir: 'asc' | 'desc'
  onSort: (key: string) => void
}) {
  const visible = groups
    .map((g) => ({
      ...g,
      entries: g.entries.filter((e) => e.value !== null && e.value !== undefined),
    }))
    .filter((g) => g.entries.length > 0)
  if (visible.length === 0) return null

  return (
    <div className="mt-3 rounded-xl border border-parchment-300/70 bg-parchment-50/60 px-1 dark:border-ash/15 dark:bg-obsidian/40">
      {visible.map((g, gi) => (
        <div
          key={g.id}
          className={`flex flex-wrap justify-center py-1.5 ${
            gi > 0 ? 'border-t border-parchment-300/60 dark:border-ash/10' : ''
          }`}
        >
          {g.entries.map((e) => {
            const active = sortKey === e.id
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => onSort(e.id)}
                title={`Sort by ${e.label}`}
                className={`${TILE_BASIS[g.perRow]} rounded-md px-0.5 py-0.5 text-center transition-colors hover:bg-gilt/10 ${
                  active ? 'bg-gilt/15 ring-1 ring-gilt/60' : ''
                } ${e.cls}`}
              >
                <span className="block text-[11px] font-semibold uppercase tracking-wider opacity-80">
                  {e.label}
                  {active && <span className="ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </span>
                <span className="block text-lg font-bold leading-tight">{e.value}</span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function EquipmentCard({
  item,
  seller,
  recipeText,
  compareMode,
  checked,
  onToggleCompare,
  sortKey,
  sortDir,
  onSort,
  upgradeCount = 0,
  upgradesOpen = false,
  onToggleUpgrades,
  highlight = false,
}: {
  item: DisplayRow
  seller?: { npc: string; town: string }
  recipeText: string | null
  compareMode: boolean
  checked: boolean
  onToggleCompare: (item: DisplayRow) => void
  sortKey: string
  sortDir: 'asc' | 'desc'
  onSort: (key: string) => void
  upgradeCount?: number
  upgradesOpen?: boolean
  onToggleUpgrades?: () => void
  highlight?: boolean
}) {
  const Icon = categoryIcon(item.category)
  const gender = item.gender ? GENDER_BADGE[item.gender.toLowerCase()] : undefined
  const classText = item.class ? classLabels[item.class] ?? item.class : null
  const level =
    item.level == null || String(item.level).trim() === '' ? null : shortLevel(String(item.level).trim())
  const location = hasText(item.location) ? item.location.trim() : null
  const hasFooter = !!location || !!seller
  const linkCls = 'underline decoration-gilt/60 hover:decoration-gilt'

  // In compare mode, a click anywhere on the card selects it, except on links
  // and anything marked data-no-select (the Upgrades button).
  const handleCardClick = (e: React.MouseEvent) => {
    if (!compareMode) return
    if ((e.target as HTMLElement).closest('a, [data-no-select]')) return
    onToggleCompare(item)
  }

  // Stats and the REQ circle only sort when compare mode is off; in compare
  // mode their clicks fall through to the card and select it instead.
  const statSort = compareMode ? () => {} : onSort

  const s = item.stats
  const p = item.percentages
  const stat = (id: string, label: string, value: number | null | undefined): StatEntry => ({
    id,
    label,
    value,
    cls: STAT_COLORS[id],
  })
  const statGroups: StatGroup[] = [
    {
      id: 'vitals',
      perRow: 4,
      entries: [stat('hp', 'HP', s.hp), stat('mp', 'MP', s.mp), stat('ac', 'AC', s.ac), stat('mr', 'MR', s.mr)],
    },
    {
      id: 'attributes',
      perRow: 5,
      entries: [
        stat('str', 'STR', s.str),
        stat('int', 'INT', s.int),
        stat('wis', 'WIS', s.wis),
        stat('con', 'CON', s.con),
        stat('dex', 'DEX', s.dex),
      ],
    },
    {
      id: 'offense',
      perRow: 4,
      entries: [
        stat('dmg', 'DMG', s.dmg),
        stat('hit', 'HIT', s.hit),
        stat('as', 'AS%', p.attackSpeed),
        stat('cdr', 'CDR%', p.cooldownReduction),
      ],
    },
    {
      id: 'skillspell',
      perRow: 4,
      entries: [
        stat('skd', 'SKD', p.skillDamage),
        stat('skdp', 'SKD%', p.skillDamagePercent),
        stat('spd', 'SPD', p.spellDamage),
        stat('spdp', 'SPD%', p.spellDamagePercent),
      ],
    },
    {
      id: 'healing',
      perRow: 4,
      entries: [stat('heal', 'HEAL', p.flatHealBonus), stat('healp', 'HEAL%', p.healBonusPercent)],
    },
  ]

  return (
    <article
      onClick={handleCardClick}
      className={`flex flex-col rounded-2xl border bg-parchment-100 p-4 text-parchment-800 shadow-sm transition-colors dark:bg-ink dark:text-ivory/90 ${
        compareMode ? 'cursor-pointer select-none' : ''
      } ${
        checked
          ? 'border-gilt ring-2 ring-gilt/60'
          : highlight
            ? 'border-gilt'
            : 'border-parchment-300 hover:border-gilt/50 dark:border-ash/10'
      }`}
    >
      {compareMode && (
        // The checkbox is now just an indicator; the card handles the click.
        // It stays keyboard-focusable: pressing Space on it still toggles.
        <div className="pointer-events-none mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ash">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => {}}
            className="h-4 w-4 rounded border-ash/40 accent-gilt"
          />
          Compare
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex h-[70px] w-[70px] shrink-0 items-center justify-center overflow-hidden rounded-sm border border-gilt/40 bg-parchment-200 dark:bg-obsidian">
          <Icon size={30} className="text-gilt/60" />
        </div>

        <div className="min-w-0 flex-1 text-center">
          <h3 className="break-words text-xl font-semibold italic leading-tight text-gilt">
            {item.name}
            {gender && (
              <span title={gender.title} className={`ml-1.5 not-italic ${gender.cls}`}>
                {gender.symbol}
              </span>
            )}
          </h3>
          {classText && (
            <p className="mt-0.5 text-sm font-semibold italic text-parchment-600 dark:text-parchment-400">
              {classText}
            </p>
          )}
          {recipeText && (
            <p className="mt-0.5">
              <RecipeTag materials={recipeText} />
            </p>
          )}
        </div>

        {level ? (
          <button
            type="button"
            onClick={compareMode ? undefined : () => onSort('level')}
            title={compareMode ? undefined : 'Sort by level'}
            className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-2 border-gilt bg-gilt/10 text-center leading-none text-gilt transition-colors hover:bg-gilt/25"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider">REQ</span>
            <span className={`mt-0.5 font-bold ${reqFontClass(level)}`}>{level}</span>
          </button>
        ) : (
          <div className="h-14 w-14 shrink-0" />
        )}
      </div>

      <StatPanel groups={statGroups} sortKey={sortKey} sortDir={sortDir} onSort={statSort} />

      {(hasFooter || upgradeCount > 0) && (
        <div className="mt-auto pt-3">
          {upgradeCount > 0 && onToggleUpgrades && (
            <button
              type="button"
              data-no-select
              onClick={onToggleUpgrades}
              aria-expanded={upgradesOpen}
              className="mb-3 flex w-full items-center justify-center gap-1 rounded-lg border border-gilt/40 bg-gilt/10 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-gilt transition-colors hover:bg-gilt/20"
            >
              {upgradesOpen ? 'Hide upgrades' : `Upgrades (${upgradeCount})`}
              <ChevronRight size={14} className={upgradesOpen ? 'rotate-180' : ''} />
            </button>
          )}

          {hasFooter && (
            <div className="flex items-end justify-between gap-3 border-t border-parchment-300 pt-3 text-sm dark:border-ash/20">
              <span className="min-w-0 text-left text-parchment-700 dark:text-parchment-300">
                {location && !item.locationLink ? location : ''}
              </span>
              <span className="flex min-w-0 flex-col items-end text-right">
                {location && item.locationLink && (
                  <Link to={item.locationLink} className={linkCls}>
                    {location}
                  </Link>
                )}
                {seller && (
                  <Link to={`/towns/${seller.town}`} className={linkCls}>
                    Sold by {seller.npc}
                  </Link>
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

// ── Enchants (from the Enchanting tab data) ──

interface EnchantRow {
  Enchant?: string
  Effects?: string
  Rank?: string
  Name?: string
  Level?: string
}

interface Enchant {
  id: string
  name: string
  rank: string
  effects: string
}

// Highest rank first, which is the order the dropdown lists them in.
const ENCHANT_RANKS = ['Master', 'Expert', 'Advanced', 'Adept', 'Artisan', 'Initiate', 'Basic', 'Beginner']

let enchantPromise: Promise<Enchant[]> | null = null

function loadEnchants(): Promise<Enchant[]> {
  if (!enchantPromise) {
    enchantPromise = fetch(enchantsUrl)
      .then((r) => (r.ok ? (r.json() as Promise<EnchantRow[]>) : []))
      .catch(() => [] as EnchantRow[])
      .then((rows) => {
        const list: Enchant[] = []
        rows.forEach((r, i) => {
          const name = (r.Name ?? '').trim()
          if (!name) return
          const rankRaw = (r.Rank ?? '').trim()
          const rank = ENCHANT_RANKS.find((x) => x.toLowerCase() === rankRaw.toLowerCase()) ?? (rankRaw || 'Other')
          list.push({ id: String(i), name, rank, effects: (r.Effects ?? '').trim() })
        })
        return list
      })
  }
  return enchantPromise
}

// Master -> Beginner, each rank sorted by name. Unknown ranks go last.
function groupEnchants(list: Enchant[]): { rank: string; items: Enchant[] }[] {
  const byRank = new Map<string, Enchant[]>()
  for (const e of list) {
    const bucket = byRank.get(e.rank)
    if (bucket) bucket.push(e)
    else byRank.set(e.rank, [e])
  }
  const order = [...ENCHANT_RANKS, ...[...byRank.keys()].filter((k) => !ENCHANT_RANKS.includes(k))]
  return order
    .filter((r) => byRank.has(r))
    .map((rank) => ({
      rank,
      items: byRank.get(rank)!.slice().sort((a, b) => a.name.localeCompare(b.name)),
    }))
}

interface StatTarget {
  kind: 'stat' | 'pct'
  key: string
}

// Turns the wording used in the enchant effects ("Flat Skill DMG", "Atk Spd", "ATK Speed",
// "Flat Skill Damage", ...) into the stat it changes. Returns null when it isn't recognised.
function enchantTarget(rawLabel: string): StatTarget | null {
  const l = rawLabel
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .replace(/\bdamage\b/g, 'dmg')
    .replace(/\bspeed\b/g, 'spd')
    .replace(/\battack\b/g, 'atk')
    .replace(/\s+/g, ' ')
    .trim()
  if (/^(hp|mp|ac|mr|str|int|wis|con|dex|dmg|hit)$/.test(l)) return { kind: 'stat', key: l }
  if (/^(atk spd|as)$/.test(l)) return { kind: 'pct', key: 'attackSpeed' }
  let m = l.match(/^(flat )?skill dmg$/)
  if (m) return { kind: 'pct', key: m[1] ? 'skillDamage' : 'skillDamagePercent' }
  m = l.match(/^(flat )?spell dmg$/)
  if (m) return { kind: 'pct', key: m[1] ? 'spellDamage' : 'spellDamagePercent' }
  m = l.match(/^(flat )?(heal|heal bonus|healing)$/)
  if (m) return { kind: 'pct', key: m[1] ? 'flatHealBonus' : 'healBonusPercent' }
  if (/^(cdr|cooldown reduction|cooldown)$/.test(l)) return { kind: 'pct', key: 'cooldownReduction' }
  return null
}

// "+3 DMG +20 Flat Skill DMG -1% MR", "+1% ATK Speed, +1 DMG", "+1% Skill DMG + 6 Flat Skill DMG"
// all work: pieces are split at commas and before every +/- number.
function parseEffects(effects: string): { deltas: { target: StatTarget; amount: number }[]; unknown: string[] } {
  const text = effects.replace(/[−–—]/g, '-')
  const tokens = text
    .split(/\s*,\s*|\s+(?=[+-]\s*\d)/)
    .map((t) => t.trim())
    .filter(Boolean)
  const deltas: { target: StatTarget; amount: number }[] = []
  const unknown: string[] = []
  for (const tok of tokens) {
    const m = tok.match(/^([+-])?\s*(\d+(?:\.\d+)?)\s*%?\s*(.+)$/)
    const target = m ? enchantTarget(m[3]) : null
    if (!m || !target) {
      unknown.push(tok)
      continue
    }
    deltas.push({ target, amount: (m[1] === '-' ? -1 : 1) * parseFloat(m[2]) })
  }
  return { deltas, unknown }
}

const COMPARE_ROWS: { kind: 'stat' | 'pct'; key: string; label: string }[] = [
  ...Object.entries(statLabels).map(([key, label]) => ({ kind: 'stat' as const, key, label })),
  ...Object.entries(percentLabels).map(([key, label]) => ({ kind: 'pct' as const, key, label })),
]

// One item's stats with an optional enchant added on top. `changed` holds the
// amount each stat moved so the table can flag it.
function resolveColumn(item: DisplayRow, enchant: Enchant | undefined) {
  const parsed = enchant ? parseEffects(enchant.effects) : null
  const add = new Map<string, number>()
  parsed?.deltas.forEach(({ target, amount }) => {
    const k = `${target.kind}:${target.key}`
    add.set(k, (add.get(k) ?? 0) + amount)
  })
  const values = new Map<string, number | null>()
  const changed = new Map<string, number>()
  for (const row of COMPARE_ROWS) {
    const base = (row.kind === 'stat' ? item.stats[row.key] : item.percentages[row.key]) ?? null
    const d = add.get(`${row.kind}:${row.key}`)
    if (d !== undefined && d !== 0) {
      values.set(row.label, Math.round(((base ?? 0) + d) * 100) / 100)
      changed.set(row.label, d)
    } else {
      values.set(row.label, base)
    }
  }
  return { values, changed, unknown: parsed?.unknown ?? [] }
}

// Stats where a LOWER number is the better one (shown green in Compare).
const LOWER_IS_BETTER = new Set(['AC'])

const CELL_NEUTRAL = 'bg-parchment-100 text-parchment-800 dark:bg-ink dark:text-ivory/90'
const CELL_BEST = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
const CELL_WORST = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'

function CompareBar({
  items,
  enchants,
  onRemove,
  onDuplicate,
  onClear,
  onClose,
}: {
  items: CompareEntry[]
  enchants: Enchant[]
  onRemove: (uid: string) => void
  onDuplicate: (uid: string) => void
  onClear: () => void
  onClose: () => void
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  // null = the window sizes itself to fit everything; set once the user drags the resize corner.
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [picked, setPicked] = useState<Record<string, string>>({})
  const dragRef = useRef<{ startX: number; startY: number; origTop: number; origLeft: number } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const resizingRef = useRef(false)

  useEffect(() => {
    if (pos !== null) return
    setPos({ top: 80, left: Math.max(16, window.innerWidth - 480) })
  }, [pos])

  // Keep the window on screen when its size changes (more items, a window resize, ...).
  const placed = pos !== null
  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    const clamp = () =>
      setPos((p) => {
        if (!p) return p
        const left = Math.max(8, Math.min(p.left, window.innerWidth - el.offsetWidth - 8))
        const top = Math.max(8, Math.min(p.top, window.innerHeight - el.offsetHeight - 8))
        return left === p.left && top === p.top ? p : { top, left }
      })
    const ro = new ResizeObserver(clamp)
    ro.observe(el)
    window.addEventListener('resize', clamp)
    clamp()
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', clamp)
    }
  }, [placed])

  // Only a drag that starts on the bottom-right resize corner counts as a manual resize.
  useEffect(() => {
    const up = () => {
      if (!resizingRef.current) return
      resizingRef.current = false
      const el = panelRef.current
      if (el) setSize({ width: el.offsetWidth, height: el.offsetHeight })
    }
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!pos) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, origTop: pos.top, origLeft: pos.left }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const { startX, startY, origTop, origLeft } = dragRef.current
    const panelWidth = panelRef.current?.offsetWidth ?? 460
    const panelHeight = panelRef.current?.offsetHeight ?? 500
    let newLeft = origLeft + (e.clientX - startX)
    let newTop = origTop + (e.clientY - startY)
    newLeft = Math.max(8, Math.min(newLeft, window.innerWidth - panelWidth - 8))
    newTop = Math.max(8, Math.min(newTop, window.innerHeight - panelHeight - 8))
    setPos({ top: newTop, left: newLeft })
  }

  const handlePointerUp = () => {
    dragRef.current = null
  }

  const groups = useMemo(() => groupEnchants(enchants), [enchants])
  const enchantById = useMemo(() => new Map(enchants.map((e) => [e.id, e])), [enchants])

  const cols = useMemo(
    () =>
      items.map(({ uid: key, item }) => {
        const enchant = enchantById.get(picked[key] ?? '')
        return { key, item, enchant, ...resolveColumn(item, enchant) }
      }),
    [items, picked, enchantById]
  )

  const rows = useMemo(
    () =>
      COMPARE_ROWS.map((r) => ({ label: r.label, vals: cols.map((c) => c.values.get(r.label) ?? null) })).filter((r) =>
        r.vals.some((v) => v !== null)
      ),
    [cols]
  )

  // Best value in a row is green, worst is red, anything between stays neutral.
  const cellClass = (label: string, v: number | null, vals: (number | null)[]) => {
    const nums = vals.map((x) => x ?? 0)
    const max = Math.max(...nums)
    const min = Math.min(...nums)
    if (max === min) return CELL_NEUTRAL
    const lowerBetter = LOWER_IS_BETTER.has(label)
    const best = lowerBetter ? min : max
    const worst = lowerBetter ? max : min
    const n = v ?? 0
    if (n === best) return CELL_BEST
    if (n === worst) return CELL_WORST
    return CELL_NEUTRAL
  }

  if (!pos) return null

  const headBtn =
    'rounded border border-parchment-300 px-2 py-1 text-xs font-medium text-parchment-600 hover:border-gilt hover:text-gilt dark:border-ash/20 dark:text-ash'
  const boxCls =
    'rounded-lg border border-parchment-300 bg-parchment-100 dark:border-ash/10 dark:bg-ink'
  const n = cols.length

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-[100] flex min-h-[200px] min-w-[320px] max-h-[calc(100vh-16px)] max-w-[calc(100vw-16px)] flex-col resize overflow-hidden rounded-lg border border-parchment-300 bg-parchment-50 shadow-[0_8px_30px_rgba(0,0,0,0.3)] dark:border-ash/20 dark:bg-obsidian"
      style={{
        top: pos.top,
        left: pos.left,
        width: size ? size.width : 'max-content',
        height: size ? size.height : 'auto',
      }}
      onMouseDown={(e) => {
        const el = panelRef.current
        if (!el) return
        const r = el.getBoundingClientRect()
        resizingRef.current = e.clientX > r.right - 22 && e.clientY > r.bottom - 22
      }}
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex shrink-0 cursor-move items-center justify-between gap-6 rounded-t-lg border-b border-parchment-300 bg-parchment-100 px-3 py-2 dark:border-ash/20 dark:bg-ink"
      >
        <h3 className="select-none whitespace-nowrap font-heading text-sm font-semibold text-gilt">Compare Equipment</h3>
        <div className="flex items-center gap-2">
          {size && (
            <button onClick={() => setSize(null)} className={headBtn} title="Resize the window to fit everything">
              Auto-fit
            </button>
          )}
          <button
            onClick={() => {
              setPicked({})
              onClear()
            }}
            className={headBtn}
          >
            Clear
          </button>
          <button onClick={onClose} className={headBtn}>
            Close
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {n === 0 ? (
          <p className="whitespace-nowrap text-sm text-parchment-500 dark:text-parchment-600">
            Tick the Compare box on as many items as you like to compare their stats.
          </p>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: `88px repeat(${n}, minmax(150px, max-content))` }}>
            {/* Item names */}
            <div />
            {cols.map((c, i) => (
              <div key={c.key} className="px-1 pb-2">
                <div className={`relative px-3 py-2 ${boxCls}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-parchment-500 dark:text-parchment-600">
                    Item {i + 1}
                  </p>
                  <p className="whitespace-nowrap pr-4 font-heading text-sm font-semibold text-gilt">{c.item.name}</p>
                  <p className="text-xs text-parchment-500 dark:text-parchment-600">Level {c.item.level ?? '-'}</p>
                  <button
                    type="button"
                    onClick={() => onDuplicate(c.key)}
                    title="Add another copy of this item, to compare it with a different enchant"
                    className="absolute bottom-1.5 right-1.5 rounded border border-parchment-300 px-1.5 text-[10px] font-medium text-parchment-600 hover:border-gilt hover:text-gilt dark:border-ash/20 dark:text-ash"
                  >
                    + Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(c.key)}
                    aria-label={`Remove ${c.item.name} from compare`}
                    title="Remove from compare"
                    className="absolute right-1.5 top-1 rounded px-1 text-xs text-parchment-500 hover:text-gilt dark:text-ash"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

            {/* Enchant pickers */}
            <div className="flex items-start pt-2 text-[10px] font-semibold uppercase tracking-wider text-parchment-500 dark:text-parchment-600">
              Enchant
            </div>
            {cols.map((c) => (
              <div key={c.key} className="min-w-0 px-1 pb-3">
                <select
                  value={picked[c.key] ?? ''}
                  onChange={(e) => setPicked((p) => ({ ...p, [c.key]: e.target.value }))}
                  aria-label={`Enchant for ${c.item.name}`}
                  className="w-full rounded-lg border border-parchment-300 bg-parchment-100 px-2 py-1.5 text-sm text-parchment-800 outline-none focus:border-gilt dark:border-ash/20 dark:bg-ink dark:text-ivory dark:[color-scheme:dark]"
                >
                  <option value="">{' '}</option>
                  {groups.map((g) => (
                    <optgroup key={g.rank} label={g.rank}>
                      {g.items.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {c.enchant && (
                  // width 0 + min-width 100% keeps long effect text from stretching the column
                  <p
                    className="mt-1 text-[11px] leading-snug text-parchment-500 dark:text-parchment-600"
                    style={{ width: 0, minWidth: '100%' }}
                  >
                    {c.enchant.effects}
                    {c.unknown.length > 0 && (
                      <span className="text-amber-600 dark:text-amber-300"> (not counted: {c.unknown.join(', ')})</span>
                    )}
                  </p>
                )}
              </div>
            ))}

            {/* Stats */}
            {rows.length === 0 ? (
              <p className="col-span-full text-sm text-parchment-500 dark:text-parchment-600">No stats to compare.</p>
            ) : (
              rows.map((r, i) => (
                <div key={r.label} className="contents">
                  <div
                    className={`px-3 py-1.5 text-sm font-medium text-parchment-600 dark:text-parchment-400 ${
                      i % 2 ? 'bg-parchment-100/50 dark:bg-ink/20' : ''
                    }`}
                  >
                    {r.label}
                  </div>
                  {cols.map((c, ci) => {
                    const delta = c.changed.get(r.label)
                    return (
                      <div
                        key={c.key}
                        className={`px-3 py-1.5 text-right text-sm font-semibold ${cellClass(r.label, r.vals[ci], r.vals)}`}
                      >
                        {delta !== undefined && (
                          <span
                            className="mr-1.5 inline-block text-amber-600 dark:text-amber-300"
                            title={`${delta > 0 ? '+' : ''}${delta} from ${c.enchant?.name ?? 'enchant'}`}
                          >
                            {delta > 0 ? '▲' : '▼'}
                          </span>
                        )}
                        {r.vals[ci] ?? '-'}
                      </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

// List view: variant rows always sort using their group's base row, and rows
// inside a group keep their built order, so an expanded item never scatters.
function groupedSortingFn(
  getValue: (row: DisplayRow) => unknown,
  compareRaw: (a: unknown, b: unknown) => number,
  parentLookup: Map<string, DisplayRow>,
) {
  return (rowA: Row<DisplayRow>, rowB: Row<DisplayRow>) => {
    const a = rowA.original
    const b = rowB.original
    if (a._groupKey === b._groupKey) return 0
    const parentA = parentLookup.get(a._groupKey) ?? a
    const parentB = parentLookup.get(b._groupKey) ?? b
    return compareRaw(getValue(parentA), getValue(parentB))
  }
}

function compareNum(a: unknown, b: unknown): number {
  const an = a == null ? -Infinity : Number(a)
  const bn = b == null ? -Infinity : Number(b)
  return an - bn
}

function compareStr(a: unknown, b: unknown): number {
  const as = a == null ? '' : String(a)
  const bs = b == null ? '' : String(b)
  return as.localeCompare(bs, undefined, { numeric: true, sensitivity: 'base' })
}

function levelRankValue(raw: unknown): { tier: number; num: number } {
  if (raw == null || raw === '' || raw === '-') return { tier: 5, num: 0 }
  const s = String(raw).trim()
  if (/^ab\s*\d+/i.test(s)) {
    const n = s.match(/\d+/)
    return { tier: 3, num: n ? parseFloat(n[0]) : 0 }
  }
  if (/^(grand\s*master|gm)$/i.test(s)) return { tier: 2, num: 0 }
  if (/^master$/i.test(s)) return { tier: 1, num: 0 }
  const n = s.match(/-?\d+(?:\.\d+)?/)
  if (n) return { tier: 0, num: parseFloat(n[0]) }
  return { tier: 4, num: 0 }
}

function compareLevelRaw(a: unknown, b: unknown): number {
  const ra = levelRankValue(a)
  const rb = levelRankValue(b)
  if (ra.tier !== rb.tier) return ra.tier - rb.tier
  return ra.num - rb.num
}

// Card view sorting. Items missing the chosen stat always go last.
function cardSortCompare(key: string, dir: number, a: EquipmentItem, b: EquipmentItem): number {
  if (key === 'name') return dir * compareStr(a.name, b.name)
  if (key === 'level') return dir * compareLevelRaw(a.level, b.level)
  const get = SORT_GETTERS[key]
  if (!get) return 0
  const av = get(a)
  const bv = get(b)
  if (av == null && bv == null) return 0
  if (av == null) return 1
  if (bv == null) return -1
  return dir * (av - bv)
}

export function Equipment() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedClass, setSelectedClass] = useState('all')
  const [data, setData] = useState<EquipmentItem[] | null>(equipmentCache)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [textSize, setTextSize] = useState<'normal' | 'large'>('normal')
  const [shopIndex, setShopIndex] = useState<Map<string, { npc: string; town: string }>>(new Map())
  const [weaponRecipes, setWeaponRecipes] = useState<Map<string, WeaponRecipeRow>>(new Map())
  const [jewelRecipes, setJewelRecipes] = useState<Map<string, JewelRecipeRow>>(new Map())
  const [compareMode, setCompareMode] = useState(false)
  const [compareItems, setCompareItems] = useState<CompareEntry[]>([])
  const [enchants, setEnchants] = useState<Enchant[]>([])
  const [sortKey, setSortKey] = useState('level')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [cardQuery, setCardQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [viewMode, setViewMode] = useState<'cards' | 'list'>(() => {
    try {
      return localStorage.getItem('equipmentViewMode') === 'list' ? 'list' : 'cards'
    } catch {
      return 'cards'
    }
  })

  const changeView = (v: 'cards' | 'list') => {
    setViewMode(v)
    try {
      localStorage.setItem('equipmentViewMode', v)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (equipmentCache) return
    let alive = true
    loadEquipment().then((items) => {
      if (alive) setData(items)
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let alive = true
    loadShopIndex().then((index) => {
      if (alive) setShopIndex(index)
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let alive = true
    loadWeaponRecipes().then((index) => {
      if (alive) setWeaponRecipes(index)
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let alive = true
    loadJewelRecipes().then((index) => {
      if (alive) setJewelRecipes(index)
    })
    return () => { alive = false }
  }, [])

  // Enchant list for the Compare window; only fetched once Compare is opened.
  useEffect(() => {
    if (!compareMode) return
    let alive = true
    loadEnchants().then((list) => {
      if (alive) setEnchants(list)
    })
    return () => { alive = false }
  }, [compareMode])

  // Start the card list over from the top whenever the view of it changes.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [selectedCategory, selectedClass, cardQuery, sortKey, sortDir, viewMode])

  const filteredData = useMemo(() => {
    if (!data) return []
    let items = data
    if (selectedCategory !== 'all') {
      items = items.filter((item) => item.category === selectedCategory)
    }
    if (selectedClass !== 'all') {
      items = items.filter((item) => !item.class || item.class === selectedClass)
    }
    return items
  }, [data, selectedCategory, selectedClass])

  const groups = useMemo(() => groupEquipment(filteredData), [filteredData])

  // One representative row per group: the base tier if it exists, else the
  // first tier in order. It is the collapsed row/card and the sort value for
  // the whole group.
  const baseRowByGroup = useMemo(() => {
    const map = new Map<string, DisplayRow>()
    for (const g of groups) {
      const tier = g.tiers['base'] ? 'base' : g.availableTiers[0]
      map.set(g.key, makeRow(g, tier, false))
    }
    return map
  }, [groups])

  // List view rows (several groups can be expanded at once).
  const displayRows = useMemo<DisplayRow[]>(() => {
    const rows: DisplayRow[] = []
    for (const g of groups) {
      const baseRow = baseRowByGroup.get(g.key)!
      rows.push(baseRow)
      if (expandedGroups[g.key]) {
        for (const tier of g.availableTiers) {
          if (tier === baseRow._selectedTier) continue
          rows.push(makeRow(g, tier, true))
        }
      }
    }
    return rows
  }, [groups, baseRowByGroup, expandedGroups])

  // Card view groups: search, then sort by each group's base item.
  const cardGroups = useMemo<CardGroup[]>(() => {
    const q = cardQuery.trim().toLowerCase()
    const dir = sortDir === 'asc' ? 1 : -1
    const list: CardGroup[] = []
    for (const g of groups) {
      const base = baseRowByGroup.get(g.key)!
      const variants = g.availableTiers
        .filter((t) => t !== base._selectedTier)
        .map((t) => makeRow(g, t, true))
      if (q) {
        const haystack = [base, ...variants]
          .map((r) =>
            [r.name, r.location, r.class ? classLabels[r.class] ?? r.class : '', r.gender]
              .filter(Boolean)
              .join(' ')
          )
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) continue
      }
      list.push({ key: g.key, base, variants })
    }
    list.sort(
      (a, b) =>
        cardSortCompare(sortKey, dir, a.base, b.base) || compareStr(a.base.name, b.base.name)
    )
    return list
  }, [groups, baseRowByGroup, cardQuery, sortKey, sortDir])

  const toggleExpand = (groupKey: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }))
  }

  const toggleCompare = (item: DisplayRow) => {
    setCompareItems((prev) => {
      const key = compareKey(item)
      // Ticking an already-selected item removes it (and any copies of it).
      if (prev.some((p) => compareKey(p.item) === key)) return prev.filter((p) => compareKey(p.item) !== key)
      return [...prev, { uid: newCompareUid(), item }]
    })
  }

  const removeCompareEntry = (uid: string) => setCompareItems((prev) => prev.filter((p) => p.uid !== uid))

  const duplicateCompareEntry = (uid: string) =>
    setCompareItems((prev) => {
      const i = prev.findIndex((p) => p.uid === uid)
      if (i < 0) return prev
      return [...prev.slice(0, i + 1), { uid: newCompareUid(), item: prev[i].item }, ...prev.slice(i + 1)]
    })

    // Clicking a stat sorts by it; clicking it again reverses the order.
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'level' || LOWEST_FIRST.has(key) ? 'asc' : 'desc')
    }
  }

  const resetSort = () => {
    setSortKey('level')
    setSortDir('asc')
  }

  const renderCard = (
    row: DisplayRow,
    extra: {
      upgradeCount?: number
      upgradesOpen?: boolean
      onToggleUpgrades?: () => void
      highlight?: boolean
    } = {}
  ) => (
    <EquipmentCard
      key={compareKey(row)}
      item={row}
      seller={shopIndex.get(row.name)}
      recipeText={recipeTextFor(row, weaponRecipes, jewelRecipes)}
      compareMode={compareMode}
      checked={compareItems.some((p) => compareKey(p.item) === compareKey(row))}
      onToggleCompare={toggleCompare}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={handleSort}
      {...extra}
    />
  )

  const columnHelper = useMemo(() => createColumnHelper<DisplayRow>(), [])

  const columns = useMemo(() => {
    const tierTextClass = textSize === 'large' ? 'text-lg' : 'text-sm'
    const soldByTextClass = textSize === 'large' ? 'text-sm' : 'text-xs'
    const showGender = selectedCategory === 'armor' || selectedCategory === 'helmet'

    const g = (fn: (row: DisplayRow) => unknown, kind: 'num' | 'str' | 'level') =>
      groupedSortingFn(fn, kind === 'num' ? compareNum : kind === 'level' ? compareLevelRaw : compareStr, baseRowByGroup)

    const baseColumns = []

    if (compareMode) {
      baseColumns.push(
        columnHelper.display({
          id: 'compare',
          header: 'Compare',
          cell: ({ row }) => {
            const item = row.original
            const checked = compareItems.some((p) => compareKey(p.item) === compareKey(item))
            return (
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleCompare(item)}
                className="h-4 w-4 rounded border-ash/40 accent-gilt"
              />
            )
          },
        })
      )
    }

    baseColumns.push(
      columnHelper.display({
        id: 'tier',
        header: 'Tier',
        cell: ({ row }) => {
          const r = row.original
          if (r._isVariant) {
            return (
              <span className={`${tierTextClass} pl-3 font-medium text-parchment-500 dark:text-parchment-500`}>
                ↳ {TIER_LABELS[r._selectedTier]}
              </span>
            )
          }
          if (r._availableTiers.length <= 1) {
            return (
              <span className={`${tierTextClass} font-medium text-parchment-600 dark:text-parchment-400`}>
                {TIER_LABELS[r._selectedTier]}
              </span>
            )
          }
          const isOpen = !!expandedGroups[r._groupKey]
          return (
            <button
              onClick={() => toggleExpand(r._groupKey)}
              className={`flex items-center gap-1 ${tierTextClass} font-medium text-parchment-700 hover:text-gilt dark:text-ash dark:hover:text-gilt`}
            >
              <span className={`inline-block transition-transform ${isOpen ? 'rotate-90' : ''}`}>▸</span>
              {TIER_LABELS[r._selectedTier]}
            </button>
          )
        },
      }),
      columnHelper.accessor('name', {
        header: 'Name',
        sortingFn: g((r) => r.name, 'str'),
        cell: ({ row }) => {
          const item = row.original
          const recipeText = recipeTextFor(item, weaponRecipes, jewelRecipes)
          return (
            <span className={item._isVariant ? 'text-parchment-600 dark:text-ivory/70' : ''}>
              {item.name}
              {recipeText && <RecipeTag materials={recipeText} />}
            </span>
          )
        },
      }),
      columnHelper.accessor('location', {
        header: 'LOC',
        sortingFn: g((r) => r.location, 'str'),
        cell: ({ row }) => {
          const item = row.original
          const seller = shopIndex.get(item.name)
          return (
            <div className="flex flex-col">
              {item.locationLink ? (
                <Link
                  to={item.locationLink}
                  className="underline decoration-gilt/60 hover:decoration-gilt"
                >
                  {item.location || '-'}
                </Link>
              ) : (
                <span>{item.location || '-'}</span>
              )}
              {seller && (
                <Link
                  to={`/towns/${seller.town}`}
                  className={`${soldByTextClass} underline decoration-gilt/60 hover:decoration-gilt`}
                >
                  Sold by {seller.npc}
                </Link>
              )}
            </div>
          )
        },
      }),
    )

    if (showGender) {
      baseColumns.push(
        columnHelper.accessor('gender', {
          header: 'Gender',
          sortingFn: g((r) => r.gender, 'str'),
          cell: (info) => info.getValue() ?? '-',
        })
      )
    }

    return [
      ...baseColumns,
      columnHelper.accessor('level', {
        header: 'LVL',
        sortingFn: g((r) => r.level, 'level'),
        cell: (info) => info.getValue() ?? '-',
      }),
      columnHelper.accessor((row) => row.stats.hp, { id: 'hp', header: 'HP', sortingFn: g((r) => r.stats.hp, 'num'), cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.stats.mp, { id: 'mp', header: 'MP', sortingFn: g((r) => r.stats.mp, 'num'), cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.stats.ac, { id: 'ac', header: 'AC', sortingFn: g((r) => r.stats.ac, 'num'), cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.stats.mr, { id: 'mr', header: 'MR', sortingFn: g((r) => r.stats.mr, 'num'), cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.stats.str, { id: 'str', header: 'STR', sortingFn: g((r) => r.stats.str, 'num'), cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.stats.int, { id: 'int', header: 'INT', sortingFn: g((r) => r.stats.int, 'num'), cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.stats.wis, { id: 'wis', header: 'WIS', sortingFn: g((r) => r.stats.wis, 'num'), cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.stats.con, { id: 'con', header: 'CON', sortingFn: g((r) => r.stats.con, 'num'), cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.stats.dex, { id: 'dex', header: 'DEX', sortingFn: g((r) => r.stats.dex, 'num'), cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.stats.dmg, { id: 'dmg', header: 'DMG', sortingFn: g((r) => r.stats.dmg, 'num'), cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.stats.hit, { id: 'hit', header: 'HIT', sortingFn: g((r) => r.stats.hit, 'num'), cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.percentages.attackSpeed, { id: 'as', header: 'AS%', sortingFn: g((r) => r.percentages.attackSpeed, 'num'), cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.percentages.skillDamage, { id: 'skd', header: 'SKD', sortingFn: g((r) => r.percentages.skillDamage, 'num'), cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.percentages.skillDamagePercent, { id: 'skdp', header: 'SKD%', sortingFn: g((r) => r.percentages.skillDamagePercent, 'num'), cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.percentages.spellDamage, { id: 'spd', header: 'SPD', sortingFn: g((r) => r.percentages.spellDamage, 'num'), cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.percentages.spellDamagePercent, { id: 'spdp', header: 'SPD%', sortingFn: g((r) => r.percentages.spellDamagePercent, 'num'), cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.percentages.flatHealBonus, { id: 'heal', header: 'HEAL', sortingFn: g((r) => r.percentages.flatHealBonus, 'num'), cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.percentages.healBonusPercent, { id: 'healp', header: 'HEAL%', sortingFn: g((r) => r.percentages.healBonusPercent, 'num'), cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.percentages.cooldownReduction, { id: 'cdr', header: 'CDR%', sortingFn: g((r) => r.percentages.cooldownReduction, 'num'), cell: (info) => info.getValue() ?? '-' }),
    ]
  }, [columnHelper, textSize, shopIndex, weaponRecipes, jewelRecipes, selectedCategory, compareMode, compareItems, expandedGroups, baseRowByGroup])

  return (
    <div>
      <h1 className="mb-6 border-l-4 border-l-srad pl-4 font-heading text-3xl font-bold text-parchment-900 dark:text-parchment-100">
        Equipment
      </h1>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <label className="flex items-center gap-2">
          <span className={controlLabelCls}>Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={selectCls}
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className={controlLabelCls}>Class:</span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className={selectCls}
          >
            <option value="all">All Classes</option>
            {classGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((cls) => (
                  <option key={cls} value={cls}>
                    {classLabels[cls]}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        {viewMode === 'cards' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className={controlLabelCls}>Sorted by:</span>
            <span className="text-xs font-semibold text-gilt">
              {SORT_LABELS[sortKey]} {sortDir === 'asc' ? '↑' : '↓'}
            </span>
            {(sortKey !== 'level' || sortDir !== 'asc') && (
              <button type="button" onClick={resetSort} className={pillCls(false)}>
                Reset
              </button>
            )}
            <span className="text-xs text-ash">Click any stat on a card to sort.</span>
          </div>
        )}

        {viewMode === 'list' && (
          <label className="flex items-center gap-2">
            <span className={controlLabelCls}>Text Size:</span>
            <select
              value={textSize}
              onChange={(e) => setTextSize(e.target.value as 'normal' | 'large')}
              className={selectCls}
            >
              <option value="normal">Normal</option>
              <option value="large">Large</option>
            </select>
          </label>
        )}

        <div className="flex items-center gap-1.5">
          <span className={controlLabelCls}>View:</span>
          <button type="button" onClick={() => changeView('cards')} className={pillCls(viewMode === 'cards')}>
            Cards
          </button>
          <button type="button" onClick={() => changeView('list')} className={pillCls(viewMode === 'list')}>
            List
          </button>
        </div>

        <button
          onClick={() => {
            setCompareMode((prev) => !prev)
            if (compareMode) setCompareItems([])
          }}
          className={pillCls(compareMode)}
        >
          {compareMode ? 'Exit Compare Mode' : 'Compare Equipment'}
        </button>
      </div>

      {/* Content */}
      {data === null ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gilt/20 border-t-gilt" />
        </div>
      ) : viewMode === 'list' ? (
        <DataTable
          data={displayRows}
          columns={columns}
          searchPlaceholder="Search equipment..."
          initialSorting={[{ id: 'level', desc: false }]}
          textSize={textSize}
        />
      ) : (
        <div>
          <input
            type="text"
            value={cardQuery}
            onChange={(e) => setCardQuery(e.target.value)}
            placeholder="Search equipment..."
            className="mb-4 w-full rounded-lg border border-parchment-300 bg-parchment-50 px-4 py-2 font-ui text-sm text-parchment-900 outline-none transition-colors placeholder:text-ash focus:border-gilt focus:ring-2 focus:ring-gilt/20 dark:border-ash/20 dark:bg-obsidian dark:text-ivory dark:placeholder:text-ash dark:focus:border-gilt sm:max-w-xs"
          />

          {cardGroups.length === 0 ? (
            <p className="py-10 text-center text-parchment-500 dark:text-parchment-600">No matches.</p>
          ) : (
            <div className={CARD_GRID}>
              {cardGroups.slice(0, visibleCount).map((cg) => {
                const open = openGroup === cg.key && cg.variants.length > 0
                const baseCard = renderCard(cg.base, {
                  upgradeCount: cg.variants.length,
                  upgradesOpen: open,
                  onToggleUpgrades: () => setOpenGroup((cur) => (cur === cg.key ? null : cg.key)),
                  highlight: open,
                })
                if (!open) return baseCard
                return (
                  <div key={cg.key} className={`col-span-full ${CARD_GRID}`}>
                    {baseCard}
                    {cg.variants.map((v) => renderCard(v))}
                  </div>
                )
              })}
            </div>
          )}

          {cardGroups.length > visibleCount && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="rounded-lg border border-gilt px-4 py-2 text-sm font-medium text-gilt transition-colors hover:bg-gilt/10"
              >
                Show more ({cardGroups.length - visibleCount} remaining)
              </button>
            </div>
          )}

          <p className="mt-4 font-ui text-sm text-ash">
            {Math.min(visibleCount, cardGroups.length)} of {cardGroups.length} items
          </p>
        </div>
      )}

      {compareMode && (
        <CompareBar
          items={compareItems}
          enchants={enchants}
          onRemove={removeCompareEntry}
          onDuplicate={duplicateCompareEntry}
          onClear={() => setCompareItems([])}
          onClose={() => {
            setCompareMode(false)
            setCompareItems([])
          }}
        />
      )}
    </div>
  )
}