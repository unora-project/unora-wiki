/**
 * Content Build Script
 * Reads YAML metadata from src/content/metadata/ and outputs typed JSON
 * to src/data/metadata/ for the React app.
 *
 * Also reads per-area YAML files and merges them into a single areas.json.
 *
 * Usage: npx tsx scripts/build-content.ts
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs'
import { join, basename, dirname } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const CONTENT_ROOT = join(__dirname, '..', 'src', 'content', 'metadata')
const DATA_CONTENT_ROOT = join(__dirname, '..', 'src', 'content', 'data')
const OUT_ROOT = join(__dirname, '..', 'src', 'data', 'metadata')
const DATA_OUT_ROOT = join(__dirname, '..', 'src', 'data')
const PUBLIC_DATA_ROOT = join(__dirname, '..', 'public', 'data')

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function readYaml<T = unknown>(filePath: string): T {
  const raw = readFileSync(filePath, 'utf-8')
  return yaml.load(raw) as T
}

function writeJson(filePath: string, data: unknown) {
  ensureDir(dirname(filePath))
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

function buildFolderCollection(subfolder: string): Record<string, unknown> {
  const dir = join(CONTENT_ROOT, subfolder)
  if (!existsSync(dir)) return {}

  const result: Record<string, unknown> = {}
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue
    const slug = basename(file, file.endsWith('.yaml') ? '.yaml' : '.yml')
    result[slug] = readYaml(join(dir, file))
  }
  return result
}

function buildFolderArray(subfolder: string): unknown[] {
  const dir = join(DATA_CONTENT_ROOT, subfolder)
  if (!existsSync(dir)) return []

  const result: unknown[] = []
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue
    result.push(readYaml(join(dir, file)))
  }
  return result
}

function buildSingleFile(relativePath: string): unknown {
  const filePath = join(CONTENT_ROOT, relativePath)
  if (!existsSync(filePath)) {
    console.warn(`  Warning: ${relativePath} not found, skipping`)
    return null
  }
  return readYaml(filePath)
}

// ── Main ──

console.log('Building content from YAML...\n')

// Classes metadata (per-class YAML → single classes.json)
console.log('  Classes...')
const classes = buildFolderCollection('classes')
writeJson(join(OUT_ROOT, 'classes.json'), classes)

// Professions metadata (per-profession YAML → single professions.json)
console.log('  Professions...')
const professions = buildFolderCollection('professions')
writeJson(join(OUT_ROOT, 'professions.json'), professions)

// Religion metadata (per-god YAML → single religion.json)
console.log('  Religion...')
const religion = buildFolderCollection('religion')
writeJson(join(OUT_ROOT, 'religion.json'), religion)

// Town names (single file)
console.log('  Town names...')
const townNames = buildSingleFile('towns/names.yaml')
if (townNames) writeJson(join(OUT_ROOT, 'town-names.json'), townNames)

// Hunting area names (single file)
console.log('  Hunting area names...')
const areaNames = buildSingleFile('hunting/area-names.yaml')
if (areaNames) writeJson(join(OUT_ROOT, 'area-names.json'), areaNames)

// Hunting map variants (single file)
console.log('  Hunting map variants...')
const mapVariants = buildSingleFile('hunting/map-variants.yaml')
if (mapVariants) writeJson(join(OUT_ROOT, 'map-variants.json'), mapVariants)

// Hunting index (areas list, tier config, chart data)
console.log('  Hunting index...')
const huntingIndex = buildSingleFile('hunting/index.yaml')
if (huntingIndex) writeJson(join(OUT_ROOT, 'hunting-index.json'), huntingIndex)

// Hunting area details (per-area YAML → single areas.json matching current format)
console.log('  Hunting area details...')
const areasDir = join(CONTENT_ROOT, 'hunting', 'areas')
if (existsSync(areasDir)) {
  const areas = buildFolderCollection('hunting/areas')
  writeJson(join(OUT_ROOT, 'hunting-areas.json'), areas)
}

// ── Game Data (per-item YAML → JSON arrays) ──

console.log('  Bosses...')
const bosses = buildFolderArray('bosses')
if (bosses.length) writeJson(join(DATA_OUT_ROOT, 'hunting', 'bosses.json'), bosses)

console.log('  Blessings...')
const blessings = buildFolderArray('blessings')
if (blessings.length) writeJson(join(DATA_OUT_ROOT, 'religion', 'blessings.json'), blessings)

console.log('  NPCs...')
const npcs = buildFolderArray('npcs')
if (npcs.length) writeJson(join(DATA_OUT_ROOT, 'towns', 'npcs.json'), npcs)

console.log('  Mounts...')
const mounts = buildFolderArray('mounts')
if (mounts.length) writeJson(join(DATA_OUT_ROOT, 'mounts', 'mounts.json'), mounts)

console.log('  Cloaks...')
const cloaks = buildFolderArray('cloaks')
if (cloaks.length) writeJson(join(DATA_OUT_ROOT, 'mounts', 'cloaks.json'), cloaks)

console.log('  Skills...')
const skills = buildFolderArray('skills') as { class?: string }[]
if (skills.length) writeJson(join(DATA_OUT_ROOT, 'classes', 'skills.json'), skills)

console.log('  Spells...')
const spells = buildFolderArray('spells') as { class?: string }[]
if (spells.length) writeJson(join(DATA_OUT_ROOT, 'classes', 'spells.json'), spells)

// Per-class shards for public/data — ClassDetail fetches only its own slice.
console.log('  Per-class skill/spell shards...')
const shardClasses = new Set<string>()
for (const s of skills) if (s.class) shardClasses.add(s.class)
for (const s of spells) if (s.class) shardClasses.add(s.class)
for (const cls of shardClasses) {
  const classSkills = skills.filter((s) => s.class === cls)
  const classSpells = spells.filter((s) => s.class === cls)
  writeJson(join(PUBLIC_DATA_ROOT, 'classes', cls, 'skills.json'), classSkills)
  writeJson(join(PUBLIC_DATA_ROOT, 'classes', cls, 'spells.json'), classSpells)
}
console.log(`    wrote ${shardClasses.size} class shard pair(s) to public/data/classes/`)

console.log('\nContent build complete!')
