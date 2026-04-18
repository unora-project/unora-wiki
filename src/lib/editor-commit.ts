import type { EditorDb, EditorItem, EditorRecipe, EditorTab, GenericRow, GenericTab } from '@/types/editor'
import { FIELD_TO_CSV_HEADER, GENERIC_TAB_SCHEMAS } from '@/types/editor'
import { parseCSV } from '@/lib/csv-parse'
import { serializeCSV } from '@/lib/csv-serialize'
import { groupItemsByPath, groupRecipesByPath, resolveItemPath, resolveRecipePath } from '@/lib/csv-paths'
import { getFile, commitMultiFile, clearFileCache, EDITOR_REPO } from '@/lib/github-client'
import { seedItemsFromPublished } from '@/lib/editor-seed'

const GENERIC_TABS: GenericTab[] = [
  'alchemy-recipes', 'alchemy-extracts', 'cooking-recipes', 'cooking-ingredients', 'enchanting', 'fishing',
]

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
  headers: string[]
): Record<string, string> {
  const row: Record<string, string> = {}
  for (const h of headers) {
    // Preserve unknown columns as-is (via existing value) — caller merges.
    const fieldKey = Object.entries(FIELD_TO_CSV_HEADER).find(([, v]) => v === h)?.[0]
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
  rows: (EditorItem | EditorRecipe)[]
): Promise<FileDiff & { sha: string | null }> {
  const existing = await getFile(token, EDITOR_REPO.owner, EDITOR_REPO.repo, path, EDITOR_REPO.branch)
  const before = existing?.content ?? ''
  const parsed = parseCSV(before)
  const headers = parsed.headers

  const nameHeader = headers.includes('Name') ? 'Name' : headers[0]
  const byName = new Map<string, number>()
  parsed.rows.forEach((r, idx) => {
    const n = (r[nameHeader] ?? '').trim()
    if (n) byName.set(n.toLowerCase(), idx)
  })

  const outRows = parsed.rows.map((r) => ({ ...r }))
  for (const entry of rows) {
    const name = entry.item_name?.trim()
    if (!name) continue
    const editorRow = rowFromEditor(entry, headers)
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
  rows: GenericRow[]
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
  const outRows: Record<string, string>[] = parsed.rows.map((r, idx) => {
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
  const items = db.items.length === 0 ? await seedItemsFromPublished() : db.items

  const tasks: Promise<FileDiff & { sha: string | null }>[] = []

  for (const [path, itemsAtPath] of groupItemsByPath(items)) {
    tasks.push(buildFileDiff(token, path, itemsAtPath))
  }

  for (const tab of ['jewelcrafting', 'armorsmithing', 'weaponsmithing'] as EditorTab[]) {
    const arr = db[tab] as EditorRecipe[]
    for (const [path, recs] of groupRecipesByPath(tab, arr)) {
      tasks.push(buildFileDiff(token, path, recs))
    }
  }

  for (const tab of GENERIC_TABS) {
    tasks.push(buildGenericDiff(token, tab, db[tab]))
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
