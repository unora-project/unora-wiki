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
            <GenericTable data={table.data} searchPlaceholder={table.searchPlaceholder} />
          </section>
        ))
      )}
    </div>
  )
}

function GenericTable({ data, searchPlaceholder }: { data: Record<string, unknown>[]; searchPlaceholder: string }) {
  const columns = useMemo(() => {
    if (data.length === 0) return []
    const keys = Object.keys(data[0])
    const colHelper = createColumnHelper<Record<string, unknown>>()
    return keys.map((key) =>
      colHelper.accessor((row) => row[key], {
        id: key,
        header: key,
        cell: (info) => String(info.getValue() ?? '-'),
      })
    )
  }, [data])

  if (data.length === 0) {
    return <p className="text-parchment-500 dark:text-parchment-600">No data available.</p>
  }

  return <DataTable data={data} columns={columns} searchPlaceholder={searchPlaceholder} />
}
