import type { EditorItem, EditorRecipe, EditorTab, GenericTab } from '@/types/editor'
import { GENERIC_TAB_SCHEMAS } from '@/types/editor'

export const DATA_ROOT = 'data-source'

export function resolveGenericPath(tab: GenericTab): string {
  return GENERIC_TAB_SCHEMAS[tab].csvPath
}

function lc(s: string | undefined): string {
  return (s || '').toLowerCase().trim()
}

const CLASS_DIRS = new Set(['monk', 'peasant', 'priest', 'rogue', 'warrior', 'wizard'])
const GENDER_DIRS = new Set(['male', 'female'])

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

export function resolveItemPath(item: EditorItem): string | null {
  const type = lc(item.type)

  if (type === 'weapons') {
    const cls = lc(item.class)
    if (!CLASS_DIRS.has(cls)) return null
    return `${DATA_ROOT}/equipment/csv/weapons/${cls}/weapons.csv`
  }

  if (type === 'armors' || type === 'armor') {
    const cls = lc(item.class)
    const g = lc(item.gender)
    if (!CLASS_DIRS.has(cls) || !GENDER_DIRS.has(g)) return null
    return `${DATA_ROOT}/equipment/csv/armor/${cls}/${g}/armor.csv`
  }

  if (type === 'helmets' || type === 'helmet') {
    const cls = lc(item.class)
    const g = lc(item.gender)
    if (!CLASS_DIRS.has(cls) || !GENDER_DIRS.has(g)) return null
    return `${DATA_ROOT}/equipment/csv/helmets/${cls}/${g}/helmets.csv`
  }

  if (type === 'overarmor') {
    const g = lc(item.gender)
    if (!GENDER_DIRS.has(g)) return null
    return `${DATA_ROOT}/equipment/csv/overarmor/${g}/overarmor.csv`
  }

  if (type === 'overhelmet') {
    const g = lc(item.gender)
    if (!GENDER_DIRS.has(g)) return null
    return `${DATA_ROOT}/equipment/csv/overhelmet/${g}/overhelmet.csv`
  }

  const file = SIMPLE_TYPE_FILES[type]
  if (file) return `${DATA_ROOT}/equipment/csv/${file}`
  return null
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
    const p = resolveItemPath(item)
    if (!p) continue
    const arr = map.get(p) ?? []
    arr.push(item)
    map.set(p, arr)
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
