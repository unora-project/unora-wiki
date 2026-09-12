// Run: npx tsx --tsconfig tsconfig.app.json scripts/test-editor-deletions.ts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { computeDiffs } from '../src/lib/editor-commit.ts'
import { clearFileCache } from '../src/lib/github-client.ts'
import { parseCSV } from '../src/lib/csv-parse.ts'
import * as seed from '../src/lib/editor-seed.ts'
import type { EditorDb, EditorItem, TrashEntry } from '../src/types/editor.ts'

const ring: EditorItem = { item_name: 'Deleted Ring', type: 'Rings', level: 1, weight: 1, value: '' }
function deletion(tab: TrashEntry['tab'] = 'items', payload: unknown = ring): TrashEntry {
  return { id: 'delete-1', tab, payload, name: 'Deleted Ring', index: 0, deletedAt: 1 }
}
function draft(): EditorDb {
  return {
    items: [], jewelcrafting: [], armorsmithing: [], weaponsmithing: [],
    'alchemy-recipes': [], 'alchemy-extracts': [], 'cooking-recipes': [],
    'cooking-ingredients': [], enchanting: [], fishing: [],
    initializedTabs: ['items'], pendingDeletions: [deletion()],
  }
}

for (const last of [false, true]) {
  test(`preview removes explicit deletion${last ? ' even when it empties the file' : ' and retains newer remote rows'}`, async (t) => {
    clearFileCache()
    const before = 'Name,LVL,WGT\nDeleted Ring,1,1\n' + (last ? '' : 'Remote Ring,2,1\n')
    t.mock.method(globalThis, 'fetch', async (url: string) => Response.json({
      content: btoa(url.includes('/rings.csv') ? before : ''), encoding: 'base64', sha: 'fixture',
    }))
    const diffs = await computeDiffs('token', draft())
    const diff = diffs.find((d) => d.path.endsWith('/rings.csv'))
    assert.ok(diff, 'deletion must produce a publishable diff')
    assert.deepEqual(parseCSV(diff.after).rows.map((r) => r.Name), last ? [] : ['Remote Ring'])
    assert.equal(diff.after.split('\n')[0], 'Name,LVL,WGT')
  })
}

test('restoring or re-adding the same item cancels its pending deletion', async (t) => {
  clearFileCache()
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 404 }))
  const db = draft()
  db.items = [ring]
  const diffs = await computeDiffs('token', db)
  const diff = diffs.find((d) => d.path.endsWith('/rings.csv'))!
  assert.equal(parseCSV(diff.after).rows[0].Name, ring.item_name)
})

test('deletion uses item path as well as name', async (t) => {
  clearFileCache()
  t.mock.method(globalThis, 'fetch', async (url: string) => Response.json({
    content: btoa(url.includes('/weapons/') ? 'Name,LVL\nTwin,1\n' : ''), encoding: 'base64', sha: 'fixture',
  }))
  const db = draft()
  db.items = [{ ...ring, item_name: 'Twin', type: 'Weapons', class: 'Wizard' }]
  db.pendingDeletions = [deletion('items', { ...db.items[0], class: 'Peasant' })]
  const diffs = await computeDiffs('token', db)
  const removed = diffs.find((d) => d.path.includes('/peasant/'))
  assert.ok(removed)
  assert.deepEqual(parseCSV(removed.after).rows, [])
  assert.ok(!diffs.some((d) => d.path.includes('/wizard/')))
})

for (const tab of ['jewelcrafting', 'cooking-recipes'] as const) {
  test(`last ${tab} deletion remains publishable`, async (t) => {
    clearFileCache()
    const nameHeader = tab === 'jewelcrafting' ? 'Name' : 'Recipe'
    t.mock.method(globalThis, 'fetch', async (url: string) => Response.json({
      content: btoa(url.includes(tab === 'jewelcrafting' ? '/jewelcrafting/' : '/cooking/recipes.csv')
        ? `${nameHeader}\nDeleted Ring\n` : ''), encoding: 'base64', sha: 'fixture',
    }))
    const db = draft()
    db.pendingDeletions = [deletion(tab, tab === 'jewelcrafting' ? ring : { Recipe: 'Deleted Ring' })]
    const diffs = await computeDiffs('token', db)
    const diff = diffs.find((d) => d.path.includes(tab === 'jewelcrafting' ? '/jewelcrafting/' : '/cooking/recipes.csv'))
    assert.ok(diff)
    assert.deepEqual(parseCSV(diff.after).rows, [])
  })
}

test('pending deletions survive reload and emptying Trash; old Trash migrates once', (t) => {
  const values = new Map<string, string>()
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } as Storage })
  seed.saveToLocal(draft())
  seed.saveTrash([])
  assert.deepEqual(seed.loadFromLocal()?.pendingDeletions, [deletion()])
  assert.deepEqual(seed.loadFromLocal()?.initializedTabs, ['items'])

  const legacy = draft()
  delete legacy.pendingDeletions
  seed.saveToLocal(legacy)
  seed.saveTrash([deletion()])
  assert.deepEqual(seed.loadFromLocal()?.pendingDeletions, [deletion()])
  seed.saveToLocal({ ...legacy, pendingDeletions: [] })
  assert.deepEqual(seed.loadFromLocal()?.pendingDeletions, [])
})

test('an intentionally emptied tab is not re-seeded after publishing', () => {
  const db = { ...draft(), pendingDeletions: [] }
  assert.equal(seed.shouldSeedTab?.(db, 'items'), false)
})

test('uninitialized empty tabs do not publish header-only files that erase their seed', async (t) => {
  clearFileCache()
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 404 }))
  const diffs = await computeDiffs('token', { ...draft(), pendingDeletions: [] })
  assert.deepEqual(diffs, [])
})

test('deleting a published unisex costume can clear its missing source CSV', async (t) => {
  clearFileCache()
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 404 }))
  const db = draft()
  db.pendingDeletions = [deletion('items', { ...ring, type: 'Overarmor', gender: 'Unisex' })]
  const diffs = await computeDiffs('token', db)
  const diff = diffs.find((d) => d.path.endsWith('/overarmor/unisex/overarmor.csv'))
  assert.ok(diff)
  assert.deepEqual(parseCSV(diff.after).rows, [])
  assert.ok(parseCSV(diff.after).headers.includes('Name'))
})
