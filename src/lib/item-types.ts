// The one list of item categories, shared by the build scripts, the Database Editor and the wiki.
// No imports and no "@/" aliases on purpose, so Node scripts (tsx) can load it too.
//
// Tree (what the editor and the wiki show):
//   Equipment > Weapon / Armor / Jewelry
//   Items     > Consumables / Cosmetics / Misc

export type Section = 'Equipment' | 'Items'
export type FileKind = 'equipment' | 'items'

export interface ItemTypeInfo {
  /** Value stored in the CSV "Type" column and shown in the editor. */
  label: string
  section: Section
  group: string
  /** equipment.csv holds things with stats; items.csv holds everything else. */
  file: FileKind
  /** Category name the Equipment page and overlay already use (equipment.json "category"). */
  legacy?: string
}

const eq = (label: string, group: string, legacy: string, section: Section = 'Equipment'): ItemTypeInfo =>
  ({ label, section, group, file: 'equipment', legacy })
const it = (label: string, group: string): ItemTypeInfo =>
  ({ label, section: 'Items', group, file: 'items' })

export const ITEM_TYPES: ItemTypeInfo[] = [
  // Equipment > Weapon. "Weapon" is the generic type the old per-class files used;
  // set a specific one (1H Weapon, Bows...) in the editor over time.
  eq('Weapon', 'Weapon', 'weapon'),
  eq('1H Weapon', 'Weapon', 'weapon'),
  eq('2H Weapon', 'Weapon', 'weapon'),
  eq('Bows', 'Weapon', 'weapon'),
  eq('Dagger', 'Weapon', 'weapon'),
  eq('Claw', 'Weapon', 'weapon'),
  eq('Grimoire', 'Weapon', 'weapon'),
  eq('Harp', 'Weapon', 'weapon'),
  eq('Staff', 'Weapon', 'weapon'),
  eq('Secret', 'Weapon', 'weapon'),
  eq('Shield', 'Weapon', 'shield'),
  eq('Sphere', 'Weapon', 'weapon'),
  // Equipment > Armor
  eq('Armor', 'Armor', 'armor'),
  eq('Helm', 'Armor', 'helmet'),
  eq('Boots', 'Armor', 'boot'),
  eq('Belt', 'Armor', 'belt'),
  eq('Gauntlet', 'Armor', 'gauntlet'),
  eq('Greaves', 'Armor', 'greave'),
  // Equipment > Jewelry
  eq('Ring', 'Jewelry', 'ring'),
  eq('Necklace', 'Jewelry', 'necklace'),
  eq('Earrings', 'Jewelry', 'earring'),
  // Items > Cosmetics (they carry stats, so they live in equipment.csv)
  eq('Overarmor', 'Cosmetics', 'overarmor', 'Items'),
  eq('Overhelmet', 'Cosmetics', 'overhelmet', 'Items'),
  eq('Weaponskins', 'Cosmetics', 'weaponskin', 'Items'),
  eq('Accessories', 'Cosmetics', 'accessorie', 'Items'),
  // Items > Consumables
  it('Food', 'Consumables'),
  it('Drink', 'Consumables'),
  it('Potion', 'Consumables'),
  it('Recipes', 'Consumables'),
  it('Misc', 'Consumables'),
  // Items > Misc
  it('Quest Items', 'Misc'),
  it('Monster Drops', 'Misc'),
  it('Plants/Flowers', 'Misc'),
]

export const TYPE_BY_LABEL = new Map(ITEM_TYPES.map((t) => [t.label.toLowerCase(), t]))
// First type wins, so "weapon" maps back to the generic "Weapon" type.
export const TYPE_BY_LEGACY = new Map<string, ItemTypeInfo>()
for (const t of ITEM_TYPES) {
  if (t.legacy && !TYPE_BY_LEGACY.has(t.legacy)) TYPE_BY_LEGACY.set(t.legacy, t)
}

/** The type label to use for a category name from the old per-class files. */
export function typeForLegacyCategory(category: string): string {
  // Several leaves share "weapon"; the plain "Weapon" type is the one that maps back.
  return TYPE_BY_LEGACY.get(category)?.label ?? category
}

/** The tree for menus: section > group > type labels. */
export function typeTree(): { section: Section; groups: { group: string; types: string[] }[] }[] {
  const out: { section: Section; groups: { group: string; types: string[] }[] }[] = []
  for (const t of ITEM_TYPES) {
    if (t.label === 'Weapon') continue // the generic placeholder is not offered for new items
    let s = out.find((x) => x.section === t.section)
    if (!s) out.push((s = { section: t.section, groups: [] }))
    let g = s.groups.find((x) => x.group === t.group)
    if (!g) s.groups.push((g = { group: t.group, types: [] }))
    g.types.push(t.label)
  }
  return out
}

// ── Classes ──

/** Every class, in the order the old build looked at them. */
export const CLASS_SLUGS = [
  'monk', 'peasant', 'priest', 'rogue', 'warrior', 'wizard',
  'adept', 'druid', 'plague-doctor', 'bard', 'assassin',
  'archer', 'berserker', 'warlord', 'arcanist', 'elementalist',
] as const

/** The CSV writes the Peasant class as "any" (items anyone can use). */
export const ANY_CLASS = 'any'
export const GENDERS = ['male', 'female', 'unisex'] as const

export function classToToken(slug: string): string {
  return slug === 'peasant' ? ANY_CLASS : slug
}
export function tokenToClass(token: string): string {
  const t = token.trim().toLowerCase().replace(/\s+/g, '-')
  return t === ANY_CLASS ? 'peasant' : t
}

// ── IDs ──

/** "Nyx's Twilight Band" -> "nyxs-twilight-band" */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item'
}

/** A free ID for a new item: the slug of its name, then slug-2, slug-3... */
export function newItemId(name: string, taken: ReadonlySet<string>): string {
  const base = slugify(name)
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) {
    const id = `${base}-${n}`
    if (!taken.has(id)) return id
  }
}

// ── CSV layouts ──

export const STAT_HEADERS = [
  'HP', 'MP', 'AC', 'MR', 'STR', 'INT', 'WIS', 'CON', 'DEX', 'DMG', 'HIT',
  'AS%', 'SKD', 'SKD%', 'SPD', 'SPD%', 'FHB', 'HB%', 'CDR%',
] as const

export const EQUIPMENT_HEADERS = [
  'ID', 'Name', 'Type', 'Class', 'Gender', 'LOC', 'LOC_LINK', 'LVL', 'WGT',
  ...STAT_HEADERS, 'Value', 'Set',
] as const

export const ITEM_HEADERS = [
  'ID', 'Name', 'Type', 'LOC', 'LOC_LINK', 'Description', 'Uses', 'Buy', 'Sell',
] as const

/** Separator inside list cells such as Class, Gender and Uses. */
export const LIST_SEP = '|'

export const EQUIPMENT_CSV = 'data-source/items/equipment.csv'
export const ITEMS_CSV = 'data-source/items/items.csv'
