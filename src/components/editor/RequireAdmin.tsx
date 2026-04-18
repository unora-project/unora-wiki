import { useEffect, useState } from 'react'
import { getToken, getCachedUser, setCachedUser, signIn, signOut, readSveltiaLogin } from '@/lib/github-auth'
import { getCurrentUser, isCollaborator, EDITOR_REPO } from '@/lib/github-client'

type State =
  | { kind: 'loading' }
  | { kind: 'unauth' }
  | { kind: 'denied'; login: string }
  | { kind: 'ok'; login: string }
  | { kind: 'error'; message: string }

const COLLAB_CACHE_KEY = 'unora-editor-collab-ok'

async function checkAccess(token: string, login: string): Promise<boolean> {
  if (sessionStorage.getItem(COLLAB_CACHE_KEY) === login) return true
  const ok = await isCollaborator(token, EDITOR_REPO.owner, EDITOR_REPO.repo, login)
  if (ok) sessionStorage.setItem(COLLAB_CACHE_KEY, login)
  return ok
}

export function RequireAdmin({ children }: { children: (login: string) => React.ReactNode }) {
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    const token = getToken()
    if (!token) { setState({ kind: 'unauth' }); return }
    const cached = getCachedUser() ?? readSveltiaLogin()
    const resolve = async (login: string) => {
      try {
        const ok = await checkAccess(token, login)
        setState(ok ? { kind: 'ok', login } : { kind: 'denied', login })
      } catch (e: any) {
        setState({ kind: 'error', message: String(e.message || e) })
      }
    }
    if (cached) { resolve(cached); return }
    getCurrentUser(token)
      .then((u) => { setCachedUser(u.login); return resolve(u.login) })
      .catch((e) => setState({ kind: 'error', message: String(e.message || e) }))
  }, [])

  const handleSignIn = async () => {
    setState({ kind: 'loading' })
    try {
      const token = await signIn()
      const u = await getCurrentUser(token)
      setCachedUser(u.login)
      const ok = await checkAccess(token, u.login)
      setState(ok ? { kind: 'ok', login: u.login } : { kind: 'denied', login: u.login })
    } catch (e: any) {
      setState({ kind: 'error', message: String(e.message || e) })
    }
  }

  const handleSignOut = () => {
    signOut()
    sessionStorage.removeItem(COLLAB_CACHE_KEY)
    setState({ kind: 'unauth' })
  }

  if (state.kind === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gilt/20 border-t-gilt" />
      </div>
    )
  }

  if (state.kind === 'ok') return <>{children(state.login)}</>

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-heading text-2xl font-bold text-gilt">Editor Access</h1>
      {state.kind === 'unauth' && (
        <>
          <p className="max-w-md font-ui text-sm text-ash">
            Sign in with GitHub to edit wiki data. Any collaborator on{' '}
            <code className="rounded bg-ink px-1 py-0.5 text-xs">{EDITOR_REPO.owner}/{EDITOR_REPO.repo}</code>{' '}
            can commit changes.
          </p>
          <button
            onClick={handleSignIn}
            className="rounded-md bg-gilt px-4 py-2 font-ui text-sm font-semibold text-ink transition-colors hover:bg-gilt/90"
          >
            Sign in with GitHub
          </button>
        </>
      )}
      {state.kind === 'denied' && (
        <>
          <p className="max-w-md font-ui text-sm text-ignis">
            Account <strong>{state.login}</strong> is not a collaborator on{' '}
            <code className="rounded bg-ink px-1 py-0.5 text-xs">{EDITOR_REPO.owner}/{EDITOR_REPO.repo}</code>.
            Ask a repo owner to add you.
          </p>
          <button
            onClick={handleSignOut}
            className="rounded-md border border-ash/30 px-4 py-2 font-ui text-sm text-ash hover:border-gilt hover:text-gilt"
          >
            Sign out
          </button>
        </>
      )}
      {state.kind === 'error' && (
        <>
          <p className="max-w-md font-ui text-sm text-ignis">{state.message}</p>
          <button
            onClick={handleSignIn}
            className="rounded-md bg-gilt px-4 py-2 font-ui text-sm font-semibold text-ink transition-colors hover:bg-gilt/90"
          >
            Retry sign in
          </button>
        </>
      )}
    </div>
  )
}
