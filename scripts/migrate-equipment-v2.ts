// One-off: converts the ~100 per-class/per-gender equipment CSVs into the single ID-based file
//   data-source/items/equipment.csv   (+ an empty data-source/items/items.csv for everything else)
//
// Run:  npx tsx scripts/migrate-equipment-v2.ts
// It never touches or deletes the old CSVs. Check the result with:
//   npx tsx scripts/verify-equipment-v2.ts
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCSV } from '../src/lib/csv-parse.ts'
import { serializeCSV } from '../src/lib/csv-serialize.ts'
import {
  CLASS_SLUGS, EQUIPMENT_HEADERS, GENDERS, ITEM_HEADERS, LIST_SEP, STAT_HEADERS,
  classToToken, newItemId, typeForLegacyCategory,
} from '../src/lib/item-types.ts'

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const oldRoot = join(project, 'data-source', 'equipment', 'csv')
const outDir = join(project, 'data-source', 'items')

interface Source { path: string; category: string; cls: string | null; gender: string | null }

// Same list, same order, as the old build-equipment.ts.
const sources: Source[] = []
for (const cls of CLASS_SLUGS) {
  sources.push({ path: `weapons/${cls}/weapons.csv`, category: 'weapon', cls, gender: null })
  for (const gender of GENDERS) {
    sources.push({ path: `armor/${cls}/${gender}/armor.csv`, category: 'armor', cls, gender })
    sources.push({ path: `helmets/${cls}/${gender}/helmets.csv`, category: 'helmet', cls, gender })
  }
}
for (const category of ['overarmor', 'overhelmet']) {
  for (const gender of GENDERS) {
    sources.push({ path: `${category}/${gender}/${category}.csv`, category, cls: null, gender })
  }
}
for (const type of ['accessories', 'belts', 'boots', 'earrings', 'gauntlets', 'greaves', 'necklaces', 'rings', 'shields']) {
  sources.push({ path: `${type}.csv`, category: type.replace(/s$/, ''), cls: null, gender: null })
}

const COPY_COLUMNS = ['LOC', 'LOC_LINK', 'LVL', 'WGT', ...STAT_HEADERS, 'Value', 'Set'] as const

interface Group {
  category: string
  name: string
  cells: Record<string, string>
  pairs: { cls: string | null; gender: string | null }[]
}

const groups = new Map<string, Group>()
// For every old file: its rows in order, as [group key, gender] so the new file can keep that order.
const sequences: { key: string; gender: string }[][] = []
const consumed = new Set<string>()
let legacyRows = 0

for (const source of sources) {
  const full = join(oldRoot, source.path)
  if (!existsSync(full)) continue
  consumed.add(source.path)
  const parsed = parseCSV(readFileSync(full, 'utf8').replace(/^﻿/, ''))
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
interface RecordOut { name: string; type: string; classes: string[]; genders: string[]; cells: Record<string, string>; covers: string[] }
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
  const keys = [...groups.keys()]
  let r = 0
  for (const key of keys) {
    // records were pushed in group order, so walk them in step with the groups
    const g = groups.get(key)!
    const used = new Set<string>()
    while (r < records.length && records[r].name === g.name && records[r].cells === g.cells) {
      for (const gender of records[r].covers) recordOf.set(`${key}|${gender}`, r)
      for (const gender of records[r].covers) used.add(gender)
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
  for (let i = 0; i < records.length; i++) if (!ordered.includes(i)) ordered.push(i)
}
const orderedRecords = ordered.map((i) => records[i])

// Give every record its permanent ID.
const taken = new Set<string>()
const rows = orderedRecords.map((r) => {
  const id = newItemId(r.name, taken)
  taken.add(id)
  const row: Record<string, string> = {
    ID: id, Name: r.name, Type: r.type,
    Class: r.classes.map(classToToken).join(LIST_SEP),
    Gender: r.genders.join(LIST_SEP),
  }
  for (const h of COPY_COLUMNS) row[h] = r.cells[h]
  return row
})

mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'equipment.csv'), serializeCSV([...EQUIPMENT_HEADERS], rows))
const itemsPath = join(outDir, 'items.csv')
if (!existsSync(itemsPath)) writeFileSync(itemsPath, serializeCSV([...ITEM_HEADERS], []))

// Report anything in the old folder that the old build never read (it was invisible on the wiki).
const strays: string[] = []
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (name.endsWith('.csv') && !consumed.has(relative(oldRoot, p).replaceAll('\\', '/'))) strays.push(relative(oldRoot, p))
  }
}
walk(oldRoot)

console.log(`Read ${legacyRows} rows from ${consumed.size} old CSV files.`)
console.log(`Wrote ${rows.length} records to ${relative(project, join(outDir, 'equipment.csv'))}.`)
const multi = rows.filter((r) => r.Class.includes(LIST_SEP) || r.Gender.includes(LIST_SEP)).length
console.log(`${multi} records cover more than one class or gender.`)
if (!orderKept) console.log('Note: a few items are listed in a different order in two old files, so one list may be ordered slightly differently.')
if (strays.length) {
  console.log(`\nIgnored (the old build never read these):\n  ${strays.join('\n  ')}`)
}
