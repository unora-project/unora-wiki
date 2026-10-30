// Builds the equipment list the site uses (the same shape as the old build-equipment.ts)
// from the single ID-based file data-source/items/equipment.csv.
//
// One CSV row can cover several classes and genders ("Class" = warrior|monk, "Gender" = male|female).
// This expands it into one entry per class x gender, which is what the Equipment page,
// the search index and the overlay already expect.
import { existsSync, readFileSync } from 'node:fs'
import { parseCSV } from '../src/lib/csv-parse.ts'
import {
  CLASS_SLUGS, GENDERS, LIST_SEP, TYPE_BY_LABEL, tokenToClass,
} from '../src/lib/item-types.ts'

export interface EquipmentItem {
  name: string
  location: string | null
  locationLink: string | null
  level: number | string | null
  weight: number | null
  category: string
  class: string | null
  gender: string | null
  stats: Record<string, number | null>
  percentages: Record<string, number | null>
  set?: string
}

const stats = {
  hp: 'HP', mp: 'MP', ac: 'AC', mr: 'MR', str: 'STR', int: 'INT',
  wis: 'WIS', con: 'CON', dex: 'DEX', dmg: 'DMG', hit: 'HIT',
}
const percentages = {
  attackSpeed: 'AS%', skillDamage: 'SKD', skillDamagePercent: 'SKD%',
  spellDamage: 'SPD', spellDamagePercent: 'SPD%', flatHealBonus: 'FHB',
  healBonusPercent: 'HB%', cooldownReduction: 'CDR%',
}

function numeric(value: string | undefined): number | null {
  if (!value?.trim() || value === '-') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function setName(value: string | undefined): string | undefined {
  const v = value?.trim()
  return v && v !== '-' ? v : undefined
}

function levelValue(value: string | undefined): number | string | null {
  if (!value?.trim() || value === '-') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : value.trim()
}

function list(cell: string | undefined): string[] {
  return (cell ?? '').split(LIST_SEP).map((s) => s.trim()).filter((s) => s && s !== '-')
}

// The order the old per-class files were read in, so the output lists items the same way.
const classRank = new Map<string, number>(CLASS_SLUGS.map((c, i) => [c, i]))
const genderRank = new Map<string, number>(GENDERS.map((g, i) => [g, i]))
const CATEGORY_ORDER = [
  'weapon', 'armor', 'helmet', 'overarmor', 'overhelmet',
  'accessorie', 'belt', 'boot', 'earring', 'gauntlet', 'greave', 'necklace', 'ring', 'shield',
]

function sourceRank(category: string, cls: string | null, gender: string | null): number[] {
  // Class-based items first. Per class the old files were read: weapons, then for each gender armor and helmets.
  if (category === 'weapon') return [0, classRank.get(cls ?? '') ?? 99, -1, 0]
  if (category === 'armor' || category === 'helmet') {
    return [0, classRank.get(cls ?? '') ?? 99, genderRank.get(gender ?? '') ?? 0, category === 'armor' ? 0 : 1]
  }
  if (category === 'overarmor' || category === 'overhelmet') {
    return [1, category === 'overarmor' ? 0 : 1, genderRank.get(gender ?? '') ?? 0, 0]
  }
  const c = CATEGORY_ORDER.indexOf(category)
  return [2, c === -1 ? 99 : c, 0, 0]
}

export function parseEquipmentCsv(text: string): { entries: EquipmentItem[]; problems: string[] } {
  const parsed = parseCSV(text)
  const problems: string[] = []
  const tagged: { entry: EquipmentItem; rank: number[]; order: number }[] = []
  const seenIds = new Set<string>()
  parsed.rows.forEach((raw, rowIdx) => {
    const row: Record<string, string> = {}
    for (const [k, v] of Object.entries(raw)) row[k] = (v ?? '').trim()
    const where = `row ${rowIdx + 2} (${row.Name || 'no name'})`
    if (!row.Name) { problems.push(`${where}: no Name`); return }
    if (!row.ID) problems.push(`${where}: no ID`)
    else if (seenIds.has(row.ID)) problems.push(`${where}: duplicate ID "${row.ID}"`)
    else seenIds.add(row.ID)
    const type = TYPE_BY_LABEL.get(row.Type.toLowerCase())
    if (!type || type.file !== 'equipment' || !type.legacy) {
      problems.push(`${where}: unknown equipment Type "${row.Type}"`)
      return
    }
    const classes = list(row.Class).map(tokenToClass)
    for (const c of classes) {
      if (!classRank.has(c)) problems.push(`${where}: unknown class "${c}"`)
    }
    const genders = list(row.Gender).map((g) => g.toLowerCase())
    for (const g of genders) {
      if (!genderRank.has(g)) problems.push(`${where}: unknown gender "${g}"`)
    }
    for (const cls of classes.length ? classes : [null]) {
      for (const gender of genders.length ? genders : [null]) {
        const entry: EquipmentItem = {
          name: row.Name,
          location: row.LOC || null,
          locationLink: row.LOC_LINK && row.LOC_LINK !== '-' ? row.LOC_LINK : null,
          level: levelValue(row.LVL), weight: numeric(row.WGT),
          category: type.legacy as string, class: cls, gender,
          stats: Object.fromEntries(Object.entries(stats).map(([key, header]) => [key, numeric(row[header])])),
          percentages: Object.fromEntries(Object.entries(percentages).map(([key, header]) => [key, numeric(row[header])])),
          ...(setName(row.Set) ? { set: setName(row.Set) } : {}),
        }
        tagged.push({ entry, rank: sourceRank(entry.category, cls, gender), order: tagged.length })
      }
    }
  })
  tagged.sort((a, b) => {
    for (let i = 0; i < 4; i++) if (a.rank[i] !== b.rank[i]) return a.rank[i] - b.rank[i]
    return a.order - b.order
  })
  return { entries: tagged.map((t) => t.entry), problems }
}

export function buildEquipmentV2(csvPath: string): EquipmentItem[] {
  if (!existsSync(csvPath)) return []
  const { entries, problems } = parseEquipmentCsv(readFileSync(csvPath, 'utf8'))
  if (problems.length) throw new Error(`${csvPath} has problems:\n  ${problems.join('\n  ')}`)
  return entries
}
