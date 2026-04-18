import type { EditorDb, EditorItem, EditorRecipe, EditorIngredient, GenericRow, GenericTab } from '@/types/editor'
import { GENERIC_TAB_SCHEMAS } from '@/types/editor'

interface RawEquip {
  name: string
  location: string | null
  level: number | null
  weight: number | null
  category: string
  class: string | null
  gender: string | null
  stats: Record<string, number | null>
  percentages: Record<string, number | null>
}

interface RawJewelRecipe {
  Name: string
  Level: string
  Materials: string
}

interface RawArmorRecipe {
  Name: string
  Class: string
  Gender: string
  Level: string
  Materials: string
}

interface RawWeaponRecipe {
  Name: string
  Level: string
  Type: string
  Materials: string
  'Materials to upgrade'?: string
}

function cap(s: string | null | undefined): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function numOrDash(n: number | null | undefined): number | string {
  return n == null ? '' : n
}

const CATEGORY_TO_TYPE: Record<string, string> = {
  weapon: 'Weapons',
  armor: 'Armors',
  helmet: 'Helmets',
  overarmor: 'Overarmor',
  overhelmet: 'Overhelmet',
  accessorie: 'Accessories',
  belt: 'Belts',
  boot: 'Boots',
  earring: 'Earrings',
  gauntlet: 'Gauntlets',
  greave: 'Greaves',
  necklace: 'Necklaces',
  ring: 'Rings',
  shield: 'Shields',
}

function mapEquipItem(r: RawEquip): EditorItem {
  const type = CATEGORY_TO_TYPE[r.category] ?? cap(r.category)
  return {
    item_name: r.name,
    type,
    class: cap(r.class),
    gender: cap(r.gender),
    level: numOrDash(r.level),
    weight: numOrDash(r.weight),
    value: '',
    location: r.location && r.location !== '-' ? r.location : '',
    set_bonus: '',
    hp: numOrDash(r.stats.hp),
    mp: numOrDash(r.stats.mp),
    ac: numOrDash(r.stats.ac),
    mr: numOrDash(r.stats.mr),
    str: numOrDash(r.stats.str),
    int: numOrDash(r.stats.int),
    wis: numOrDash(r.stats.wis),
    con: numOrDash(r.stats.con),
    dex: numOrDash(r.stats.dex),
    dmg: numOrDash(r.stats.dmg),
    hit: numOrDash(r.stats.hit),
    attack_speed: numOrDash(r.percentages.attackSpeed),
    skill_dmg_flat: numOrDash(r.percentages.skillDamage),
    skill_dmg_pct: numOrDash(r.percentages.skillDamagePercent),
    spell_dmg_flat: numOrDash(r.percentages.spellDamage),
    spell_dmg_pct: numOrDash(r.percentages.spellDamagePercent),
    heal_flat: numOrDash(r.percentages.flatHealBonus),
    heal_pct: numOrDash(r.percentages.healBonusPercent),
    cdr_pct: numOrDash(r.percentages.cooldownReduction),
  }
}

export function parseMaterials(s: string): EditorIngredient[] {
  if (!s) return []
  return s.split(',').map((part) => {
    const m = part.trim().match(/^(\d+)\s+(.+)$/)
    if (m) return { qty: m[1], name: m[2].trim() }
    return { qty: '1', name: part.trim() }
  }).filter((i) => i.name.length > 0)
}

// Profession CSVs use a free-form "Level" column that's numeric in practice.
// No craft_rank in source data — editor defaults it to Beginner for seed rows.
function rankFromLevel(_level: string): string {
  return 'Beginner'
}

function mapJewelRecipe(r: RawJewelRecipe): EditorRecipe {
  return {
    item_name: r.Name,
    type: 'Rings',
    level: r.Level,
    weight: '',
    value: '',
    craft_rank: rankFromLevel(r.Level),
    recipe: parseMaterials(r.Materials),
  }
}

function mapArmorRecipe(r: RawArmorRecipe): EditorRecipe {
  return {
    item_name: r.Name,
    type: 'Armors',
    class: r.Class,
    gender: r.Gender,
    level: r.Level,
    weight: '',
    value: '',
    craft_rank: rankFromLevel(r.Level),
    recipe: parseMaterials(r.Materials),
  }
}

function mapWeaponRecipe(r: RawWeaponRecipe): EditorRecipe {
  return {
    item_name: r.Name,
    type: 'Weapons',
    level: r.Level,
    weight: '',
    value: '',
    craft_rank: rankFromLevel(r.Level),
    recipe: parseMaterials(r.Materials),
    weapon_type: r.Type,
    upgrade_materials: r['Materials to upgrade'] ?? '',
  }
}

function normalizeGeneric(raw: unknown, schema: { headers: readonly string[] }): GenericRow[] {
  if (!Array.isArray(raw)) return []
  return raw.map((row) => {
    const r = (row ?? {}) as Record<string, unknown>
    const out: GenericRow = {}
    for (const h of schema.headers) out[h] = r[h] == null ? '' : String(r[h])
    return out
  })
}

export type NonItemsTab = Exclude<keyof EditorDb, 'items'>

const GENERIC_LOADERS: Record<GenericTab, () => Promise<unknown>> = {
  'alchemy-recipes': () => import('@/data/professions/alchemy-recipes.json').then((m) => m.default ?? m),
  'alchemy-extracts': () => import('@/data/professions/alchemy-extracts.json').then((m) => m.default ?? m),
  'cooking-recipes': () => import('@/data/professions/cooking-recipes.json').then((m) => m.default ?? m),
  'cooking-ingredients': () => import('@/data/professions/cooking-ingredients.json').then((m) => m.default ?? m),
  enchanting: () => import('@/data/professions/enchanting-enchants.json').then((m) => m.default ?? m),
  fishing: () => import('@/data/professions/fishing-fish.json').then((m) => m.default ?? m),
}

const RECIPE_LOADERS = {
  jewelcrafting: () => import('@/data/professions/jewelcrafting-recipes.json').then((m) => (m.default ?? m) as RawJewelRecipe[]),
  armorsmithing: () => import('@/data/professions/armorsmithing-recipes.json').then((m) => (m.default ?? m) as RawArmorRecipe[]),
  weaponsmithing: () => import('@/data/professions/weaponsmithing-recipes.json').then((m) => (m.default ?? m) as RawWeaponRecipe[]),
} as const

export async function seedItemsFromPublished(): Promise<EditorItem[]> {
  const mod = await import('@/data/equipment/all.json')
  const equip = ((mod as any).default ?? mod) as RawEquip[]
  return equip.map(mapEquipItem)
}

export async function seedNonItemsFromPublished(
  keys?: NonItemsTab[]
): Promise<Partial<Omit<EditorDb, 'items'>>> {
  const wanted = new Set<NonItemsTab>(keys ?? [
    'jewelcrafting', 'armorsmithing', 'weaponsmithing',
    'alchemy-recipes', 'alchemy-extracts', 'cooking-recipes', 'cooking-ingredients', 'enchanting', 'fishing',
  ])
  const out: Partial<Omit<EditorDb, 'items'>> = {}
  const tasks: Promise<void>[] = []

  if (wanted.has('jewelcrafting')) {
    tasks.push(RECIPE_LOADERS.jewelcrafting().then((raw) => { out.jewelcrafting = raw.map(mapJewelRecipe) }))
  }
  if (wanted.has('armorsmithing')) {
    tasks.push(RECIPE_LOADERS.armorsmithing().then((raw) => { out.armorsmithing = raw.map(mapArmorRecipe) }))
  }
  if (wanted.has('weaponsmithing')) {
    tasks.push(RECIPE_LOADERS.weaponsmithing().then((raw) => { out.weaponsmithing = raw.map(mapWeaponRecipe) }))
  }

  for (const g of Object.keys(GENERIC_LOADERS) as GenericTab[]) {
    if (!wanted.has(g)) continue
    tasks.push(GENERIC_LOADERS[g]().then((raw) => {
      out[g] = normalizeGeneric(raw, GENERIC_TAB_SCHEMAS[g])
    }))
  }

  await Promise.all(tasks)
  return out
}

export async function seedFromPublished(): Promise<EditorDb> {
  const [items, nonItems] = await Promise.all([
    seedItemsFromPublished(),
    seedNonItemsFromPublished(),
  ])
  return {
    items,
    jewelcrafting: nonItems.jewelcrafting ?? [],
    armorsmithing: nonItems.armorsmithing ?? [],
    weaponsmithing: nonItems.weaponsmithing ?? [],
    'alchemy-recipes': nonItems['alchemy-recipes'] ?? [],
    'alchemy-extracts': nonItems['alchemy-extracts'] ?? [],
    'cooking-recipes': nonItems['cooking-recipes'] ?? [],
    'cooking-ingredients': nonItems['cooking-ingredients'] ?? [],
    enchanting: nonItems.enchanting ?? [],
    fishing: nonItems.fishing ?? [],
  }
}

const LS_KEY = 'unoraDataV10'

export function loadFromLocal(): EditorDb | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return null
    const db = parsed as Partial<EditorDb>
    return {
      items: db.items ?? [],
      jewelcrafting: db.jewelcrafting ?? [],
      armorsmithing: db.armorsmithing ?? [],
      weaponsmithing: db.weaponsmithing ?? [],
      'alchemy-recipes': db['alchemy-recipes'] ?? [],
      'alchemy-extracts': db['alchemy-extracts'] ?? [],
      'cooking-recipes': db['cooking-recipes'] ?? [],
      'cooking-ingredients': db['cooking-ingredients'] ?? [],
      enchanting: db.enchanting ?? [],
      fishing: db.fishing ?? [],
    }
  } catch {
    return null
  }
}

export function saveToLocal(db: EditorDb) {
  localStorage.setItem(LS_KEY, JSON.stringify(db))
}

export function clearLocal() {
  localStorage.removeItem(LS_KEY)
}

const TRASH_KEY = 'unoraTrashV1'
const TRASH_MAX = 200

import type { TrashEntry } from '@/types/editor'

export function loadTrash(): TrashEntry[] {
  try {
    const raw = localStorage.getItem(TRASH_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as TrashEntry[]) : []
  } catch {
    return []
  }
}

export function saveTrash(trash: TrashEntry[]) {
  const capped = trash.slice(-TRASH_MAX)
  localStorage.setItem(TRASH_KEY, JSON.stringify(capped))
}
