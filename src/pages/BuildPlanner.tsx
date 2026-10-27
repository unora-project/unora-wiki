import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { classLabel } from '@/lib/class-families'
import {
  hasText,
  levelSortKey,
  loadClassShard,
  MaxStatsRow,
  parseGold,
  parseItems,
  usePersistentState,
  type PlanEntry,
  type SkillSpell,
} from './ClassDetail'

// Stand-alone Build Planner: shows only the saved plan for one class at a time.
// Reads the same saved picks as the class pages (abilityPlan.v1 / abilityPlanDone.v1).
export function BuildPlanner() {
  const [planMap, setPlanMap] = usePersistentState<Record<string, string[]>>('abilityPlan.v1', {})
  const [doneMap, setDoneMap] = usePersistentState<Record<string, string[]>>('abilityPlanDone.v1', {})
  const [lastClass, setLastClass] = usePersistentState<string>('plannerLastClass.v1', '')
  const [shard, setShard] = useState<{ skills: SkillSpell[]; spells: SkillSpell[] } | null>(null)

  // Only classes that actually have something planned.
  const classes = useMemo(
    () =>
      Object.entries(planMap)
        .filter(([, keys]) => Array.isArray(keys) && keys.length > 0)
        .map(([slug]) => ({ slug, label: classLabel(slug) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [planMap]
  )

  const current = classes.some((c) => c.slug === lastClass) ? lastClass : (classes[0]?.slug ?? '')

  useEffect(() => {
    if (!current) {
      setShard(null)
      return
    }
    let alive = true
    setShard(null)
    loadClassShard(current).then((s) => alive && setShard(s))
    return () => {
      alive = false
    }
  }, [current])

  const entries: PlanEntry[] = useMemo(() => {
    if (!shard) return []
    return (planMap[current] ?? []).flatMap((key) => {
      const [kind, ...rest] = key.split('|')
      if (kind !== 'skills' && kind !== 'spells') return []
      const name = rest.join('|')
      const item = shard[kind].find((i) => i.name === name)
      return item ? [{ key, kind, item }] : []
    })
  }, [shard, planMap, current])

  const done = new Set(doneMap[current] ?? [])
  const toggleDone = (k: string) =>
    setDoneMap((prev) => {
      const cur = prev[current] ?? []
      return { ...prev, [current]: cur.includes(k) ? cur.filter((m) => m !== k) : [...cur, k] }
    })
  const remove = (key: string) =>
    setPlanMap((prev) => ({ ...prev, [current]: (prev[current] ?? []).filter((k) => k !== key) }))

  const grouped = useMemo(() => {
    const byLoc = new Map<string, PlanEntry[]>()
    for (const e of entries) {
      const loc = hasText(e.item.learningLocation) ? e.item.learningLocation.trim() : ''
      byLoc.set(loc, [...(byLoc.get(loc) ?? []), e])
    }
    return [...byLoc.entries()]
      .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b, undefined, { sensitivity: 'base' })))
      .map(([location, list]) => ({
        location: location || 'Location unknown',
        list: [...list].sort(
          (a, b) =>
            levelSortKey(a.item.levelRequirement) - levelSortKey(b.item.levelRequirement) ||
            a.item.name.localeCompare(b.item.name, undefined, { numeric: true })
        ),
      }))
  }, [entries])

  const totals = useMemo(() => {
    let gold = 0
    const items = new Map<string, { name: string; qty: number }>()
    for (const { item } of entries) {
      gold += parseGold(item.goldRequired)
      for (const it of parseItems(item.itemRequirements)) {
        const k = it.name.toLowerCase()
        const cur = items.get(k)
        if (cur) cur.qty += it.qty
        else items.set(k, { ...it })
      }
    }
    return { gold, items: [...items.values()].sort((a, b) => a.name.localeCompare(b.name)) }
  }, [entries])

  if (classes.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="font-heading text-2xl text-gilt">Build Planner</h1>
        <p className="mt-3 text-parchment-600 dark:text-ash">
          No build plans yet. Open a class page, press <b>Build Plan</b>, and pick the skills and spells you want.
          They will show up here.
        </p>
        <a href="#/classes" className="mt-4 inline-block rounded-lg border border-gilt px-4 py-2 text-sm text-gilt">
          Browse classes
        </a>
      </div>
    )
  }

  return (
    <div className="mx-auto w-fit max-w-full">
      <div className="mb-3 flex items-center gap-2">
        <h1 className="font-heading text-xl font-semibold text-gilt">Build Planner</h1>
        <select
          value={current}
          onChange={(e) => setLastClass(e.target.value)}
          aria-label="Class"
          className="rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-1.5 text-sm text-parchment-900 outline-none focus:border-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ivory"
        >
          {classes.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label} ({(planMap[c.slug] ?? []).length})
            </option>
          ))}
        </select>
      </div>

      {!shard ? (
        <p className="text-sm text-ash">Loading…</p>
      ) : (
        <div className="flex flex-wrap items-start gap-3 text-sm">
          <div className="w-fit min-w-[200px] shrink-0">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-parchment-500 dark:text-parchment-600">
              Selected ({entries.length})
            </p>
            <div className="space-y-2">
              {grouped.map((grp) => (
                <div key={grp.location}>
                  <p className="mb-0.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-gilt">
                    {grp.location}
                  </p>
                  <ul className="divide-y divide-parchment-300 rounded-lg border border-parchment-300 dark:divide-ash/10 dark:border-ash/20">
                    {grp.list.map((e) => {
                      const g = parseGold(e.item.goldRequired)
                      const mats = parseItems(e.item.itemRequirements)
                      const complete = mats.length > 0 && mats.every((m) => done.has(m.name.toLowerCase()))
                      return (
                        <li key={e.key} className="flex items-center gap-3 px-3 py-1.5">
                          <span
                            className={`min-w-0 flex-1 whitespace-nowrap text-parchment-800 dark:text-ivory ${
                              complete ? 'line-through opacity-50' : ''
                            }`}
                          >
                            {e.item.name}
                          </span>
                          {g > 0 && <span className="shrink-0 text-xs text-ash">{g.toLocaleString('en-US')} g</span>}
                          <button
                            type="button"
                            onClick={() => remove(e.key)}
                            title="Remove from plan"
                            className="shrink-0 rounded p-0.5 text-ash hover:text-gilt"
                          >
                            <X size={14} />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="w-fit min-w-[200px] shrink-0 rounded-lg border border-parchment-300 bg-parchment-100 p-3 dark:border-ash/10 dark:bg-ink">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-parchment-500 dark:text-parchment-600">
              Total needed
            </p>
            <div className="mt-1 flex items-baseline justify-between gap-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-ash">Gold</span>
              <span className="text-lg font-bold text-gilt">{totals.gold.toLocaleString('en-US')}</span>
            </div>
            <MaxStatsRow entries={entries} />
            {totals.items.length > 0 && (
              <ul className="mt-2 grid grid-cols-[auto_auto_auto] items-center gap-x-2 gap-y-0.5 border-t border-parchment-300 pt-2 dark:border-ash/20">
                {totals.items.map((it) => {
                  const k = it.name.toLowerCase()
                  const got = done.has(k)
                  return (
                    <li key={it.name} className="contents">
                      <input
                        type="checkbox"
                        checked={got}
                        onChange={() => toggleDone(k)}
                        aria-label={`Got ${it.name}`}
                        className="h-3.5 w-3.5 cursor-pointer accent-gilt"
                      />
                      <span className={`text-parchment-800 dark:text-ivory ${got ? 'line-through opacity-50' : ''}`}>
                        {it.name}
                      </span>
                      <span className={`text-right font-semibold text-gilt ${got ? 'line-through opacity-50' : ''}`}>
                        {it.qty}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
