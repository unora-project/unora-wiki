// Run: npx tsx --tsconfig tsconfig.app.json scripts/test-hunting-images.ts
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { build, createServer, type ViteDevServer } from 'vite'
import sharp from 'sharp'
import yaml from 'js-yaml'
import { resolveHuntingImage } from '../src/lib/hunting-image.ts'

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..')
type Field = { name: string; widget?: string; fields?: Field[] }
const config = yaml.load(readFileSync(join(project, 'public/admin/config.yml'), 'utf8')) as {
  media_folder: string
  public_folder: string
  collections: { name: string; files: { file: string; fields: Field[] }[] }[]
}
const collection = config.collections.find(c => c.name === 'hunting-index')!
const huntingFile = collection.files[0]

test('thumbnail picker uses the existing global asset storage and public URLs', () => {
  const field = huntingFile.fields.find(f => f.name === 'huntingAreas')!.fields!.find(f => f.name === 'image')!
  assert.equal(field.widget, 'image', 'thumbnail selection must use the CMS image picker')
  assert.equal(config.media_folder, 'public/images')
  assert.equal(config.public_folder, '/images')
})

test('existing thumbnails have public URLs that the image picker can preview', () => {
  const index = yaml.load(readFileSync(join(project, huntingFile.file), 'utf8')) as {
    huntingAreas: { name: string; image?: string }[]
  }
  for (const area of index.huntingAreas) {
    if (!area.image) continue
    assert.ok(area.image.startsWith('/images/'), `${area.name} needs a public URL for CMS preview`)
    assert.ok(existsSync(join(project, 'public', ...area.image.split('/'))), area.image)
  }
})

test('URL resolution supports base paths, empty values, and existing URLs', () => {
  assert.equal(resolveHuntingImage(undefined), undefined)
  assert.equal(resolveHuntingImage('  '), undefined)
  assert.equal(resolveHuntingImage('/images/map.png', '/wiki/'), '/wiki/images/map.png')
  assert.equal(resolveHuntingImage('/wiki/images/map.png', '/wiki/'), '/wiki/images/map.png')
  assert.equal(resolveHuntingImage('map.png', '/wiki/'), '/wiki/images/hunting/thumbs/map.webp')
  assert.equal(resolveHuntingImage('//cdn.example.com/map.png'), '//cdn.example.com/map.png')
  assert.equal(resolveHuntingImage('C:\\private\\map.png'), undefined)
})

test('selected PNG survives the content build and renders from the served public directory', async t => {
  const scratch = join(project, 'node_modules', '.tmp')
  mkdirSync(scratch, { recursive: true })
  const root = mkdtempSync(join(scratch, 'hunting-images-'))
  let server: ViteDevServer | undefined = undefined
  t.after(async () => {
    await server?.close()
    assert.ok(realpathSync(root).startsWith(realpathSync(scratch) + sep))
    rmSync(root, { recursive: true })
  })
  cpSync(join(project, 'scripts'), join(root, 'scripts'), { recursive: true })
  cpSync(join(project, 'src/content/metadata'), join(root, 'src/content/metadata'), { recursive: true })

  // Reproduce the CMS storage boundary without writing test assets to the live GitHub repository.
  const filename = 'Uploaded map.PNG'
  const storedPath = join(root, ...config.media_folder.split('/'), filename)
  assert.ok(!existsSync(dirname(storedPath)))
  mkdirSync(dirname(storedPath), { recursive: true })
  const png = await sharp({ create: { width: 16, height: 12, channels: 3, background: '#397a5a' } }).png().toBuffer()
  writeFileSync(storedPath, png)
  const selectedUrl = `${config.public_folder}/${filename}`
  const indexPath = join(root, huntingFile.file)
  const index = yaml.load(readFileSync(indexPath, 'utf8')) as { huntingAreas: { image?: string; name: string }[] }
  const template = index.huntingAreas[0]
  const cases = [
    ['Uploaded PNG', selectedUrl, selectedUrl],
    ['Relative public URL', 'images/Uploaded map.PNG', selectedUrl],
    ['Windows repo path', 'public\\images\\Uploaded map.PNG', selectedUrl],
    ['Linux repo path', 'public/images/Uploaded map.PNG', selectedUrl],
    ['Existing thumbnail', 'mileth_crypt.png', '/images/hunting/thumbs/mileth_crypt.webp'],
    ['Explicit thumbnail', '/images/hunting/thumbs/mileth_crypt.webp', '/images/hunting/thumbs/mileth_crypt.webp'],
    ['External image', 'https://example.com/map.png?version=2', 'https://example.com/map.png?version=2'],
  ]
  index.huntingAreas = cases.map(([name, image]) => ({ ...template, name, image }))
  writeFileSync(indexPath, yaml.dump(index))
  execFileSync(process.execPath, [
    join(project, 'node_modules/tsx/dist/cli.mjs'), '--tsconfig', join(project, 'tsconfig.app.json'), join(root, 'scripts/build-content.ts'),
  ], { cwd: root, stdio: 'pipe' })
  const builtPath = join(root, 'src/data/metadata/hunting-index.json')
  const built = JSON.parse(readFileSync(builtPath, 'utf8'))
  assert.equal(built.huntingAreas[0].image, selectedUrl, 'CMS public URL must survive YAML → JSON')
  assert.deepEqual(readFileSync(storedPath), png, 'build must preserve the uploaded asset')

  const oldThumbnail = join(project, 'public/images/hunting/thumbs/mileth_crypt.webp')
  const copiedThumbnail = join(root, 'public/images/hunting/thumbs/mileth_crypt.webp')
  mkdirSync(dirname(copiedThumbnail), { recursive: true })
  cpSync(oldThumbnail, copiedThumbnail)

  server = await createServer({
    configFile: false,
    root: project,
    publicDir: join(root, 'public'),
    cacheDir: join(root, 'vite-cache'),
    resolve: { alias: [
      { find: '@/data/metadata/hunting-index.json', replacement: builtPath },
      { find: '@', replacement: join(project, 'src') },
    ] },
    server: { host: '127.0.0.1', port: 0, watch: null },
    logLevel: 'error',
  })
  await server.listen()
  const { HuntingGrounds } = await server.ssrLoadModule('/src/pages/HuntingGrounds.tsx')
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(HuntingGrounds)))
  const tags = [...html.matchAll(/<img\b[^>]*>/g)].map(match => match[0])
  assert.equal(tags.length, cases.length)
  for (const [name, , expected] of cases) {
    const tag = tags.find(tag => tag.includes(`alt="${name}"`))!
    assert.ok(tag, `rendered image for ${name}`)
    assert.ok(tag.includes(`src="${expected}"`), `${name} must use ${expected}; got ${tag}`)
  }
  assert.ok(!html.includes('<source'), 'uploaded PNG must not select nonexistent AVIF/WebP siblings')
  const address = server.httpServer!.address() as { port: number }
  const response = await fetch(`http://127.0.0.1:${address.port}${encodeURI(selectedUrl)}`)
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type')!, /image\/png/i)
  const served = Buffer.from(await response.arrayBuffer())
  assert.deepEqual(served, png)
  assert.equal((await sharp(served).metadata()).width, 16)
  assert.deepEqual(readFileSync(copiedThumbnail), readFileSync(oldThumbnail))

  // Production also copies the selected public asset without requiring image optimization.
  writeFileSync(join(root, 'index.html'), html)
  await build({ configFile: false, root, logLevel: 'silent' })
  assert.deepEqual(readFileSync(join(root, 'dist', 'images', filename)), png)
})
