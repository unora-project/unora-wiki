import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/tables/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { OptimizedImage } from '@/components/ui/OptimizedImage'
import mountsData from '@/data/mounts/mounts.json'
import cloaksData from '@/data/mounts/cloaks.json'

interface Mount {
  name: string
  speed: string
  obtained: string
}

interface Cloak {
  color: string
  obtained: string
}

/** Render markdown-style links as plain text (strip link syntax, keep label) */
function stripMdLinks(text: string) {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
}

const mountColumnHelper = createColumnHelper<Mount>()
const mountColumns = [
  mountColumnHelper.accessor('name', { header: 'Name' }),
  mountColumnHelper.accessor('speed', { header: 'Speed' }),
  mountColumnHelper.accessor('obtained', {
    header: 'How to Obtain',
    cell: ({ getValue }) => stripMdLinks(getValue()),
  }),
]

const cloakColumnHelper = createColumnHelper<Cloak>()
const cloakColumns = [
  cloakColumnHelper.accessor('color', { header: 'Color' }),
  cloakColumnHelper.accessor('obtained', {
    header: 'How to Obtain',
    cell: ({ getValue }) => stripMdLinks(getValue()),
  }),
]

export function Mounts() {
  return (
    <div>
      <PageHeader
        title="Mounts & Cloaks"
        description="Cosmetic mounts and cloaks available in Unora."
        accent="tide"
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Mounts' }]}
      />

      {/* Mount Images */}
      <section className="mb-8">
        <h2 className="mb-4 font-heading text-2xl font-semibold text-gilt">
          Mounts
        </h2>
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {['horse', 'kelberoth', 'ant', 'dunan'].map((mount) => (
            <div key={mount} className="overflow-hidden rounded-lg border border-parchment-300 bg-parchment-100 dark:border-ash/10 dark:bg-ink">
              <OptimizedImage
                src={`${import.meta.env.BASE_URL}images/mounts/${mount}.png`}
                alt={mount}
                width={250}
                height={250}
                className="h-32 w-full object-contain p-2"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <div className="border-t border-parchment-200 px-3 py-2 text-center text-xs font-medium capitalize text-parchment-700 dark:border-ash/10 dark:text-ash">
                {mount.replace(/_/g, ' ')}
              </div>
            </div>
          ))}
        </div>
        <DataTable
          data={mountsData as Mount[]}
          columns={mountColumns}
          searchPlaceholder="Search mounts..."
        />
      </section>

      {/* Cloaks */}
      <section className="mb-8">
        <h2 className="mb-4 font-heading text-2xl font-semibold text-gilt">
          Cloaks
        </h2>
        <div className="mb-6 grid grid-cols-3 gap-4 sm:grid-cols-5">
          {['green', 'purple', 'blue', 'red', 'black'].map((color) => (
            <div key={color} className="overflow-hidden rounded-lg border border-parchment-300 bg-parchment-100 dark:border-ash/10 dark:bg-ink">
              <OptimizedImage
                src={`${import.meta.env.BASE_URL}images/mounts/${color}.png`}
                alt={`${color} cloak`}
                width={250}
                height={250}
                className="h-24 w-full object-contain p-2"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <div className="border-t border-parchment-200 px-3 py-2 text-center text-xs font-medium capitalize text-parchment-700 dark:border-ash/10 dark:text-ash">
                {color} cloak
              </div>
            </div>
          ))}
        </div>
        <DataTable
          data={cloaksData as Cloak[]}
          columns={cloakColumns}
          searchPlaceholder="Search cloaks..."
        />
      </section>
    </div>
  )
}
