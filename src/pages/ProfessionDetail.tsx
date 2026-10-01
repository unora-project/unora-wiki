import { useParams } from 'react-router'
import { useEffect, useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/tables/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  MapPin, Hammer, PackageOpen, Lightbulb,
  type LucideIcon,
} from 'lucide-react'

import professionsMetadata from '@/data/metadata/professions.json'

const iconMap: Record<string, LucideIcon> = { MapPin, Hammer, PackageOpen, Lightbulb }

const RANK_ORDER = ['Beginner', 'Basic', 'Initiate', 'Artisan', 'Adept', 'Advanced', 'Expert', 'Master']

// Map dataFile key -> dynamic import. Only the files needed by the active
// profession are fetched; unused ones stay out of the JS graph for this route.
const dataFileLoaders: Record<string, () => Promise<Record<string, unknown>[]>> = {
  'alchemy-recipes': () => import('@/data/professions/alchemy-recipes.json').then((m) => m.default),
  'alchemy-extracts': () => import('@/data/professions/alchemy-extracts.json').then((m) => m.default),
  'armorsmithing-recipes': () => import('@/data/professions/armorsmithing-recipes.json').then((m) => m.default),
  'enchanting-enchants': () => import('@/data/professions/enchanting-enchants.json').then((m) => m.default),
  'jewelcrafting-recipes': () => import('@/data/professions/jewelcrafting-recipes.json').then((m) => m.default),
  'weaponsmithing-recipes': () => import('@/data/professions/weaponsmithing-recipes.json').then((m) => m.default),
  'cooking-recipes': () => import('@/data/professions/cooking-recipes.json').then((m) => m.default),
  'cooking-ingredients': () => import('@/data/professions/cooking-ingredients.json').then((m) => m.default as Record<string, unknown>[]),
  'fishing-fish': () => import('@/data/professions/fishing-fish.json').then((m) => m.default),
}

interface ProfessionMeta {
  name: string
  description: string
  cards: { icon: string; title: string; body: string }[]
  tip?: string
  tables: { title: string; dataFile: string; searchPlaceholder: string }[]
}

const professionsMeta = professionsMetadata as Record<string, ProfessionMeta>

interface ResolvedTable {
  title: string
  dataFile: string
  data: Record<string, unknown>[]
  searchPlaceholder: string
}

export function ProfessionDetail() {
  const { type } = useParams<{ type: string }>()
  const meta = type ? professionsMeta[type] : null

  const [tables, setTables] = useState<ResolvedTable[] | null>(null)

  useEffect(() => {
    if (!meta) {
      setTables([])
      return
    }
    let alive = true
    const defs = meta.tables ?? []
    Promise.all(
      defs.map(async (t) => ({
        title: t.title,
        dataFile: t.dataFile,
        searchPlaceholder: t.searchPlaceholder,
        data: (await dataFileLoaders[t.dataFile]?.()) ?? [],
      }))
    ).then((resolved) => {
      if (alive) setTables(resolved)
    })
    return () => { alive = false }
  }, [meta])

  if (!meta || !type) {
    return (
      <div className="py-20 text-center">
        <h1 className="font-heading text-2xl text-gilt">Profession not found</h1>
      </div>
    )
  }

  const cards = meta.cards.map((c) => ({
    icon: iconMap[c.icon] || MapPin,
    title: c.title,
    body: c.body,
  }))

  return (
    <div>
      <PageHeader
        title={meta.name}
        description={meta.description}
        accent="verdant"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Professions', to: '/professions' },
          { label: meta.name },
        ]}
      />

      {/* Info cards grid */}
      <div className={`mb-6 grid gap-4 ${cards.length >= 2 ? 'sm:grid-cols-2' : ''}`}>
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-parchment-300 bg-parchment-100 p-5 dark:border-ash/10 dark:bg-ink"
          >
            <div className="mb-2 flex items-center gap-2">
              <card.icon size={16} className="shrink-0 text-verdant" />
              <h2 className="font-heading text-lg font-semibold text-gilt">{card.title}</h2>
            </div>
            <p className="text-sm leading-relaxed text-parchment-700 dark:text-parchment-300">
              {card.body}
            </p>
          </div>
        ))}
      </div>

      {/* Tip callout */}
      {meta.tip && (
        <div className="mb-8 flex gap-3 rounded-lg border border-verdant/20 bg-verdant/5 p-4">
          <Lightbulb size={18} className="mt-0.5 shrink-0 text-verdant" />
          <p className="text-sm leading-relaxed text-parchment-700 dark:text-parchment-300">
            {meta.tip}
          </p>
        </div>
      )}

      {/* Data tables */}
      {tables === null ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gilt/20 border-t-gilt" />
        </div>
      ) : (
        tables.map((table) => (
          <section key={table.title} className="mb-8">
            <h2 className="mb-4 font-heading text-xl font-semibold text-gilt">
              {table.title}
            </h2>
            {table.dataFile === 'weaponsmithing-recipes' ? (
              <WeaponRecipeTable data={table.data} searchPlaceholder={table.searchPlaceholder} />
            ) : (
              <GenericTable data={table.data} searchPlaceholder={table.searchPlaceholder} />
            )}
          </section>
        ))
      )}
    </div>
  )
}

function GenericTable({ data, searchPlaceholder }: { data: Record<string, unknown>[]; searchPlaceholder: string }) {
  const hasRank = data.length > 0 && 'Rank' in data[0]

  const rankTabs = useMemo(() => {
    if (!hasRank) return []
    const present = new Set(data.map((row) => String(row.Rank)))
    const ordered = RANK_ORDER.filter((r) => present.has(r))
    return ['All', ...ordered]
  }, [data, hasRank])

  const [activeRank, setActiveRank] = useState('All')

  useEffect(() => {
    if (!rankTabs.includes(activeRank)) {
      setActiveRank('All')
    }
  }, [rankTabs, activeRank])

  const filteredData = useMemo(() => {
    if (!hasRank || activeRank === 'All') return data
    return data.filter((row) => row.Rank === activeRank)
  }, [data, hasRank, activeRank])

  const columns = useMemo(() => {
    if (filteredData.length === 0) return []
    const keys = Object.keys(filteredData[0]).filter(
      (k) => !(k === 'Rank' && activeRank !== 'All')
    )
    const colHelper = createColumnHelper<Record<string, unknown>>()
    return keys.map((key) =>
      colHelper.accessor((row) => row[key], {
        id: key,
        header: key,
        cell: (info) => (
          <span className="whitespace-pre-line">{String(info.getValue() ?? '-')}</span>
        ),
      })
    )
  }, [filteredData, activeRank])

  if (data.length === 0) {
    return <p className="text-parchment-500 dark:text-parchment-600">No data available.</p>
  }

  return (
    <div>
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
      <DataTable data={filteredData} columns={columns} searchPlaceholder={searchPlaceholder} />
    </div>
  )
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

function WeaponRecipeTable({ data, searchPlaceholder }: { data: Record<string, unknown>[]; searchPlaceholder: string }) {
  const rows = data as unknown as WeaponRecipeRow[]
  const [selectedTier, setSelectedTier] = useState<Record<string, keyof WeaponRecipeRow>>({})

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

  return <DataTable data={rows} columns={columns} searchPlaceholder={searchPlaceholder} />
}
