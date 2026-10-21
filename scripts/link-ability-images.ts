/**
 * Links the pictures in public/images/abilities to their skills and spells by name.
 * Only letters count: case, spaces, digits and punctuation are ignored, so
 * "Rout 1.png", "rout-2.png" and "Rout.png" all link to Rout 1, Rout 2 and Rout 3.
 *
 *   npx tsx scripts/link-ability-images.ts            (preview, changes nothing)
 *   npx tsx scripts/link-ability-images.ts --apply    (writes `image:` into the YAML files)
 *
 * Options: --images <folder>  (default public/images/abilities)
 *          --data <folder>    (default src/content/data, uses its skills/ and spells/ folders)
 */
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const opt = (n: string, d: string) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d }
const IMAGES = path.resolve(opt('images', 'public/images/abilities'))
const DATA = path.resolve(opt('data', 'src/content/data'))
const PUBLIC_PREFIX = '/images/abilities'

const letters = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')

if (!fs.existsSync(IMAGES)) { console.error('Image folder not found: ' + IMAGES); process.exit(1) }

// letters-only name -> image file (if two files collapse to the same letters, the first alphabetically wins)
const byLetters = new Map<string, string>()
const dupes: string[] = []
for (const f of fs.readdirSync(IMAGES).filter((f) => /\.(png|jpe?g|gif|webp)$/i.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
  const k = letters(path.parse(f).name)
  if (!k) continue
  if (byLetters.has(k)) dupes.push(`${f} (same letters as ${byLetters.get(k)}, ignored)`)
  else byLetters.set(k, f)
}

const unq = (s: string) => { s = s.trim(); return (s[0] === '"' && s.endsWith('"')) || (s[0] === "'" && s.endsWith("'")) ? s.slice(1, -1) : s }
function topLevel(text: string, key: string) {
  const m = text.match(new RegExp('^' + key + '\\s*:[ \\t]*(.*)$', 'm'))
  return m ? unq(m[1].replace(/\s+#.*$/, '')) : ''
}
function walk(d: string): string[] {
  if (!fs.existsSync(d)) return []
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(d, e.name)) : /\.ya?ml$/i.test(e.name) ? [path.join(d, e.name)] : [])
}
function setImageLine(text: string, value: string) {
  const nl = text.includes('\r\n') ? '\r\n' : '\n'
  const lines = text.split(/\r?\n/)
  const at = lines.findIndex((l) => /^image\s*:/.test(l))
  if (at >= 0) lines[at] = `image: ${value}`
  else { const n = lines.findIndex((l) => /^name\s*:/.test(l)); lines.splice(n >= 0 ? n + 1 : lines.length, 0, `image: ${value}`) }
  return lines.join(nl)
}

const used = new Set<string>()
let changed = 0, already = 0
const noImage: string[] = []
for (const kind of ['skills', 'spells']) {
  for (const file of walk(path.join(DATA, kind))) {
    const text = fs.readFileSync(file, 'utf8')
    const name = topLevel(text, 'name')
    if (!name) continue
    const img = byLetters.get(letters(name))
    if (!img) { noImage.push(`${kind}/${name}`); continue }
    used.add(img)
    const value = `${PUBLIC_PREFIX}/${encodeURI(img)}`
    const next = setImageLine(text, value)
    if (next === text) { already++; continue }
    console.log(`${name}  ->  ${img}`)
    if (apply) fs.writeFileSync(file, next)
    changed++
  }
}

const unmatched = [...byLetters.values()].filter((f) => !used.has(f))
console.log(`\n${apply ? 'Updated' : 'Would update'} ${changed} files (${already} already correct).`)
if (unmatched.length) console.log(`\n${unmatched.length} pictures matched no skill or spell:\n  ` + unmatched.join('\n  '))
if (dupes.length) console.log(`\nDuplicate names:\n  ` + dupes.join('\n  '))
console.log(`\n${noImage.length} skills/spells have no picture yet.`)
if (!apply) console.log('Run again with --apply to write the changes.')
