import { useEffect, useState, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { createColumnHelper, type Row } from '@tanstack/react-table'
import { DataTable, compareLevels } from '@/components/tables/DataTable'
import equipmentUrl from '@/data/equipment/all.json?url'

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

const UPGRADE_TIERS: { key: keyof WeaponRecipeRow; label: string }[] = [
  { key: 'Materials to upgrade', label: 'Good' },
  { key: 'Upgrade to Great', label: 'Great' },
  { key: 'Upgrade to Grand', label: 'Grand' },
  { key: 'Upgrade to Enchanted', label: 'Enchanted' },
  { key: 'Upgrade to Empowered', label: 'Empowered' },
]

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

function compareKey(item: DisplayRow): string {
  return `${item.category}|${item.name}|${item._selectedTier}`
}

// Stats where a LOWER number is the better one (shown green in Compare).
const LOWER_IS_BETTER = new Set(['AC'])

function CompareBar({
  items,
  onClear,
  onClose,
}: {
  items: DisplayRow[]
  onClear: () => void
  onClose: () => void
}) {
  const [a, b] = items
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; origTop: number; origLeft: number } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (pos !== null) return
    const width = 460
    setPos({ top: 80, left: Math.max(16, window.innerWidth - width - 24) })
  }, [pos])

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

  const rows = useMemo(() => {
    const keys = new Set<string>()
    if (a) Object.keys(a.stats).forEach((k) => keys.add(k))
    if (b) Object.keys(b.stats).forEach((k) => keys.add(k))
    const pctKeys = new Set<string>()
    if (a) Object.keys(a.percentages).forEach((k) => pctKeys.add(k))
    if (b) Object.keys(b.percentages).forEach((k) => pctKeys.add(k))

    const statRows = Array.from(keys)
      .filter((k) => statLabels[k])
      .map((k) => ({ label: statLabels[k], va: a?.stats[k] ?? null, vb: b?.stats[k] ?? null }))
    const pctRows = Array.from(pctKeys)
      .filter((k) => percentLabels[k])
      .map((k) => ({ label: percentLabels[k], va: a?.percentages[k] ?? null, vb: b?.percentages[k] ?? null }))

    return [...statRows, ...pctRows].filter((r) => r.va !== null || r.vb !== null)
  }, [a, b])

  const cellClass = (value: number | null, other: number | null, isBetter: (v: number, o: number) => boolean) => {
    const v = value ?? 0
    const o = other ?? 0
    if (v === o) {
      return 'bg-parchment-100 text-parchment-800 dark:bg-ink dark:text-ivory/90'
    }
    return isBetter(v, o)
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  }

  if (!pos) return null

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-[100] flex min-w-[340px] min-h-[280px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-32px)] flex-col resize overflow-hidden rounded-lg border border-parchment-300 bg-parchment-50 shadow-[0_8px_30px_rgba(0,0,0,0.3)] dark:border-ash/20 dark:bg-obsidian"
      style={{
        top: pos.top,
        left: pos.left,
        width: size?.width ?? 460,
        height: size?.height ?? 500,
      }}
      onMouseUp={() => {
        if (panelRef.current) {
          setSize({ width: panelRef.current.offsetWidth, height: panelRef.current.offsetHeight })
        }
      }}
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex shrink-0 cursor-move items-center justify-between rounded-t-lg border-b border-parchment-300 bg-parchment-100 px-3 py-2 dark:border-ash/20 dark:bg-ink"
      >
        <h3 className="select-none font-heading text-sm font-semibold text-gilt">Compare Equipment</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="rounded border border-parchment-300 px-2 py-1 text-xs font-medium text-parchment-600 hover:border-gilt hover:text-gilt dark:border-ash/20 dark:text-ash"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="rounded border border-parchment-300 px-2 py-1 text-xs font-medium text-parchment-600 hover:border-gilt hover:text-gilt dark:border-ash/20 dark:text-ash"
          >
            Close
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-3">
        <div className="mb-3 grid shrink-0 grid-cols-2 gap-2">
          <div className="rounded-lg border border-parchment-300 bg-parchment-100 px-3 py-2 dark:border-ash/10 dark:bg-ink">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-parchment-500 dark:text-parchment-600">Item 1</p>
            <p className="truncate font-heading text-sm font-semibold text-gilt">{a ? a.name : 'Select an item'}</p>
            {a && <p className="text-xs text-parchment-500 dark:text-parchment-600">Level {a.level ?? '-'}</p>}
          </div>
          <div className="rounded-lg border border-parchment-300 bg-parchment-100 px-3 py-2 dark:border-ash/10 dark:bg-ink">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-parchment-500 dark:text-parchment-600">Item 2</p>
            <p className="truncate font-heading text-sm font-semibold text-gilt">{b ? b.name : 'Select an item'}</p>
            {b && <p className="text-xs text-parchment-500 dark:text-parchment-600">Level {b.level ?? '-'}</p>}
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-parchment-500 dark:text-parchment-600">
            Select two items (use the checkbox in the Compare column) to see stat differences.
          </p>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-parchment-300 dark:border-ash/20">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-parchment-200 dark:bg-ink">
                <tr>
                  <th className="px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-parchment-600 dark:text-parchment-400">Stat</th>
                  <th className="px-3 py-1.5 text-right text-xs font-semibold uppercase tracking-wider text-parchment-600 dark:text-parchment-400">Item 1</th>
                  <th className="px-3 py-1.5 text-right text-xs font-semibold uppercase tracking-wider text-parchment-600 dark:text-parchment-400">Item 2</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.label} className={i % 2 ? 'bg-parchment-100/50 dark:bg-ink/20' : ''}>
                    <td className="px-3 py-1.5 font-medium text-parchment-600 dark:text-parchment-400">{r.label}</td>
                    <td className={`px-3 py-1.5 text-right font-semibold ${cellClass(r.va, r.vb, (v, o) => v > o)}`}>
                      {r.va ?? '-'}
                    </td>
                    <td className={`px-3 py-1.5 text-right font-semibold ${cellClass(r.vb, r.va, (v, o) => v > o)}`}>
                      {r.vb ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

// Compares two rows so that variant rows always resolve to their parent's
// value for this column, and rows within the same group are ordered by
// tier. This keeps an expanded item's variants glued to it regardless of
// which column header the user sorts by.
function groupedSortingFn(
  getValue: (row: DisplayRow) => unknown,
  compareRaw: (a: unknown, b: unknown) => number,
  parentLookup: Map<string, DisplayRow>,
) {
  return (rowA: Row<DisplayRow>, rowB: Row<DisplayRow>) => {
    const a = rowA.original
    const b = rowB.original
    if (a._groupKey === b._groupKey) {
      // Same group: always keep the pre-built insertion order (Base, then
      // tiers in sequence). Returning 0 relies on the sort being stable,
      // which holds regardless of ascending/descending direction — a
      // nonzero tier-difference here would get flipped under descending
      // sort, which was the bug.
      return 0
    }
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

const LEVEL_TIER_ORDER = ['Beginner-num', 'Master', 'Grandmaster', 'Ab']
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

export function Equipment() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedClass, setSelectedClass] = useState('all')
  const [data, setData] = useState<EquipmentItem[] | null>(equipmentCache)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [textSize, setTextSize] = useState<'normal' | 'large'>('normal')
  const [shopIndex, setShopIndex] = useState<Map<string, { npc: string; town: string }>>(new Map())
  const [weaponRecipes, setWeaponRecipes] = useState<Map<string, WeaponRecipeRow>>(new Map())
  const [compareMode, setCompareMode] = useState(false)
  const [compareItems, setCompareItems] = useState<DisplayRow[]>([])

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

  // One representative row per group: the base tier if it exists, else
  // whichever tier is first in TIER_ORDER. This is both what shows as the
  // main (collapsed) row AND the value every sort comparison uses for the
  // whole group, so variants never scatter away from it.
  const baseRowByGroup = useMemo(() => {
    const map = new Map<string, DisplayRow>()
    for (const g of groups) {
      const tier = g.tiers['base'] ? 'base' : g.availableTiers[0]
      const item = g.tiers[tier]!
      map.set(g.key, {
        ...item,
        _groupKey: g.key,
        _baseName: g.baseName,
        _availableTiers: g.availableTiers,
        _selectedTier: tier,
        _isVariant: false,
      })
    }
    return map
  }, [groups])

  const displayRows = useMemo<DisplayRow[]>(() => {
    const rows: DisplayRow[] = []
    for (const g of groups) {
      const baseRow = baseRowByGroup.get(g.key)!
      rows.push(baseRow)
      if (expandedGroups[g.key]) {
        for (const tier of g.availableTiers) {
          if (tier === baseRow._selectedTier) continue
          const item = g.tiers[tier]!
          rows.push({
            ...item,
            _groupKey: g.key,
            _baseName: g.baseName,
            _availableTiers: g.availableTiers,
            _selectedTier: tier,
            _isVariant: true,
          })
        }
      }
    }
    return rows
  }, [groups, baseRowByGroup, expandedGroups])

  const toggleExpand = (groupKey: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }))
  }

  const toggleCompare = (item: DisplayRow) => {
    setCompareItems((prev) => {
      const key = compareKey(item)
      const exists = prev.find((p) => compareKey(p) === key)
      if (exists) return prev.filter((p) => compareKey(p) !== key)
      if (prev.length >= 2) return [prev[1], item]
      return [...prev, item]
    })
  }

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
            const checked = compareItems.some((p) => compareKey(p) === compareKey(item))
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
          let recipeText: string | null = null
          if (item.category === 'weapon') {
            const recipe = weaponRecipes.get(item._baseName)
            recipeText = getRecipeDisplay(recipe, item._selectedTier)
          }
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
  }, [columnHelper, textSize, shopIndex, weaponRecipes, selectedCategory, compareMode, compareItems, expandedGroups, baseRowByGroup])

  return (
    <div>
      <h1 className="mb-6 border-l-4 border-l-srad pl-4 font-heading text-3xl font-bold text-parchment-900 dark:text-parchment-100">
        Equipment
      </h1>

      {/* Filters */}
      <div className="mb-6 space-y-3">
        {/* Category tabs */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedCategory === cat.id
                  ? 'border border-gilt bg-transparent text-gilt'
                  : 'border border-parchment-300 bg-parchment-100 text-parchment-600 hover:border-gilt hover:text-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ash dark:hover:border-gilt'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Class filter */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-1.5">
            <span className="self-center text-xs font-medium uppercase tracking-wider text-parchment-500 dark:text-parchment-600">
              Class:
            </span>
            <button
              onClick={() => setSelectedClass('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedClass === 'all'
                  ? 'border border-gilt bg-transparent text-gilt'
                  : 'border border-parchment-300 bg-parchment-100 text-parchment-600 hover:border-gilt hover:text-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ash dark:hover:border-gilt'
              }`}
            >
              All
            </button>
          </div>
          {classGroups.map((group) => (
            <div key={group.label} className="flex flex-wrap items-center gap-1.5">
              <span className="self-center text-xs font-medium uppercase tracking-wider text-parchment-500 dark:text-parchment-600">
                {group.label}:
              </span>
              {group.options.map((cls) => (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedClass === cls
                      ? 'border border-gilt bg-transparent text-gilt'
                      : 'border border-parchment-300 bg-parchment-100 text-parchment-600 hover:border-gilt hover:text-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ash dark:hover:border-gilt'
                  }`}
                >
                  {classLabels[cls]}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Text size + Compare toggle */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-parchment-500 dark:text-parchment-600">
              Text Size:
            </span>
            <select
              value={textSize}
              onChange={(e) => setTextSize(e.target.value as 'normal' | 'large')}
              className="rounded-lg border border-parchment-300 bg-parchment-100 px-3 py-1.5 text-xs font-medium text-parchment-700 dark:border-ash/20 dark:bg-obsidian dark:text-ash"
            >
              <option value="normal">Normal</option>
              <option value="large">Large</option>
            </select>
          </div>

          <button
            onClick={() => {
              setCompareMode((prev) => !prev)
              if (compareMode) setCompareItems([])
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              compareMode
                ? 'border border-gilt bg-transparent text-gilt'
                : 'border border-parchment-300 bg-parchment-100 text-parchment-600 hover:border-gilt hover:text-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ash dark:hover:border-gilt'
            }`}
          >
            {compareMode ? 'Exit Compare Mode' : 'Compare Equipment'}
          </button>
        </div>
      </div>

      {/* Data Table */}
      {data === null ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gilt/20 border-t-gilt" />
        </div>
      ) : (
        <DataTable
          data={displayRows}
          columns={columns}
          searchPlaceholder="Search equipment..."
          initialSorting={[{ id: 'level', desc: false }]}
          textSize={textSize}
        />
      )}

      {compareMode && (
        <CompareBar
          items={compareItems}
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