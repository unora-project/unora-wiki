import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'

const statCaps: Record<string, Record<string, Record<string, number>>> = {
  Warrior: {
    'Pre-Master': { STR: 120, INT: 50, WIS: 50, CON: 50, DEX: 100 },
    Master: { STR: 180, INT: 80, WIS: 80, CON: 120, DEX: 150 },
    Grandmaster: { STR: 215, INT: 100, WIS: 100, CON: 150, DEX: 180 },
  },
  Monk: {
    'Pre-Master': { STR: 100, INT: 50, WIS: 50, CON: 120, DEX: 80 },
    Master: { STR: 150, INT: 80, WIS: 80, CON: 180, DEX: 120 },
    Grandmaster: { STR: 180, INT: 100, WIS: 100, CON: 215, DEX: 150 },
  },
  Rogue: {
    'Pre-Master': { STR: 100, INT: 50, WIS: 50, CON: 80, DEX: 120 },
    Master: { STR: 150, INT: 80, WIS: 80, CON: 120, DEX: 180 },
    Grandmaster: { STR: 180, INT: 100, WIS: 100, CON: 150, DEX: 215 },
  },
  Wizard: {
    'Pre-Master': { STR: 50, INT: 120, WIS: 100, CON: 80, DEX: 50 },
    Master: { STR: 80, INT: 180, WIS: 150, CON: 120, DEX: 80 },
    Grandmaster: { STR: 100, INT: 215, WIS: 180, CON: 150, DEX: 100 },
  },
  Priest: {
    'Pre-Master': { STR: 50, INT: 100, WIS: 120, CON: 80, DEX: 50 },
    Master: { STR: 80, INT: 150, WIS: 180, CON: 120, DEX: 80 },
    Grandmaster: { STR: 100, INT: 180, WIS: 215, CON: 150, DEX: 100 },
  },
}

const statColors: Record<string, string> = {
  STR: 'text-ignis',
  INT: 'text-tide',
  WIS: 'text-astral',
  CON: 'text-verdant',
  DEX: 'text-gilt',
}

const statBorders: Record<string, string> = {
  STR: 'border-ignis focus:ring-ignis/20',
  INT: 'border-tide focus:ring-tide/20',
  WIS: 'border-astral focus:ring-astral/20',
  CON: 'border-verdant focus:ring-verdant/20',
  DEX: 'border-gilt focus:ring-gilt/20',
}

function experienceForStat(current: number, max: number): number {
  let totalExp = 0
  for (let i = current + 1; i <= max; i++) {
    if (i <= 29) {
      totalExp += 3000000
    } else {
      totalExp += (i - 1) * 75000 + 2000000
    }
  }
  return totalExp
}

export function StatCalculator() {
  const [selectedClass, setSelectedClass] = useState('')
  const [progression, setProgression] = useState('Pre-Master')
  const [stats, setStats] = useState({ STR: 1, INT: 1, WIS: 1, CON: 1, DEX: 1 })
  const [xpRate, setXpRate] = useState('')
  const [currentExp, setCurrentExp] = useState('')

  const caps = selectedClass ? statCaps[selectedClass]?.[progression] : null

  const result = useMemo(() => {
    if (!caps) return null

    const breakdown: Record<string, number> = {}
    let total = 0

    for (const stat of Object.keys(caps)) {
      const xp = experienceForStat(stats[stat as keyof typeof stats] || 1, caps[stat])
      breakdown[stat] = xp
      total += xp
    }

    const curExp = parseInt(currentExp) || 0
    const remaining = Math.max(total - curExp, 0)

    let timeEstimate: string | null = null
    const rate = parseFloat(xpRate)
    if (!isNaN(rate) && rate > 0) {
      const hours = remaining / (rate * 1_000_000)
      const days = hours / 24
      timeEstimate = `${hours.toFixed(1)} hours (~${days.toFixed(1)} days) at ${rate.toLocaleString()}M XP/hr`
    }

    return { breakdown, total: remaining, timeEstimate }
  }, [caps, stats, currentExp, xpRate])

  function updateStat(key: string, value: string) {
    const num = parseInt(value) || 1
    setStats((prev) => ({ ...prev, [key]: Math.max(1, Math.min(215, num)) }))
  }

  return (
    <div>
      <PageHeader
        title="Stat Calculator"
        description="Calculate how much experience is needed to max your stats."
        accent="verdant"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Calculators' },
          { label: 'Stats' },
        ]}
      />

      <div className="max-w-2xl space-y-6">
        {/* Class & Progression */}
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-parchment-600 dark:text-parchment-400">
              Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-2 text-sm outline-none focus:border-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ivory"
            >
              <option value="">-- Select --</option>
              {Object.keys(statCaps).map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-parchment-600 dark:text-parchment-400">
              Progression
            </label>
            <div className="flex gap-3">
              {['Pre-Master', 'Master', 'Grandmaster'].map((p) => (
                <label key={p} className="flex items-center gap-1.5 text-sm text-parchment-700 dark:text-parchment-300">
                  <input
                    type="radio"
                    name="progression"
                    value={p}
                    checked={progression === p}
                    onChange={(e) => setProgression(e.target.value)}
                    className="accent-gilt"
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>

          {caps && (
            <div className="text-xs font-medium text-parchment-500 dark:text-parchment-500">
              MAX: {caps.STR}/{caps.INT}/{caps.WIS}/{caps.CON}/{caps.DEX}
            </div>
          )}
        </div>

        {/* Stat Inputs */}
        <div>
          <h3 className="mb-3 font-heading text-lg font-semibold text-parchment-800 dark:text-parchment-200">
            Current Stats
          </h3>
          <div className="flex flex-wrap gap-3">
            {(['STR', 'INT', 'WIS', 'CON', 'DEX'] as const).map((stat) => (
              <div key={stat} className="flex flex-col items-center">
                <label className={`mb-1 text-xs font-bold ${statColors[stat]}`}>{stat}</label>
                <input
                  type="number"
                  value={stats[stat]}
                  onChange={(e) => updateStat(stat, e.target.value)}
                  min="1"
                  max="215"
                  className={`w-16 rounded-lg border-2 ${statBorders[stat]} bg-parchment-50 px-2 py-1.5 text-center text-sm font-semibold outline-none focus:ring-2 dark:bg-obsidian dark:text-ivory`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Optional inputs */}
        <div className="flex flex-wrap gap-6">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-parchment-600 dark:text-parchment-400">
              XP/hour (Millions)
            </label>
            <input
              type="number"
              value={xpRate}
              onChange={(e) => setXpRate(e.target.value)}
              placeholder="e.g. 50"
              className="w-32 rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-1.5 text-sm outline-none focus:border-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ivory"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-parchment-600 dark:text-parchment-400">
              Current Experience
            </label>
            <input
              type="number"
              value={currentExp}
              onChange={(e) => setCurrentExp(e.target.value)}
              placeholder="0"
              className="w-40 rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-1.5 text-sm outline-none focus:border-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ivory"
            />
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="rounded-lg border border-parchment-300 bg-parchment-100 p-5 dark:border-ash/10 dark:bg-ink">
            <h3 className="font-heading text-lg font-semibold text-gilt">
              Total Experience Needed: {result.total.toLocaleString()}
            </h3>

            <ul className="mt-3 space-y-1">
              {Object.entries(result.breakdown).map(([stat, xp]) => (
                <li key={stat} className={`text-sm font-medium ${statColors[stat]}`}>
                  {stat}: {xp.toLocaleString()} XP
                </li>
              ))}
            </ul>

            {result.timeEstimate && (
              <p className="mt-3 text-sm text-parchment-600 dark:text-parchment-400">
                Estimated time: {result.timeEstimate}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
