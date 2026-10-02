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
  Rank?: string
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

function isMedeniaLevel(level: unknown): boolean {
  return typeof level === 'string' && /^ab\s*\d+/i.test(level.trim())
}

function WeaponRecipeTable({ data, searchPlaceholder }: { data: Record<string, unknown>[]; searchPlaceholder: string }) {
  const rows = data as unknown as WeaponRecipeRow[]
  const [selectedTier, setSelectedTier] = useState<Record<string, keyof WeaponRecipeRow>>({})

  const regionTabs = useMemo(() => {
    const tabs: { id: 'temuair' | 'medenia'; label: string }[] = []
    if (rows.some((r) => !isMedeniaLevel(r.Level))) tabs.push({ id: 'temuair', label: 'Temuair' })
    if (rows.some((r) => isMedeniaLevel(r.Level))) tabs.push({ id: 'medenia', label: 'Medenia' })
    return tabs
  }, [rows])

  const [activeRegion, setActiveRegion] = useState<'temuair' | 'medenia'>('temuair')

  useEffect(() => {
    if (!regionTabs.some((t) => t.id === activeRegion)) {
      setActiveRegion(regionTabs[0]?.id ?? 'temuair')
    }
  }, [regionTabs, activeRegion])

  const regionFilteredRows = useMemo(() => {
    return rows.filter((r) => (activeRegion === 'medenia') === isMedeniaLevel(r.Level))
  }, [rows, activeRegion])

  const hasRank = regionFilteredRows.length > 0 && regionFilteredRows.some((r) => r.Rank?.trim())

  const rankTabs = useMemo(() => {
    if (!hasRank) return []
    const present = new Set(regionFilteredRows.map((r) => r.Rank).filter(Boolean))
    const ordered = RANK_ORDER.filter((r) => present.has(r))
    return ['All', ...ordered]
  }, [regionFilteredRows, hasRank])

  const [activeRank, setActiveRank] = useState('All')

  useEffect(() => {
    if (!rankTabs.includes(activeRank)) {
      setActiveRank('All')
    }
  }, [rankTabs, activeRank])

  const filteredRows = useMemo(() => {
    if (!hasRank || activeRank === 'All') return regionFilteredRows
    return regionFilteredRows.filter((r) => r.Rank === activeRank)
  }, [regionFilteredRows, hasRank, activeRank])

  const columns = useMemo(() => {
    const colHelper = createColumnHelper<WeaponRecipeRow>()
    return [
      colHelper.accessor('Name', { header: 'Name' }),
      colHelper.accessor('Level', { header: 'Level' }),
      colHelper.accessor('Type', { header: 'Type' }),
      colHelper.accessor('Materials', {
        header: 'Materials to Craft',
        cell: (info) => (
          <span className="whitespace-pre-line">{String(info.getValue() ?? '-')}</span>
        ),
      }),
      colHelper.display({
        id: 'upgradeTier',
        header: 'Upgrade To',
        cell: ({ row }) => {
          const r = row.original
          const available = UPGRADE_TIERS.filter((t) => r[t.key]?.trim())
          if (available.length === 0) return <span className="text-parchment-500 dark:text-parchment-600">-</span>
          const current = selectedTier[r.Name] ?? available[0].key
          return (
            <select
              value={current}
              onChange={(e) =>
                setSelectedTier((prev) => ({ ...prev, [r.Name]: e.target.value as keyof WeaponRecipeRow }))
              }
              className="rounded border border-parchment-300 bg-parchment-100 px-2 py-1 text-xs text-parchment-700 dark:border-ash/20 dark:bg-obsidian dark:text-ash"
            >
              {available.map((t) => (
                <option key={t.key as string} value={t.key as string}>{t.label}</option>
              ))}
            </select>
          )
        },
      }),
      colHelper.display({
        id: 'upgradeMaterials',
        header: 'Materials to Upgrade',
        cell: ({ row }) => {
          const r = row.original
          const available = UPGRADE_TIERS.filter((t) => r[t.key]?.trim())
          if (available.length === 0) return <span>-</span>
          const current = selectedTier[r.Name] ?? available[0].key
          return <span className="whitespace-pre-line">{r[current] || '-'}</span>
        },
      }),
    ]
  }, [selectedTier])

  return (
    <div>
      {regionTabs.length > 1 && (
        <div className="mb-3 flex gap-1 border-b border-parchment-300 dark:border-ash/20">
          {regionTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveRegion(t.id)}
              className={`relative px-4 py-2.5 font-ui text-sm font-medium transition-colors ${
                activeRegion === t.id
                  ? 'text-gilt'
                  : 'text-ash hover:text-parchment-800 dark:hover:text-ivory'
              }`}
            >
              {t.label}
              {activeRegion === t.id && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-gilt" />
              )}
            </button>
          ))}
        </div>
      )}
      {hasRank && rankTabs.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1 border-b border-parchment-300 dark:border-ash/20">
          {rankTabs.map((rank) => (
            <button
              key={rank}
              onClick={() => setActiveRank(rank)}
              className={`relative px-3 py-2 font-ui text-sm font-medium transition-colors ${
                activeRank === rank
                  ? 'text-gilt'
                  : 'text-ash hover:text-parchment-800 dark:hover:text-ivory'
              }`}
            >
              {rank}
              {activeRank === rank && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-gilt" />
              )}
            </button>
          ))}
        </div>
      )}
      <DataTable data={filteredRows} columns={columns} searchPlaceholder={searchPlaceholder} />
    </div>
  )
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

export function Equipment() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedClass, setSelectedClass] = useState('all')
  const [data, setData] = useState<EquipmentItem[] | null>(equipmentCache)
  const [tierSelections, setTierSelections] = useState<Record<string, string>>({})
  const [textSize, setTextSize] = useState<'normal' | 'large'>('normal')
  const [shopIndex, setShopIndex] = useState<Map<string, { npc: string; town: string }>>(new Map())
  const [weaponRecipes, setWeaponRecipes] = useState<Map<string, WeaponRecipeRow>>(new Map())

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

  const columnHelper = useMemo(() => createColumnHelper<DisplayRow>(), [])

  const columns = useMemo(() => {
  const tierTextClass = textSize === 'large' ? 'text-lg' : 'text-sm'
  const soldByTextClass = textSize === 'large' ? 'text-sm' : 'text-xs'
  const showGender = selectedCategory === 'armor' || selectedCategory === 'helmet'

  const baseColumns = [
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
  ]

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
}, [columnHelper, textSize, shopIndex, weaponRecipes, selectedCategory])

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

        {/* Text size */}
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
    </div>
  )
}