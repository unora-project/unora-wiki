import type { EditorItem, EditorRecipe, EditorTab, GenericTab } from '@/types/editor'
import { GENERIC_TAB_SCHEMAS } from '@/types/editor'

export const DATA_ROOT = 'data-source'

export function resolveGenericPath(tab: GenericTab): string {
  return GENERIC_TAB_SCHEMAS[tab].csvPath
}

function lc(s: string | undefined): string {
  return (s || '').toLowerCase().trim()
}

const CLASS_DIRS = new Set([
  'monk', 'peasant', 'priest', 'rogue', 'warrior', 'wizard',
  'adept', 'druid', 'plague-doctor', 'bard', 'assassin',
  'archer', 'berserker', 'warlord', 'arcanist', 'elementalist',
])
const GENDER_DIRS = new Set(['male', 'female', 'unisex'])

const SIMPLE_TYPE_FILES: Record<string, string> = {
  accessories: 'accessories.csv',
  belts: 'belts.csv',
  boots: 'boots.csv',
  earrings: 'earrings.csv',
  gauntlets: 'gauntlets.csv',
  greaves: 'greaves.csv',
  necklaces: 'necklaces.csv',
  rings: 'rings.csv',
  shields: 'shields.csv',
}

// Splits a possibly comma-separated Class field ("Adept, Druid") into the
// individual class dirs it resolves to, ignoring anything unrecognized.
function classList(item: EditorItem): string[] {
  return (item.class || '')
    .split(',')
    .map((c) => lc(c).replace(/\s+/g, '-'))
    .filter((c) => CLASS_DIRS.has(c))
}

// Returns every CSV path this item should be written to. A single-class
// item resolves to one path (same as before); a multi-class item resolves
// to one path per selected class, so the item gets duplicated into each
// class's CSV.
export function resolveItemPaths(item: EditorItem): string[] {
  const type = lc(item.type)

  if (type === 'weapons') {
    const classes = classList(item)
    if (classes.length === 0) return []
    return classes.map((cls) => `${DATA_ROOT}/equipment/csv/weapons/${cls}/weapons.csv`)
  }

  if (type === 'armors' || type === 'armor') {
    const classes = classList(item)
    const g = lc(item.gender)
    if (classes.length === 0 || !GENDER_DIRS.has(g)) return []
    return classes.map((cls) => `${DATA_ROOT}/equipment/csv/armor/${cls}/${g}/armor.csv`)
  }

  if (type === 'helmets' || type === 'helmet') {
    const classes = classList(item)
    const g = lc(item.gender)
    if (classes.length === 0 || !GENDER_DIRS.has(g)) return []
    return classes.map((cls) => `${DATA_ROOT}/equipment/csv/helmets/${cls}/${g}/helmets.csv`)
  }

  if (type === 'overarmor') {
    const g = lc(item.gender)
    if (!GENDER_DIRS.has(g) && g !== 'unisex') return []
    return [`${DATA_ROOT}/equipment/csv/overarmor/${g}/overarmor.csv`]
  }

  if (type === 'overhelmet') {
    const g = lc(item.gender)
    if (!GENDER_DIRS.has(g) && g !== 'unisex') return []
    return [`${DATA_ROOT}/equipment/csv/overhelmet/${g}/overhelmet.csv`]
  }

  const file = SIMPLE_TYPE_FILES[type]
  if (file) return [`${DATA_ROOT}/equipment/csv/${file}`]
  return []
}

// Kept for callers that only need a single representative path (e.g. the
// unresolved-item counter). Returns the first resolved path, or null.
export function resolveItemPath(item: EditorItem): string | null {
  return resolveItemPaths(item)[0] ?? null
}

export function resolveRecipePath(tab: EditorTab, _recipe: EditorRecipe): string | null {
  switch (tab) {
    case 'jewelcrafting':
      return `${DATA_ROOT}/professions/csv/jewelcrafting/recipes.csv`
    case 'armorsmithing':
      return `${DATA_ROOT}/professions/csv/armorsmithing/recipes.csv`
    case 'weaponsmithing':
      return `${DATA_ROOT}/professions/csv/weaponsmithing/weapons.csv`
    default:
      return null
  }
}

export function groupItemsByPath(items: EditorItem[]): Map<string, EditorItem[]> {
  const map = new Map<string, EditorItem[]>()
  for (const item of items) {
    const paths = resolveItemPaths(item)
    for (const p of paths) {
      const arr = map.get(p) ?? []
      arr.push(item)
      map.set(p, arr)
    }
  }
  return map
}

export function groupRecipesByPath(
  tab: EditorTab,
  recipes: EditorRecipe[]
): Map<string, EditorRecipe[]> {
  const map = new Map<string, EditorRecipe[]>()
  for (const r of recipes) {
    const p = resolveRecipePath(tab, r)
    if (!p) continue
    const arr = map.get(p) ?? []
    arr.push(r)
    map.set(p, arr)
  }
  return map
}