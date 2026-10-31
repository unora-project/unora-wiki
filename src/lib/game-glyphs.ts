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
  return decodeMask(m, w, h, (x) => x * scale, (y) => y * scale)
}

/**
 * Window sizes that are not a whole multiple of the game picture (e.g. 1.5x): the picture of the
 * game is stretched by `scale`, and its top-left corner sits at (ox, oy) in the screenshot piece.
 * Every game pixel is read from the middle of its stretched block (blending the screen pixels around
 * that point), which works both when the game stretches with sharp edges and when it smooths.
 */
type SampleMode = 0 | 1 | 2
// [take the one screen pixel at the block's centre (sharp stretch) instead of blending, brightness limit]
const SAMPLE_MODES: Record<SampleMode, [boolean, number]> = { 0: [true, 170], 1: [false, 170], 2: [false, 125] }

function readFractional(img: PixelImage, scale: number, ox: number, oy: number, mode: SampleMode): ReadRun[] {
  const w = Math.floor((img.width - ox) / scale)
  const h = Math.floor((img.height - oy) / scale)
  if (w < 4 || h < 4 || !(scale > 0)) return []
  const m = new Uint8Array(w * h)
  const [sharp, limit] = SAMPLE_MODES[mode]
  const W = img.width
  const H = img.height
  const d = img.data
  for (let y = 0; y < h; y++) {
    if (sharp) {
      const py = Math.max(0, Math.min(H - 1, Math.floor(oy + (y + 0.5) * scale)))
      for (let x = 0; x < w; x++) {
        const px = Math.max(0, Math.min(W - 1, Math.floor(ox + (x + 0.5) * scale)))
        const i = (py * W + px) * 4
        m[y * w + x] = Math.min(d[i], d[i + 1], d[i + 2]) > limit ? 1 : 0
      }
      continue
    }
    // centre of this game pixel's block, as a position between screen pixel centres
    const v = oy + (y + 0.5) * scale - 0.5
    const y0 = Math.max(0, Math.min(H - 1, Math.floor(v)))
    const y1 = Math.min(H - 1, y0 + 1)
    const fy = Math.max(0, Math.min(1, v - y0))
    for (let x = 0; x < w; x++) {
      const u = ox + (x + 0.5) * scale - 0.5
      const x0 = Math.max(0, Math.min(W - 1, Math.floor(u)))
      const x1 = Math.min(W - 1, x0 + 1)
      const fx = Math.max(0, Math.min(1, u - x0))
      let low = 255
      for (let c = 0; c < 3; c++) {
        const top = d[(y0 * W + x0) * 4 + c] * (1 - fx) + d[(y0 * W + x1) * 4 + c] * fx
        const bot = d[(y1 * W + x0) * 4 + c] * (1 - fx) + d[(y1 * W + x1) * 4 + c] * fx
        const val = top * (1 - fy) + bot * fy
        if (val < low) low = val
      }
      m[y * w + x] = low > limit ? 1 : 0
    }
  }
  return decodeMask(m, w, h, (x) => ox + x * scale, (y) => oy + y * scale, true)
}

// Glyph shapes grouped by width, for the near-miss lookup used when the picture was stretched by a
// fractional amount (a pixel or two can come out wrong there).
const BY_WIDTH = new Map<number, [string, string][]>()
for (const [k, v] of Object.entries(GLYPHS)) {
  const mt = /^\d+x(\d+):([01]+)$/.exec(k)
  if (!mt) continue
  const wd = Number(mt[1])
  const list = BY_WIDTH.get(wd) ?? []
  list.push([mt[2], v])
  BY_WIDTH.set(wd, list)
}

// The one known shape that differs from `bits` by at most 2 pixels, if exactly one letter is that close.
function nearGlyph(width: number, bits: string): string | undefined {
  let best: string | undefined
  let bestD = 3
  let tie = false
  for (const [gb, ch] of BY_WIDTH.get(width) ?? []) {
    let d = 0
    for (let i = 0; i < gb.length && d < bestD + 1; i++) if (gb[i] !== bits[i]) d++
    if (d < bestD) {
      bestD = d
      best = ch
      tie = false
    } else if (d === bestD && ch !== best) tie = true
  }
  return bestD <= 2 && !tie ? best : undefined
}

function decodeMask(
  m: Uint8Array,
  w: number,
  h: number,
  fx: (x: number) => number,
  fy: (y: number) => number,
  fuzzy = false
): ReadRun[] {
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
  // Reads the lines of text inside one horizontal band of rows (at most 16 rows tall).
  const decodeBand = (r0: number, r1: number): ReadRun[] => {
    const runs: ReadRun[] = []
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
          const ch = GLYPHS[`${ROWS}x${b - a}:${bits}`] ?? (fuzzy ? nearGlyph(b - a, bits) : undefined)
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
        x0: fx(grp[0][0]),
        x1: fx(grp[grp.length - 1][1]),
        y0: fy(r0),
        y1: fy(r1 + 1),
        hits: Math.max(hits, 0),
        total: grp.length,
      })
    }
    return runs
  }

  const runs: ReadRun[] = []
  for (const [r0, r1] of bands) {
    const height = r1 - r0
    if (height < 3) continue
    if (height <= 16) {
      runs.push(...decodeBand(r0, r1))
      continue
    }
    // A band taller than any line of text: something bright sits next to or above/below the text and
    // joined the rows together (typically the white highlights of a skill's icon beside its name).
    // Slide a 16-row window down the band; icons and text are far enough apart sideways that they
    // fall into different groups, so the text is still read cleanly. Where windows read the same
    // text, the best read wins.
    if (height > 120) continue
    const found: ReadRun[] = []
    for (let w0 = r0; w0 <= r1 - 9; w0++) found.push(...decodeBand(w0, Math.min(r1, w0 + 15)))
    found.sort((p, q) => q.hits - p.hits || (q.hits / q.total) - (p.hits / p.total))
    const kept: ReadRun[] = []
    for (const r of found) {
      if (r.hits < 2) continue
      const same = kept.some((k) => r.x0 < k.x1 && k.x0 < r.x1 && r.y0 < k.y1 && k.y0 < r.y1)
      if (!same) kept.push(r)
    }
    runs.push(...kept)
  }
  return runs
}

// Letters recognised, minus half a point for every shape that was not (so a messy misread of the wrong
// scale loses to a clean read of the right one).
const scoreOf = (runs: ReadRun[]) => runs.reduce((n, r) => n + r.hits - 0.5 * (r.total - r.hits), 0)
// True when some line was read cleanly: enough letters and nearly all of them recognised.
const confident = (runs: ReadRun[]) => runs.some((r) => r.hits >= 6 && r.hits >= 0.85 * r.total)

export interface ReadHint {
  /** How many screen pixels one game pixel is (window width / 640). 0 or missing = unknown. */
  scale?: number
  /** Where the game picture's top-left corner is inside the screenshot piece. */
  ox?: number
  oy?: number
}

/**
 * Reads the game's text from a screenshot piece, for any window size.
 * With a hint (scale and corner) it tries that first; otherwise, or when that reads poorly, it
 * tries whole-number scales and finally sweeps fractional ones, keeping whatever reads best.
 */
export function readGameText(img: PixelImage, hint: ReadHint = {}): { scale: number; runs: ReadRun[] } {
  let best = { scale: 0, runs: [] as ReadRun[], score: 0 }
  const consider = (scale: number, runs: ReadRun[]) => {
    const score = scoreOf(runs)
    if (score > best.score) best = { scale, runs, score }
  }
  const hs = hint.scale && hint.scale > 0.4 ? hint.scale : 0

  if (hs) {
    const nearInt = Math.abs(hs - Math.round(hs)) < 0.02 && Math.round(hs) >= 1
    if (nearInt) consider(Math.round(hs), readAtScale(img, Math.round(hs)))
    if (!confident(best.runs)) {
      const ox0 = hint.ox ?? 0
      const oy0 = hint.oy ?? 0
      for (const f of [1, 0.98, 1.02, 0.96, 1.04]) {
        const s = hs * f
        for (const [dx, dy] of [[0, 0], [-0.25, 0], [0.25, 0], [0, -0.25], [0, 0.25], [-0.25, -0.25], [0.25, 0.25]]) {
          for (const mode of [0, 1, 2] as SampleMode[]) consider(s, readFractional(img, s, ox0 + dx * s, oy0 + dy * s, mode))
        }
        if (confident(best.runs)) break
      }
    }
  }
  if (!confident(best.runs)) {
    for (const scale of [2, 1, 3, 4]) consider(scale, readAtScale(img, scale))
  }
  if (!confident(best.runs)) {
    // Last resort: no usable hint. Sweep scales and the position of the game's pixel grid.
    for (let s = 1.0; s <= 4.01; s += 0.05) {
      for (const fx of [0, 0.33, 0.66]) {
        for (const fy of [0, 0.33, 0.66]) {
          for (const mode of [0, 1] as SampleMode[]) consider(s, readFractional(img, s, fx * s, fy * s, mode))
        }
      }
      if (confident(best.runs)) break
    }
  }
  // Marks that no letter was recognised in (icon edges, box borders, cut-off text) are not worth
  // offering as a possible skill name, unless that is all there is.
  const readable = best.runs.filter((r) => r.hits > 0)
  return { scale: best.scale, runs: readable.length ? readable : best.runs }
}
