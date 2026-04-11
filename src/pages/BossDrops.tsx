import { Link } from 'react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/tables/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import bossesData from '@/data/hunting/bosses.json'

interface Boss {
  boss: string
  level: string
  location: string
  locationSlug: string | null
  drops: string
}

const columnHelper = createColumnHelper<Boss>()
const columns = [
  columnHelper.accessor('boss', { header: 'Boss' }),
  columnHelper.accessor('level', { header: 'Level' }),
  columnHelper.accessor('location', {
    header: 'Location',
    cell: ({ row }) => {
      const { location, locationSlug } = row.original
      if (locationSlug) {
        return (
          <Link to={`/hunting/${locationSlug}`} className="text-ivory underline decoration-gilt/60 hover:decoration-gilt dark:text-ivory">
            {location}
          </Link>
        )
      }
      return location
    },
  }),
  columnHelper.accessor('drops', { header: 'Drops' }),
]

export function BossDrops() {
  return (
    <div>
      <PageHeader
        title="Boss Drops"
        description="Boss encounters and their loot drops throughout Unora."
        accent="ignis"
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Boss Drops' }]}
      />
      <DataTable
        data={bossesData as Boss[]}
        columns={columns}
        searchPlaceholder="Search bosses..."
      />
    </div>
  )
}
