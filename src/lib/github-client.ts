const API = 'https://api.github.com'

export const EDITOR_REPO = {
  owner: 'unora-project',
  repo: 'unora-wiki',
  branch: 'master',
}

interface GhHeaders {
  Authorization: string
  Accept: string
  'X-GitHub-Api-Version': string
  'Content-Type'?: string
}

function headers(token: string, json = false): GhHeaders {
  const h: GhHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (json) h['Content-Type'] = 'application/json'
  return h
}

async function gh<T>(
  token: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...headers(token, !!init.body), ...(init.headers as any) },
  })
  if (!res.ok) {
    const body = await res.text()
    const err = new Error(`GitHub ${res.status}: ${body}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return res.json() as Promise<T>
}

export async function getCurrentUser(token: string): Promise<{ login: string }> {
  return gh<{ login: string }>(token, '/user')
}

export async function isCollaborator(
  token: string,
  owner: string,
  repo: string,
  login: string
): Promise<boolean> {
  const res = await fetch(
    `${API}/repos/${owner}/${repo}/collaborators/${encodeURIComponent(login)}`,
    { headers: headers(token) as any }
  )
  if (res.status === 204) return true
  if (res.status === 404) return false
  throw new Error(`GitHub ${res.status}: ${await res.text()}`)
}

export interface FileContent {
  content: string
  sha: string
}

// Session-scoped cache for getFile. Keyed by owner/repo/path@ref.
// Invalidated by clearFileCache() after a successful commit — stale `before`
// could otherwise make Preview show a diff vs. old content. Entries for files
// that don't exist on GitHub are stored as null so 404s are also cached.
const fileCache = new Map<string, FileContent | null>()

function fileCacheKey(owner: string, repo: string, path: string, ref: string): string {
  return `${owner}/${repo}/${path}@${ref}`
}

export function clearFileCache(): void {
  fileCache.clear()
}

export async function getFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<FileContent | null> {
  const key = fileCacheKey(owner, repo, path, ref)
  if (fileCache.has(key)) return fileCache.get(key) ?? null
  try {
    const data = await gh<{ content: string; sha: string; encoding: string }>(
      token,
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(ref)}`
    )
    const decoded = data.encoding === 'base64'
      ? new TextDecoder().decode(Uint8Array.from(atob(data.content.replace(/\n/g, '')), (c) => c.charCodeAt(0)))
      : data.content
    const result: FileContent = { content: decoded, sha: data.sha }
    fileCache.set(key, result)
    return result
  } catch (e: any) {
    if (e.status === 404) {
      fileCache.set(key, null)
      return null
    }
    throw e
  }
}

interface RefResp { object: { sha: string } }
interface CommitResp { sha: string; tree: { sha: string } }
interface TreeResp { sha: string }
interface BlobResp { sha: string }

function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  bytes.forEach((b) => { bin += String.fromCharCode(b) })
  return btoa(bin)
}

export async function commitMultiFile(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  files: { path: string; content: string }[],
  message: string
): Promise<{ sha: string; url: string }> {
  const ref = await gh<RefResp>(token, `/repos/${owner}/${repo}/git/ref/heads/${branch}`)
  const parentSha = ref.object.sha
  const parentCommit = await gh<CommitResp>(
    token,
    `/repos/${owner}/${repo}/git/commits/${parentSha}`
  )

  const blobs = await Promise.all(
    files.map((f) =>
      gh<BlobResp>(token, `/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({ content: toBase64(f.content), encoding: 'base64' }),
      })
    )
  )

  const tree = await gh<TreeResp>(token, `/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({
      base_tree: parentCommit.tree.sha,
      tree: files.map((f, i) => ({
        path: f.path,
        mode: '100644',
        type: 'blob',
        sha: blobs[i].sha,
      })),
    }),
  })

  const commit = await gh<{ sha: string; html_url: string }>(
    token,
    `/repos/${owner}/${repo}/git/commits`,
    {
      method: 'POST',
      body: JSON.stringify({
        message,
        tree: tree.sha,
        parents: [parentSha],
      }),
    }
  )

  await gh(token, `/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha }),
  })

  return { sha: commit.sha, url: commit.html_url }
}

export interface DirEntry {
  name: string
  path: string
  sha: string
  size: number
  type: 'file' | 'dir'
}

export async function listDirectory(
  token: string,
  owner: string,
  repo: string,
  path: string,
  ref: string,
): Promise<DirEntry[]> {
  try {
    const data = await gh<DirEntry[]>(
      token,
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(ref)}`,
    )
    return Array.isArray(data) ? data : []
  } catch (e: any) {
    if (e.status === 404) return []
    throw e
  }
}
