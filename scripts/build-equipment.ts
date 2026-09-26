import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'csv-parse/sync'

interface EquipmentItem {
  name: string
  location: string | null
  locationLink: string | null
  level: number | null
  weight: number | null
  category: string
  class: string | null
  gender: string | null
  stats: Record<string, number | null>
  percentages: Record<string, number | null>
}

interface Source {
  path: string
  category: string
  class: string | null
  gender: string | null
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

function group(item: Pick<EquipmentItem, 'category' | 'class' | 'gender'>): string {
  return JSON.stringify([item.category, item.class, item.gender])
}

export function buildEquipment(csvRoot: string, previous: EquipmentItem[]): EquipmentItem[] {
  const sources: Source[] = []
  for (const cls of ['monk', 'peasant', 'priest', 'rogue', 'warrior', 'wizard']) {
    sources.push({ path: `weapons/${cls}/weapons.csv`, category: 'weapon', class: cls, gender: null })
    for (const gender of ['male', 'female']) {
      sources.push({ path: `armor/${cls}/${gender}/armor.csv`, category: 'armor', class: cls, gender })
      sources.push({ path: `helmets/${cls}/${gender}/helmets.csv`, category: 'helmet', class: cls, gender })
    }
  }
  for (const category of ['overarmor', 'overhelmet']) {
    for (const gender of ['male', 'female', 'unisex']) {
      sources.push({ path: `${category}/${gender}/${category}.csv`, category, class: null, gender })
    }
  }
  for (const type of ['accessories', 'belts', 'boots', 'earrings', 'gauntlets', 'greaves', 'necklaces', 'rings', 'shields']) {
    // Keep the category identifiers used by the existing CSV converter and editor seed.
    sources.push({ path: `${type}.csv`, category: type.replace(/s$/, ''), class: null, gender: null })
  }

  const replaced = new Set<string>()
  const items: EquipmentItem[] = []
  for (const source of sources) {
    const path = join(csvRoot, source.path)
    if (!existsSync(path)) continue
    let headers: string[] = []
    const rows = parse(readFileSync(path, 'utf8'), {
      columns: (columns: string[]) => { headers = columns; return columns },
      skip_empty_lines: true, bom: true, trim: true,
    }) as Record<string, string>[]
    // Retain published groups whose sources are still missing or blank.
    if (!headers.length) continue
    if (!headers.includes('Name') || rows.some((row) => !row.Name?.trim())) {
      throw new Error(`Equipment CSV contains a row without a Name: ${source.path}`)
    }
    // A valid header with no rows explicitly clears this equipment group.
    replaced.add(group(source))
    for (const row of rows) {
      items.push({
        name: row.Name.trim(), location: row.LOC || null, locationLink: row.LOC_LINK && row.LOC_LINK !== '-' ? row.LOC_LINK.trim() : null,
        level: numeric(row.LVL), weight: numeric(row.WGT),
        category: source.category, class: source.class, gender: source.gender,
        stats: Object.fromEntries(Object.entries(stats).map(([key, header]) => [key, numeric(row[header])])),
        percentages: Object.fromEntries(Object.entries(percentages).map(([key, header]) => [key, numeric(row[header])])),
      })
    }
  }
  return [...previous.filter((item) => !replaced.has(group(item))), ...items]
}