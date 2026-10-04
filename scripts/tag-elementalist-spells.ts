import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SPELLS_DIR = join(__dirname, '..', 'src', 'content', 'data', 'spells')

const ELEMENTS: Record<string, string[]> = {
  Fire: ['Ember Ward', 'Fire Wall', 'Ignis', 'Meteor', 'Proliferation'],
  Water: ['Bubble Shield', 'Cloudburst', 'Nera', 'Tidal Wave', 'Tidewell'],
  Earth: ['Earth Barrier', 'Groo', 'Mud Wall', 'Seismic Shift', 'Subsuming Sands'],
  Wind: ['Call Lightning', 'Cyclone', 'Galeform', 'Keeter', 'Static Field'],
}

const lookup = new Map<string, string>()
for (const [element, names] of Object.entries(ELEMENTS)) {
  for (const n of names) lookup.set(n.toLowerCase(), element)
}

let tagged = 0
for (const file of readdirSync(SPELLS_DIR)) {
  if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue
  const path = join(SPELLS_DIR, file)
  const data = yaml.load(readFileSync(path, 'utf-8')) as Record<string, unknown>
  if (String(data.class ?? '').trim().toLowerCase() !== 'elementalist') continue
  // "Bubble Shield 1" -> "bubble shield"
  const base = String(data.name ?? '').replace(/\s+\d+$/, '').trim().toLowerCase()
  const element = lookup.get(base)
  if (!element) continue
  data.element = element
  writeFileSync(path, yaml.dump(data, { lineWidth: -1 }), 'utf-8')
  tagged++
  console.log(`  ✓ ${data.name} → ${element}`)
}
console.log(`\nTagged ${tagged} spells.`)