import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { CLASS_FAMILIES, classLabel } from '@/lib/class-families'
import { readGameText } from '@/lib/game-glyphs'
import {
  CLASS_INFO_SLUGS,
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
// Every class/branch slug the site knows about (used by the mini planner's "add to another class").
const ALL_CLASS_SLUGS: string[] = [
  ...new Set([...Object.values(CLASS_FAMILIES).flat(), ...CLASS_INFO_SLUGS]),
]

export function BuildPlanner() {
  return <PlannerView mini={false} />
}

// Compact version for the AutoHotkey overlay: just the plan, plus a box to add skills/spells by name.
export function BuildPlannerMini() {
  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = '#0a0a0d'
    return () => {
      document.body.style.background = prev
    }
  }, [])
  return (
    <div className="dark min-h-screen bg-obsidian p-2 text-ivory">
      <PlannerView mini />
    </div>
  )
}

// ---- Matching text read from the game screen (by the AutoHotkey overlay) to a skill/spell ----

// Letters and digits only; "?" (a character the game-font reader did not know) is kept as a wildcard.
const normName = (t: string) => t.toLowerCase().replace(/[^a-z0-9?]+/g, '')

function editDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      const same = a[i - 1] === b[j - 1] || a[i - 1] === '?' || b[j - 1] === '?'
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (same ? 0 : 1))
    }
    prev = cur
  }
  return prev[n]
}

// 1 = identical, 0 = nothing alike. A name found inside a longer line scores 0.96.
function nameScore(line: string, name: string): number {
  const a = normName(line)
  const b = normName(name)
  if (a.length < 3 || b.length < 3) return 0
  if (b.length >= 5 && !a.includes('?') && a.includes(b)) return 0.96
  return 1 - editDistance(a, b) / Math.max(a.length, b.length)
}

type ScreenLine = { text: string; dist: number }
type Found = {
  slug: string
  kind: 'skills' | 'spells'
  item: SkillSpell
  score: number
  dist: number
  // Another skill/spell whose name fits the text almost as well: the read is not certain.
  runnerUp?: string
}

function bestInShard(
  slug: string,
  shard: { skills: SkillSpell[]; spells: SkillSpell[] },
  lines: ScreenLine[]
): Found | null {
  let best: Found | null = null
  for (const line of lines) {
    // Only the NAME text is used (never the icon): score every skill/spell name against this line.
    const scored: { kind: 'skills' | 'spells'; item: SkillSpell; score: number }[] = []
    for (const kind of ['skills', 'spells'] as const) {
      for (const item of shard[kind]) {
        const score = nameScore(line.text, item.name)
        if (score >= 0.6) scored.push({ kind, item, score })
      }
    }
    scored.sort((p, q) => q.score - p.score)
    const top = scored[0]
    if (!top) continue
    const second = scored.find((c) => c.item.name !== top.item.name)
    const f: Found = {
      slug,
      kind: top.kind,
      item: top.item,
      score: top.score,
      dist: line.dist,
      runnerUp: second && top.score < 0.96 && second.score >= top.score - 0.04 ? second.item.name : undefined,
    }
    if (!best || f.score > best.score + 0.02 || (Math.abs(f.score - best.score) <= 0.02 && f.dist < best.dist)) {
      best = f
    }
  }
  return best
}

function PlannerView({ mini }: { mini: boolean }) {
  const [planMap, setPlanMap] = usePersistentState<Record<string, string[]>>('abilityPlan.v1', {})
  const [doneMap, setDoneMap] = usePersistentState<Record<string, string[]>>('abilityPlanDone.v1', {})
  const [lastClass, setLastClass] = usePersistentState<string>('plannerLastClass.v1', '')
  const [hiddenMap] = usePersistentState<Record<string, string[]>>('abilityHidden.v1', {})
  const [shard, setShard] = useState<{ skills: SkillSpell[]; spells: SkillSpell[] } | null>(null)
  const [query, setQuery] = useState('')
  const [flash, setFlash] = useState('')
  const apiRef = useRef<{ addFromLines: (lines: ScreenLine[]) => Promise<string> } | null>(null)

  // Only classes that actually have something planned.
  const classes = useMemo(
    () =>
      Object.entries(planMap)
        .filter(([, keys]) => Array.isArray(keys) && keys.length > 0)
        .map(([slug]) => ({ slug, label: classLabel(slug) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [planMap]
  )

  const otherClasses = useMemo(
    () =>
      mini
        ? ALL_CLASS_SLUGS.filter((s) => !classes.some((c) => c.slug === s))
            .map((slug) => ({ slug, label: classLabel(slug) }))
            .sort((a, b) => a.label.localeCompare(b.label))
        : [],
    [mini, classes]
  )
  const selectable = [...classes, ...otherClasses]
  const current = selectable.some((c) => c.slug === lastClass) ? lastClass : (classes[0]?.slug ?? otherClasses[0]?.slug ?? '')

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
  const clearAll = () => {
    setPlanMap((prev) => ({ ...prev, [current]: [] }))
    setDoneMap((prev) => ({ ...prev, [current]: [] }))
  }

  // Add by name (mini planner). Same rules as ticking it on the class page.
  const inPlan = new Set(planMap[current] ?? [])
  const hidden = new Set(hiddenMap[current] ?? [])
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || !shard) return []
    const all = [
      ...shard.skills.map((item) => ({ kind: 'skills' as const, item })),
      ...shard.spells.map((item) => ({ kind: 'spells' as const, item })),
    ].filter(
      ({ kind, item }) =>
        item.name.toLowerCase().includes(q) &&
        !inPlan.has(`${kind}|${item.name}`) &&
        !hidden.has(`${kind}|${item.name}`)
    )
    all.sort(
      (a, b) =>
        Number(b.item.name.toLowerCase().startsWith(q)) - Number(a.item.name.toLowerCase().startsWith(q)) ||
        a.item.name.localeCompare(b.item.name, undefined, { numeric: true })
    )
    return all.slice(0, 8)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, shard, planMap, hiddenMap, current])

  const addMatch = (m: { kind: 'skills' | 'spells'; item: SkillSpell }) => {
    const key = `${m.kind}|${m.item.name}`
    const needed = new Set(parseItems(m.item.itemRequirements).map((x) => x.name.toLowerCase()))
    if (needed.size > 0) {
      setDoneMap((prev) => {
        const cur = prev[current] ?? []
        return cur.some((x) => needed.has(x)) ? { ...prev, [current]: cur.filter((x) => !needed.has(x)) } : prev
      })
    }
    setPlanMap((prev) => {
      const cur = prev[current] ?? []
      return cur.includes(key) ? prev : { ...prev, [current]: [...cur, key] }
    })
    setQuery('')
  }

  const addFromLines = async (lines: ScreenLine[]): Promise<string> => {
    const clean = lines.filter((l) => l && typeof l.text === 'string' && l.text.trim().length >= 3)
    if (clean.length === 0) return 'No text found under the mouse.'
    // Nearest text to the mouse first: the first line that matches a skill/spell wins.
    const ordered = [...clean].sort((p, q) => p.dist - q.dist)
    let found: Found | null = null
    if (shard) {
      for (const line of ordered) {
        const f = bestInShard(current, shard, [line])
        if (f && f.score >= 0.8) {
          found = f
          break
        }
      }
    }
    if (!found) {
      // Not in this class: look through the other classes too.
      const others = ALL_CLASS_SLUGS.filter((sl) => sl !== current)
      const shards = await Promise.all(others.map((sl) => loadClassShard(sl)))
      for (const line of ordered) {
        let best: Found | null = null
        others.forEach((sl, i) => {
          const f = bestInShard(sl, shards[i], [line])
          if (f && (!best || f.score > best.score)) best = f
        })
        const b = best as Found | null
        if (b && b.score >= 0.85) {
          found = b
          break
        }
      }
    }
    if (!found) {
      const seen = ordered.map((l) => l.text.trim()).slice(0, 3).join(' / ')
      return `No skill or spell matched "${seen}". Point at the skill's name.`
    }
    if (found.runnerUp) {
      return `Not sure: "${found.item.name}" or "${found.runnerUp}". Point at the name again, or type it.`
    }
    const { slug, kind, item } = found
    const key = `${kind}|${item.name}`
    if ((planMap[slug] ?? []).includes(key)) return `${item.name} is already in your ${classLabel(slug)} plan.`
    if ((hiddenMap[slug] ?? []).includes(key)) return `${item.name} is hidden for ${classLabel(slug)}. Show it on the class page first.`
    const needed = new Set(parseItems(item.itemRequirements).map((x) => x.name.toLowerCase()))
    if (needed.size > 0) {
      setDoneMap((prev) => {
        const cur = prev[slug] ?? []
        return cur.some((x) => needed.has(x)) ? { ...prev, [slug]: cur.filter((x) => !needed.has(x)) } : prev
      })
    }
    setPlanMap((prev) => {
      const cur = prev[slug] ?? []
      return cur.includes(key) ? prev : { ...prev, [slug]: [...cur, key] }
    })
    setLastClass(slug)
    return `Added ${item.name} (${classLabel(slug)})`
  }
  apiRef.current = { addFromLines }

  // The AutoHotkey overlay calls this after reading a skill name from the game screen.
  useEffect(() => {
    if (!mini) return
    const w = window as unknown as {
      unoraAddFromText?: (lines: ScreenLine[]) => void
      unoraAddFromImage?: (dataUrl: string, cx: number, cy: number, scale?: number, ox?: number, oy?: number) => void
      chrome?: { webview?: { postMessage: (m: string) => void } }
    }
    const tell = (m: string) => {
      setFlash(m)
      try {
        w.chrome?.webview?.postMessage(m)
      } catch {
        /* not running inside the overlay */
      }
    }
    // Preferred: the overlay sends a small screenshot piece and where the mouse was inside it.
    // scale = screen pixels per game pixel (window width / 640); ox, oy = where the game picture's
    // top-left corner is inside this piece. Both are optional hints: the reader works without them.
    w.unoraAddFromImage = (dataUrl, cx, cy, scale, ox, oy) => {
      const img = new Image()
      img.onload = () => {
        try {
          const c = document.createElement('canvas')
          c.width = img.width
          c.height = img.height
          const g = c.getContext('2d', { willReadFrequently: true })
          if (!g) return tell('Could not read the screenshot.')
          g.drawImage(img, 0, 0)
          const { scale, runs } = readGameText(g.getImageData(0, 0, c.width, c.height), { scale, ox, oy })
          if (scale === 0 || runs.length === 0) {
            return tell(
              'Could not read any game text there. Point at the skill name. (The game window should be at least 640x480.)'
            )
          }
          const lines = runs.map((r) => ({
            text: r.text,
            dist: Math.hypot(Math.max(r.x0 - cx, 0, cx - r.x1), Math.max(r.y0 - cy, 0, cy - r.y1)),
          }))
          apiRef.current?.addFromLines(lines).then(tell, () => tell('Could not add that skill.'))
        } catch {
          tell('Could not read the screenshot.')
        }
      }
      img.onerror = () => tell('Could not read the screenshot.')
      img.src = dataUrl
    }
    w.unoraAddFromText = (lines) => {
      apiRef.current?.addFromLines(lines).then(tell, () => tell('Could not add that skill.'))
    }
    try {
      w.chrome?.webview?.postMessage('ready')
    } catch {
      /* ignore */
    }
    return () => {
      delete w.unoraAddFromText
      delete w.unoraAddFromImage
    }
  }, [mini])
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(''), 4000)
    return () => clearTimeout(t)
  }, [flash])

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

  if (!mini && classes.length === 0) {
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
    <div className={mini ? 'w-full' : 'mx-auto w-fit max-w-full'}>
      <div className={`flex items-center gap-2 ${mini ? 'mb-2 flex-wrap' : 'mb-3'}`}>
        {!mini && <h1 className="font-heading text-xl font-semibold text-gilt">Build Planner</h1>}
        <select
          value={current}
          onChange={(e) => {
            setLastClass(e.target.value)
            setQuery('')
          }}
          aria-label="Class"
          className="rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-1.5 text-sm text-parchment-900 outline-none focus:border-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ivory"
        >
          {mini && classes.length > 0 ? (
            <optgroup label="Your plans">
              {classes.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label} ({(planMap[c.slug] ?? []).length})
                </option>
              ))}
            </optgroup>
          ) : (
            classes.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label} ({(planMap[c.slug] ?? []).length})
              </option>
            ))
          )}
          {mini && otherClasses.length > 0 && (
            <optgroup label="Start a plan for…">
              {otherClasses.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        {mini && (
          <button
            type="button"
            onClick={clearAll}
            disabled={entries.length === 0}
            className="rounded border border-parchment-300 px-2 py-1 text-xs font-medium text-parchment-600 hover:border-gilt hover:text-gilt disabled:opacity-40 dark:border-ash/20 dark:text-ash"
          >
            Clear
          </button>
        )}
      </div>

      {mini && (
        <div className="relative mb-3">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-2.5 text-ash" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matches[0]) addMatch(matches[0])
              if (e.key === 'Escape') setQuery('')
            }}
            placeholder="Type a skill or spell to add…"
            aria-label="Add a skill or spell"
            className="w-full rounded-lg border border-parchment-300 bg-parchment-50 py-1.5 pl-8 pr-3 text-sm text-parchment-900 outline-none placeholder:text-ash focus:border-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ivory"
          />
          {query.trim() !== '' && (
            <ul className="mt-1 divide-y divide-parchment-300 rounded-lg border border-parchment-300 bg-parchment-100 dark:divide-ash/10 dark:border-ash/20 dark:bg-ink">
              {matches.length === 0 ? (
                <li className="px-3 py-1.5 text-xs text-ash">No matches (already added, hidden, or not in this class).</li>
              ) : (
                matches.map((m) => (
                  <li key={`${m.kind}|${m.item.name}`}>
                    <button
                      type="button"
                      onClick={() => addMatch(m)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm text-parchment-800 hover:bg-gilt/10 dark:text-ivory"
                    >
                      <span>{m.item.name}</span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wider text-ash">
                        {m.kind === 'spells' ? 'Spell' : 'Skill'}
                        {hasText(m.item.levelRequirement) ? ` · ${m.item.levelRequirement}` : ''}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}

      {mini && flash && (
        <p className="mb-2 rounded-lg border border-gilt/40 bg-gilt/10 px-3 py-1.5 text-xs text-gilt">{flash}</p>
      )}

      {mini && shard && entries.length === 0 && (
        <p className="mb-2 text-xs text-ash">Nothing planned for {classLabel(current)} yet. Type a name above to add it.</p>
      )}

      {!shard ? (
        <p className="text-sm text-ash">Loading…</p>
      ) : entries.length === 0 ? null : (
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
