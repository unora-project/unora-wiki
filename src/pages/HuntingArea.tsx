import { Link, useParams } from 'react-router'
import { useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/tables/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { OptimizedImage } from '@/components/ui/OptimizedImage'
import areasData from '@/data/metadata/hunting-areas.json'
import areaNamesData from '@/data/metadata/area-names.json'
import mapVariantsData from '@/data/metadata/map-variants.json'
import { resolveHuntingImage } from '@/lib/hunting-image'

interface Leader {
  npc: string
  area: string
  areaSlug?: string | null
  minimumLevel: string
}

interface ShopItem {
  name: string
  tab: string
  cost: number
}

interface AreaShop {
  npc: string
  currency: string
  items: ShopItem[]
}

interface Subarea {
  area: string
  minimumLevel: number
}

interface AreaDetail {
  area?: string
  description?: string
  mapImage?: string | null
  leaders?: Leader[]
  shops?: AreaShop[]
  subareas?: Subarea[]
}

const leaderColumnHelper = createColumnHelper<Leader>()
const leaderColumns = [
  leaderColumnHelper.accessor('npc', { header: 'NPC' }),
  leaderColumnHelper.accessor('area', {
    header: 'Area',
    cell: ({ row }) => <LeaderAreaLink leader={row.original} />,
  }),
  leaderColumnHelper.accessor('minimumLevel', { header: 'Minimum Level' }),
]

const shopItemColumnHelper = createColumnHelper<ShopItem>()
const shopItemColumns = [
  shopItemColumnHelper.accessor('name', { header: 'Item' }),
  shopItemColumnHelper.accessor('tab', { header: 'Type' }),
  shopItemColumnHelper.accessor('cost', { header: 'Cost (Tokens)' }),
]

const subareaColumnHelper = createColumnHelper<Subarea>()
const subareaColumns = [
  subareaColumnHelper.accessor('area', { header: 'Area' }),
  subareaColumnHelper.accessor('minimumLevel', { header: 'Minimum Level' }),
]

const areaNames = areaNamesData as Record<string, string>
const details = areasData as Record<string, AreaDetail>

function LeaderAreaLink({ leader }: { leader: Leader }) {
  const { area } = useParams<{ area: string }>()
  const slug = leader.areaSlug?.trim()
  if (!area || !slug) return leader.area
  return (
    <Link to={`/hunting/${encodeURIComponent(area)}/${encodeURIComponent(slug)}`}
      className="underline decoration-gilt/60 hover:decoration-gilt">
      {leader.area}
    </Link>
  )
}

export function HuntingArea() {
  const { area: areaParam, subarea: subareaParam } = useParams<{ area: string; subarea: string }>()
  const area = areaParam?.toLowerCase()
  const subarea = subareaParam?.toLowerCase()
  const key = subarea || area
  const parent = area ? details[area] : undefined
  const linkedArea = subarea ? parent?.leaders?.find(leader => leader.areaSlug?.trim().toLowerCase() === subarea) : undefined
  const displayName = key ? linkedArea?.area || details[key]?.area || areaNames[key] || key.replace(/_/g, ' ') : ''

  const areaDetail = useMemo(
    () => (key && details[key]) || null,
    [key]
  )

  if (!area || (subarea && (!linkedArea || !areaDetail))) {
    return (
      <div className="py-20 text-center">
        <h1 className="font-heading text-2xl text-gilt">Area not found</h1>
      </div>
    )
  }

  // Check for multi-level maps
  const selectedMap = resolveHuntingImage(areaDetail?.mapImage ?? undefined, import.meta.env.BASE_URL)
  const mapVariants = getMapVariants(key!)

  return (
    <div>
      <PageHeader
        title={displayName}
        accent="ignis"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Hunting Grounds', to: '/hunting' },
          ...(subarea ? [{ label: areaNames[area] || area, to: `/hunting/${area}` }] : []),
          { label: displayName },
        ]}
      />

      {/* Description */}
      {areaDetail?.description && (
        <p className="mb-6 text-parchment-700 dark:text-ivory/80">
          {areaDetail.description}
        </p>
      )}

      {/* Sub-areas */}
      {areaDetail?.subareas && areaDetail.subareas.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 font-heading text-2xl font-semibold text-gilt">
            Sub-areas
          </h2>
          <DataTable
            data={areaDetail.subareas}
            columns={subareaColumns}
            searchPlaceholder="Search sub-areas..."
            initialSorting={[{ id: 'minimumLevel', desc: false }]}
          />
        </section>
      )}

      {/* Maps */}
      {selectedMap ? (
        <div className="mb-8">
          <img src={selectedMap} alt={displayName} loading="lazy" decoding="async"
            className="max-w-full rounded-lg shadow-md" />
        </div>
      ) : mapVariants.length > 0 ? (
        <div className="mb-8 space-y-6">
          {mapVariants.map((variant) => (
            <section key={variant.src}>
              {variant.label && (
                <h2 className="mb-3 font-heading text-xl font-semibold text-gilt">
                  {variant.label}
                </h2>
              )}
              <OptimizedImage
                src={variant.src}
                alt={`${displayName}${variant.label ? ` - ${variant.label}` : ''}`}
                className="max-w-full rounded-lg shadow-md"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </section>
          ))}
        </div>
      ) : (
        <div className="py-10 text-center text-parchment-500 dark:text-parchment-600">
          <p>No map available for this area yet.</p>
        </div>
      )}

      {/* Leaders */}
      {areaDetail?.leaders && areaDetail.leaders.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 font-heading text-2xl font-semibold text-gilt">
            Leaders
          </h2>
          <DataTable
            data={areaDetail.leaders}
            columns={leaderColumns}
            searchPlaceholder="Search leaders..."
            initialSorting={[{ id: 'minimumLevel', desc: false }]}
          />
        </section>
      )}

      {/* Shops */}
      {areaDetail?.shops?.map((shop) => (
        <section key={shop.npc} className="mb-8">
          <h2 className="mb-4 font-heading text-2xl font-semibold text-gilt">
            Shop: {shop.npc}
          </h2>
          <p className="mb-3 text-sm text-parchment-600 dark:text-ivory/60">
            Currency: {shop.currency}
          </p>
          <DataTable
            data={shop.items}
            columns={shopItemColumns}
            searchPlaceholder={`Search ${shop.npc}'s inventory...`}
            initialSorting={[{ id: 'cost', desc: false }]}
          />
        </section>
      ))}
    </div>
  )
}

function getMapVariants(area: string): { src: string; label?: string }[] {
  const multiFloor = mapVariantsData as Record<string, string[]>

  if (multiFloor[area]) {
    return multiFloor[area].map((file) => ({
      src: `${import.meta.env.BASE_URL}images/hunting/${file}.png`,
      label: file !== area ? file.replace(`${area}_`, '').replace(/_/g, ' ').replace(/-/g, ' to ') : undefined,
    }))
  }

  // Default: single map
  return [{ src: `${import.meta.env.BASE_URL}images/hunting/${area}.png` }]
}
