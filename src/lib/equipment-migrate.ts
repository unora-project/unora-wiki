// Converts the old per-class / per-gender equipment CSVs into rows of the single ID-based equipment.csv.
// Pure code (no file access): the caller supplies a `read` function, so the same logic runs in the
// migration script (reads disk) and in the item editor (reads the files from GitHub).
import { parseCSV } from './csv-parse'
import {
  CLASS_SLUGS, GENDERS, LIST_SEP, STAT_HEADERS,
  classToToken, newItemId, typeForLegacyCategory,
} from './item-types'

export interface LegacySource { path: string; category: string; cls: string | null; gender: string | null }

/** Folder of the old files, relative to the repo root. */
export const LEGACY_ROOT = 'data-source/equipment/csv'

/** Same list, same order, as the old build-equipment.ts. */
export const LEGACY_SOURCES: LegacySource[] = []
for (const cls of CLASS_SLUGS) {
  LEGACY_SOURCES.push({ path: `weapons/${cls}/weapons.csv`, category: 'weapon', cls, gender: null })
  for (const gender of GENDERS) {
    LEGACY_SOURCES.push({ path: `armor/${cls}/${gender}/armor.csv`, category: 'armor', cls, gender })
    LEGACY_SOURCES.push({ path: `helmets/${cls}/${gender}/helmets.csv`, category: 'helmet', cls, gender })
  }
}
for (const category of ['overarmor', 'overhelmet']) {
  for (const gender of GENDERS) {
    LEGACY_SOURCES.push({ path: `${category}/${gender}/${category}.csv`, category, cls: null, gender })
  }
}
for (const type of ['accessories', 'belts', 'boots', 'earrings', 'gauntlets', 'greaves', 'necklaces', 'rings', 'shields']) {
  LEGACY_SOURCES.push({ path: `${type}.csv`, category: type.replace(/s$/, ''), cls: null, gender: null })
}

// Columns copied as they are. (Life Steal did not exist in the old files.)
const COPY_COLUMNS = ['LOC', 'LOC_LINK', 'LVL', 'WGT', ...STAT_HEADERS.filter((h) => h !== 'LS%'), 'Value', 'Set'] as const

interface Group {
  category: string
  name: string
  cells: Record<string, string>
  pairs: { cls: string | null; gender: string | null }[]
}

interface RecordOut { name: string; type: string; classes: string[]; genders: string[]; cells: Record<string, string>; covers: string[] }

export interface MigrationResult {
  /** Rows for equipment.csv, keyed by CSV header, in site order. */
  rows: Record<string, string>[]
  legacyRows: number
  filesRead: string[]
  /** False if two old files disagreed about the order of the same items. */
  orderKept: boolean
}

/** `read(path)` gets a path relative to LEGACY_ROOT and returns the file text, or null if there is no such file. */
export function migrateLegacy(read: (path: string) => string | null): MigrationResult {
  const groups = new Map<string, Group>()
  // For every old file: its rows in order, as [group key, gender] so the new file can keep that order.
  const sequences: { key: string; gender: string }[][] = []
  const filesRead: string[] = []
  let legacyRows = 0

  for (const source of LEGACY_SOURCES) {
    const text = read(source.path)
    if (text === null) continue
    filesRead.push(source.path)
    const parsed = parseCSV(text.replace(/^\uFEFF/, ''))
    if (!parsed.headers.length) continue
    const seenHere = new Map<string, number>()
    const sequence: { key: string; gender: string }[] = []
    sequences.push(sequence)
    for (const raw of parsed.rows) {
      const name = (raw.Name ?? '').trim()
      if (!name) throw new Error(`Row without a Name in ${source.path}`)
      const cells: Record<string, string> = {}
      for (const h of COPY_COLUMNS) cells[h] = (raw[h] ?? '').trim()
      legacyRows++
      // Identical rows (same name + same numbers) across classes/genders become ONE record.
      // A row repeated inside the same file keeps its own record so nothing is lost.
      const content = JSON.stringify([source.category, name, ...COPY_COLUMNS.map((h) => cells[h])])
      const occurrence = (seenHere.get(content) ?? 0) + 1
      seenHere.set(content, occurrence)
      const key = `${content}#${occurrence}`
      let g = groups.get(key)
      if (!g) groups.set(key, (g = { category: source.category, name, cells, pairs: [] }))
      g.pairs.push({ cls: source.cls, gender: source.gender })
      sequence.push({ key, gender: source.gender ?? '' })
    }
  }

  // Turn each group into records: genders that have the same class list share one record.
  const records: RecordOut[] = []
  const recordOf = new Map<string, number>()   // "group key|gender" -> index in records
  const classOrder = new Map<string, number>(CLASS_SLUGS.map((c, i) => [c, i]))
  const genderOrder = new Map<string, number>(GENDERS.map((g, i) => [g, i]))
  for (const g of groups.values()) {
    const byGender = new Map<string, Set<string>>()
    for (const p of g.pairs) {
      const k = p.gender ?? ''
      if (!byGender.has(k)) byGender.set(k, new Set())
      if (p.cls) byGender.get(k)!.add(p.cls)
    }
    const bySignature = new Map<string, { classes: string[]; genders: string[]; covers: string[] }>()
    for (const [gender, set] of byGender) {
      const classes = [...set].sort((a, b) => (classOrder.get(a) ?? 99) - (classOrder.get(b) ?? 99))
      const sig = classes.join(',')
      const entry = bySignature.get(sig) ?? { classes, genders: [], covers: [] }
      if (gender) entry.genders.push(gender)
      entry.covers.push(gender)
      bySignature.set(sig, entry)
    }
    for (const e of bySignature.values()) {
      e.genders.sort((a, b) => (genderOrder.get(a) ?? 99) - (genderOrder.get(b) ?? 99))
      records.push({ name: g.name, type: typeForLegacyCategory(g.category), classes: e.classes, genders: e.genders, cells: g.cells, covers: e.covers })
    }
  }
  // Every (group key, gender) maps to its record.
  {
    let r = 0
    for (const key of groups.keys()) {
      // records were pushed in group order, so walk them in step with the groups
      const g = groups.get(key)!
      while (r < records.length && records[r].name === g.name && records[r].cells === g.cells) {
        for (const gender of records[r].covers) recordOf.set(`${key}|${gender}`, r)
        r++
      }
    }
  }

  // Order the records so that every old file's rows keep their original order wherever possible:
  // a topological sort that otherwise prefers where each record first appeared.
  const after: Set<number>[] = records.map(() => new Set<number>())
  const indegree: number[] = records.map(() => 0)
  for (const seq of sequences) {
    let prev = -1
    for (const row of seq) {
      const cur = recordOf.get(`${row.key}|${row.gender}`) ?? -1
      if (cur === -1) continue
      if (prev !== -1 && prev !== cur && !after[prev].has(cur)) {
        after[prev].add(cur)
        indegree[cur]++
      }
      prev = cur
    }
  }
  const ready: number[] = []
  indegree.forEach((d, i) => { if (d === 0) ready.push(i) })
  const ordered: number[] = []
  while (ready.length) {
    ready.sort((a, b) => a - b)
    const i = ready.shift()!
    ordered.push(i)
    for (const j of after[i]) if (--indegree[j] === 0) ready.push(j)
  }
  const orderKept = ordered.length === records.length
  if (!orderKept) {
    // Two files disagree about the order of the same items; keep first-seen order for the rest.
    const placed = new Set(ordered)
    for (let i = 0; i < records.length; i++) if (!placed.has(i)) ordered.push(i)
  }

  // Give every record its permanent ID.
  const taken = new Set<string>()
  const rows = ordered.map((i) => records[i]).map((r) => {
    const id = newItemId(r.name, taken)
    taken.add(id)
    const row: Record<string, string> = {
      ID: id, Name: r.name, Type: r.type,
      Class: r.classes.map(classToToken).join(LIST_SEP),
      Gender: r.genders.join(LIST_SEP),
    }
    for (const h of COPY_COLUMNS) row[h] = r.cells[h]
    row['LS%'] = ''
    return row
  })

  return { rows, legacyRows, filesRead, orderKept }
}
