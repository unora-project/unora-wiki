import { useParams } from 'react-router'
import { useState, useMemo, useEffect } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/tables/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import classInfo from '@/data/metadata/classes.json'

interface SkillSpell {
  name: string
  class: string
  levelRequirement: string
  statRequirements: string
  goldRequired: string
  itemRequirements: string
  prerequisites: string
  learningLocation: string
  description: string
}

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
  skillColumnHelper.accessor('levelRequirement', { header: 'Level' }),
  skillColumnHelper.accessor('statRequirements', { header: 'Stats' }),
  skillColumnHelper.accessor('goldRequired', { header: 'Gold' }),
  skillColumnHelper.accessor('itemRequirements', { header: 'Items' }),
  skillColumnHelper.accessor('prerequisites', { header: 'Prereqs' }),
  skillColumnHelper.accessor('learningLocation', { header: 'Location' }),
  skillColumnHelper.accessor('description', { header: 'Description' }),
]

const classShardCache = new Map<string, { skills: SkillSpell[]; spells: SkillSpell[] }>()

async function loadClassShard(className: string): Promise<{ skills: SkillSpell[]; spells: SkillSpell[] }> {
  const cached = classShardCache.get(className)
  if (cached) return cached
  const base = import.meta.env.BASE_URL + 'data/classes/' + className
  const [skills, spells] = await Promise.all([
    fetch(base + '/skills.json').then((r) => (r.ok ? (r.json() as Promise<SkillSpell[]>) : [])).catch(() => []),
    fetch(base + '/spells.json').then((r) => (r.ok ? (r.json() as Promise<SkillSpell[]>) : [])).catch(() => []),
  ])
  const result = { skills, spells }
  classShardCache.set(className, result)
  return result
}

export function ClassDetail() {
  const { className } = useParams<{ className: string }>()
  const info = className ? typedClassInfo[className] : null

  const initial = className ? classShardCache.get(className) : undefined
  const [skills, setSkills] = useState<SkillSpell[]>(initial?.skills ?? [])
  const [spells, setSpells] = useState<SkillSpell[]>(initial?.spells ?? [])

  useEffect(() => {
    if (!className) return
    let alive = true
    loadClassShard(className).then((shard) => {
      if (!alive) return
      setSkills(shard.skills)
      setSpells(shard.spells)
    })
    return () => { alive = false }
  }, [className])

  const tabs = useMemo(() => {
    const t: { id: string; label: string }[] = []
    if (info && info.statCaps.length > 0) t.push({ id: 'overview', label: 'Overview' })
    if (skills.length > 0) t.push({ id: 'skills', label: `Skills (${skills.length})` })
    if (spells.length > 0) t.push({ id: 'spells', label: `Spells (${spells.length})` })
    return t
  }, [info, skills, spells])

  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? 'overview')

  if (!info || !className) {
    return (
      <div className="py-20 text-center">
        <h1 className="font-heading text-2xl text-gilt">Class not found</h1>
      </div>
    )
  }

  const displayName = className.charAt(0).toUpperCase() + className.slice(1)

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
            {/* Mastering Requirements */}
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

            {/* Class Dedication */}
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
      {activeTab === 'skills' && skills.length > 0 && (
        <section>
          <DataTable
            data={skills}
            columns={skillColumns}
            searchPlaceholder={`Search ${displayName} skills...`}
            initialSorting={[{ id: 'levelRequirement', desc: false }]}
          />
        </section>
      )}

      {/* Spells Tab */}
      {activeTab === 'spells' && spells.length > 0 && (
        <section>
          <DataTable
            data={spells}
            columns={skillColumns}
            searchPlaceholder={`Search ${displayName} spells...`}
            initialSorting={[{ id: 'levelRequirement', desc: false }]}
          />
        </section>
      )}
    </div>
  )
}
