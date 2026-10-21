/**
 * Writes every skill and spell name found in public/data/classes to names.txt (one per line).
 *
 *   npx tsx scripts/export-ability-names.ts
 *   npx tsx scripts/export-ability-names.ts <classes-folder> <output-file>
 *
 * Handles either layout: separate skills/spells files (skills.json, spells.json, or
 * folders named skills/spells), or one file per class with "skills" and "spells" lists inside.
 */
import fs from 'node:fs'
import path from 'node:path'
 
const dir = path.resolve(process.argv[2] ?? 'public/data/classes')
const outFile = path.resolve(process.argv[3] ?? 'names.txt')
 
function jsonFiles(d: string): string[] {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? jsonFiles(path.join(d, e.name)) : e.name.endsWith('.json') ? [path.join(d, e.name)] : [])
}
 
// every { name: "..." } inside a value
function collect(v: unknown, out: Set<string>) {
  if (Array.isArray(v)) v.forEach((x) => collect(x, out))
  else if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (typeof o.name === 'string' && o.name.trim()) out.add(o.name.trim())
    else Object.values(o).forEach((x) => collect(x, out))
  }
}
 
if (!fs.existsSync(dir)) {
  console.error(`Folder not found: ${dir}\nRun from the project root, or pass the folder as the first argument.`)
  process.exit(1)
}
 
const names = new Set<string>()
for (const file of jsonFiles(dir)) {
  let data: any
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')) } catch { console.warn('Skipped (invalid JSON): ' + file); continue }
  const rel = path.relative(dir, file).toLowerCase()
  if (/skill|spell/.test(rel)) collect(data, names)      // skills.json, spells.json, skills/…, spells/…
  else if (Array.isArray(data)) collect(data, names)     // a plain list of skill/spell blocks
  else if (data && typeof data === 'object') {           // one file per class
    collect((data as any).skills, names)
    collect((data as any).spells, names)
  }
}
 
const list = [...names].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
fs.writeFileSync(outFile, list.join('\n') + '\n')
console.log(`${list.length} names written to ${outFile}`)
