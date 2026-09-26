import { useEffect, useState, useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/tables/DataTable'
import equipmentUrl from '@/data/equipment/all.json?url'

interface EquipmentItem {
  name: string
  location: string | null
  level: number | null
  weight: number | null
  category: string
  class: string | null
  gender: string | null
  stats: Record<string, number | null>
  percentages: Record<string, number | null>
}

interface DisplayRow extends EquipmentItem {
  _groupKey: string
  _availableTiers: string[]
  _selectedTier: string
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

const classes = ['all', 'monk', 'priest', 'rogue', 'warrior', 'wizard', 'peasant']

const TIER_PREFIXES = ['Good', 'Great', 'Grand']
const TIER_ORDER = ['base', 'Good', 'Great', 'Grand']
const TIER_LABELS: Record<string, string> = { base: 'Base', Good: 'Good', Great: 'Great', Grand: 'Grand' }

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
    const { tier, baseName } = parseTier(item.name)
    const key = `${item.category}|${item.class ?? ''}|${baseName}`
    let group = map.get(key)
    if (!group) {
      group = { key, baseName, tiers: {}, availableTiers: [] }
      map.set(key, group)
    }
    group.tiers[tier] = item
    group.availableTiers.push(tier)
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

export function Equipment() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedClass, setSelectedClass] = useState('all')
  const [data, setData] = useState<EquipmentItem[] | null>(equipmentCache)
  const [tierSelections, setTierSelections] = useState<Record<string, string>>({})

  useEffect(() => {
    if (equipmentCache) return
    let alive = true
    loadEquipment().then((items) => {
      if (alive) setData(items)
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
        _availableTiers: g.availableTiers,
        _selectedTier: tier,
      }
    })
  }, [groups, tierSelections])

  const columnHelper = useMemo(() => createColumnHelper<DisplayRow>(), [])

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'tier',
      header: 'Tier',
      cell: ({ row }) => {
        const r = row.original
        if (r._availableTiers.length <= 1) {
          return <span className="text-xs text-parchment-500 dark:text-parchment-600">{TIER_LABELS[r._selectedTier]}</span>
        }
        return (
          <select
            value={r._selectedTier}
            onChange={(e) =>
              setTierSelections((prev) => ({ ...prev, [r._groupKey]: e.target.value }))
            }
            className="rounded border border-parchment-300 bg-parchment-100 px-1.5 py-0.5 text-xs text-parchment-700 dark:border-ash/20 dark:bg-obsidian dark:text-ash"
          >
            {r._availableTiers.map((t) => (
              <option key={t} value={t}>{TIER_LABELS[t]}</option>
            ))}
          </select>
        )
      },
    }),
    columnHelper.accessor('name', { header: 'Name' }),
    columnHelper.accessor('location', { header: 'LOC', cell: (info) => info.getValue() || '-' }),
    columnHelper.accessor('level', { header: 'LVL', cell: (info) => info.getValue() ?? '-' }),
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
  ], [columnHelper])

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
        <div className="flex flex-wrap gap-1.5">
          <span className="self-center text-xs font-medium uppercase tracking-wider text-parchment-500 dark:text-parchment-600">
            Class:
          </span>
          {classes.map((cls) => (
            <button
              key={cls}
              onClick={() => setSelectedClass(cls)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                selectedClass === cls
                  ? 'border border-gilt bg-transparent text-gilt'
                  : 'border border-parchment-300 bg-parchment-100 text-parchment-600 hover:border-gilt hover:text-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ash dark:hover:border-gilt'
              }`}
            >
              {cls}
            </button>
          ))}
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
        />
      )}
    </div>
  )
}
