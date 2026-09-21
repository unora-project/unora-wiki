import { Link, useParams } from 'react-router'
import { useMemo, useState, useEffect } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/tables/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { OptimizedImage } from '@/components/ui/OptimizedImage'
// Generated at build time from src/content/data/npcs/*.yaml — do not edit directly
import npcsData from '@/data/towns/npcs.json'
import shopsData from '@/data/towns/shops.json'
import { ChevronRight } from 'lucide-react'

interface NPC {
  town: string
  name: string
  type: string
  coordinates: string
  quests?: { name: string; path: string }[]
}

const columnHelper = createColumnHelper<NPC>()
const columns = [
  columnHelper.accessor('name', { header: 'Name' }),
  columnHelper.accessor('type', { header: 'Type' }),
  columnHelper.accessor('coordinates', { header: 'Coordinates' }),
  columnHelper.accessor((row) => row.quests?.map((q) => q.name).join(', ') ?? '', {
    id: 'quests',
    header: 'Quests',
    cell: ({ row }) => {
      const quests = row.original.quests
      if (!quests || quests.length === 0) return '—'
      return (
        <div className="flex flex-col gap-1">
          {quests.map((quest, i) => (
            <Link
              key={i}
              to={quest.path}
              className="underline decoration-gilt/60 hover:decoration-gilt"
            >
              {quest.name}
            </Link>
          ))}
        </div>
      )
    },
  }),
]

interface ShopItem {
  name: string
  type: string
  cost: string
}

interface Shop {
  town: string
  npc: string
  items: ShopItem[]
}

const shopColumnHelper = createColumnHelper<ShopItem>()
const shopColumns = [
  shopColumnHelper.accessor('name', {
    header: 'Name',
    cell: ({ getValue }) => <ItemNameTooltip name={getValue()} />,
  }),
  shopColumnHelper.accessor('type', { header: 'Type' }),
  shopColumnHelper.accessor('cost', { header: 'Cost (Gold)' }),
]

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

const statLabels: Record<string, string> = {
  hp: 'HP', mp: 'MP', ac: 'AC', mr: 'MR',
  str: 'STR', int: 'INT', wis: 'WIS', con: 'CON', dex: 'DEX',
  dmg: 'DMG', hit: 'HIT',
}

const percentLabels: Record<string, string> = {
  attackSpeed: 'ATK Speed %',
  skillDamage: 'Flat Skill DMG',
  skillDamagePercent: 'Skill DMG %',
  spellDamage: 'Flat Spell DMG',
  spellDamagePercent: 'Spell DMG %',
  flatHealBonus: 'Flat Heal Bonus',
  healBonusPercent: 'Heal Bonus %',
  cooldownReduction: 'CDR %',
}

let equipmentIndexPromise: Promise<Map<string, EquipmentItem>> | null = null

function loadEquipmentIndex(): Promise<Map<string, EquipmentItem>> {
  if (!equipmentIndexPromise) {
    equipmentIndexPromise = fetch(`${import.meta.env.BASE_URL}data/equipment.json`)
      .then((r) => (r.ok ? (r.json() as Promise<EquipmentItem[]>) : []))
      .then((items) => new Map(items.map((item) => [item.name, item])))
      .catch(() => new Map())
  }
  return equipmentIndexPromise
}

function ItemNameTooltip({ name }: { name: string }) {
  const [item, setItem] = useState<EquipmentItem | null | undefined>(undefined)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    let alive = true
    loadEquipmentIndex().then((index) => {
      if (alive) setItem(index.get(name) ?? null)
    })
    return () => { alive = false }
  }, [name])

  if (!item) {
    return <span>{name}</span>
  }

  const statEntries = Object.entries(item.stats).filter(([, v]) => v !== null && v !== undefined)
  const percentEntries = Object.entries(item.percentages).filter(([, v]) => v !== null && v !== undefined)

  return (
    <span className="relative inline-block">
      <span
        className="cursor-help underline decoration-dotted decoration-ash/60 underline-offset-2"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {name}
      </span>
      {hovered && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg border border-parchment-300 bg-parchment-100 p-3 text-left shadow-lg dark:border-ash/20 dark:bg-ink">
          <p className="mb-1 font-heading text-sm font-semibold text-gilt">{item.name}</p>
          <div className="space-y-0.5 text-xs text-parchment-700 dark:text-parchment-300">
            {item.level !== null && <p>Level: {item.level}</p>}
            {item.location && item.location !== '-' && <p>Location: {item.location}</p>}
            {item.gender && <p>Gender: {item.gender}</p>}
            {statEntries.map(([key, value]) => (
              <p key={key}>{statLabels[key] ?? key}: {value}</p>
            ))}
            {percentEntries.map(([key, value]) => (
              <p key={key}>{percentLabels[key] ?? key}: {value}</p>
            ))}
          </div>
        </div>
      )}
    </span>
  )
}

import townNamesData from '@/data/metadata/town-names.json'

const townNames = townNamesData as Record<string, string>

export function TownDetail() {
  const { town } = useParams<{ town: string }>()
  const displayName = town ? townNames[town] || town.charAt(0).toUpperCase() + town.slice(1) : ''

  const npcs = useMemo(
    () => (npcsData as NPC[]).filter((n) => n.town === town),
    [town]
  )

  const shops = useMemo(
    () => (shopsData as Shop[]).filter((s) => s.town === town),
    [town]
  )

  if (!town || !townNames[town]) {
    return (
      <div className="py-20 text-center">
        <h1 className="font-heading text-2xl text-gilt">Town not found</h1>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={displayName}
        accent="verdant"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Towns', to: '/towns' },
          { label: displayName },
        ]}
      />

      {/* Town Map */}
      <section className="mb-8 flex justify-center">
        <OptimizedImage
          src={`${import.meta.env.BASE_URL}images/towns/${town}.png`}
          alt={`Map of ${displayName}`}
          className="max-w-full rounded-lg shadow-md"
        />
      </section>

      {/* NPCs */}
      {npcs.length > 0 && (
        <section>
          <h2 className="mb-4 font-heading text-2xl font-semibold text-gilt">
            Mundanes
          </h2>
          <DataTable
            data={npcs}
            columns={columns}
            searchPlaceholder={`Search ${displayName} NPCs...`}
          />
        </section>
      )}

      {/* Shops */}
      {shops.length > 0 && (
        <ShopsSection shops={shops} townName={displayName} />
      )}
    </div>
  )
}

function ShopsSection({ shops, townName: _townName }: { shops: Shop[]; townName: string }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  return (
    <section className="mt-8">
      <h2 className="mb-4 font-heading text-2xl font-semibold text-gilt">
        Shops
      </h2>
      <div className="space-y-3">
        {shops.map((shop) => {
          const isOpen = expanded[shop.npc] ?? false
          return (
            <div
              key={shop.npc}
              className="overflow-hidden rounded-lg border border-parchment-300 dark:border-ash/20"
            >
              <button
                onClick={() => setExpanded((prev) => ({ ...prev, [shop.npc]: !prev[shop.npc] }))}
                className="flex w-full items-center gap-2 bg-parchment-100 px-4 py-3 text-left font-heading text-lg font-medium text-parchment-800 transition-colors hover:bg-parchment-200 dark:bg-obsidian/50 dark:text-ivory dark:hover:bg-obsidian/70"
              >
                <ChevronRight
                  size={16}
                  className={`shrink-0 text-gilt transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                />
                {shop.npc}
                <span className="ml-auto text-sm font-normal text-ash">
                  {shop.items.length} item{shop.items.length !== 1 ? 's' : ''}
                </span>
              </button>
              {isOpen && (
                <div className="p-4">
                  <DataTable
                    data={shop.items}
                    columns={shopColumns}
                    searchPlaceholder={`Search ${shop.npc}'s inventory...`}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
