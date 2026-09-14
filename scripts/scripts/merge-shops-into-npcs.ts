/**
 * One-time migration: merges src/data/towns/shops.json into the
 * corresponding NPC YAML files under src/content/data/npcs/.
 * Run once, then delete this script and shops.json (or leave shops.json
 * as a backup — it's regenerated automatically going forward).
 *
 * Usage: npx tsx scripts/merge-shops-into-npcs.ts
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const NPCS_DIR = join(__dirname, '..', 'src', 'content', 'data', 'npcs')
const SHOPS_JSON = join(__dirname, '..', 'src', 'data', 'towns', 'shops.json')

interface ShopItem { name: string; type: string; cost: string }
interface ShopEntry { town: string; npc: string; items: ShopItem[] }

const shops: ShopEntry[] = JSON.parse(readFileSync(SHOPS_JSON, 'utf-8'))
const npcFiles = readdirSync(NPCS_DIR).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))

let matched = 0
let missing: string[] = []

for (const shop of shops) {
  // Find the NPC file matching this town + npc name (case-insensitive)
  const match = npcFiles.find((file) => {
    const content = readFileSync(join(NPCS_DIR, file), 'utf-8')
    const data = yaml.load(content) as { town?: string; name?: string }
    return (
      data.town?.toLowerCase() === shop.town.toLowerCase() &&
      data.name?.toLowerCase() === shop.npc.toLowerCase()
    )
  })

  if (!match) {
    missing.push(`${shop.town} / ${shop.npc}`)
    continue
  }

  const filePath = join(NPCS_DIR, match)
  const data = yaml.load(readFileSync(filePath, 'utf-8')) as Record<string, unknown>
  data.shop = shop.items
  writeFileSync(filePath, yaml.dump(data, { lineWidth: -1 }), 'utf-8')
  matched++
  console.log(`  ✓ merged shop into ${match}`)
}

console.log(`\nDone. Merged ${matched}/${shops.length} shops.`)
if (missing.length) {
  console.log(`\n⚠ No matching NPC file found for:`)
  missing.forEach((m) => console.log(`  - ${m}`))
  console.log('You will need to create these NPC YAML files first, then re-run.')
}