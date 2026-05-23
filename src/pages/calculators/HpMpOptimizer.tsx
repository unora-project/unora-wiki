import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'

type ClassName = 'Warrior' | 'Monk' | 'Rogue' | 'Wizard' | 'Priest'
type Progression = 'Pre-Master' | 'Master' | 'Grandmaster'

interface Stats {
  STR: number
  CON: number
  INT: number
  WIS: number
}

const STAT_CAPS: Record<ClassName, Record<Progression, Stats>> = {
  Warrior: {
    'Pre-Master': { STR: 120, CON: 80, INT: 50, WIS: 50 },
    Master: { STR: 180, CON: 120, INT: 80, WIS: 80 },
    Grandmaster: { STR: 215, CON: 150, INT: 100, WIS: 100 },
  },
  Monk: {
    'Pre-Master': { STR: 100, CON: 120, INT: 50, WIS: 50 },
    Master: { STR: 150, CON: 180, INT: 80, WIS: 80 },
    Grandmaster: { STR: 180, CON: 215, INT: 100, WIS: 100 },
  },
  Rogue: {
    'Pre-Master': { STR: 100, CON: 80, INT: 50, WIS: 50 },
    Master: { STR: 150, CON: 120, INT: 80, WIS: 80 },
    Grandmaster: { STR: 180, CON: 150, INT: 100, WIS: 100 },
  },
  Wizard: {
    'Pre-Master': { STR: 50, CON: 80, INT: 120, WIS: 100 },
    Master: { STR: 80, CON: 120, INT: 180, WIS: 150 },
    Grandmaster: { STR: 100, CON: 150, INT: 215, WIS: 180 },
  },
  Priest: {
    'Pre-Master': { STR: 50, CON: 80, INT: 100, WIS: 120 },
    Master: { STR: 80, CON: 120, INT: 150, WIS: 180 },
    Grandmaster: { STR: 100, CON: 150, INT: 180, WIS: 215 },
  },
}

interface CharacterState {
  charClass: ClassName
  progression: Progression
  hp: number
  mp: number
  hpTarget: number
  mpTarget: number
  str: number
  con: number
  int: number
  wis: number
  free: number
}

const PRESETS: Record<string, CharacterState> = {
  char1: {
    charClass: 'Warrior',
    progression: 'Pre-Master',
    hp: 0,
    mp: 0,
    hpTarget: 0,
    mpTarget: 0,
    str: 0,
    con: 0,
    int: 0,
    wis: 0,
    free: 0,
  },
  char2: {
    charClass: 'Warrior',
    progression: 'Pre-Master',
    hp: 0,
    mp: 0,
    hpTarget: 0,
    mpTarget: 0,
    str: 0,
    con: 0,
    int: 0,
    wis: 0,
    free: 0,
  },
  reset: {
    charClass: 'Warrior',
    progression: 'Pre-Master',
    hp: 0,
    mp: 0,
    hpTarget: 0,
    mpTarget: 0,
    str: 0,
    con: 0,
    int: 0,
    wis: 0,
    free: 0,
  },
}

function statCost(n: number, x0: number): number {
  if (n <= 0) return 0
  return 2000000 * n + 75000 * n * x0 + 37500 * n * (n - 1)
}

function directHPCost(P: number, hp0: number): number {
  if (P <= 0) return 0
  return 500 * P * hp0 + 12500 * P * (P - 1)
}

function directMPCost(Q: number, mp0: number): number {
  if (Q <= 0) return 0
  return 500 * Q * mp0 + 6250 * Q * (Q - 1) + 12500 * Q
}

function optimize(inp: CharacterState) {
  const {
    hp,
    mp,
    hpTarget,
    mpTarget,
    str,
    con,
    int: intStat,
    wis,
    free,
    charClass,
    progression,
  } = inp
  const caps = STAT_CAPS[charClass][progression]
  const dHP = Math.max(0, hpTarget - hp)
  const dMP = Math.max(0, mpTarget - mp)

  const empty = {
    f_c: 0,
    f_s: 0,
    f_w: 0,
    f_i: 0,
    P: 0,
    D: 0,
    S: 0,
    W: 0,
    I: 0,
    Q: 0,
    hpCost: 0,
    mpCost: 0,
    totalCost: 0,
    finalHP: hp,
    finalMP: mp,
    finalCon: con,
    finalStr: str,
    finalInt: intStat,
    finalWis: wis,
  }
  if (dHP === 0 && dMP === 0) return empty

  let best: typeof empty | null = null

  const fcMax = Math.min(free, caps.CON - con)
  for (let f_c = 0; f_c <= fcMax; f_c++) {
    const remainingFree1 = free - f_c
    const fwMax = Math.min(remainingFree1, caps.WIS - wis)
    for (let f_w = 0; f_w <= fwMax; f_w++) {
      const remainingFree2 = remainingFree1 - f_w
      const fiMax = Math.min(remainingFree2, caps.INT - intStat)
      for (let f_i = 0; f_i <= fiMax; f_i++) {
        const f_s = Math.min(remainingFree2 - f_i, caps.STR - str)

        const curCon = con + f_c
        const curStr = str + f_s
        const curWis = wis + f_w
        const curInt = intStat + f_i

        const hpFromFree = 50 * f_c + 25 * f_s
        const mpFromFree = 40 * f_w + 20 * f_i

        const reqHP = Math.max(0, dHP - hpFromFree)
        const reqMP = Math.max(0, dMP - mpFromFree)

        let bestHPCost = Infinity,
          bestP = 0,
          bestD = 0,
          bestS = 0
        const dMax = caps.CON - curCon
        const sMax = caps.STR - curStr

        for (let D = 0; D <= dMax; D++) {
          const remHP1 = Math.max(0, reqHP - 50 * D)
          for (let S = 0; S <= sMax; S++) {
            const remHP2 = Math.max(0, remHP1 - 25 * S)
            const P = Math.ceil(remHP2 / 50)
            const cost = directHPCost(P, hp) + statCost(D, curCon) + statCost(S, curStr)
            if (cost < bestHPCost) {
              bestHPCost = cost
              bestP = P
              bestD = D
              bestS = S
            }
            if (remHP2 === 0) break
          }
        }

        let bestMPCost = Infinity,
          bestW = 0,
          bestI = 0,
          bestQ = 0
        const wMax = caps.WIS - curWis
        const iMax = caps.INT - curInt

        for (let W = 0; W <= wMax; W++) {
          const remMP1 = Math.max(0, reqMP - 40 * W)
          for (let I = 0; I <= iMax; I++) {
            const remMP2 = Math.max(0, remMP1 - 20 * I)
            const Q = Math.ceil(remMP2 / 25)
            const cost = directMPCost(Q, mp) + statCost(W, curWis) + statCost(I, curInt)
            if (cost < bestMPCost) {
              bestMPCost = cost
              bestW = W
              bestI = I
              bestQ = Q
            }
            if (remMP2 === 0) break
          }
        }

        const total = bestHPCost + bestMPCost
        if (!best || total < best.totalCost) {
          best = {
            f_c,
            f_s,
            f_w,
            f_i,
            P: bestP,
            D: bestD,
            S: bestS,
            W: bestW,
            I: bestI,
            Q: bestQ,
            hpCost: bestHPCost,
            mpCost: bestMPCost,
            totalCost: total,
            finalHP: hp + hpFromFree + 50 * (bestP + bestD) + 25 * bestS,
            finalMP: mp + mpFromFree + 25 * bestQ + 40 * bestW + 20 * bestI,
            finalCon: curCon + bestD,
            finalStr: curStr + bestS,
            finalInt: curInt + bestI,
            finalWis: curWis + bestW,
          }
        }
      }
    }
  }
  return best || empty
}

const format = (n: number) => Math.round(n).toLocaleString()
const formatSigned = (n: number) => (n > 0 ? `+${format(n)}` : format(n))

const INPUT_FIELD =
  'w-full rounded border border-parchment-300/20 bg-ink px-3 py-2 text-sm outline-none focus:border-gilt transition-colors text-ivory'
const LABEL_STYLE = 'text-[10px] uppercase tracking-wider text-ash font-bold'
const CARD_STYLE = 'bg-ink/50 border border-parchment-300/10 rounded-xl overflow-hidden mb-6'
const CARD_HEADER =
  'bg-parchment-200/5 px-4 py-2.5 text-[10px] uppercase font-bold tracking-[0.15em] text-ash border-b border-parchment-300/10'

export function HpMpOptimizer() {
  const [state, setState] = useState<CharacterState>(PRESETS.reset)

  const handleChange = (key: keyof CharacterState, value: string | number) => {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  const loadPreset = (presetKey: string) => {
    setState(PRESETS[presetKey])
  }

  const plan = optimize(state)
  const dHP = Math.max(0, state.hpTarget - state.hp)
  const dMP = Math.max(0, state.mpTarget - state.mp)
  const targetMet = plan.finalHP >= state.hpTarget && plan.finalMP >= state.mpTarget
  const caps = STAT_CAPS[state.charClass][state.progression]

  const steps = []
  let n = 1
  if (plan.P > 0) {
    steps.push({
      n: n++,
      action: 'Direct +50 HP buys',
      times: `${plan.P}×`,
      effect: `HP ${format(state.hp)} → ${format(state.hp + 50 * plan.P)}`,
      cost: format(directHPCost(plan.P, state.hp)),
    })
  }
  if (plan.Q > 0) {
    steps.push({
      n: n++,
      action: 'Direct +25 MP buys',
      times: `${plan.Q}×`,
      effect: `MP ${format(state.mp)} → ${format(state.mp + 25 * plan.Q)}`,
      cost: format(directMPCost(plan.Q, state.mp)),
    })
  }
  const freeParts = []
  if (plan.f_c > 0) freeParts.push(`+${plan.f_c} CON`)
  if (plan.f_s > 0) freeParts.push(`+${plan.f_s} STR`)
  if (plan.f_w > 0) freeParts.push(`+${plan.f_w} WIS`)
  if (plan.f_i > 0) freeParts.push(`+${plan.f_i} INT`)
  const freeUsed = plan.f_c + plan.f_s + plan.f_w + plan.f_i
  if (freeUsed > 0) {
    steps.push({
      n: n++,
      action: 'Spend free stat points',
      times: `${freeUsed}`,
      effect: freeParts.join(', '),
      cost: '0',
    })
  }
  if (plan.W > 0) {
    steps.push({
      n: n++,
      action: 'Buy WIS with EXP',
      times: `${plan.W}×`,
      effect: `WIS ${state.wis + plan.f_w} → ${state.wis + plan.f_w + plan.W}`,
      cost: format(statCost(plan.W, state.wis + plan.f_w)),
    })
  }
  if (plan.I > 0) {
    steps.push({
      n: n++,
      action: 'Buy INT with EXP',
      times: `${plan.I}×`,
      effect: `INT ${state.int + plan.f_i} → ${state.int + plan.f_i + plan.I}`,
      cost: format(statCost(plan.I, state.int + plan.f_i)),
    })
  }
  if (plan.D > 0) {
    steps.push({
      n: n++,
      action: 'Buy CON with EXP',
      times: `${plan.D}×`,
      effect: `CON ${state.con + plan.f_c} → ${state.con + plan.f_c + plan.D}`,
      cost: format(statCost(plan.D, state.con + plan.f_c)),
    })
  }
  if (plan.S > 0) {
    steps.push({
      n: n++,
      action: 'Buy STR with EXP',
      times: `${plan.S}×`,
      effect: `STR ${state.str + plan.f_s} → ${state.str + plan.f_s + plan.S}`,
      cost: format(statCost(plan.S, state.str + plan.f_s)),
    })
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="HP/MP Optimizer"
        description="Minimum-EXP plan to reach target stats via free points and purchases. Credit and huge thanks to Fancyson for the original calculator!"
        accent="ignis"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Calculators' },
          { label: 'HP/MP Optimizer' },
        ]}
      />

      <div className="mb-8 flex flex-wrap gap-2">
        {['char1', 'char2', 'reset'].map((preset) => (
          <button
            key={preset}
            onClick={() => loadPreset(preset)}
            className="rounded-full border border-gilt/40 px-4 py-1.5 text-xs font-medium text-gilt/80 transition-all hover:border-gilt hover:bg-gilt/10 hover:text-gilt"
          >
            {preset === 'reset' ? 'Clear All' : `Load Character ${preset.slice(-1)}`}
          </button>
        ))}
      </div>

      <div className={CARD_STYLE}>
        <div className={CARD_HEADER}>Character Inputs</div>
        <div className="p-6">
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className={LABEL_STYLE}>Class</label>
              <select
                value={state.charClass}
                onChange={(e) => handleChange('charClass', e.target.value)}
                className={INPUT_FIELD}
              >
                {Object.keys(STAT_CAPS).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className={LABEL_STYLE}>Progression</label>
              <select
                value={state.progression}
                onChange={(e) => handleChange('progression', e.target.value)}
                className={INPUT_FIELD}
              >
                <option value="Pre-Master">Pre-Master</option>
                <option value="Master">Master</option>
                <option value="Grandmaster">Grandmaster</option>
              </select>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {[
              { label: 'Current HP', key: 'hp' },
              { label: 'Target HP', key: 'hpTarget' },
              { label: 'Current MP', key: 'mp' },
              { label: 'Target MP', key: 'mpTarget' },
            ].map((f) => (
              <div key={f.key} className="flex flex-col gap-2">
                <label className={LABEL_STYLE}>{f.label}</label>
                <input
                  type="number"
                  value={state[f.key as keyof CharacterState]}
                  onChange={(e) => handleChange(f.key as keyof CharacterState, parseInt(e.target.value) || 0)}
                  className={INPUT_FIELD}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6 lg:grid-cols-5">
            {[
              { label: 'STR', key: 'str', hint: '+25 HP / pt', cap: caps.STR },
              { label: 'CON', key: 'con', hint: '+50 HP / pt', cap: caps.CON },
              { label: 'INT', key: 'int', hint: '+20 MP / pt', cap: caps.INT },
              { label: 'WIS', key: 'wis', hint: '+40 MP / pt', cap: caps.WIS },
              { label: 'Free Points', key: 'free', hint: 'Spend before EXP', special: true },
            ].map((f) => (
              <div key={f.key} className="flex flex-col gap-2">
                <label className={LABEL_STYLE}>{f.label}</label>
                <input
                  type="number"
                  value={state[f.key as keyof CharacterState]}
                  onChange={(e) => handleChange(f.key as keyof CharacterState, parseInt(e.target.value) || 0)}
                  className={INPUT_FIELD}
                />
                <div className={`text-[10px] ${f.special ? 'font-medium text-gilt/60' : 'text-ash/60'}`}>
                  {f.hint} {f.cap && `(Cap: ${f.cap})`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold">Plan Summary</h2>
        <span
          className={`pill inline-block rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
            targetMet ? 'border-gilt/30 bg-gilt/10 text-gilt' : 'border-ignis/30 bg-ignis/10 text-ignis'
          }`}
        >
          {targetMet ? 'Targets met' : 'Targets impossible'}
        </span>
      </div>

      <div className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total EXP Cost', value: format(plan.totalCost), accent: 'text-gilt' },
          {
            label: `HP Gain ${formatSigned(plan.finalHP - state.hp)} (need +${format(dHP)})`,
            value: format(plan.hpCost),
            accent: 'text-ignis',
          },
          {
            label: `MP Gain ${formatSigned(plan.finalMP - state.mp)} (need +${format(dMP)})`,
            value: format(plan.mpCost),
            accent: 'text-tide',
          },
          { label: 'Final HP / MP', value: `${format(plan.finalHP)} / ${format(plan.finalMP)}`, accent: '' },
        ].map((s, i) => (
          <div
            key={i}
            className="flex flex-col gap-1 rounded-xl border border-parchment-300/10 bg-ink/60 p-5"
          >
            <div className={`text-2xl font-bold ${s.accent}`}>{s.value}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-ash">{s.label}</div>
          </div>
        ))}
      </div>

      <section className="mb-12">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-xl font-bold">Action Plan</h2>
          <div className="h-px flex-1 bg-parchment-300/10"></div>
        </div>
        <p className="mb-4 max-w-2xl text-xs leading-relaxed text-ash">
          Direct buys go first while HP/MP are still cheap. Free points come before EXP-purchased stats (game rule). EXP
          stat buys go last.
        </p>
        <div className="overflow-hidden rounded-xl border border-parchment-300/10 bg-ink/30">
          <table className="w-full">
            <thead>
              <tr className="bg-parchment-200/5 text-[10px] font-bold uppercase tracking-[0.15em] text-ash">
                <th className="w-16 px-6 py-4 text-center">#</th>
                <th className="px-6 py-4 text-left">Action</th>
                <th className="w-24 px-6 py-4 text-center">Times</th>
                <th className="px-6 py-4 text-left">Effect</th>
                <th className="px-6 py-4 text-right">EXP Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-parchment-300/5">
              {steps.length > 0 ? (
                steps.map((step) => (
                  <tr key={step.n}>
                    <td className="px-6 py-4 text-center font-mono text-xs text-ash">{step.n}</td>
                    <td className="px-6 py-4 text-sm font-medium text-ivory">{step.action}</td>
                    <td className="px-6 py-4 text-center text-sm text-ash">{step.times}</td>
                    <td className="px-6 py-4 text-sm text-ash">{step.effect}</td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-gilt">{step.cost}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-ash">
                    No purchases needed
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-12">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-xl font-bold">Final Stats Break-down</h2>
          <div className="h-px flex-1 bg-parchment-300/10"></div>
        </div>
        <div className="overflow-hidden rounded-xl border border-parchment-300/10 bg-ink/30">
          <table className="w-full">
            <thead>
              <tr className="bg-parchment-200/5 text-[10px] font-bold uppercase tracking-[0.15em] text-ash">
                <th className="px-6 py-4 text-left">Stat</th>
                <th className="px-6 py-4 text-right">Before</th>
                <th className="px-6 py-4 text-right">Free</th>
                <th className="px-6 py-4 text-right text-gilt">EXP</th>
                <th className="px-6 py-4 text-right font-bold">After</th>
                <th className="px-6 py-4 text-right">Bonus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-parchment-300/5">
              {[
                { label: 'STR', before: state.str, free: plan.f_s, exp: plan.S, after: plan.finalStr, bonus: `+${format(25 * (plan.f_s + plan.S))} HP` },
                { label: 'CON', before: state.con, free: plan.f_c, exp: plan.D, after: plan.finalCon, bonus: `+${format(50 * (plan.f_c + plan.D))} HP` },
                { label: 'INT', before: state.int, free: plan.f_i, exp: plan.I, after: plan.finalInt, bonus: `+${format(20 * (plan.f_i + plan.I))} MP` },
                { label: 'WIS', before: state.wis, free: plan.f_w, exp: plan.W, after: plan.finalWis, bonus: `+${format(40 * (plan.f_w + plan.W))} MP` },
                { label: 'Direct HP', before: '—', free: '—', exp: `${plan.P}×`, after: '—', bonus: `+${format(50 * plan.P)} HP` },
                { label: 'Direct MP', before: '—', free: '—', exp: `${plan.Q}×`, after: '—', bonus: `+${format(25 * plan.Q)} MP` },
              ].map((r, i) => (
                <tr key={i}>
                  <td className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-ash">{r.label}</td>
                  <td className="px-6 py-4 text-right text-sm text-ash">{typeof r.before === 'number' ? format(r.before) : r.before}</td>
                  <td className="px-6 py-4 text-right text-sm text-ash">
                    {typeof r.free === 'number' && r.free > 0 ? `+${r.free}` : r.free === 0 ? '—' : r.free}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gilt">
                    {typeof r.exp === 'number' && r.exp > 0 ? `+${r.exp}` : r.exp === 0 ? '—' : r.exp}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-ivory">{typeof r.after === 'number' ? format(r.after) : r.after}</td>
                  <td className="px-6 py-4 text-right text-xs italic text-ash/80">{r.bonus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="rounded-xl border border-parchment-300/10 bg-ink/50 overflow-hidden">
          <div className={CARD_HEADER}>Formula: Direct Buys</div>
          <div className="p-6">
            <div className="space-y-4 text-sm">
              <div>
                <div className="mb-1 font-bold text-ivory">+50 HP at HP = h</div>
                <div className="font-mono text-xs text-ash">cost = 500 · h</div>
              </div>
              <div>
                <div className="mb-1 font-bold text-ivory">+25 MP at MP = m</div>
                <div className="font-mono text-xs text-ash">cost = 500 · m + 12,500</div>
              </div>
              <div className="space-y-1 border-t border-parchment-300/10 pt-2 text-[11px] text-ash">
                <p>P direct HP from h₀: 500·P·h₀ + 12,500·P·(P−1)</p>
                <p>Q direct MP from m₀: 500·Q·m₀ + 6,250·Q·(Q−1) + 12,500·Q</p>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-parchment-300/10 bg-ink/50 overflow-hidden">
          <div className={CARD_HEADER}>Formula: Stat Buys</div>
          <div className="p-6">
            <div className="space-y-4 text-sm">
              <div>
                <div className="mb-1 font-bold text-ivory">+1 stat at level x</div>
                <div className="font-mono text-xs text-ash">cost = 2,000,000 + 75,000 · x</div>
              </div>
              <div className="space-y-1 border-t border-parchment-300/10 pt-2 text-[11px] text-ash">
                <p>n buys from x₀: 2M·n + 75K·n·x₀ + 37,500·n·(n−1)</p>
                <p>STR +25 HP, CON +50 HP, INT +20 MP, WIS +40 MP per point.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
