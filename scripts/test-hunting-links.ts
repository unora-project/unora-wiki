// Run: node node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.app.json scripts/test-hunting-links.ts
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import yaml from 'js-yaml'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Routes, Route } from 'react-router'
import { createServer } from 'vite'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')
type Field = { name: string; required?: boolean; widget?: string; fields?: Field[] }
type AreaFixture = { leaders: { areaSlug?: string | null }[] }
test('CMS area links are optional and map files use the global image picker', () => {
  const config = yaml.load(read('public/admin/config.yml')) as { collections: { name: string; fields: Field[] }[] }
  const fields = config.collections.find(c => c.name === 'hunting-areas')!.fields
  assert.equal(fields.find(f => f.name === 'leaders')!.fields!.find(f => f.name === 'areaSlug')!.required, false)
  assert.equal(fields.find(f => f.name === 'mapImage')?.widget, 'image')
})

test('Mythic links open the selected map while absent slugs remain readable', async () => {
  const scratch = join(root, 'node_modules/.tmp')
  mkdirSync(scratch, { recursive: true })
  const temp = mkdtempSync(join(scratch, 'hunting-links-'))
  const areaDir = 'src/content/metadata/hunting/areas'
  const areas = Object.fromEntries(readdirSync(join(root, areaDir)).filter(f => f.endsWith('.yaml')).map(f => [f.slice(0, -5), yaml.load(read(`${areaDir}/${f}`))])) as Record<string, AreaFixture>
  const leaders = areas.mythic.leaders
  delete leaders[1].areaSlug
  leaders[2].areaSlug = null
  leaders[3].areaSlug = '   '
  const data = join(temp, 'areas.json')
  writeFileSync(data, JSON.stringify(areas))
  const server = await createServer({ configFile: false, root, cacheDir: join(temp, 'cache'),
    resolve: { alias: [{ find: '@/data/metadata/hunting-areas.json', replacement: data }, { find: '@', replacement: join(root, 'src') }] },
    server: { host: '127.0.0.1', port: 0, watch: null }, logLevel: 'error' })
  try {
    await server.listen()
    // DataTable chooses its initial layout from the browser viewport.
    Object.defineProperty(globalThis, 'window', { value: { innerWidth: 1280 }, configurable: true })
    const { HuntingArea } = await server.ssrLoadModule('/src/pages/HuntingArea.tsx')
    const paths = [...read('src/App.tsx').matchAll(/path="(hunting\/[^"]+)" element=\{<HuntingArea/g)].map(m => m[1])
    const render = (url: string) => renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [url] },
      createElement(Routes, null, ...paths.map(path => createElement(Route, { key: path, path, element: createElement(HuntingArea) })))) )
    const parent = render('/hunting/mythic')
    assert.match(parent, /href="\/hunting\/mythic\/floppy_farms"[^>]*>Floppy Farms<\/a>/)
    for (const name of ['Garden', 'Woodlands', 'Wolf']) {
      assert.ok(parent.includes(name))
      assert.ok(!new RegExp(`<a[^>]*>${name}</a>`).test(parent))
    }
    const child = render('/hunting/mythic/floppy_farms')
    assert.match(child, /src="\/images\/hunting\/FloppyFarms.png"/)
    assert.match(child, /href="\/hunting\/mythic"/)
    assert.ok(!child.includes('<source'), 'uploaded maps must not request ungenerated image formats')
    assert.ok(!child.includes('Fabrizio'), 'nested route must render the child, not its parent')
    assert.match(render('/hunting/mythic/missing'), /Area not found/)
    assert.match(render('/hunting/floppy_farms'), /FloppyFarms.png/)
    const address = server.httpServer!.address() as { port: number }
    const response = await fetch(`http://127.0.0.1:${address.port}/images/hunting/FloppyFarms.png`)
    assert.equal(response.status, 200)
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), readFileSync(join(root, 'public/images/hunting/FloppyFarms.png')))
  } finally {
    Reflect.deleteProperty(globalThis, 'window')
    await server.close()
    assert.equal(resolve(temp, '..'), resolve(scratch))
    rmSync(temp, { recursive: true })
  }
})
