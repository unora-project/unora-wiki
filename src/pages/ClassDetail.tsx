import { Link, useParams } from 'react-router'
import { useState, useMemo, useEffect } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable, compareLevels } from '@/components/tables/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import classInfo from '@/data/metadata/classes.json'
import { CLASS_FAMILIES, classLabel } from '@/lib/class-families'

interface SkillSpell {
  name: string
  class: string
  element?: string
  levelRequirement: string
  statRequirements: string
  goldRequired: string
  itemRequirements: string
  prerequisites: string
  learningLocation: string
  description: string
}

interface Dugon {
  name: string
  target: string
  meditation: string
}

interface Shard {
  skills: SkillSpell[]
  spells: SkillSpell[]
}

const EMPTY_SHARD: Shard = { skills: [], spells: [] }

const typedClassInfo = classInfo as Record<string, {
  description: string
  mastering: string[]
  dedication: string[]
  dedicationCarryOver: string
  statCaps: { progression: string; str: number; int: number; wis: number; con: number; dex: number }[]
}>

const skillColumnHelper = createColumnHelper<SkillSpell>()

const skillColumns = [
  skillColumnHelper.accessor('name', { header: 'Name' }),
  skillColumnHelper.accessor('levelRequirement', { header: 'Level', sortingFn: compareLevels }),
  skillColumnHelper.accessor('statRequirements', { header: 'Stats' }),
  skillColumnHelper.accessor('goldRequired', { header: 'Gold' }),
  skillColumnHelper.accessor('itemRequirements', { header: 'Items' }),
  skillColumnHelper.accessor('prerequisites', { header: 'Prereqs' }),
  skillColumnHelper.accessor('learningLocation', { header: 'Location' }),
  skillColumnHelper.accessor('description', { header: 'Description' }),
]

function normalizeElement(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
}

function elementLabel(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1)
}

const ELEMENT_ORDER = ['fire', 'water', 'earth', 'wind']

// Same columns as skillColumns, plus an Element column after Name. Used on
// the "All" view so people can see which attunement each spell belongs to.
const skillColumnsWithElement = [
  skillColumnHelper.accessor('name', { header: 'Name' }),
  skillColumnHelper.accessor(
    (row) => (normalizeElement(row.element) ? elementLabel(normalizeElement(row.element)) : 'Any'),
    { id: 'element', header: 'Element' }
  ),
  ...skillColumns.slice(1),
]

const dugonColumnHelper = createColumnHelper<Dugon>()

const dugonColorMap: Record<string, string> = {
  White: 'text-parchment-800 dark:text-ivory',
  Green: 'text-green-600 dark:text-green-400',
  Blue: 'text-blue-600 dark:text-blue-400',
  Yellow: 'text-yellow-600 dark:text-yellow-400',
  Purple: 'text-purple-600 dark:text-purple-400',
  Brown: 'text-amber-700 dark:text-amber-500',
  Red: 'text-red-600 dark:text-red-400',
  Black: 'text-parchment-900 dark:text-parchment-200',
}

const dugonColumns = [
  dugonColumnHelper.accessor('name', {
    header: 'Name',
    cell: ({ getValue }) => {
      const name = getValue()
      const colorKey = Object.keys(dugonColorMap).find((c) => name.startsWith(c))
      const colorClass = colorKey ? dugonColorMap[colorKey] : ''
      return <span className={`font-medium ${colorClass}`}>{name}</span>
    },
  }),
  dugonColumnHelper.accessor('target', {
    header: 'Target',
    cell: ({ getValue }) => renderTextWithLinks(getValue()),
  }),
  dugonColumnHelper.accessor('meditation', { header: 'Meditation Location' }),
]

const classShardCache = new Map<string, Shard>()
const dugonCache = new Map<string, Dugon[]>()

async function loadClassShard(slug: string): Promise<Shard> {
  const cached = classShardCache.get(slug)
  if (cached) return cached
  const base = import.meta.env.BASE_URL + 'data/classes/' + slug
  const [skills, spells] = await Promise.all([
    fetch(base + '/skills.json').then((r) => (r.ok ? (r.json() as Promise<SkillSpell[]>) : [])).catch(() => []),
    fetch(base + '/spells.json').then((r) => (r.ok ? (r.json() as Promise<SkillSpell[]>) : [])).catch(() => []),
  ])
  const result = { skills, spells }
  classShardCache.set(slug, result)
  return result
}

async function loadDugons(className: string): Promise<Dugon[]> {
  const cached = dugonCache.get(className)
  if (cached) return cached
  const base = import.meta.env.BASE_URL + 'data/classes/' + className
  const dugons = await fetch(base + '/dugons.json')
    .then((r) => (r.ok ? (r.json() as Promise<Dugon[]>) : []))
    .catch(() => [])
  dugonCache.set(className, dugons)
  return dugons
}

function SubTabs({
  items,
  active,
  onChange,
}: {
  items: { slug: string; label: string; count: number }[]
  active: string
  onChange: (slug: string) => void
}) {
  if (items.length <= 1) return null
  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <button
          key={item.slug}
          onClick={() => onChange(item.slug)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            active === item.slug
              ? 'border border-gilt bg-transparent text-gilt'
              : 'border border-parchment-300 bg-parchment-100 text-parchment-600 hover:border-gilt hover:text-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ash dark:hover:border-gilt'
          }`}
        >
          {item.label} ({item.count})
        </button>
      ))}
    </div>
  )
}

function ElementTabs({
  items,
  active,
  onChange,
}: {
  items: { id: string; label: string; count: number }[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-medium uppercase tracking-wider text-parchment-500 dark:text-parchment-600">
        Attunement:
      </span>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            active === item.id
              ? 'border border-gilt bg-transparent text-gilt'
              : 'border border-parchment-300 bg-parchment-100 text-parchment-600 hover:border-gilt hover:text-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ash dark:hover:border-gilt'
          }`}
        >
          {item.label} ({item.count})
        </button>
      ))}
    </div>
  )
}

export function ClassDetail() {
  const { className } = useParams<{ className: string }>()
  const info = className ? typedClassInfo[className] : null

  // The class itself plus its two Medenia branches (e.g. monk, adept, druid).
  const family = useMemo(
    () => (className ? CLASS_FAMILIES[className] ?? [className] : []),
    [className]
  )

  const [shards, setShards] = useState<Record<string, Shard>>({})
  const [dugons, setDugons] = useState<Dugon[]>(className ? dugonCache.get(className) ?? [] : [])
  const [activeSub, setActiveSub] = useState('')
  const [activeElement, setActiveElement] = useState('all')

  useEffect(() => {
    setActiveSub('')
  }, [className])

  useEffect(() => {
    setActiveElement('all')
  }, [className, activeSub])

  useEffect(() => {
    let alive = true
    Promise.all(
      family.map(async (slug) => [slug, await loadClassShard(slug)] as const)
    ).then((entries) => {
      if (!alive) return
      setShards((prev) => ({ ...prev, ...Object.fromEntries(entries) }))
    })
    return () => { alive = false }
  }, [family])

  useEffect(() => {
    if (className !== 'monk') {
      setDugons([])
      return
    }
    let alive = true
    loadDugons(className).then((data) => {
      if (!alive) return
      setDugons(data)
    })
    return () => { alive = false }
  }, [className])

  const familyData = useMemo(
    () =>
      family.map((slug) => ({
        slug,
        label: classLabel(slug),
        shard: shards[slug] ?? classShardCache.get(slug) ?? EMPTY_SHARD,
      })),
    [family, shards]
  )

  const totalSkills = familyData.reduce((n, f) => n + f.shard.skills.length, 0)
  const totalSpells = familyData.reduce((n, f) => n + f.shard.spells.length, 0)

  const tabs = useMemo(() => {
    const t: { id: string; label: string }[] = []
    if (info && info.statCaps.length > 0) t.push({ id: 'overview', label: 'Overview' })
    if (totalSkills > 0) t.push({ id: 'skills', label: `Skills (${totalSkills})` })
    if (totalSpells > 0) t.push({ id: 'spells', label: `Spells (${totalSpells})` })
    if (className === 'monk' && dugons.length > 0) t.push({ id: 'dugons', label: `Dugons (${dugons.length})` })
    return t
  }, [info, totalSkills, totalSpells, dugons, className])

  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? 'overview')

  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTab)) {
      setActiveTab(tabs[0]?.id ?? 'overview')
    }
  }, [tabs, activeTab])

  if (!info || !className) {
    return (
      <div className="py-20 text-center">
        <h1 className="font-heading text-2xl text-gilt">Class not found</h1>
      </div>
    )
  }

  const displayName = classLabel(className)
  const currentSub = family.includes(activeSub) ? activeSub : (family[0] ?? '')
  const currentShard = familyData.find((f) => f.slug === currentSub)?.shard ?? EMPTY_SHARD

    const renderSkillSpellPanel = (kind: 'skills' | 'spells') => {
    const rows = currentShard[kind]

    // Elements tagged on this class's entries, in a stable order.
    const elementsPresent = Array.from(
      new Set(rows.map((r) => normalizeElement(r.element)).filter(Boolean))
    ).sort((a, b) => {
      const ai = ELEMENT_ORDER.indexOf(a)
      const bi = ELEMENT_ORDER.indexOf(b)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.localeCompare(b)
    })
    const hasElements = elementsPresent.length > 0
    const activeEl = hasElements && elementsPresent.includes(activeElement) ? activeElement : 'all'

    const elementRows =
      activeEl === 'all' ? rows : rows.filter((r) => normalizeElement(r.element) === activeEl)
    const anyRows = activeEl === 'all' ? [] : rows.filter((r) => !normalizeElement(r.element))

    return (
      <section>
        <SubTabs
          items={familyData.map((f) => ({ slug: f.slug, label: f.label, count: f.shard[kind].length }))}
          active={currentSub}
          onChange={setActiveSub}
        />

        {hasElements && (
          <ElementTabs
            items={[
              { id: 'all', label: 'All', count: rows.length },
              ...elementsPresent.map((el) => ({
                id: el,
                label: elementLabel(el),
                count: rows.filter((r) => normalizeElement(r.element) === el).length,
              })),
            ]}
            active={activeEl}
            onChange={setActiveElement}
          />
        )}

        {rows.length === 0 ? (
          <p className="py-10 text-center text-parchment-500 dark:text-parchment-600">
            No {kind} added for {classLabel(currentSub)} yet.
          </p>
        ) : (
          <>
            {activeEl !== 'all' && (
              <h3 className="mb-3 font-heading text-lg font-semibold text-gilt">
                {elementLabel(activeEl)} Attunement
              </h3>
            )}
            <DataTable
              key={`${kind}-${currentSub}-${activeEl}`}
              data={elementRows}
              columns={hasElements && activeEl === 'all' ? skillColumnsWithElement : skillColumns}
              searchPlaceholder={`Search ${classLabel(currentSub)} ${kind}...`}
              initialSorting={[{ id: 'levelRequirement', desc: false }]}
            />

            {anyRows.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-1 font-heading text-lg font-semibold text-gilt">Any Attunement</h3>
                <p className="mb-3 text-sm text-parchment-600 dark:text-parchment-400">
                  These {kind} don't depend on which element you're attuned to.
                </p>
                <DataTable
                  key={`${kind}-${currentSub}-any`}
                  data={anyRows}
                  columns={skillColumns}
                  searchPlaceholder={`Search ${classLabel(currentSub)} ${kind}...`}
                  initialSorting={[{ id: 'levelRequirement', desc: false }]}
                />
              </div>
            )}
          </>
        )}
      </section>
    )
  }

  return (
    <div>
      <PageHeader
        title={displayName}
        description={info.description}
        accent="ignis"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Classes', to: '/classes' },
          { label: displayName },
        ]}
      />

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="mb-6 flex gap-1 border-b border-parchment-300 dark:border-ash/20">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2.5 font-ui text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-gilt'
                  : 'text-ash hover:text-parchment-800 dark:hover:text-ivory'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-gilt" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Stat Caps */}
          {info.statCaps.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 font-heading text-2xl font-semibold text-gilt">
                Stat Caps
              </h2>
              <p className="mb-3 text-sm text-parchment-600 dark:text-parchment-400">
                Maximum stat points per progression level for {displayName}s.
              </p>
              <div className="overflow-x-auto rounded-lg border border-parchment-300 dark:border-ash/20">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-parchment-300 bg-parchment-200 dark:border-ash/20 dark:bg-ink">
                      {['Progression', 'STR', 'INT', 'WIS', 'CON', 'DEX'].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-parchment-600 dark:text-parchment-400">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {info.statCaps.map((row, i) => (
                      <tr key={i} className={`border-b border-parchment-200 dark:border-ash/10 ${i % 2 ? 'bg-parchment-100/50 dark:bg-ink/20' : ''}`}>
                        <td className="px-3 py-2 font-semibold text-gilt">{row.progression}</td>
                        <td className="px-3 py-2 text-parchment-800 dark:text-parchment-300">{row.str}</td>
                        <td className="px-3 py-2 text-parchment-800 dark:text-parchment-300">{row.int}</td>
                        <td className="px-3 py-2 text-parchment-800 dark:text-parchment-300">{row.wis}</td>
                        <td className="px-3 py-2 text-parchment-800 dark:text-parchment-300">{row.con}</td>
                        <td className="px-3 py-2 text-parchment-800 dark:text-parchment-300">{row.dex}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Mastering & Dedication side by side */}
          <div className="grid gap-6 sm:grid-cols-2">
            {info.mastering.length > 0 && (
              <section className="rounded-lg border border-parchment-300 bg-parchment-100 p-5 dark:border-ash/10 dark:bg-ink">
                <h2 className="mb-3 font-heading text-xl font-semibold text-gilt">
                  Mastering Requirements
                </h2>
                <ul className="ml-5 list-disc space-y-1 text-sm text-parchment-800 marker:text-gilt dark:text-ivory/90">
                  {info.mastering.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </section>
            )}

            {info.dedication.length > 0 && (
              <section className="rounded-lg border border-parchment-300 bg-parchment-100 p-5 dark:border-ash/10 dark:bg-ink">
                <h2 className="mb-3 font-heading text-xl font-semibold text-gilt">
                  Class Dedication (Subbing)
                </h2>
                <ul className="ml-5 list-disc space-y-1 text-sm text-parchment-800 marker:text-gilt dark:text-ivory/90">
                  {info.dedication.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-parchment-600 dark:text-parchment-400">
                  {info.dedicationCarryOver}
                </p>
              </section>
            )}
          </div>
        </>
      )}

      {/* Skills Tab */}
      {activeTab === 'skills' && renderSkillSpellPanel('skills')}

      {/* Spells Tab */}
      {activeTab === 'spells' && renderSkillSpellPanel('spells')}

      {/* Dugons Tab */}
      {activeTab === 'dugons' && dugons.length > 0 && (
        <section>
          <p className="mb-4 text-center text-base text-parchment-600 dark:text-parchment-400">
            Dugons are an important part of the Monk class! Start by heading to Sapphire Streams and speaking to Sabonim!
            <br /><br />
            When you're ready say "Sabonim, Please teach me the -color- dugon." (ie. Sabonim, Please teach me the White dugon.)
            <br /><br />
            After meditating (which can take a bit of time), return to Sabonim and say "Sabonim, I understand the -color- dugon." (ie. Sabonim, I understand the White dugon.)
          </p>
          <DataTable
            data={dugons}
            columns={dugonColumns}
            searchPlaceholder="Search Dugons..."
          />
        </section>
      )}
    </div>
  )
}

function renderTextWithLinks(text: string) {
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g
  const parts: (string | JSX.Element)[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let keyIndex = 0

  while ((match = linkPattern.exec(text)) !== null) {
    const [fullMatch, label, url] = match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const isInternal = url.startsWith('/')
    const currentKey = keyIndex
    keyIndex += 1

    parts.push(
      isInternal ? (
        <Link
          key={currentKey}
          to={url}
          className="underline decoration-gilt/60 hover:decoration-gilt"
        >
          {label}
        </Link>
      ) : (
        <a
          key={currentKey}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-gilt/60 hover:decoration-gilt"
        >
          {label}
        </a>
      )
    )

    lastIndex = match.index + fullMatch.length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}