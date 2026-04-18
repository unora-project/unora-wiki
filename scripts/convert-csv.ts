/**
 * CSV → JSON Conversion Script
 * Reads CSVs from the UnoraWiki docs directory and outputs typed JSON
 * to src/data/ for the React app.
 *
 * Usage: npx tsx scripts/convert-csv.ts
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs'
import { join, basename, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const WIKI_ROOT = join(__dirname, '..', 'data-source')
const OUT_ROOT = join(__dirname, '..', 'src', 'data')

function splitCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current.trim())
  return fields
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n')
  if (lines.length < 2) return []

  const headers = splitCSVLine(lines[0])
  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = values[i] || '-'
    })
    return row
  })
}

function parseNumeric(val: string): number | null {
  if (!val || val === '-' || val === '') return null
  const n = Number(val)
  return isNaN(n) ? null : n
}

function ensureDir(dir: string) {
  mkdirSync(dir, { recursive: true })
}

function writeJSON(path: string, data: any) {
  writeFileSync(path, JSON.stringify(data, null, 2))
  console.log(`  → ${path.replace(OUT_ROOT, 'src/data')}`)
}

// ============================================================
// Equipment conversion
// ============================================================
function convertEquipment() {
  console.log('\n📦 Converting Equipment...')
  const equipDir = join(WIKI_ROOT, 'equipment', 'csv')
  if (!existsSync(equipDir)) {
    console.log('  ⚠ Equipment CSV directory not found')
    return
  }

  const allEquipment: any[] = []

  // Weapons (class-specific)
  const weaponsDir = join(equipDir, 'weapons')
  if (existsSync(weaponsDir)) {
    for (const classDir of readdirSync(weaponsDir)) {
      const csvPath = join(weaponsDir, classDir, 'weapons.csv')
      if (!existsSync(csvPath)) continue
      const rows = parseCSV(readFileSync(csvPath, 'utf-8'))
      for (const row of rows) {
        allEquipment.push(convertEquipmentRow(row, 'weapon', classDir, null))
      }
    }
  }

  // Armor (class/gender-specific)
  const armorDir = join(equipDir, 'armor')
  if (existsSync(armorDir)) {
    for (const classDir of readdirSync(armorDir)) {
      const classPath = join(armorDir, classDir)
      for (const genderDir of readdirSync(classPath)) {
        const csvPath = join(classPath, genderDir, 'armor.csv')
        if (!existsSync(csvPath)) continue
        const rows = parseCSV(readFileSync(csvPath, 'utf-8'))
        for (const row of rows) {
          allEquipment.push(convertEquipmentRow(row, 'armor', classDir, genderDir))
        }
      }
    }
  }

  // Helmets (class/gender-specific)
  const helmetsDir = join(equipDir, 'helmets')
  if (existsSync(helmetsDir)) {
    for (const classDir of readdirSync(helmetsDir)) {
      const classPath = join(helmetsDir, classDir)
      for (const genderDir of readdirSync(classPath)) {
        const csvPath = join(classPath, genderDir, 'helmets.csv')
        if (!existsSync(csvPath)) continue
        const rows = parseCSV(readFileSync(csvPath, 'utf-8'))
        for (const row of rows) {
          allEquipment.push(convertEquipmentRow(row, 'helmet', classDir, genderDir))
        }
      }
    }
  }

  // Overarmor (gender-specific, no class)
  const overarmorDir = join(equipDir, 'overarmor')
  if (existsSync(overarmorDir)) {
    for (const genderDir of readdirSync(overarmorDir)) {
      const csvPath = join(overarmorDir, genderDir, 'overarmor.csv')
      if (!existsSync(csvPath)) continue
      const rows = parseCSV(readFileSync(csvPath, 'utf-8'))
      for (const row of rows) {
        allEquipment.push(convertEquipmentRow(row, 'overarmor', null, genderDir))
      }
    }
  }

  // Overhelmet (gender-specific, no class)
  const overhelmetDir = join(equipDir, 'overhelmet')
  if (existsSync(overhelmetDir)) {
    for (const genderDir of readdirSync(overhelmetDir)) {
      const csvPath = join(overhelmetDir, genderDir, 'overhelmet.csv')
      if (!existsSync(csvPath)) continue
      const rows = parseCSV(readFileSync(csvPath, 'utf-8'))
      for (const row of rows) {
        allEquipment.push(convertEquipmentRow(row, 'overhelmet', null, genderDir))
      }
    }
  }

  // Simple equipment types (no class/gender subdivisions)
  const simpleTypes = ['accessories', 'belts', 'boots', 'earrings', 'gauntlets', 'greaves', 'necklaces', 'rings', 'shields']
  for (const type of simpleTypes) {
    const csvPath = join(equipDir, `${type}.csv`)
    if (!existsSync(csvPath)) continue
    const rows = parseCSV(readFileSync(csvPath, 'utf-8'))
    for (const row of rows) {
      allEquipment.push(convertEquipmentRow(row, type.replace(/s$/, ''), null, null))
    }
  }

  ensureDir(join(OUT_ROOT, 'equipment'))
  writeJSON(join(OUT_ROOT, 'equipment', 'all.json'), allEquipment)
  console.log(`  Total equipment items: ${allEquipment.length}`)
}

function convertEquipmentRow(row: Record<string, string>, category: string, className: string | null, gender: string | null) {
  return {
    name: row['Name'] || '',
    location: row['LOC'] || null,
    level: parseNumeric(row['LVL']),
    weight: parseNumeric(row['WGT']),
    category,
    class: className || null,
    gender: gender || null,
    stats: {
      hp: parseNumeric(row['HP']),
      mp: parseNumeric(row['MP']),
      ac: parseNumeric(row['AC']),
      mr: parseNumeric(row['MR']),
      str: parseNumeric(row['STR']),
      int: parseNumeric(row['INT']),
      wis: parseNumeric(row['WIS']),
      con: parseNumeric(row['CON']),
      dex: parseNumeric(row['DEX']),
      dmg: parseNumeric(row['DMG']),
      hit: parseNumeric(row['HIT']),
    },
    percentages: {
      attackSpeed: parseNumeric(row['AS%']),
      skillDamage: parseNumeric(row['SKD']),
      skillDamagePercent: parseNumeric(row['SKD%']),
      spellDamage: parseNumeric(row['SPD']),
      spellDamagePercent: parseNumeric(row['SPD%']),
      flatHealBonus: parseNumeric(row['FHB']),
      healBonusPercent: parseNumeric(row['HB%']),
      cooldownReduction: parseNumeric(row['CDR%']),
    },
  }
}

// ============================================================
// Skills & Spells conversion
// ============================================================
function convertClassData() {
  console.log('\n⚔️  Converting Class Skills & Spells...')
  const classDir = join(WIKI_ROOT, 'classes', 'csv')
  if (!existsSync(classDir)) {
    console.log('  ⚠ Class CSV directory not found')
    return
  }

  const classes = ['monk', 'priest', 'rogue', 'warrior', 'wizard']
  const allSkills: any[] = []
  const allSpells: any[] = []

  for (const cls of classes) {
    // Skills
    const skillPath = join(classDir, 'skills', `${cls}.csv`)
    if (existsSync(skillPath)) {
      const rows = parseCSV(readFileSync(skillPath, 'utf-8'))
      for (const row of rows) {
        allSkills.push({
          name: row['Name'] || '',
          class: cls,
          levelRequirement: row['Level Requirement'] || null,
          statRequirements: row['Stat Requirements'] || null,
          goldRequired: row['Gold Required'] || null,
          itemRequirements: row['Item Requirement(s)'] || null,
          prerequisites: row['Prerequisite(s)'] || null,
          learningLocation: row['Learning Location'] || null,
          description: row['Description'] || null,
        })
      }
    }

    // Spells
    const spellPath = join(classDir, 'spells', `${cls}.csv`)
    if (existsSync(spellPath)) {
      const rows = parseCSV(readFileSync(spellPath, 'utf-8'))
      for (const row of rows) {
        allSpells.push({
          name: row['Name'] || '',
          class: cls,
          levelRequirement: row['Level Requirement'] || null,
          statRequirements: row['Stat Requirements'] || null,
          goldRequired: row['Gold Required'] || null,
          itemRequirements: row['Item Requirement(s)'] || null,
          prerequisites: row['Prerequisite(s)'] || null,
          learningLocation: row['Learning Location'] || null,
          description: row['Description'] || null,
        })
      }
    }
  }

  ensureDir(join(OUT_ROOT, 'classes'))
  writeJSON(join(OUT_ROOT, 'classes', 'skills.json'), allSkills)
  writeJSON(join(OUT_ROOT, 'classes', 'spells.json'), allSpells)
  console.log(`  Skills: ${allSkills.length}, Spells: ${allSpells.length}`)
}

// ============================================================
// Religion conversion
// ============================================================
function convertReligion() {
  console.log('\n🙏 Converting Religion...')
  const relDir = join(WIKI_ROOT, 'religion', 'csv')
  if (!existsSync(relDir)) {
    console.log('  ⚠ Religion CSV directory not found')
    return
  }

  const goddesses = ['miraelis', 'serendael', 'skandara', 'theselene']
  const allBlessings: any[] = []

  for (const goddess of goddesses) {
    const csvPath = join(relDir, `${goddess}.csv`)
    if (!existsSync(csvPath)) continue
    const rows = parseCSV(readFileSync(csvPath, 'utf-8'))
    for (const row of rows) {
      allBlessings.push({
        goddess,
        blessing: row['Blessing'] || '',
        cost: row['Cost'] || null,
        description: row['Description'] || null,
      })
    }
  }

  ensureDir(join(OUT_ROOT, 'religion'))
  writeJSON(join(OUT_ROOT, 'religion', 'blessings.json'), allBlessings)
  console.log(`  Blessings: ${allBlessings.length}`)
}

// ============================================================
// Towns conversion
// ============================================================
function convertTowns() {
  console.log('\n🏘️  Converting Towns...')
  const townDir = join(WIKI_ROOT, 'towns', 'csv')
  if (!existsSync(townDir)) {
    console.log('  ⚠ Towns CSV directory not found')
    return
  }

  const towns = ['abel', 'loures', 'mileth', 'piet', 'rucesion', 'suomi', 'tagor', 'undine']
  const allNPCs: any[] = []

  for (const town of towns) {
    const csvPath = join(townDir, town, 'npcs.csv')
    if (!existsSync(csvPath)) continue
    const rows = parseCSV(readFileSync(csvPath, 'utf-8'))
    for (const row of rows) {
      allNPCs.push({
        town,
        name: row['Name'] || '',
        type: row['Type'] || null,
        coordinates: row['Coordinates'] || null,
      })
    }
  }

  ensureDir(join(OUT_ROOT, 'towns'))
  writeJSON(join(OUT_ROOT, 'towns', 'npcs.json'), allNPCs)
  console.log(`  NPCs: ${allNPCs.length}`)
}

// ============================================================
// Drops conversion
// ============================================================
function convertDrops() {
  console.log('\n💀 Converting Drops...')
  const csvPath = join(WIKI_ROOT, 'drops', 'csv', 'bosses.csv')
  if (!existsSync(csvPath)) {
    console.log('  ⚠ Bosses CSV not found')
    return
  }

  const rows = parseCSV(readFileSync(csvPath, 'utf-8'))
  const bosses = rows.map((row) => {
    const loc = row['Location'] || ''
    const match = loc.match(/^\[([^\]]+)\]\(hunting_grounds\/areas\/([^)]+)\.md\)$/)
    return {
      boss: row['Boss'] || '',
      level: row['Level'] || null,
      location: match ? match[1] : loc || null,
      locationSlug: match ? match[2] : null,
      drops: row['Drops'] || null,
    }
  })

  ensureDir(join(OUT_ROOT, 'hunting'))
  writeJSON(join(OUT_ROOT, 'hunting', 'bosses.json'), bosses)
  console.log(`  Bosses: ${bosses.length}`)
}

// ============================================================
// Mounts conversion
// ============================================================
function convertMounts() {
  console.log('\n🐴 Converting Mounts...')
  const mountsPath = join(WIKI_ROOT, 'mounts', 'csv', 'mounts.csv')
  const cloaksPath = join(WIKI_ROOT, 'mounts', 'csv', 'cloaks.csv')

  const mounts: any[] = []
  const cloaks: any[] = []

  if (existsSync(mountsPath)) {
    const rows = parseCSV(readFileSync(mountsPath, 'utf-8'))
    for (const row of rows) {
      mounts.push({
        name: row['Name'] || '',
        speed: row['Speed'] || null,
        obtained: row['Obtained'] || null,
      })
    }
  }

  if (existsSync(cloaksPath)) {
    const rows = parseCSV(readFileSync(cloaksPath, 'utf-8'))
    for (const row of rows) {
      cloaks.push({
        color: row['Color'] || '',
        obtained: row['Obtained'] || null,
      })
    }
  }

  ensureDir(join(OUT_ROOT, 'mounts'))
  writeJSON(join(OUT_ROOT, 'mounts', 'mounts.json'), mounts)
  writeJSON(join(OUT_ROOT, 'mounts', 'cloaks.json'), cloaks)
  console.log(`  Mounts: ${mounts.length}, Cloaks: ${cloaks.length}`)
}

// ============================================================
// Professions conversion
// ============================================================
function convertProfessions() {
  console.log('\n🔨 Converting Professions...')
  const profDir = join(WIKI_ROOT, 'professions', 'csv')
  if (!existsSync(profDir)) {
    console.log('  ⚠ Professions CSV directory not found')
    return
  }

  ensureDir(join(OUT_ROOT, 'professions'))

  // Alchemy
  const alchemyRecipes = join(profDir, 'alchemy', 'recipes.csv')
  if (existsSync(alchemyRecipes)) {
    const rows = parseCSV(readFileSync(alchemyRecipes, 'utf-8'))
    writeJSON(join(OUT_ROOT, 'professions', 'alchemy-recipes.json'), rows)
  }

  const alchemyExtracts = join(profDir, 'alchemy', 'extracts.csv')
  if (existsSync(alchemyExtracts)) {
    const rows = parseCSV(readFileSync(alchemyExtracts, 'utf-8'))
    writeJSON(join(OUT_ROOT, 'professions', 'alchemy-extracts.json'), rows)
  }

  // Armorsmithing
  const armorsmithRecipes = join(profDir, 'armorsmithing', 'recipes.csv')
  if (existsSync(armorsmithRecipes)) {
    const rows = parseCSV(readFileSync(armorsmithRecipes, 'utf-8'))
    writeJSON(join(OUT_ROOT, 'professions', 'armorsmithing-recipes.json'), rows)
  }

  // Cooking
  const cookingRecipes = join(profDir, 'cooking', 'recipes.csv')
  if (existsSync(cookingRecipes)) {
    const rows = parseCSV(readFileSync(cookingRecipes, 'utf-8'))
    writeJSON(join(OUT_ROOT, 'professions', 'cooking-recipes.json'), rows)
  }

  const cookingIngredients = join(profDir, 'cooking', 'ingredients.csv')
  if (existsSync(cookingIngredients)) {
    const rows = parseCSV(readFileSync(cookingIngredients, 'utf-8'))
    writeJSON(join(OUT_ROOT, 'professions', 'cooking-ingredients.json'), rows)
  }

  // Enchanting
  const enchants = join(profDir, 'enchanting', 'enchants.csv')
  if (existsSync(enchants)) {
    const rows = parseCSV(readFileSync(enchants, 'utf-8'))
    writeJSON(join(OUT_ROOT, 'professions', 'enchanting-enchants.json'), rows)
  }

  // Fishing
  const fish = join(profDir, 'fishing', 'fish.csv')
  if (existsSync(fish)) {
    const rows = parseCSV(readFileSync(fish, 'utf-8'))
    writeJSON(join(OUT_ROOT, 'professions', 'fishing-fish.json'), rows)
  }

  // Jewelcrafting
  const jewelRecipes = join(profDir, 'jewelcrafting', 'recipes.csv')
  if (existsSync(jewelRecipes)) {
    const rows = parseCSV(readFileSync(jewelRecipes, 'utf-8'))
    writeJSON(join(OUT_ROOT, 'professions', 'jewelcrafting-recipes.json'), rows)
  }

  // Weaponsmithing
  const weaponRecipes = join(profDir, 'weaponsmithing', 'weapons.csv')
  if (existsSync(weaponRecipes)) {
    const rows = parseCSV(readFileSync(weaponRecipes, 'utf-8'))
    writeJSON(join(OUT_ROOT, 'professions', 'weaponsmithing-recipes.json'), rows)
  }

  console.log('  Done.')
}

// ============================================================
// Main
// ============================================================
console.log('🗡️  Unora Wiki CSV → JSON Converter')
console.log('='.repeat(50))
console.log(`Source: ${WIKI_ROOT}`)
console.log(`Output: ${OUT_ROOT}`)

ensureDir(OUT_ROOT)

convertEquipment()
convertClassData()
convertReligion()
convertTowns()
convertDrops()
convertMounts()
convertProfessions()

console.log('\n✅ Done! All data converted.')
