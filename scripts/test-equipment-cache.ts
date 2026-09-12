// Run after npm run build: npx tsx scripts/test-equipment-cache.ts
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const assets = join(root, 'dist/assets')

function importedCode(file: string, seen = new Set<string>()): string {
  if (seen.has(file)) return ''
  seen.add(file)
  const code = readFileSync(join(assets, file), 'utf8')
  return code + [...code.matchAll(/["']\.\/([^"']+\.js)["']/g)]
    .map((match) => importedCode(match[1], seen)).join('\n')
}

// The search index is in the main bundle; the search-* chunk contains Fuse itself.
for (const [entry, label] of [['Equipment-', 'Equipment page'], ['index-', 'Site search']]) {
  test(`${label} loads the equipment dataset through a content-hashed URL`, () => {
    const file = readdirSync(assets).find((name) => name.startsWith(entry) && name.endsWith('.js'))
    assert.ok(file)
    const code = importedCode(file)
    const urls = [...code.matchAll(/\/assets\/all-[A-Za-z0-9_-]+\.json/g)].map((match) => match[0])
    assert.ok(urls.length, 'deployed reader must reference a versioned equipment asset, not a stale fixed URL')
    const data = JSON.parse(readFileSync(join(root, 'dist', urls[0]), 'utf8'))
    const seed = JSON.parse(readFileSync(join(root, 'src/data/equipment/all.json'), 'utf8'))
    assert.deepEqual(data, seed, 'site and search must use the dataset generated for this deployment')
    assert.ok(!/["'`]\/data\/equipment\.json["'`]/.test(code))
  })
}
