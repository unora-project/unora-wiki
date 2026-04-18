const AUTH_BASE = 'https://sveltia-cms-auth.thirdbrody.workers.dev/auth'
const TOKEN_KEY = 'unora-editor-gh-token'
const USER_KEY = 'unora-editor-gh-user'
const SVELTIA_KEY = 'sveltia-cms.user'

function readSveltia(): { token: string; login?: string } | null {
  try {
    const raw = localStorage.getItem(SVELTIA_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.token !== 'string') return null
    return { token: parsed.token, login: typeof parsed?.login === 'string' ? parsed.login : undefined }
  } catch {
    return null
  }
}

function readSveltiaToken(): string | null {
  return readSveltia()?.token ?? null
}

export function readSveltiaLogin(): string | null {
  return readSveltia()?.login ?? null
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) ?? readSveltiaToken()
}

export function getCachedUser(): string | null {
  return sessionStorage.getItem(USER_KEY)
}

export function setCachedUser(login: string) {
  sessionStorage.setItem(USER_KEY, login)
}

export function signOut() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

export function signIn(): Promise<string> {
  return new Promise((resolve, reject) => {
    const siteId = window.location.origin
    const url = `${AUTH_BASE}?provider=github&scope=repo&site_id=${encodeURIComponent(siteId)}`
    const popup = window.open(url, 'unora-editor-auth', 'width=720,height=720')
    if (!popup) {
      reject(new Error('Popup blocked'))
      return
    }

    let state: 'idle' | 'ack' = 'idle'
    const allowedOrigins = new Set([
      'https://sveltia-cms-auth.thirdbrody.workers.dev',
      new URL(AUTH_BASE).origin,
    ])

    const onMessage = (ev: MessageEvent) => {
      if (typeof ev.data !== 'string') return
      if (!allowedOrigins.has(ev.origin)) return

      if (state === 'idle' && ev.data === 'authorizing:github') {
        state = 'ack'
        popup.postMessage('authorizing:github', ev.origin)
        return
      }

      if (state === 'ack' && ev.data.startsWith('authorization:github:success:')) {
        const payload = ev.data.slice('authorization:github:success:'.length)
        try {
          const { token } = JSON.parse(payload)
          if (token) {
            sessionStorage.setItem(TOKEN_KEY, token)
            window.removeEventListener('message', onMessage)
            popup.close()
            resolve(token)
            return
          }
        } catch {}
        cleanup(new Error('Invalid auth payload'))
      } else if (ev.data.startsWith('authorization:github:error:')) {
        cleanup(new Error(ev.data))
      }
    }

    const cleanup = (err: Error) => {
      window.removeEventListener('message', onMessage)
      try { popup.close() } catch {}
      reject(err)
    }

    window.addEventListener('message', onMessage)

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer)
        window.removeEventListener('message', onMessage)
        if (!getToken()) reject(new Error('Auth cancelled'))
      }
    }, 500)
  })
}
