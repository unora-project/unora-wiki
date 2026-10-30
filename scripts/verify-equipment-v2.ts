// Proves the new equipment.csv produces exactly the same equipment list as the old per-class CSVs.
// Run:  npx tsx scripts/verify-equipment-v2.ts
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildEquipment } from './build-equipment.ts'
import { buildEquipmentV2 } from './build-equipment-v2.ts'

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const oldList = buildEquipment(join(project, 'data-source', 'equipment', 'csv'), [])
const newList = buildEquipmentV2(join(project, 'data-source', 'items', 'equipment.csv'))

const canon = (x: unknown) => JSON.stringify(x)
const sorted = (list: unknown[]) => list.map(canon).sort()
const a = sorted(oldList)
const b = sorted(newList)

console.log(`old build: ${oldList.length} entries   new build: ${newList.length} entries`)
let bad = 0
const counts = new Map<string, number>()
for (const s of a) counts.set(s, (counts.get(s) ?? 0) + 1)
for (const s of b) counts.set(s, (counts.get(s) ?? 0) - 1)
for (const [s, n] of counts) {
  if (n === 0) continue
  bad++
  if (bad <= 10) console.log(n > 0 ? '  only in OLD:' : '  only in NEW:', s.slice(0, 220))
}
const sameOrder = oldList.length === newList.length && oldList.every((x, i) => canon(x) === canon(newList[i]))
console.log(bad === 0 ? 'SAME CONTENT: every entry matches.' : `DIFFERENT: ${bad} entries do not match.`)
console.log(sameOrder ? 'SAME ORDER: identical, entry for entry.' : 'Order differs (content is the same).')
if (bad !== 0) process.exit(1)
// Also check the committed site data, which should match the old CSVs once built.
try {
  const published = JSON.parse(readFileSync(join(project, 'src', 'data', 'equipment', 'all.json'), 'utf8'))
  const p = sorted(published)
  const shortOf = (x: string[], y: string[]) => x.filter((s) => !y.includes(s)).length
  console.log(`Committed all.json: ${published.length} entries; ${shortOf(p, b)} not in the new build, ${shortOf(b, p)} new-only.`)
} catch { /* all.json is optional */ }
