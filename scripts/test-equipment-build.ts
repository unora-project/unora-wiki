// Run: npx tsx scripts/test-equipment-build.ts
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..')

test('deployment build publishes equipment edits to the site and editor seed', (t) => {
  const scratch = join(project, 'node_modules', '.tmp')
  mkdirSync(scratch, { recursive: true })
  const root = mkdtempSync(join(scratch, 'equipment-build-'))
  t.after(() => {
    assert.ok(realpathSync(root).startsWith(realpathSync(scratch) + sep))
    rmSync(root, { recursive: true })
  })
  cpSync(join(project, 'scripts'), join(root, 'scripts'), { recursive: true })
  const template = JSON.parse(readFileSync(join(project, 'src/data/equipment/all.json'), 'utf8'))[0]
  const seed = [
    { ...template, name: 'Old Peasant Weapon', category: 'weapon', class: 'peasant', gender: null },
    { ...template, name: 'Missing CSV Costume', category: 'overarmor', class: null, gender: 'unisex' },
    { ...template, name: 'Blank CSV Ring', category: 'ring', class: null, gender: null },
  ]
  const write = (path: string, data: string) => {
    const full = join(root, path)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, data)
  }
  write('src/data/equipment/all.json', JSON.stringify(seed))
  write('public/data/equipment.json', JSON.stringify(seed))
  const weaponPath = 'data-source/equipment/csv/weapons/peasant/weapons.csv'
  write(weaponPath, 'Name,LOC,LVL,WGT,STR,AS%\nTester Weapon,"Town, Shop",1,1,4,0\n')
  write('data-source/equipment/csv/rings.csv', '\n\n')
  const build = () => execFileSync(process.execPath, [
    join(project, 'node_modules/tsx/dist/cli.mjs'), join(root, 'scripts/build-content.ts'),
  ], { cwd: root, stdio: 'pipe' })
  const read = (path: string) => JSON.parse(readFileSync(join(root, path), 'utf8'))
  build()
  const published = read('public/data/equipment.json')
  assert.deepEqual(published, read('src/data/equipment/all.json'))
  const weapon = published.find((row: { name: string }) => row.name === 'Tester Weapon')
  assert.ok(weapon, 'submitted weapon must reach the JSON fetched by the live equipment page')
  assert.equal(weapon.category, 'weapon')
  assert.equal(weapon.class, 'peasant')
  assert.equal(weapon.location, 'Town, Shop')
  assert.equal(weapon.stats.str, 4)
  assert.equal(weapon.percentages.attackSpeed, 0)
  assert.equal(weapon.stats.hp, null)
  assert.ok(published.some((row: { name: string }) => row.name === 'Missing CSV Costume'))
  assert.ok(published.some((row: { name: string }) => row.name === 'Blank CSV Ring'))
  assert.ok(!published.some((row: { name: string }) => row.name === 'Old Peasant Weapon'))

  write(weaponPath, 'Name,LVL,STR\nTester Weapon,2,8\n')
  build()
  const updated = read('public/data/equipment.json')
  assert.equal(updated.filter((row: { name: string }) => row.name === 'Tester Weapon').length, 1)
  assert.equal(updated.find((row: { name: string }) => row.name === 'Tester Weapon').stats.str, 8)
  assert.deepEqual(updated, read('src/data/equipment/all.json'))
})
