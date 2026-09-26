import type { EditorDb, EditorItem, EditorRecipe, EditorTab, GenericRow, GenericTab, RecipeTab } from '@/types/editor'
import { FIELD_TO_CSV_HEADER, GENERIC_TAB_SCHEMAS } from '@/types/editor'
import { parseCSV } from '@/lib/csv-parse'
import { serializeCSV } from '@/lib/csv-serialize'
import { groupItemsByPath, groupRecipesByPath, resolveItemPath, resolveRecipePath } from '@/lib/csv-paths'
import { getFile, commitMultiFile, clearFileCache, EDITOR_REPO } from '@/lib/github-client'
import { seedItemsFromPublished, shouldSeedTab } from '@/lib/editor-seed'

const GENERIC_TABS: GenericTab[] = [
  'alchemy-recipes', 'alchemy-extracts', 'cooking-recipes', 'cooking-ingredients', 'enchanting', 'fishing',
]

type ItemTab = 'items' | RecipeTab

// New files (and files written blank by the old editor) have no schema to infer.
const DEFAULT_HEADERS: Record<ItemTab, string[]> = {
  items: [
    'Name', 'LOC', 'LOC_LINK', 'LVL', 'WGT', 'HP', 'MP', 'AC', 'MR', 'STR', 'INT', 'WIS',
    'CON', 'DEX', 'DMG', 'HIT', 'AS%', 'SKD', 'SKD%', 'SPD', 'SPD%', 'FHB',
    'HB%', 'CDR%', 'Value', 'Set',
  ],
  jewelcrafting: ['Name', 'Level', 'Materials'],
  armorsmithing: ['Name', 'Class', 'Gender', 'Level', 'Materials'],
  weaponsmithing: ['Name', 'Level', 'Type', 'Materials', 'Materials to upgrade'],
}

export interface FileDiff {
  path: string
  before: string
  after: string
  changed: boolean
}

function stringifyValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '-'
  if (typeof v === 'number' && !Number.isFinite(v)) return '-'
  return String(v)
}

function materialsToString(recipe: EditorRecipe['recipe']): string {
  return recipe.map((i) => `${i.qty} ${i.name}`).join(', ')
}

function rowFromEditor(
  entry: EditorItem | EditorRecipe,
  headers: string[],
  tab: ItemTab,
): Record<string, string> {
  const row: Record<string, string> = {}
  for (const h of headers) {
    // Preserve unknown columns as-is (via existing value) — caller merges.
    const fieldKey = tab !== 'items' && h === 'Level' ? 'level'
      : tab === 'weaponsmithing' && h === 'Type' && entry.weapon_type != null ? 'weapon_type'
      : tab === 'weaponsmithing' && h === 'Materials to upgrade' ? 'upgrade_materials'
      : Object.entries(FIELD_TO_CSV_HEADER).find(([, v]) => v === h)?.[0]
    if (!fieldKey) { row[h] = '' ; continue }

    if (fieldKey === 'recipe') {
      const rec = (entry as EditorRecipe).recipe
      row[h] = rec ? materialsToString(rec) : '-'
      continue
    }
    row[h] = stringifyValue((entry as any)[fieldKey])
  }
  return row
}

async function buildFileDiff(
  token: string,
  path: string,
  rows: (EditorItem | EditorRecipe)[],
  tab: ItemTab,
  deletedNames: ReadonlySet<string> = new Set(),
): Promise<FileDiff & { sha: string | null }> {
  const existing = await getFile(token, EDITOR_REPO.owner, EDITOR_REPO.repo, path, EDITOR_REPO.branch)
  const before = existing?.content ?? ''
  const parsed = parseCSV(before)
  const headers = parsed.headers.length ? parsed.headers : DEFAULT_HEADERS[tab]

  // Existing files predate the LOC_LINK field — add the column the first
  // time an item being saved actually sets one, rather than requiring
  // every equipment CSV to be manually migrated up front.
  if (
    tab === 'items' &&
    !headers.includes('LOC_LINK') &&
    rows.some((r) => (r as EditorItem).locationLink)
  ) {
    headers.push('LOC_LINK')
  }

  const nameHeader = headers.includes('Name') ? 'Name' : headers[0]
  const byName = new Map<string, number>()
  const outRows = parsed.rows
    .filter((r) => !deletedNames.has((r[nameHeader] ?? '').trim().toLowerCase()))
    .map((r) => ({ ...r }))
  outRows.forEach((r, idx) => {
    const n = (r[nameHeader] ?? '').trim()
    if (n) byName.set(n.toLowerCase(), idx)
  })

  for (const entry of rows) {
    const name = entry.item_name?.trim()
    if (!name) continue
    const editorRow = rowFromEditor(entry, headers, tab)
    const key = name.toLowerCase()
    const idx = byName.get(key)
    if (idx === undefined) {
      outRows.push(editorRow)
      byName.set(key, outRows.length - 1)
    } else {
      // Merge: editor overwrites known headers, unknown stay from existing row.
      outRows[idx] = { ...outRows[idx], ...editorRow }
    }
  }

  // Truncate quotedMask to header row only — let mustQuote decide per cell going forward.
  const headerMask = parsed.quotedMask[0]
  const after = serializeCSV(headers, outRows, {
    trailingNewline: parsed.trailingNewline || true,
    quotedMask: headerMask ? [headerMask] : undefined,
  })

  return {
    path,
    before,
    after,
    changed: before !== after,
    sha: existing?.sha ?? null,
  }
}

async function buildGenericDiff(
  token: string,
  tab: GenericTab,
  rows: GenericRow[],
  deletedNames: ReadonlySet<string> = new Set(),
): Promise<FileDiff & { sha: string | null }> {
  const schema = GENERIC_TAB_SCHEMAS[tab]
  const path = schema.csvPath
  const existing = await getFile(token, EDITOR_REPO.owner, EDITOR_REPO.repo, path, EDITOR_REPO.branch)
  const before = existing?.content ?? ''
  const parsed = parseCSV(before)
  const headers = parsed.headers.length ? parsed.headers : [...schema.headers]

  // Merge editor rows into existing CSV by nameKey rather than replacing.
  // The bundled seed can lag GitHub (e.g. Load Published only reads the shipped
  // JSON), so a wholesale replace would silently delete rows that exist on
  // GitHub but not in the seed.
  const nameKey = headers.includes(schema.nameKey) ? schema.nameKey : headers[0]
  const byName = new Map<string, number>()
  const outRows: Record<string, string>[] = parsed.rows
    .filter((r) => !deletedNames.has((r[nameKey] ?? '').trim().toLowerCase()))
    .map((r, idx) => {
      const n = (r[nameKey] ?? '').trim()
      if (n) byName.set(n.toLowerCase(), idx)
      return { ...r }
    })

  for (const r of rows) {
    const name = (r[nameKey] ?? '').trim()
    if (!name) continue
    const editorRow: Record<string, string> = {}
    for (const h of headers) editorRow[h] = r[h] ?? ''
    const key = name.toLowerCase()
    const idx = byName.get(key)
    if (idx === undefined) {
      outRows.push(editorRow)
      byName.set(key, outRows.length - 1)
    } else {
      outRows[idx] = { ...outRows[idx], ...editorRow }
    }
  }

  const headerMask = parsed.quotedMask[0]
  const after = serializeCSV(headers, outRows, {
    trailingNewline: parsed.trailingNewline || true,
    quotedMask: headerMask ? [headerMask] : undefined,
  })

  return {
    path,
    before,
    after,
    changed: before !== after,
    sha: existing?.sha ?? null,
  }
}

export async function computeDiffs(token: string, db: EditorDb): Promise<FileDiff[]> {
  // Items tab is lazy-seeded. If Preview is clicked before items was ever visited,
  // load the seed now so we don't propose wiping all equipment CSVs.
  const items = shouldSeedTab(db, 'items') ? await seedItemsFromPublished() : db.items

  // Remove only explicit deletions, never rows merely missing from a stale seed.
  // Restored/re-added rows take precedence over an older deletion of the same identity.
  const deletions = new Map<string, Set<string>>()
  for (const entry of db.pendingDeletions ?? []) {
    const generic = GENERIC_TABS.includes(entry.tab as GenericTab)
    const schema = generic ? GENERIC_TAB_SCHEMAS[entry.tab as GenericTab] : null
    const payload = entry.payload as EditorItem & GenericRow
    if (!payload || typeof payload !== 'object') continue
    const pathOf = (row: EditorItem & GenericRow) => schema?.csvPath
      ?? (entry.tab === 'items' ? resolveItemPath(row) : resolveRecipePath(entry.tab, row as EditorRecipe))
    const nameOf = (row: EditorItem & GenericRow) => String(row[schema?.nameKey ?? 'item_name'] ?? '').trim().toLowerCase()
    const path = pathOf(payload)
    const name = nameOf(payload)
    if (!path || !name) continue
    if ((db[entry.tab] as (EditorItem & GenericRow)[]).some((row) => pathOf(row) === path && nameOf(row) === name)) continue
    const names = deletions.get(path) ?? new Set<string>()
    names.add(name)
    deletions.set(path, names)
  }

  const tasks: Promise<FileDiff & { sha: string | null }>[] = []

  const itemGroups = groupItemsByPath(items)
  for (const path of deletions.keys()) {
    if (path.startsWith('data-source/equipment/') && !itemGroups.has(path)) itemGroups.set(path, [])
  }
  for (const [path, itemsAtPath] of itemGroups) {
    tasks.push(buildFileDiff(token, path, itemsAtPath, 'items', deletions.get(path)))
  }

  for (const tab of ['jewelcrafting', 'armorsmithing', 'weaponsmithing'] as RecipeTab[]) {
    const arr = db[tab] as EditorRecipe[]
    const groups = groupRecipesByPath(tab, arr)
    for (const entry of db.pendingDeletions ?? []) {
      if (entry.tab !== tab) continue
      const path = resolveRecipePath(tab, entry.payload as EditorRecipe)
      if (path && deletions.has(path) && !groups.has(path)) groups.set(path, [])
    }
    for (const [path, recs] of groups) {
      tasks.push(buildFileDiff(token, path, recs, tab, deletions.get(path)))
    }
  }

  for (const tab of GENERIC_TABS) {
    const deletedNames = deletions.get(GENERIC_TAB_SCHEMAS[tab].csvPath)
    if (db[tab].length === 0 && !deletedNames?.size) continue
    tasks.push(buildGenericDiff(token, tab, db[tab], deletedNames))
  }

  const diffs = await Promise.all(tasks)
  return diffs.filter((d) => d.changed)
}

export async function commitDiffs(
  token: string,
  diffs: FileDiff[],
  message: string,
  dryRun: boolean
): Promise<{ sha: string; url: string } | null> {
  if (diffs.length === 0) return null
  if (dryRun) {
    console.log('[dryRun] would commit', { message, files: diffs.map((d) => d.path) })
    diffs.forEach((d) => console.log('---', d.path, '---\n', d.after))
    return { sha: 'dryrun', url: '' }
  }
  const result = await commitMultiFile(
    token,
    EDITOR_REPO.owner,
    EDITOR_REPO.repo,
    EDITOR_REPO.branch,
    diffs.map((d) => ({ path: d.path, content: d.after })),
    message
  )
  clearFileCache()
  return result
}

export function countUnresolvedItems(db: EditorDb): number {
  let n = 0
  for (const it of db.items) if (!resolveItemPath(it)) n++
  for (const tab of ['jewelcrafting', 'armorsmithing', 'weaponsmithing'] as EditorTab[]) {
    for (const r of db[tab] as EditorRecipe[]) if (!resolveRecipePath(tab, r)) n++
  }
  return n
}
