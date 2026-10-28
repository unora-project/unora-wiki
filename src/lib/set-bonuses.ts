import setBonusData from '@/data/metadata/set-bonuses.json'

// ── Set bonuses ──
// Data lives in src/data/metadata/set-bonuses.json. For every set it lists what the game's tooltip
// shows at each piece count (2/4, 3/4, ...) - the running TOTAL. Having only 1 piece gives nothing.

interface SetTier {
  stats?: Record<string, number>
  percentages?: Record<string, number>
}
interface SetDef {
  pieces: number
  tiers: Record<string, SetTier>
}

const SET_DEFS = new Map<string, { name: string; def: SetDef }>(
  Object.entries(setBonusData as Record<string, unknown>)
    .filter(([k, v]) => !k.startsWith('_') && typeof v === 'object' && v !== null)
    .map(([name, def]) => [setLookupKey(name), { name, def: def as SetDef }])
)

export function setLookupKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+set(\s+bonus)?$/, '').replace(/\s+/g, ' ')
}

const SET_STAT_ORDER: { kind: 'stat' | 'pct'; key: string; label: string }[] = [
  { kind: 'stat', key: 'ac', label: 'AC' },
  { kind: 'pct', key: 'attackSpeed', label: 'Attack Speed%' },
  { kind: 'pct', key: 'cooldownReduction', label: 'Cooldown Reduction%' },
  { kind: 'stat', key: 'dmg', label: 'DMG' },
  { kind: 'pct', key: 'skillDamage', label: 'Flat Skill DMG' },
  { kind: 'pct', key: 'spellDamage', label: 'Flat Spell DMG' },
  { kind: 'pct', key: 'flatHealBonus', label: 'Heal Bonus' },
  { kind: 'pct', key: 'healBonusPercent', label: 'Heal Bonus%' },
  { kind: 'stat', key: 'hit', label: 'HIT' },
  { kind: 'stat', key: 'hp', label: 'HP' },
  { kind: 'stat', key: 'mr', label: 'MR' },
  { kind: 'stat', key: 'mp', label: 'MP' },
  { kind: 'stat', key: 'str', label: 'STR' },
  { kind: 'stat', key: 'int', label: 'INT' },
  { kind: 'stat', key: 'wis', label: 'WIS' },
  { kind: 'stat', key: 'con', label: 'CON' },
  { kind: 'stat', key: 'dex', label: 'DEX' },
  { kind: 'pct', key: 'skillDamagePercent', label: 'Skill DMG%' },
  { kind: 'pct', key: 'spellDamagePercent', label: 'Spell DMG%' },
]

function tierTotals(t: SetTier | undefined): Map<string, number> {
  const m = new Map<string, number>()
  if (!t) return m
  for (const [k, v] of Object.entries(t.stats ?? {})) if (typeof v === 'number') m.set(`stat:${k}`, v)
  for (const [k, v] of Object.entries(t.percentages ?? {})) if (typeof v === 'number') m.set(`pct:${k}`, v)
  return m
}

export interface SetStep {
  n: number // piece count, 2..pieces
  add: Map<string, number> // what the n-th piece adds on top of the previous tier ("stat:hp" -> 500)
  lines: { label: string; amount: number }[]
}

export interface SetInfo {
  name: string
  pieces: number
  steps: SetStep[] // only tiers that actually add something
}

const setInfoCache = new Map<string, SetInfo | null>()

export function setInfoFor(item: { set?: string | null; setBonus?: string | null; set_bonus?: string | null }): SetInfo | null {
  const raw = item.set ?? item.setBonus ?? item.set_bonus
  if (typeof raw !== 'string' || raw.trim() === '' || raw.trim() === '-') return null
  const key = setLookupKey(raw)
  if (setInfoCache.has(key)) return setInfoCache.get(key)!
  const found = SET_DEFS.get(key)
  let info: SetInfo | null = null
  if (found) {
    const counts = Object.keys(found.def.tiers)
      .map(Number)
      .filter((n) => Number.isFinite(n) && n >= 2)
      .sort((a, b) => a - b)
    const steps: SetStep[] = []
    let prev = new Map<string, number>()
    let prevN = 1
    for (const n of counts) {
      const total = tierTotals(found.def.tiers[String(n)])
      // A tier is only usable when the one before it is known (otherwise the difference would be wrong).
      const known = n === 2 || prevN === n - 1
      const add = new Map<string, number>()
      for (const k of new Set([...total.keys(), ...prev.keys()])) {
        const d = Math.round(((total.get(k) ?? 0) - (prev.get(k) ?? 0)) * 100) / 100
        if (d !== 0) add.set(k, d)
      }
      if (known && add.size > 0) {
        const lines = SET_STAT_ORDER.filter((r) => add.has(`${r.kind}:${r.key}`)).map((r) => ({
          label: r.label,
          amount: add.get(`${r.kind}:${r.key}`)!,
        }))
        steps.push({ n, add, lines })
      }
      prev = total
      prevN = n
    }
    info = { name: found.name, pieces: found.def.pieces, steps }
  }
  setInfoCache.set(key, info)
  return info
}

// Every set name the site knows about (the CMS "Set Bonus" drop-down uses the same list).
export const SET_NAMES: string[] = [...SET_DEFS.values()].map((v) => v.name)

export const fmtSigned = (n: number) => `${n > 0 ? '+' : ''}${n}`

