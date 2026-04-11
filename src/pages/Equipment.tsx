import { useState, useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/tables/DataTable'
import allEquipment from '@/data/equipment/all.json'

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

const columnHelper = createColumnHelper<EquipmentItem>()

const columns = [
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
]

export function Equipment() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedClass, setSelectedClass] = useState('all')

  const filteredData = useMemo(() => {
    let items = allEquipment as EquipmentItem[]
    if (selectedCategory !== 'all') {
      items = items.filter((item) => item.category === selectedCategory)
    }
    if (selectedClass !== 'all') {
      items = items.filter((item) => !item.class || item.class === selectedClass)
    }
    return items
  }, [selectedCategory, selectedClass])

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
      <DataTable
        data={filteredData}
        columns={columns}
        searchPlaceholder="Search equipment..."
      />
    </div>
  )
}
