/**
 * Walks public/images and emits WebP + AVIF siblings for every PNG/JPG.
 * Idempotent — skips outputs that are newer than their source.
 *
 * Usage: npx tsx scripts/optimize-images.ts
 */

import { readdirSync, statSync, existsSync, renameSync, unlinkSync, writeFileSync } from 'fs'
import { join, dirname, basename, extname } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const IMAGES_ROOT = join(__dirname, '..', 'public', 'images')

const WEBP_QUALITY = 80
const AVIF_QUALITY = 55

// Shrink a PNG only if the recompressed version saves at least 15% of bytes.
const PNG_SHRINK_MIN_RATIO = 0.85
// Files with a `.shrunk` sibling marker won't be re-shrunk; prevents
// re-quantizing an already-quantized PNG and avoids oscillation.
const PNG_SHRUNK_MARKER_EXT = '.shrunk'

const SOURCE_EXT = new Set(['.png', '.jpg', '.jpeg'])

interface Counters {
  scanned: number
  webpWritten: number
  avifWritten: number
  webpSkipped: number
  avifSkipped: number
  pngShrunk: number
  pngShrinkSkipped: number
  bytesSource: number
  bytesWebp: number
  bytesAvif: number
  bytesSavedPng: number
  errors: number
}

const counters: Counters = {
  scanned: 0,
  webpWritten: 0,
  avifWritten: 0,
  webpSkipped: 0,
  avifSkipped: 0,
  pngShrunk: 0,
  pngShrinkSkipped: 0,
  bytesSource: 0,
  bytesWebp: 0,
  bytesAvif: 0,
  bytesSavedPng: 0,
  errors: 0,
}

function isFresh(outPath: string, srcMtimeMs: number): boolean {
  if (!existsSync(outPath)) return false
  try {
    return statSync(outPath).mtimeMs >= srcMtimeMs
  } catch {
    return false
  }
}

async function shrinkPng(filePath: string, currentSize: number) {
  // Skip if we already shrunk this file (marker sibling exists).
  const markerPath = filePath + PNG_SHRUNK_MARKER_EXT
  if (existsSync(markerPath)) {
    counters.pngShrinkSkipped++
    return
  }

  const tmpPath = filePath + '.tmp'
  try {
    await sharp(filePath)
      .png({ compressionLevel: 9, palette: true, quality: 80, effort: 10 })
      .toFile(tmpPath)
    const newSize = statSync(tmpPath).size
    if (newSize < currentSize * PNG_SHRINK_MIN_RATIO) {
      renameSync(tmpPath, filePath)
      writeFileSync(markerPath, '')
      counters.pngShrunk++
      counters.bytesSavedPng += currentSize - newSize
    } else {
      unlinkSync(tmpPath)
      writeFileSync(markerPath, '')
      counters.pngShrinkSkipped++
    }
  } catch (err) {
    counters.errors++
    console.warn(`  ! png shrink failed for ${filePath}:`, (err as Error).message)
    try { unlinkSync(tmpPath) } catch { /* tmp absent */ }
  }
}

async function processFile(filePath: string) {
  const ext = extname(filePath).toLowerCase()
  if (!SOURCE_EXT.has(ext)) return

  const srcStat = statSync(filePath)
  counters.scanned++
  counters.bytesSource += srcStat.size

  // Shrink PNG in place BEFORE deriving WebP/AVIF so the siblings encode from
  // the smaller palette version (sharp re-decodes, output is identical visual).
  if (ext === '.png') {
    await shrinkPng(filePath, srcStat.size)
  }

  const base = join(dirname(filePath), basename(filePath, ext))
  const webpPath = base + '.webp'
  const avifPath = base + '.avif'

  // WebP
  if (isFresh(webpPath, srcStat.mtimeMs)) {
    counters.webpSkipped++
    counters.bytesWebp += statSync(webpPath).size
  } else {
    try {
      await sharp(filePath).webp({ quality: WEBP_QUALITY, effort: 4 }).toFile(webpPath)
      counters.webpWritten++
      counters.bytesWebp += statSync(webpPath).size
    } catch (err) {
      counters.errors++
      console.warn(`  ! webp failed for ${filePath}:`, (err as Error).message)
    }
  }

  // AVIF
  if (isFresh(avifPath, srcStat.mtimeMs)) {
    counters.avifSkipped++
    counters.bytesAvif += statSync(avifPath).size
  } else {
    try {
      await sharp(filePath).avif({ quality: AVIF_QUALITY, effort: 4 }).toFile(avifPath)
      counters.avifWritten++
      counters.bytesAvif += statSync(avifPath).size
    } catch (err) {
      counters.errors++
      console.warn(`  ! avif failed for ${filePath}:`, (err as Error).message)
    }
  }
}

async function walk(dir: string): Promise<void> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const s = statSync(full)
    if (s.isDirectory()) {
      await walk(full)
    } else if (s.isFile()) {
      await processFile(full)
    }
  }
}

function mb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

;(async () => {
  if (!existsSync(IMAGES_ROOT)) {
    console.log('No public/images directory; nothing to do.')
    return
  }
  console.log('Optimizing images in', IMAGES_ROOT)
  const start = Date.now()
  await walk(IMAGES_ROOT)
  const secs = ((Date.now() - start) / 1000).toFixed(1)

  console.log('')
  console.log(`Sources scanned:  ${counters.scanned}   (${mb(counters.bytesSource)})`)
  console.log(`PNG   shrunk:  ${counters.pngShrunk}, skipped: ${counters.pngShrinkSkipped}  (saved ${mb(counters.bytesSavedPng)})`)
  console.log(`WebP  written: ${counters.webpWritten}, skipped: ${counters.webpSkipped}  (total ${mb(counters.bytesWebp)})`)
  console.log(`AVIF  written: ${counters.avifWritten}, skipped: ${counters.avifSkipped}  (total ${mb(counters.bytesAvif)})`)
  console.log(`Errors: ${counters.errors}`)
  console.log(`Elapsed: ${secs}s`)
})()
