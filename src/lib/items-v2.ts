// The data model behind the Item Editor: every item and piece of equipment is one row (a "Rec"),
// found again by its permanent ID. No React and no file access, so it can be tested on its own.
//
//   data-source/items/equipment.csv  - things with stats (weapons, armor, jewelry, cosmetics)
//   data-source/items/items.csv      - everything else (food, potions, drops, ores...)
//
// Which file a row belongs to is decided by its Type (see item-types.ts).
import { parseCSV } from './csv-parse'
import { serializeCSV } from './csv-serialize'
import {
  ANY_CLASS, CLASS_SLUGS, EQUIPMENT_CSV, EQUIPMENT_HEADERS, GENDERS, ITEMS_CSV, ITEM_HEADERS,
  LIST_SEP, NEEDS_CLASS, NEEDS_GENDER, STAT_HEADERS, TYPE_BY_LABEL, labelFor, newItemId,
  type FileKind,
} from './item-types'

export type Row = Record<string, string>
export interface Rec { file: FileKind; row: Row }

export const FILE_PATH: Record<FileKind, string> = { equipment: EQUIPMENT_CSV, items: ITEMS_CSV }
const STANDARD: Record<FileKind, readonly string[]> = { equipment: EQUIPMENT_HEADERS, items: ITEM_HEADERS }

// ── Cells ──

export const cell = (row: Row, header: string): string => (row[header] ?? '').trim()
/** "-" and blank both mean "nothing here". */
export const isBlank = (v: string | undefined): boolean => {
  const t = (v ?? '').trim()
  return t === '' || t === '-'
}
export function listOf(row: Row, header: string): string[] {
  return cell(row, header).split(LIST_SEP).map((s) => s.trim()).filter((s) => s && s !== '-')
}
export function setList(row: Row, header: string, values: string[]): Row {
  return { ...row, [header]: values.join(LIST_SEP) }
}

// ── Reading and writing the two files ──

export interface FileData { headers: string[]; recs: Rec[] }

/** Headers for a file: what the file already has, plus any standard column that now has a value. */
function headersFor(kind: FileKind, existing: string[], rows: Row[]): string[] {
  const headers = existing.length ? [...existing] : [...STANDARD[kind]]
  for (const h of STANDARD[kind]) {
    if (headers.includes(h)) continue
    if (!rows.some((r) => !isBlank(r[h]))) continue
    // keep new columns where they belong in the standard order
    const std = STANDARD[kind]
    let at = headers.length
    for (let i = std.indexOf(h) - 1; i >= 0; i--) {
      const prev = headers.indexOf(std[i])
      if (prev !== -1) { at = prev + 1; break }
    }
    headers.splice(at, 0, h)
  }
  return headers
}

export function parseFile(text: string, kind: FileKind): FileData {
  const parsed = parseCSV(text.replace(/^\uFEFF/, ''))
  return {
    headers: parsed.headers.length ? parsed.headers : [...STANDARD[kind]],
    recs: parsed.rows.map((row) => ({ file: kind, row })),
  }
}

/** Both files into one list (equipment first, then items). */
export function parseBoth(equipmentText: string, itemsText: string): { recs: Rec[]; headers: Record<FileKind, string[]> } {
  const eq = parseFile(equipmentText, 'equipment')
  const it = parseFile(itemsText, 'items')
  return { recs: [...eq.recs, ...it.recs], headers: { equipment: eq.headers, items: it.headers } }
}

export function serializeFile(kind: FileKind, recs: Rec[], existingHeaders: string[]): string {
  const rows = recs.filter((r) => r.file === kind).map((r) => r.row)
  const headers = headersFor(kind, existingHeaders, rows)
  // Missing cells are written blank (the CSV writer would otherwise put "-").
  const filled = rows.map((r) => {
    const out: Row = {}
    for (const h of headers) out[h] = r[h] ?? ''
    return out
  })
  return serializeCSV(headers, filled, { trailingNewline: true })
}

/** The type decides the file. Unknown types stay where they were. */
export function fileForType(type: string, current: FileKind): FileKind {
  return TYPE_BY_LABEL.get(type.trim().toLowerCase())?.file ?? current
}

// ── Building records ──

export function takenIds(recs: Rec[]): Set<string> {
  return new Set(recs.map((r) => cell(r.row, 'ID')).filter(Boolean))
}

export function emptyRec(type: string, taken: ReadonlySet<string>): Rec {
  const file = fileForType(type, 'equipment')
  const row: Row = {}
  for (const h of STANDARD[file]) row[h] = ''
  row.ID = newItemId('new item', taken)
  row.Type = type
  return { file, row }
}

/** Change one cell. A brand-new record keeps its ID in step with its name until it is first saved. */
export function withCell(rec: Rec, header: string, value: string): Rec {
  return { ...rec, row: { ...rec.row, [header]: value } }
}

export function changeType(rec: Rec, type: string): Rec {
  const file = fileForType(type, rec.file)
  const row: Row = { ...rec.row, Type: type }
  for (const h of STANDARD[file]) if (!(h in row)) row[h] = ''
  return { file, row }
}

// ── Checking ──

export interface Issue { id: string; name: string; level: 'error' | 'warn'; msg: string }

const NUMBER = /^-?\d+(\.\d+)?$/

export function validate(recs: Rec[]): Issue[] {
  const issues: Issue[] = []
  const seen = new Map<string, number>()
  const sig = new Map<string, string>()
  const classSet = new Set<string>([ANY_CLASS, ...CLASS_SLUGS.filter((c) => c !== 'peasant')])
  const genderSet = new Set<string>(GENDERS)

  for (const { file, row } of recs) {
    const id = cell(row, 'ID')
    const name = cell(row, 'Name')
    const type = cell(row, 'Type')
    const add = (level: Issue['level'], msg: string) => issues.push({ id, name: name || '(no name)', level, msg })

    if (!name) add('error', 'Has no name.')
    if (!id) add('error', 'Has no ID.')
    else seen.set(id, (seen.get(id) ?? 0) + 1)

    const info = TYPE_BY_LABEL.get(type.toLowerCase())
    if (!info) { add('error', type ? `Unknown type "${type}".` : 'Has no type.'); continue }
    if (info.file !== file) add('error', `Type "${type}" belongs in ${FILE_PATH[info.file]}.`)

    if (info.file === 'equipment') {
      const classes = listOf(row, 'Class')
      const genders = listOf(row, 'Gender').map((g) => g.toLowerCase())
      for (const c of classes) if (!classSet.has(c.toLowerCase())) add('error', `Unknown class "${c}".`)
      for (const g of genders) if (!genderSet.has(g)) add('error', `Unknown gender "${g}".`)
      if (classes.some((c) => c.toLowerCase() === ANY_CLASS) && classes.length > 1) {
        add('warn', 'Class has "any" together with other classes. "any" already covers everyone.')
      }
      if (NEEDS_CLASS.has(type) && classes.length === 0) add('warn', `${type} has no class. Add one, or "any" if everyone can use it.`)
      if (NEEDS_GENDER.has(type) && genders.length === 0) add('warn', `${type} has no gender. Use unisex if both can wear it.`)
      // Level may be text on purpose (some gear is "Ab 1"), so it is not checked.
      for (const h of ['WGT', 'Value', ...STAT_HEADERS]) {
        const v = cell(row, h)
        if (!isBlank(v) && !NUMBER.test(v)) add('error', `${labelFor(h)} "${v}" is not a number.`)
      }
      const key = [name.toLowerCase(), type, classes.join(',').toLowerCase(), genders.join(',')].join('|')
      const other = sig.get(key)
      if (name && other && other !== id) add('warn', `Looks like a duplicate of "${other}" (same name, type, class and gender).`)
      else if (name) sig.set(key, id)
    } else {
      for (const h of ['Buy', 'Sell']) {
        const v = cell(row, h)
        if (!isBlank(v) && !NUMBER.test(v)) add('warn', `${labelFor(h)} "${v}" is not a number.`)
      }
      const key = ['item', name.toLowerCase(), type].join('|')
      const other = sig.get(key)
      if (name && other && other !== id) add('warn', `Looks like a duplicate of "${other}" (same name and type).`)
      else if (name) sig.set(key, id)
    }
  }
  for (const [id, n] of seen) if (n > 1) issues.push({ id, name: id, level: 'error', msg: `ID "${id}" is used ${n} times.` })
  return issues
}

// ── Comparing with what is on GitHub ──

export interface Change {
  id: string
  name: string
  type: string
  kind: 'added' | 'removed' | 'changed'
  details: string[]
}

const norm = (v: string | undefined) => (isBlank(v) ? '' : (v ?? '').trim())

function describeChange(header: string, before: string, after: string): string {
  const label = labelFor(header)
  if (header === 'Class' || header === 'Gender' || header === 'Uses') {
    const a = before.split(LIST_SEP).map((s) => s.trim()).filter(Boolean)
    const b = after.split(LIST_SEP).map((s) => s.trim()).filter(Boolean)
    const gained = b.filter((x) => !a.includes(x))
    const lost = a.filter((x) => !b.includes(x))
    const parts = [...gained.map((x) => `+ ${x}`), ...lost.map((x) => `- ${x}`)]
    return `${label}: ${parts.join(', ') || 'reordered'}`
  }
  if (header === 'Description') return `${label} changed`
  const show = (v: string) => (v === '' ? 'empty' : v)
  return `${label}: ${show(before)} → ${show(after)}`
}

export function summarize(base: Rec[], current: Rec[]): Change[] {
  const baseById = new Map(base.map((r) => [cell(r.row, 'ID'), r]))
  const curById = new Map(current.map((r) => [cell(r.row, 'ID'), r]))
  const out: Change[] = []
  for (const r of current) {
    const id = cell(r.row, 'ID')
    const old = baseById.get(id)
    const name = cell(r.row, 'Name')
    const type = cell(r.row, 'Type')
    if (!old) { out.push({ id, name, type, kind: 'added', details: [] }); continue }
    const details: string[] = []
    if (old.file !== r.file) details.push(`Moves to ${FILE_PATH[r.file].split('/').pop()}`)
    const headers = new Set([...Object.keys(old.row), ...Object.keys(r.row)])
    headers.delete('ID')
    for (const h of headers) {
      const a = norm(old.row[h])
      const b = norm(r.row[h])
      if (a !== b) details.push(describeChange(h, a, b))
    }
    if (details.length) out.push({ id, name, type, kind: 'changed', details })
  }
  for (const r of base) {
    const id = cell(r.row, 'ID')
    if (!curById.has(id)) out.push({ id, name: cell(r.row, 'Name'), type: cell(r.row, 'Type'), kind: 'removed', details: [] })
  }
  return out
}

/** True when a record differs from the published one (used for the "edited" marker). */
export function sameRec(a: Rec | undefined, b: Rec): boolean {
  if (!a || a.file !== b.file) return false
  const headers = new Set([...Object.keys(a.row), ...Object.keys(b.row)])
  for (const h of headers) if (norm(a.row[h]) !== norm(b.row[h])) return false
  return true
}
