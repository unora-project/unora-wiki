import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router'
import { Layout } from '@/components/layout/Layout'
import { Home } from '@/pages/Home'

const Equipment = lazy(() => import('@/pages/Equipment').then((m) => ({ default: m.Equipment })))
const Classes = lazy(() => import('@/pages/Classes').then((m) => ({ default: m.Classes })))
const ClassDetail = lazy(() => import('@/pages/ClassDetail').then((m) => ({ default: m.ClassDetail })))
const Professions = lazy(() => import('@/pages/Professions').then((m) => ({ default: m.Professions })))
const ProfessionDetail = lazy(() => import('@/pages/ProfessionDetail').then((m) => ({ default: m.ProfessionDetail })))
const Religion = lazy(() => import('@/pages/Religion').then((m) => ({ default: m.Religion })))
const GodDetail = lazy(() => import('@/pages/GodDetail').then((m) => ({ default: m.GodDetail })))
const Towns = lazy(() => import('@/pages/Towns').then((m) => ({ default: m.Towns })))
const TownDetail = lazy(() => import('@/pages/TownDetail').then((m) => ({ default: m.TownDetail })))
const Mounts = lazy(() => import('@/pages/Mounts').then((m) => ({ default: m.Mounts })))
const BossDrops = lazy(() => import('@/pages/BossDrops').then((m) => ({ default: m.BossDrops })))
const HuntingGrounds = lazy(() => import('@/pages/HuntingGrounds').then((m) => ({ default: m.HuntingGrounds })))
const HuntingArea = lazy(() => import('@/pages/HuntingArea').then((m) => ({ default: m.HuntingArea })))
const Quests = lazy(() => import('@/pages/Quests').then((m) => ({ default: m.Quests })))
const QuestDetail = lazy(() => import('@/pages/QuestDetail').then((m) => ({ default: m.QuestDetail })))
const QuestCircle = lazy(() => import('@/pages/QuestCircle').then((m) => ({ default: m.QuestCircle })))
const LoreIndex = lazy(() => import('@/pages/Lore').then((m) => ({ default: m.LoreIndex })))
const LoreDetail = lazy(() => import('@/pages/Lore').then((m) => ({ default: m.LoreDetail })))
const PatchNotes = lazy(() => import('@/pages/PatchNotes').then((m) => ({ default: m.PatchNotes })))
const HpMpCalculator = lazy(() => import('@/pages/calculators/HpMpCalculator').then((m) => ({ default: m.HpMpCalculator })))
const StatCalculator = lazy(() => import('@/pages/calculators/StatCalculator').then((m) => ({ default: m.StatCalculator })))
const Glossary = lazy(() => import('@/pages/Glossary').then((m) => ({ default: m.Glossary })))
const GettingStarted = lazy(() => import('@/pages/GettingStarted').then((m) => ({ default: m.GettingStarted })))
const Changelog = lazy(() => import('@/pages/Changelog').then((m) => ({ default: m.Changelog })))

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gilt/20 border-t-gilt" />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />

        <Route
          path="*"
          element={
            <Suspense fallback={<RouteFallback />}>
              <LazyRoutes />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  )
}

function LazyRoutes() {
  return (
    <Routes>
      {/* Classes */}
      <Route path="classes" element={<Classes />} />
      <Route path="classes/:className" element={<ClassDetail />} />

      {/* Equipment */}
      <Route path="equipment" element={<Equipment />} />

      {/* Quests */}
      <Route path="quests" element={<Quests />} />
      <Route path="quests/:circle" element={<QuestCircle />} />
      <Route path="quests/:circle/:slug" element={<QuestDetail />} />

      {/* Hunting Grounds */}
      <Route path="hunting" element={<HuntingGrounds />} />
      <Route path="hunting/:area" element={<HuntingArea />} />

      {/* Professions */}
      <Route path="professions" element={<Professions />} />
      <Route path="professions/:type" element={<ProfessionDetail />} />

      {/* Religion */}
      <Route path="religion" element={<Religion />} />
      <Route path="religion/:god" element={<GodDetail />} />

      {/* Towns */}
      <Route path="towns" element={<Towns />} />
      <Route path="towns/:town" element={<TownDetail />} />

      {/* Single pages */}
      <Route path="mounts" element={<Mounts />} />
      <Route path="boss-drops" element={<BossDrops />} />
      <Route path="lore" element={<LoreIndex />} />
      <Route path="lore/:slug" element={<LoreDetail />} />
      <Route path="patch-notes" element={<PatchNotes />} />

      {/* Calculators */}
      <Route path="calculators/hpmp" element={<HpMpCalculator />} />
      <Route path="calculators/stats" element={<StatCalculator />} />

      {/* Reference */}
      <Route path="glossary" element={<Glossary />} />
      <Route path="getting-started" element={<GettingStarted />} />
      <Route path="changelog" element={<Changelog />} />

      {/* Catch-all */}
      <Route path="*" element={<ComingSoon />} />
    </Routes>
  )
}

function ComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h1 className="font-heading text-3xl font-bold text-gilt">
        Coming Soon
      </h1>
      <p className="mt-2 text-parchment-600 dark:text-ivory/60">
        This section is under construction.
      </p>
    </div>
  )
}
