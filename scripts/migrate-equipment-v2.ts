// One-off (the Item Editor can do this for you with one click): converts the ~100 per-class/per-gender
// equipment CSVs into the single ID-based file
//   data-source/items/equipment.csv   (+ an empty data-source/items/items.csv for everything else)
//
// Run:  npx tsx scripts/migrate-equipment-v2.ts
// It never touches or deletes the old CSVs. Check the result with:
//   npx tsx scripts/verify-equipment-v2.ts
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { serializeCSV } from '../src/lib/csv-serialize.ts'
import { EQUIPMENT_HEADERS, ITEM_HEADERS, LIST_SEP } from '../src/lib/item-types.ts'
import { migrateLegacy } from '../src/lib/equipment-migrate.ts'

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const oldRoot = join(project, 'data-source', 'equipment', 'csv')
const outDir = join(project, 'data-source', 'items')

const { rows, legacyRows, filesRead, orderKept } = migrateLegacy((path) => {
  const full = join(oldRoot, path)
  return existsSync(full) ? readFileSync(full, 'utf8') : null
})

mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'equipment.csv'), serializeCSV([...EQUIPMENT_HEADERS], rows))
const itemsPath = join(outDir, 'items.csv')
if (!existsSync(itemsPath)) writeFileSync(itemsPath, serializeCSV([...ITEM_HEADERS], []))

// Report anything in the old folder that the old build never read (it was invisible on the wiki).
const consumed = new Set(filesRead)
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
