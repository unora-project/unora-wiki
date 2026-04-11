import sharp from 'sharp'
import { readdirSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const SRC = join(import.meta.dirname, '..', 'public', 'images', 'towns')
const DEST = join(SRC, 'thumbs')
const WIDTH = 480

if (!existsSync(DEST)) mkdirSync(DEST, { recursive: true })

const files = readdirSync(SRC).filter((f) => f.endsWith('.png') && !f.startsWith('.'))

console.log(`Generating ${files.length} town thumbnails (${WIDTH}px wide)...`)

for (const file of files) {
  await sharp(join(SRC, file))
    .resize(WIDTH)
    .webp({ quality: 75 })
    .toFile(join(DEST, file.replace('.png', '.webp')))
  console.log(`  ✓ ${file} → thumbs/${file.replace('.png', '.webp')}`)
}

console.log('Done.')
