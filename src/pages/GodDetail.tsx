import { useParams } from 'react-router'
import { useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/tables/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { OptimizedImage } from '@/components/ui/OptimizedImage'
import blessingsData from '@/data/religion/blessings.json'
import godInfoData from '@/data/metadata/religion.json'

interface Blessing {
  goddess: string
  blessing: string
  cost: string
  description: string
}

const godInfo = godInfoData as Record<string, {
  name: string
  subtitle: string
  location: string
  description: string
  blessingBonus: string
}>

const columnHelper = createColumnHelper<Blessing>()
const columns = [
  columnHelper.accessor('blessing', { header: 'Blessing' }),
  columnHelper.accessor('cost', { header: 'Cost' }),
  columnHelper.accessor('description', { header: 'Description' }),
]

export function GodDetail() {
  const { god } = useParams<{ god: string }>()
  const info = god ? godInfo[god] : null

  const blessings = useMemo(
    () => (blessingsData as Blessing[]).filter((b) => b.goddess === god),
    [god]
  )

  if (!info || !god) {
    return (
      <div className="py-20 text-center">
        <h1 className="font-heading text-2xl text-gilt">Goddess not found</h1>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={info.name}
        description={info.subtitle}
        accent="astral"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Religion', to: '/religion' },
          { label: info.name },
        ]}
      />

      <div className="mb-8 flex flex-col items-center gap-6 md:flex-row md:items-start">
        {/* Portrait */}
        <div className="shrink-0">
          <OptimizedImage
            src={`${import.meta.env.BASE_URL}images/religion/${god}.png`}
            alt={info.name}
            width={360}
            height={330}
            className="h-auto w-48 max-w-full rounded-lg shadow-md md:w-56"
          />
        </div>

        {/* Description */}
        <div>
          <p className="mb-2 text-sm text-parchment-500 dark:text-parchment-600">
            Resides in {info.location}
          </p>
          <blockquote className="border-l-4 border-gilt py-2 pl-4 italic text-parchment-700 dark:text-ivory/70">
            {info.description}
          </blockquote>
        </div>
      </div>

      {/* Blessing Bonus */}
      <div className="mb-6 rounded-lg border-l-4 border-verdant bg-verdant/10 p-4 dark:bg-verdant/5">
        <p className="font-heading text-sm font-semibold text-parchment-900 dark:text-parchment-100">
          Divine Blessing Bonus
        </p>
        <p className="mt-1 text-sm text-parchment-700 dark:text-parchment-300">
          Once devoted, {info.name} provides <strong>{info.blessingBonus}</strong> when selecting a divine blessing.
        </p>
      </div>

      {/* Blessings Table */}
      {blessings.length > 0 && (
        <section>
          <h2 className="mb-4 font-heading text-2xl font-semibold text-gilt">
            Divine Blessings
          </h2>
          <DataTable
            data={blessings}
            columns={columns}
            searchPlaceholder="Search blessings..."
            initialSorting={[{ id: 'cost', desc: false }]}
          />
        </section>
      )}
    </div>
  )
}
