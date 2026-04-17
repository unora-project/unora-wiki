type Importer = () => Promise<unknown>

interface NetworkInformation {
  saveData?: boolean
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g'
}

// Ordered by expected user demand — most-common routes first, so if
// the chain gets interrupted (tab hidden, slow network) we still prefetched
// the pages most clicks want.
const ROUTE_IMPORTERS: Importer[] = [
  () => import('@/pages/Classes'),
  () => import('@/pages/Equipment'),
  () => import('@/pages/Quests'),
  () => import('@/pages/HuntingGrounds'),
  () => import('@/pages/Mounts'),
  () => import('@/pages/Professions'),
  () => import('@/pages/Religion'),
  () => import('@/pages/Towns'),
  () => import('@/pages/BossDrops'),
  () => import('@/pages/PatchNotes'),
  () => import('@/pages/Lore'),
  () => import('@/pages/Glossary'),
  () => import('@/pages/GettingStarted'),
  () => import('@/pages/Changelog'),
  () => import('@/pages/ClassDetail'),
  () => import('@/pages/ProfessionDetail'),
  () => import('@/pages/GodDetail'),
  () => import('@/pages/TownDetail'),
  () => import('@/pages/HuntingArea'),
  () => import('@/pages/QuestCircle'),
  () => import('@/pages/QuestDetail'),
  () => import('@/pages/calculators/HpMpCalculator'),
  () => import('@/pages/calculators/StatCalculator'),
]

let started = false

function shouldSkipPrefetch(): boolean {
  const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection
  if (!conn) return false
  if (conn.saveData) return true
  if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g') return true
  return false
}

type IdleCallback = (cb: () => void, opts?: { timeout: number }) => number
type CancelIdle = (id: number) => void

function scheduleIdle(cb: () => void): () => void {
  const ric = (window as unknown as { requestIdleCallback?: IdleCallback }).requestIdleCallback
  if (ric) {
    const id = ric(cb, { timeout: 3000 })
    return () => {
      const cic = (window as unknown as { cancelIdleCallback?: CancelIdle }).cancelIdleCallback
      cic?.(id)
    }
  }
  const t = window.setTimeout(cb, 500)
  return () => window.clearTimeout(t)
}

export function prefetchAllRoutes(): () => void {
  if (started) return () => {}
  started = true
  if (shouldSkipPrefetch()) return () => {}

  let cancelled = false
  let cancelCurrent: (() => void) | null = null

  const step = (i: number) => {
    if (cancelled || i >= ROUTE_IMPORTERS.length) return
    cancelCurrent = scheduleIdle(() => {
      ROUTE_IMPORTERS[i]().finally(() => step(i + 1))
    })
  }

  step(0)

  return () => {
    cancelled = true
    cancelCurrent?.()
  }
}
