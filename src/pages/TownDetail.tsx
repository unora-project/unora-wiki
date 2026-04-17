import { useParams } from 'react-router'
import { useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/tables/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { OptimizedImage } from '@/components/ui/OptimizedImage'
import npcsData from '@/data/towns/npcs.json'
import shopsData from '@/data/towns/shops.json'
import { ChevronRight } from 'lucide-react'

interface NPC {
  town: string
  name: string
  type: string
  coordinates: string
}

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

const columnHelper = createColumnHelper<NPC>()
const columns = [
  columnHelper.accessor('name', { header: 'Name' }),
  columnHelper.accessor('type', { header: 'Type' }),
  columnHelper.accessor('coordinates', { header: 'Coordinates' }),
]

const shopColumnHelper = createColumnHelper<ShopItem>()
const shopColumns = [
  shopColumnHelper.accessor('name', { header: 'Name' }),
  shopColumnHelper.accessor('type', { header: 'Type' }),
  shopColumnHelper.accessor('cost', { header: 'Cost (Gold)' }),
]

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
      <section className="mb-8">
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
