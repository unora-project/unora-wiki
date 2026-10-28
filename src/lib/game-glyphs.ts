// Pixel-font reader for the game's UI text (used by the AutoHotkey overlay's "add skill from
// the game screen" feature). The game draws its text as near-white pixels in a 14-row-tall bitmap
// font at 640x480; screenshots are usually that image scaled up by a whole number (2x etc.).
// game-glyphs.json (next to this file) maps "HxW:bits" (row by row, 1 = text pixel, capitals
// start on row 1) to the character it draws. It is the glyphs.json that icon_namer.py learns:
// copy a newer glyphs.json over it to teach the site more letters. A shape shared by two letters
// (capital I and lowercase l) is stored with both, e.g. "Il".
import glyphData from './game-glyphs.json'

const GLYPHS = glyphData as Record<string, string>

const ROWS = 14
const BASELINE_ROW = 10 // capital letters and letters without tails end on this row of the 14

export interface ReadRun {
  /** What was read. Characters the font table doesn't know are shown as "?". */
  text: string
  /** Bounding box in the original image's pixels. */
  x0: number
  y0: number
  x1: number
  y1: number
  hits: number
  total: number
}

interface PixelImage {
  data: ArrayLike<number> // RGBA, like ImageData.data
  width: number
  height: number
}

// A shape shared by capital I and lowercase l is capital at the start of a word.
function pickLetter(options: string, wordStart: boolean): string {
  if (options.length === 1) return options
  const upper = [...options].filter((c) => c !== c.toLowerCase())
  const lower = [...options].filter((c) => c === c.toLowerCase())
  return ((wordStart ? upper : lower)[0] ?? options[0])
}

function readAtScale(img: PixelImage, scale: number): ReadRun[] {
  const w = Math.floor(img.width / scale)
  const h = Math.floor(img.height / scale)
  if (w < 4 || h < 4) return []
  // 1 = white text pixel
  const m = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = ((y * scale) * img.width + x * scale) * 4
      m[y * w + x] = Math.min(img.data[i], img.data[i + 1], img.data[i + 2]) > 200 ? 1 : 0
    }
  }
  const rowHas = (y: number) => {
    for (let x = 0; x < w; x++) if (m[y * w + x]) return true
    return false
  }
  // Horizontal bands of text (rows with white pixels; gaps of 1-2 empty rows stay in the band).
  const bands: [number, number][] = []
  let start = -1
  let empty = 0
  for (let y = 0; y <= h; y++) {
    const has = y < h && rowHas(y)
    if (has) {
      if (start < 0) start = y
      empty = 0
    } else if (start >= 0) {
      empty++
      if (empty >= 3 || y === h) {
        bands.push([start, y - empty])
        start = -1
        empty = 0
      }
    }
  }
  const runs: ReadRun[] = []
  for (const [r0, r1] of bands) {
    if (r1 - r0 < 3 || r1 - r0 > 16) continue
    // Column segments: groups of columns that have text pixels.
    const segs: [number, number][] = []
    let s = -1
    for (let x = 0; x <= w; x++) {
      let has = false
      if (x < w) for (let y = r0; y <= r1; y++) if (m[y * w + x]) { has = true; break }
      if (has && s < 0) s = x
      if (!has && s >= 0) {
        segs.push([s, x])
        s = -1
      }
    }
    // Group segments into runs (a gap of 10+ columns starts a new piece of text).
    const groups: [number, number][][] = []
    let cur: [number, number][] = []
    for (const sg of segs) {
      if (cur.length && sg[0] - cur[cur.length - 1][1] >= 10) {
        groups.push(cur)
        cur = []
      }
      cur.push(sg)
    }
    if (cur.length) groups.push(cur)
    for (const grp of groups) {
      if (grp.length < 3) continue
      const bottoms = grp.map(([a, b]) => {
        let bt = r0
        for (let y = r0; y <= r1; y++) for (let x = a; x < b; x++) if (m[y * w + x]) bt = y
        return bt
      })
      const tally = new Map<number, number>()
      for (const bt of bottoms) tally.set(bt, (tally.get(bt) ?? 0) + 1)
      const common = [...tally.entries()].sort((p, q) => q[1] - p[1] || q[0] - p[0]).map((e) => e[0])
      // Where the 14-row window starts. Normally the line ends on the baseline row; a name that is
      // mostly letters with tails (g, p, y) is also tried from the top of its first letter.
      let firstTop = r1
      for (let y = r0; y <= r1; y++) {
        let has = false
        for (let x = grp[0][0]; x < grp[0][1]; x++) if (m[y * w + x]) has = true
        if (has) {
          firstTop = y
          break
        }
      }
      const tops = [...new Set([common[0] - BASELINE_ROW, firstTop - 1, ...(common[1] !== undefined ? [common[1] - BASELINE_ROW] : [])])]
      let text = ''
      let hits = -1
      for (const top of tops) {
        let t = ''
        let hh = 0
        grp.forEach(([a, b], idx) => {
          if (idx > 0 && a - grp[idx - 1][1] >= 4) t += ' '
          let bits = ''
          for (let r = 0; r < ROWS; r++) {
            const y = top + r
            for (let x = a; x < b; x++) bits += y >= 0 && y < h && m[y * w + x] ? '1' : '0'
          }
          const ch = GLYPHS[`${ROWS}x${b - a}:${bits}`]
          if (ch !== undefined) {
            const atWordStart = t === '' || t.endsWith(' ')
            t += pickLetter(ch, atWordStart)
            hh++
          } else t += '?'
        })
        if (hh > hits) {
          hits = hh
          text = t
        }
      }
      runs.push({
        text,
        x0: grp[0][0] * scale,
        x1: grp[grp.length - 1][1] * scale,
        y0: r0 * scale,
        y1: (r1 + 1) * scale,
        hits: Math.max(hits, 0),
        total: grp.length,
      })
    }
  }
  return runs
}

/** Reads the game's text from a screenshot piece. Tries 1x-4x and keeps the scale that reads best. */
export function readGameText(img: PixelImage): { scale: number; runs: ReadRun[] } {
  let best = { scale: 0, runs: [] as ReadRun[], score: 0 }
  for (const scale of [2, 1, 3, 4]) {
    const runs = readAtScale(img, scale)
    const score = runs.reduce((n, r) => n + r.hits, 0)
    if (score > best.score) best = { scale, runs, score }
  }
  return { scale: best.scale, runs: best.runs }
}
