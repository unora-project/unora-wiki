export type RecipeTab = 'jewelcrafting' | 'armorsmithing' | 'weaponsmithing'
export type GenericTab =
  | 'alchemy-recipes'
  | 'alchemy-extracts'
  | 'cooking-recipes'
  | 'cooking-ingredients'
  | 'enchanting'
  | 'fishing'
export type EditorTab = 'items' | RecipeTab | GenericTab

export type GenericRow = Record<string, string>

export interface TrashEntry {
  id: string
  tab: EditorTab
  index: number
  name: string
  deletedAt: number
  payload: unknown
}

export interface EditorIngredient {
  qty: string | number
  name: string
}

export interface EditorItem {
  item_name: string
  type: string
  class?: string
  gender?: string
  level: number | string
  weight: number | string
  value: number | string
  location?: string
  set_bonus?: string
  ac?: number | string
  hp?: number | string
  mp?: number | string
  attack_speed?: number | string
  mr?: number | string
  str?: number | string
  int?: number | string
  wis?: number | string
  con?: number | string
  dex?: number | string
  dmg?: number | string
  hit?: number | string
  skill_dmg_flat?: number | string
  skill_dmg_pct?: number | string
  spell_dmg_flat?: number | string
  spell_dmg_pct?: number | string
  heal_flat?: number | string
  heal_pct?: number | string
  cdr_pct?: number | string
  [extra: string]: unknown
}

export interface EditorRecipe extends EditorItem {
  craft_rank: string
  recipe: EditorIngredient[]
}

export interface EditorDb {
  items: EditorItem[]
  jewelcrafting: EditorRecipe[]
  armorsmithing: EditorRecipe[]
  weaponsmithing: EditorRecipe[]
  'alchemy-recipes': GenericRow[]
  'alchemy-extracts': GenericRow[]
  'cooking-recipes': GenericRow[]
  'cooking-ingredients': GenericRow[]
  enchanting: GenericRow[]
  fishing: GenericRow[]
}

export interface GenericTabSchema {
  tab: GenericTab
  label: string
  csvPath: string
  headers: readonly string[]
  nameKey: string
}

export const GENERIC_TAB_SCHEMAS: Record<GenericTab, GenericTabSchema> = {
  'alchemy-recipes': {
    tab: 'alchemy-recipes',
    label: 'Alchemy Recipes',
    csvPath: 'data-source/professions/csv/alchemy/recipes.csv',
    headers: ['Potion', 'Ingredients', 'Learned From', 'Effects'],
    nameKey: 'Potion',
  },
  'alchemy-extracts': {
    tab: 'alchemy-extracts',
    label: 'Alchemy Extracts',
    csvPath: 'data-source/professions/csv/alchemy/extracts.csv',
    headers: ['Monster Part', 'Area', 'Level', 'Extract', 'Amount'],
    nameKey: 'Monster Part',
  },
  'cooking-recipes': {
    tab: 'cooking-recipes',
    label: 'Cooking Recipes',
    csvPath: 'data-source/professions/csv/cooking/recipes.csv',
    headers: ['Recipe', 'Ingredients', 'Where to learn', 'Benefits'],
    nameKey: 'Recipe',
  },
  'cooking-ingredients': {
    tab: 'cooking-ingredients',
    label: 'Cooking Ingredients',
    csvPath: 'data-source/professions/csv/cooking/ingredients.csv',
    headers: ['Name', 'Type', 'Where to obtain'],
    nameKey: 'Name',
  },
  enchanting: {
    tab: 'enchanting',
    label: 'Enchanting',
    csvPath: 'data-source/professions/csv/enchanting/enchants.csv',
    headers: ['Enchant', 'Effects', 'Rank', 'Name', 'Level'],
    nameKey: 'Enchant',
  },
  fishing: {
    tab: 'fishing',
    label: 'Fishing',
    csvPath: 'data-source/professions/csv/fishing/fish.csv',
    headers: ['Fish', 'Rarity'],
    nameKey: 'Fish',
  },
}

export const BASIC_IDS = [
  'item_name', 'type', 'class', 'gender', 'level', 'weight', 'value',
  'ac', 'hp', 'mp', 'attack_speed', 'mr', 'str', 'int', 'wis', 'con', 'dex',
  'dmg', 'hit', 'skill_dmg_flat', 'skill_dmg_pct', 'spell_dmg_flat', 'spell_dmg_pct',
  'heal_flat', 'heal_pct', 'cdr_pct',
] as const

export const EXTRA_IDS = ['location', 'set_bonus'] as const

export const CRAFT_RANKS = [
  'Beginner', 'Novice', 'Initiate', 'Artisan', 'Adept', 'Advanced', 'Expert', 'Master',
] as const

export const ITEM_TYPES = [
  'Accessories', 'Armors', 'Belts', 'Boots', 'Earrings', 'Gauntlets',
  'Greaves', 'Helmets', 'Necklaces', 'Overarmor', 'Overhelmet', 'Rings',
  'Shields', 'Weapons',
] as const

export const CLASSES = ['Peasant', 'Monk', 'Priest', 'Rogue', 'Warrior', 'Wizard'] as const
export const GENDERS = ['Unisex', 'Male', 'Female'] as const
export const SET_BONUSES = ['', 'Dragon Scale', 'Dark Aisling', 'Forsaken', 'Sacred'] as const

export const FIELD_TO_CSV_HEADER: Record<string, string> = {
  item_name: 'Name',
  location: 'LOC',
  level: 'LVL',
  weight: 'WGT',
  hp: 'HP',
  mp: 'MP',
  ac: 'AC',
  mr: 'MR',
  str: 'STR',
  int: 'INT',
  wis: 'WIS',
  con: 'CON',
  dex: 'DEX',
  dmg: 'DMG',
  hit: 'HIT',
  attack_speed: 'AS%',
  skill_dmg_flat: 'SKD',
  skill_dmg_pct: 'SKD%',
  spell_dmg_flat: 'SPD',
  spell_dmg_pct: 'SPD%',
  heal_flat: 'FHB',
  heal_pct: 'HB%',
  cdr_pct: 'CDR%',
  class: 'Class',
  gender: 'Gender',
  craft_rank: 'Level',
  recipe: 'Materials',
  type: 'Type',
  value: 'Value',
  set_bonus: 'Set',
}

export const CSV_HEADER_TO_FIELD: Record<string, string> = Object.fromEntries(
  Object.entries(FIELD_TO_CSV_HEADER).map(([k, v]) => [v, k])
)
