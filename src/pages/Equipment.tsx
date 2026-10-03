import { useEffect, useState, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { createColumnHelper } from '@tanstack/react-table'
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
      item.category === 'weapon' ? parseTier(item.name) : { tier: 'base', baseName: item.name }
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

  const diffClass = (va: number | null, vb: number | null) => {
    if (va == null || vb == null || va === vb) return 'text-parchment-700 dark:text-ivory/85'
    return vb > va ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-parchment-300 bg-parchment-50 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] dark:border-ash/20 dark:bg-obsidian">
      <div className="mx-auto max-w-5xl px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-gilt">Compare Equipment</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onClear}
              className="rounded border border-parchment-300 px-2 py-1 text-xs text-parchment-600 hover:border-gilt hover:text-gilt dark:border-ash/20 dark:text-ash"
            >
              Clear
            </button>
            <button
              onClick={onClose}
              className="rounded border border-parchment-300 px-2 py-1 text-xs text-parchment-600 hover:border-gilt hover:text-gilt dark:border-ash/20 dark:text-ash"
            >
              Close
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-2">
          <div className="rounded border border-parchment-300 bg-parchment-100 px-3 py-2 dark:border-ash/10 dark:bg-ink">
            <p className="text-xs font-semibold uppercase tracking-wider text-parchment-500 dark:text-parchment-600">Item 1</p>
            <p className="font-heading text-sm text-gilt">{a ? a.name : 'Select an item'}</p>
            {a && <p className="text-xs text-parchment-500 dark:text-parchment-600">Level {a.level ?? '-'}</p>}
          </div>
          <div className="rounded border border-parchment-300 bg-parchment-100 px-3 py-2 dark:border-ash/10 dark:bg-ink">
            <p className="text-xs font-semibold uppercase tracking-wider text-parchment-500 dark:text-parchment-600">Item 2</p>
            <p className="font-heading text-sm text-gilt">{b ? b.name : 'Select an item'}</p>
            {b && <p className="text-xs text-parchment-500 dark:text-parchment-600">Level {b.level ?? '-'}</p>}
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-xs text-parchment-500 dark:text-parchment-600">
            Select two items (use the checkbox in the Compare column) to see stat differences.
          </p>
        ) : (
          <div className="max-h-40 overflow-y-auto">
            <div className="grid grid-cols-3 gap-2 text-xs">
              {rows.map((r) => (
                <div key={r.label} className="contents">
                  <span className="text-parchment-500 dark:text-parchment-600">{r.label}</span>
                  <span className="text-right text-parchment-700 dark:text-ivory/85">{r.va ?? '-'}</span>
                  <span className={`text-right font-semibold ${diffClass(r.va, r.vb)}`}>{r.vb ?? '-'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function Equipment() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedClass, setSelectedClass] = useState('all')
  const [data, setData] = useState<EquipmentItem[] | null>(equipmentCache)
  const [tierSelections, setTierSelections] = useState<Record<string, string>>({})
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

  const displayRows = useMemo<DisplayRow[]>(() => {
    return groups.map((g) => {
      const selected = tierSelections[g.key] ?? g.availableTiers[0]
      const tier = g.tiers[selected] ? selected : g.availableTiers[0]
      const item = g.tiers[tier]!
      return {
        ...item,
        _groupKey: g.key,
        _baseName: g.baseName,
        _availableTiers: g.availableTiers,
        _selectedTier: tier,
      }
    })
  }, [groups, tierSelections])

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
          if (r._availableTiers.length <= 1) {
            return (
              <span className={`${tierTextClass} font-medium text-parchment-600 dark:text-parchment-400`}>
                {TIER_LABELS[r._selectedTier]}
              </span>
            )
          }
          return (
            <select
              value={r._selectedTier}
              onChange={(e) =>
                setTierSelections((prev) => ({ ...prev, [r._groupKey]: e.target.value }))
              }
              className={`rounded border border-parchment-300 bg-parchment-100 px-2 py-1 ${tierTextClass} font-medium text-parchment-700 dark:border-ash/20 dark:bg-obsidian dark:text-ash`}
            >
              {r._availableTiers.map((t) => (
                <option key={t} value={t}>{TIER_LABELS[t]}</option>
              ))}
            </select>
          )
        },
      }),
      columnHelper.accessor('name', {
        header: 'Name',
        cell: ({ row }) => {
          const item = row.original
          let recipeText: string | null = null
          if (item.category === 'weapon') {
            const recipe = weaponRecipes.get(item._baseName)
            recipeText = getRecipeDisplay(recipe, item._selectedTier)
          }
          return (
            <span>
              {item.name}
              {recipeText && <RecipeTag materials={recipeText} />}
            </span>
          )
        },
      }),
      columnHelper.accessor('location', {
        header: 'LOC',
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
          cell: (info) => info.getValue() ?? '-',
        })
      )
    }

    return [
      ...baseColumns,
      columnHelper.accessor('level', { header: 'LVL', cell: (info) => info.getValue() ?? '-', sortingFn: compareLevels }),
      columnHelper.accessor((row) => row.stats.hp, { id: 'hp', header: 'HP', cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.stats.mp, { id: 'mp', header: 'MP', cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.stats.ac, { id: 'ac', header: 'AC', cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.stats.mr, { id: 'mr', header: 'MR', cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.stats.str, { id: 'str', header: 'STR', cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.stats.int, { id: 'int', header: 'INT', cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.stats.wis, { id: 'wis', header: 'WIS', cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.stats.con, { id: 'con', header: 'CON', cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.stats.dex, { id: 'dex', header: 'DEX', cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.stats.dmg, { id: 'dmg', header: 'DMG', cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.stats.hit, { id: 'hit', header: 'HIT', cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.percentages.attackSpeed, { id: 'as', header: 'AS%', cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.percentages.skillDamage, { id: 'skd', header: 'SKD', cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.percentages.skillDamagePercent, { id: 'skdp', header: 'SKD%', cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.percentages.spellDamage, { id: 'spd', header: 'SPD', cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.percentages.spellDamagePercent, { id: 'spdp', header: 'SPD%', cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.percentages.flatHealBonus, { id: 'heal', header: 'HEAL', cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.percentages.healBonusPercent, { id: 'healp', header: 'HEAL%', cell: (info) => info.getValue() ?? '-' }),
      columnHelper.accessor((row) => row.percentages.cooldownReduction, { id: 'cdr', header: 'CDR%', cell: (info) => info.getValue() ?? '-' }),
    ]
  }, [columnHelper, textSize, shopIndex, weaponRecipes, selectedCategory, compareMode, compareItems])

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
        <div className={compareMode ? 'pb-56' : ''}>
          <DataTable
            data={displayRows}
            columns={columns}
            searchPlaceholder="Search equipment..."
            initialSorting={[{ id: 'level', desc: false }]}
            textSize={textSize}
          />
        </div>
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