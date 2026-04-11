import { useParams } from 'react-router'
import { useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/tables/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  MapPin, Hammer, PackageOpen, Lightbulb,
  type LucideIcon,
} from 'lucide-react'

import alchemyRecipes from '@/data/professions/alchemy-recipes.json'
import alchemyExtracts from '@/data/professions/alchemy-extracts.json'
import armorsmithingRecipes from '@/data/professions/armorsmithing-recipes.json'
import enchantingEnchants from '@/data/professions/enchanting-enchants.json'
import jewelcraftingRecipes from '@/data/professions/jewelcrafting-recipes.json'
import weaponsmithingRecipes from '@/data/professions/weaponsmithing-recipes.json'
import cookingRecipes from '@/data/professions/cooking-recipes.json'
import cookingIngredients from '@/data/professions/cooking-ingredients.json'
import fishingFish from '@/data/professions/fishing-fish.json'
import professionsMetadata from '@/data/metadata/professions.json'

const iconMap: Record<string, LucideIcon> = { MapPin, Hammer, PackageOpen, Lightbulb }

const dataFiles: Record<string, Record<string, unknown>[]> = {
  'alchemy-recipes': alchemyRecipes,
  'alchemy-extracts': alchemyExtracts,
  'armorsmithing-recipes': armorsmithingRecipes,
  'enchanting-enchants': enchantingEnchants,
  'jewelcrafting-recipes': jewelcraftingRecipes,
  'weaponsmithing-recipes': weaponsmithingRecipes,
  'cooking-recipes': cookingRecipes,
  'cooking-ingredients': cookingIngredients as Record<string, unknown>[],
  'fishing-fish': fishingFish,
}

interface InfoCard {
  icon: LucideIcon
  title: string
  body: string
}

interface ProfessionInfo {
  name: string
  description: string
  cards: InfoCard[]
  tip?: string
  tables: { title: string; data: Record<string, unknown>[]; searchPlaceholder: string }[]
}

// Build professions from metadata YAML (icons are strings → resolved to components)
const professions: Record<string, ProfessionInfo> = {}
for (const [key, meta] of Object.entries(professionsMetadata as Record<string, {
  name: string
  description: string
  cards: { icon: string; title: string; body: string }[]
  tip?: string
  tables: { title: string; dataFile: string; searchPlaceholder: string }[]
}>)) {
  professions[key] = {
    name: meta.name,
    description: meta.description,
    cards: meta.cards.map((c) => ({
      icon: iconMap[c.icon] || MapPin,
      title: c.title,
      body: c.body,
    })),
    tip: meta.tip,
    tables: (meta.tables || []).map((t) => ({
      title: t.title,
      data: dataFiles[t.dataFile] || [],
      searchPlaceholder: t.searchPlaceholder,
    })),
  }
}

export function ProfessionDetail() {
  const { type } = useParams<{ type: string }>()
  const info = type ? professions[type] : null

  if (!info || !type) {
    return (
      <div className="py-20 text-center">
        <h1 className="font-heading text-2xl text-gilt">Profession not found</h1>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={info.name}
        description={info.description}
        accent="verdant"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Professions', to: '/professions' },
          { label: info.name },
        ]}
      />

      {/* Info cards grid */}
      <div className={`mb-6 grid gap-4 ${info.cards.length >= 2 ? 'sm:grid-cols-2' : ''}`}>
        {info.cards.map((card) => (
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
      {info.tip && (
        <div className="mb-8 flex gap-3 rounded-lg border border-verdant/20 bg-verdant/5 p-4">
          <Lightbulb size={18} className="mt-0.5 shrink-0 text-verdant" />
          <p className="text-sm leading-relaxed text-parchment-700 dark:text-parchment-300">
            {info.tip}
          </p>
        </div>
      )}

      {/* Data tables */}
      {info.tables.map((table) => (
        <section key={table.title} className="mb-8">
          <h2 className="mb-4 font-heading text-xl font-semibold text-gilt">
            {table.title}
          </h2>
          <GenericTable data={table.data} searchPlaceholder={table.searchPlaceholder} />
        </section>
      ))}
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
