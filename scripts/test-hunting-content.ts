// Run: npx tsx scripts/test-hunting-content.ts
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import yaml from 'js-yaml'

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path: string) => readFileSync(join(project, path), 'utf8')
const index = yaml.load(read('src/content/metadata/hunting/index.yaml')) as {
  huntingAreas: { slug: string; levelMin: number; levelMax: number }[]
  preMasterAreas: { slug: string }[]
  masterAreas: { slug: string }[]
}

test('Mythic is reachable from the hunting cards and both level charts', () => {
  const mythic = index.huntingAreas.find(area => area.slug === 'mythic')
  assert.ok(mythic, 'Mythic must have a hunting card')
  assert.equal(mythic.levelMin, 9)
  assert.equal(mythic.levelMax, 110)
  assert.ok(index.preMasterAreas.some(area => area.slug === 'mythic'))
  assert.ok(index.masterAreas.some(area => area.slug === 'mythic'))
})

test('search offers the Mythic hunting page as well as its quest', () => {
  const source = read('src/lib/searchIndex.ts')
  assert.match(source, /title: 'Mythic', category: 'Hunting', path: '\/hunting\/mythic'/)
  assert.match(source, /path: '\/quests\/circle_1\/leaders_of_mythic'/)
})

test('CMS edits reach the JSON actually consumed by the hunting area page', t => {
  const scratch = join(project, 'node_modules', '.tmp')
  mkdirSync(scratch, { recursive: true })
  const root = mkdtempSync(join(scratch, 'hunting-build-'))
  t.after(() => {
    assert.ok(realpathSync(root).startsWith(realpathSync(scratch) + sep))
    rmSync(root, { recursive: true })
  })
  cpSync(join(project, 'scripts'), join(root, 'scripts'), { recursive: true })
  cpSync(join(project, 'src/content/metadata'), join(root, 'src/content/metadata'), { recursive: true })
  cpSync(join(project, 'src/data/hunting'), join(root, 'src/data/hunting'), { recursive: true })
  const sourcePath = 'src/content/metadata/hunting/areas/mythic.yaml'
  const mythic = yaml.load(read(sourcePath)) as {
    description: string
    leaders: { npc: string }[]
    shops: { items: { cost: number }[] }[]
  }
  mythic.description = 'Updated CMS Mythic description'
  mythic.leaders[0].npc = 'Updated CMS leader'
  mythic.shops[0].items[0].cost = 1234
  writeFileSync(join(root, sourcePath), yaml.dump(mythic))
  execFileSync(process.execPath, [
    join(project, 'node_modules/tsx/dist/cli.mjs'), join(root, 'scripts/build-content.ts'),
  ], { cwd: root, stdio: 'pipe' })
  const page = read('src/pages/HuntingArea.tsx')
  const importedPath = page.match(/import areasData from '@\/([^']+)'/)?.[1]
  assert.ok(importedPath, 'locate the area page data source')
  const consumed = JSON.parse(readFileSync(join(root, 'src', importedPath), 'utf8'))
  assert.deepEqual(consumed.mythic, mythic, 'description, leaders and shop edits must reach the page')
  assert.deepEqual(consumed.east_woodlands, yaml.load(read('src/content/metadata/hunting/areas/east_woodlands.yaml')))
})
