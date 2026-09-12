// Run: npx tsx --tsconfig tsconfig.app.json scripts/test-editor-preview.ts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { computeDiffs } from '../src/lib/editor-commit.ts'
import { clearFileCache } from '../src/lib/github-client.ts'
import { parseCSV } from '../src/lib/csv-parse.ts'
import type { EditorDb } from '../src/types/editor.ts'

const item = {
  item_name: 'Preview Test Ring', type: 'Rings', level: 12,
  weight: 2, value: 100, hp: 25,
}

function draft(): EditorDb {
  return {
    items: [item], jewelcrafting: [], armorsmithing: [], weaponsmithing: [],
    'alchemy-recipes': [], 'alchemy-extracts': [], 'cooking-recipes': [],
    'cooking-ingredients': [], enchanting: [], fishing: [],
  }
}

test('blank-only CSV has no headers or rows', () => {
  for (const content of ['', '\n\n', '\r\n\r\n', ' \r\n\t\n']) {
    const parsed = parseCSV(content)
    assert.deepEqual(parsed.headers, [])
    assert.deepEqual(parsed.rows, [])
  }
})

for (const source of ['missing', 'empty', 'blank-lines', 'existing'] as const) {
  test(`preview includes added item when equipment CSV is ${source}`, async (t) => {
    clearFileCache()
    const before = source === 'blank-lines'
      ? '\r\n'.repeat(61)
      : source === 'existing' ? 'Name,LVL,WGT,HP\nOld Ring,1,2,3\n' : ''
    t.mock.method(globalThis, 'fetch', async (input: string) => {
      const isEquipment = input.includes('/equipment/')
      if (isEquipment && source === 'missing') return new Response('', { status: 404 })
      const content = isEquipment ? before : ''
      return Response.json({ content: btoa(content), encoding: 'base64', sha: 'fixture' })
    })
    const diffs = await computeDiffs('test-token', draft())
    const diff = diffs.find((d) => d.path.endsWith('/rings.csv'))
    assert.ok(diff)
    assert.equal(diff.before, before)
    const parsed = parseCSV(diff.after)
    const added = parsed.rows.find((row) => row.Name === item.item_name)
    assert.ok(added, 'new item must appear as a named CSV row, not a blank line')
    assert.equal(added.LVL, '12')
    assert.equal(added.HP, '25')
    if (source === 'existing') assert.equal(parsed.rows[0].Name, 'Old Ring')
  })
}

test('preview recovers recipe and generic rows from blank-only CSVs', async (t) => {
  clearFileCache()
  t.mock.method(globalThis, 'fetch', async () => Response.json({
    content: btoa('\n\n\n'), encoding: 'base64', sha: 'fixture',
  }))
  const db = draft()
  db.jewelcrafting.push({ ...item, craft_rank: 'Beginner', recipe: [{ qty: 2, name: 'Gold' }] })
  db.weaponsmithing.push({
    ...item, craft_rank: 'Beginner', weapon_type: 'Sword',
    recipe: [{ qty: 3, name: 'Iron' }], upgrade_materials: '2 Steel',
  })
  db.weaponsmithing.push({
    ...item, item_name: 'New Weapon Recipe', type: 'Weapons',
    craft_rank: 'Beginner', recipe: [{ qty: 1, name: 'Iron' }],
  })
  db['cooking-recipes'].push({ Recipe: 'Test Soup', Ingredients: '1 Fish', Benefits: 'HP\nMP' })
  const diffs = await computeDiffs('test-token', db)
  const jewel = diffs.find((d) => d.path.includes('/jewelcrafting/'))!
  assert.equal(parseCSV(jewel.after).rows[0]?.Name, item.item_name)
  assert.equal(parseCSV(jewel.after).rows[0]?.Materials, '2 Gold')
  assert.equal(parseCSV(jewel.after).rows[0]?.Level, '12')
  const weapon = diffs.find((d) => d.path.includes('/weaponsmithing/'))!
  assert.equal(parseCSV(weapon.after).rows[0]?.Type, 'Sword')
  assert.equal(parseCSV(weapon.after).rows[0]?.['Materials to upgrade'], '2 Steel')
  assert.equal(parseCSV(weapon.after).rows[1]?.Type, 'Weapons')
  const cooking = diffs.find((d) => d.path.endsWith('/cooking/recipes.csv'))!
  assert.equal(parseCSV(cooking.after).rows[0]?.Recipe, 'Test Soup')
  assert.equal(parseCSV(cooking.after).rows[0]?.Benefits, 'HP\nMP')
})
