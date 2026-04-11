import { useState, useMemo } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/ui/PageHeader'
import { LayoutGrid, BarChart3, Skull, MapPin } from 'lucide-react'
import bossesData from '@/data/hunting/bosses.json'
import huntingIndexData from '@/data/metadata/hunting-index.json'

/* ── Types ── */

interface HuntingAreaRaw {
  name: string
  slug: string
  levelRange: string
  levelMin: number
  levelMax: number
  tier: 'early' | 'mid' | 'late' | 'master' | 'grandmaster'
  image?: string
}

interface HuntingArea extends Omit<HuntingAreaRaw, 'image'> {
  image?: string
}

interface AreaBar {
  name: string
  slug: string
  startPercent: number
  widthPercent: number
  color: string
}

/* ── Load from generated metadata ── */

const huntingIndex = huntingIndexData as {
  tierConfig: Record<string, { label: string; classes: string }>
  tiers: { id: string; label: string }[]
  huntingAreas: HuntingAreaRaw[]
  preMasterAreas: AreaBar[]
  masterAreas: AreaBar[]
}

const tierConfig = huntingIndex.tierConfig
const tiers = huntingIndex.tiers

/* ── Boss counts by slug ── */

const bossCounts: Record<string, number> = {}
for (const b of bossesData) {
  bossCounts[b.locationSlug] = (bossCounts[b.locationSlug] || 0) + 1
}

/* ── Area data for card view (resolve image paths from filenames) ── */

const thumbBase = import.meta.env.BASE_URL + 'images/hunting/thumbs/'

function thumb(file: string) { return thumbBase + file.replace('.png', '.webp') }

const huntingAreas: HuntingArea[] = huntingIndex.huntingAreas.map((a) => ({
  ...a,
  image: a.image ? thumb(a.image) : undefined,
}))

/* ── Chart data ── */

const preMasterAreas: AreaBar[] = huntingIndex.preMasterAreas
const masterAreas: AreaBar[] = huntingIndex.masterAreas

/* ── Chart component (preserved) ── */

function LevelChart({ areas, labels }: { areas: AreaBar[]; labels: string[] }) {
  return (
    <div className="mb-8 overflow-x-auto rounded-lg border border-parchment-300 bg-parchment-100 p-4 dark:border-ash/10 dark:bg-ink">
      <div className="mb-2 flex justify-between text-xs font-medium text-parchment-500 dark:text-parchment-400">
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <div className="space-y-1.5">
        {areas.map((area, i) => (
          <div key={`${area.slug}-${i}`} className="relative h-9">
            <Link
              to={`/hunting/${area.slug}`}
              className="absolute flex h-full items-center justify-center rounded-md px-2 text-xs font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{
                left: `${area.startPercent}%`,
                width: `${area.widthPercent}%`,
                backgroundColor: area.color,
                minWidth: '80px',
              }}
            >
              <span className="truncate">{area.name}</span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Main component ── */

export function HuntingGrounds() {
  const [view, setView] = useState<'cards' | 'chart'>('cards')
  const [selectedTier, setSelectedTier] = useState('all')

  const filteredAreas = useMemo(() => {
    if (selectedTier === 'all') return huntingAreas
    return huntingAreas.filter((a) => a.tier === selectedTier)
  }, [selectedTier])

  return (
    <div>
      <PageHeader
        title="Hunting Grounds"
        description="Hunting areas in Unora organized by level range."
        accent="ignis"
      />

      {/* Toolbar: tier filters + view toggle */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Tier filters */}
        {view === 'cards' && (
          <div className="flex flex-wrap gap-1.5">
            {tiers.map((tier) => (
              <button
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedTier === tier.id
                    ? 'border border-gilt bg-transparent text-gilt'
                    : 'border border-parchment-300 bg-parchment-100 text-parchment-600 hover:border-gilt hover:text-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ash dark:hover:border-gilt'
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>
        )}
        {view === 'chart' && <div />}

        {/* View toggle */}
        <div className="flex shrink-0 overflow-hidden rounded-lg border border-parchment-300 dark:border-ash/20">
          <button
            onClick={() => setView('cards')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-ui text-xs font-medium transition-colors ${
              view === 'cards'
                ? 'bg-gilt/15 text-gilt'
                : 'bg-parchment-100 text-parchment-600 hover:text-gilt dark:bg-obsidian dark:text-ash'
            }`}
          >
            <LayoutGrid size={14} />
            Cards
          </button>
          <button
            onClick={() => setView('chart')}
            className={`flex items-center gap-1.5 border-l border-parchment-300 px-3 py-1.5 font-ui text-xs font-medium transition-colors dark:border-ash/20 ${
              view === 'chart'
                ? 'bg-gilt/15 text-gilt'
                : 'bg-parchment-100 text-parchment-600 hover:text-gilt dark:bg-obsidian dark:text-ash'
            }`}
          >
            <BarChart3 size={14} />
            Chart
          </button>
        </div>
      </div>

      {/* Card view */}
      {view === 'cards' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filteredAreas.map((area, i) => {
            const tc = tierConfig[area.tier]
            const bossCount = bossCounts[area.slug] || 0
            return (
              <Link
                key={`${area.slug}-${i}`}
                to={`/hunting/${area.slug}`}
                className="group overflow-hidden rounded-xl border border-parchment-300 bg-parchment-100 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gilt hover:shadow-md dark:border-ash/10 dark:bg-ink dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] dark:hover:border-gilt dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.4),0_0_30px_rgba(201,162,76,0.06)]"
              >
                {/* Thumbnail */}
                {area.image ? (
                  <div className="aspect-video overflow-hidden bg-parchment-200 dark:bg-ink">
                    <img
                      src={area.image}
                      alt={area.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-parchment-200 dark:bg-ink/50">
                    <MapPin size={32} className="text-parchment-400 dark:text-ash/30" />
                  </div>
                )}

                {/* Card body */}
                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className={`rounded-full border px-2 py-0.5 font-ui text-[10px] font-semibold uppercase tracking-wider ${tc.classes}`}>
                      {tc.label}
                    </span>
                    {bossCount > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-parchment-200 px-2 py-0.5 font-ui text-[10px] font-medium text-parchment-600 dark:bg-obsidian dark:text-ash">
                        <Skull size={10} />
                        {bossCount}
                      </span>
                    )}
                  </div>
                  <h2 className="font-heading text-lg font-semibold text-gilt transition-colors group-hover:text-gilt/80">
                    {area.name}
                  </h2>
                  <p className="mt-0.5 font-ui text-sm text-parchment-600 dark:text-ash">
                    Levels {area.levelRange}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Chart view (original) */}
      {view === 'chart' && (
        <>
          <section className="mb-10">
            <h2 className="mb-4 font-heading text-2xl font-semibold text-gilt">
              Pre-Master (Levels 1-99)
            </h2>
            <LevelChart
              areas={preMasterAreas}
              labels={['1', '10', '20', '30', '40', '50', '60', '70', '80', '90', '99']}
            />
          </section>
          <section>
            <h2 className="mb-4 font-heading text-2xl font-semibold text-gilt">
              Master (99-Grand Master)
            </h2>
            <LevelChart
              areas={masterAreas}
              labels={['99', 'Master', 'Grand Master']}
            />
          </section>
        </>
      )}
    </div>
  )
}
