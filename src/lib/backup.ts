import type { EditorDb } from '@/types/editor'
import { commitMultiFile, getFile, EDITOR_REPO } from '@/lib/github-client'

export const BACKUP_DIR = 'data-source/backups'
export const BACKUP_VERSION = 1

const DB_KEYS = [
  'items',
  'jewelcrafting',
  'armorsmithing',
  'weaponsmithing',
  'alchemy-recipes',
  'alchemy-extracts',
  'cooking-recipes',
  'cooking-ingredients',
  'enchanting',
  'fishing',
] as const satisfies readonly (keyof EditorDb)[]

export interface BackupFile {
  version: number
  createdAt: string
  createdBy: string | null
  counts: Record<keyof EditorDb, number>
  db: EditorDb
}

export function emptyDb(): EditorDb {
  return {
    items: [],
    jewelcrafting: [],
    armorsmithing: [],
    weaponsmithing: [],
    'alchemy-recipes': [],
    'alchemy-extracts': [],
    'cooking-recipes': [],
    'cooking-ingredients': [],
    enchanting: [],
    fishing: [],
  }
}

function countDb(db: EditorDb): Record<keyof EditorDb, number> {
  const out = {} as Record<keyof EditorDb, number>
  for (const k of DB_KEYS) out[k] = (db[k]?.length ?? 0)
  return out
}

export function makeBackupFilename(d: Date = new Date()): string {
  const iso = d.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/:/g, '-')
  return `backup-${iso}.json`
}

export function serializeBackup(
  db: EditorDb,
  createdBy: string | null,
): { filename: string; json: string; payload: BackupFile } {
  const now = new Date()
  const payload: BackupFile = {
    version: BACKUP_VERSION,
    createdAt: now.toISOString(),
    createdBy,
    counts: countDb(db),
    db,
  }
  const json = JSON.stringify(payload, null, 2) + '\n'
  return { filename: makeBackupFilename(now), json, payload }
}

function isArrayShapeOk(v: unknown): v is unknown[] {
  return Array.isArray(v)
}

function validateDb(db: unknown): db is EditorDb {
  if (!db || typeof db !== 'object') return false
  const rec = db as Record<string, unknown>
  for (const k of DB_KEYS) {
    if (!isArrayShapeOk(rec[k])) return false
  }
  return true
}

export function parseBackup(raw: string): BackupFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e: any) {
    throw new Error(`Invalid JSON: ${e.message || e}`)
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Backup must be a JSON object')
  }
  const obj = parsed as Record<string, unknown>

  // Wrapped form: { version, createdAt, createdBy, counts, db }
  if (typeof obj.version === 'number' && obj.db && typeof obj.db === 'object') {
    if (!validateDb(obj.db)) {
      throw new Error('Backup "db" is missing required tables')
    }
    return {
      version: obj.version,
      createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : new Date(0).toISOString(),
      createdBy: typeof obj.createdBy === 'string' ? obj.createdBy : null,
      counts: (obj.counts && typeof obj.counts === 'object')
        ? (obj.counts as Record<keyof EditorDb, number>)
        : countDb(obj.db as EditorDb),
      db: obj.db as EditorDb,
    }
  }

  // Bare EditorDb fallback (hand-crafted export).
  if (validateDb(obj)) {
    return {
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      createdBy: null,
      counts: countDb(obj),
      db: obj,
    }
  }

  throw new Error('Unrecognized backup shape: expected { version, db } or a bare EditorDb')
}

export function downloadBlob(filename: string, content: string, mime = 'application/json'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function commitBackup(
  token: string,
  db: EditorDb,
  createdBy: string | null,
  dryRun: boolean,
): Promise<{ sha: string; url: string; filename: string } | null> {
  const { filename, json } = serializeBackup(db, createdBy)
  const path = `${BACKUP_DIR}/${filename}`
  const message = `chore(backup): snapshot ${filename}\n\nCo-Authored-By: True <true@unora.local>`

  if (dryRun) {
    console.log('[dryRun] would commit backup', { path, message, bytes: json.length })
    console.log('--- backup preview ---\n', json.slice(0, 2000), json.length > 2000 ? '…' : '')
    return { sha: 'dryrun', url: '', filename }
  }

  const res = await commitMultiFile(
    token,
    EDITOR_REPO.owner,
    EDITOR_REPO.repo,
    EDITOR_REPO.branch,
    [{ path, content: json }],
    message,
  )
  return { ...res, filename }
}

export async function fetchBackup(token: string, path: string): Promise<BackupFile> {
  const file = await getFile(token, EDITOR_REPO.owner, EDITOR_REPO.repo, path, EDITOR_REPO.branch)
  if (!file) throw new Error(`Backup not found: ${path}`)
  return parseBackup(file.content)
}

export async function fetchBackupRaw(token: string, path: string): Promise<string> {
  const file = await getFile(token, EDITOR_REPO.owner, EDITOR_REPO.repo, path, EDITOR_REPO.branch)
  if (!file) throw new Error(`Backup not found: ${path}`)
  return file.content
}
