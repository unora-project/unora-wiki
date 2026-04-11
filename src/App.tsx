import { Routes, Route } from 'react-router'
import { Layout } from '@/components/layout/Layout'
import { Home } from '@/pages/Home'
import { Equipment } from '@/pages/Equipment'
import { Classes } from '@/pages/Classes'
import { ClassDetail } from '@/pages/ClassDetail'
import { Professions } from '@/pages/Professions'
import { ProfessionDetail } from '@/pages/ProfessionDetail'
import { Religion } from '@/pages/Religion'
import { GodDetail } from '@/pages/GodDetail'
import { Towns } from '@/pages/Towns'
import { TownDetail } from '@/pages/TownDetail'
import { Mounts } from '@/pages/Mounts'
import { BossDrops } from '@/pages/BossDrops'
import { HuntingGrounds } from '@/pages/HuntingGrounds'
import { HuntingArea } from '@/pages/HuntingArea'
import { Quests } from '@/pages/Quests'
import { QuestDetail } from '@/pages/QuestDetail'
import { QuestCircle } from '@/pages/QuestCircle'
import { LoreIndex, LoreDetail } from '@/pages/Lore'
import { PatchNotes } from '@/pages/PatchNotes'
import { HpMpCalculator } from '@/pages/calculators/HpMpCalculator'
import { StatCalculator } from '@/pages/calculators/StatCalculator'
import { Glossary } from '@/pages/Glossary'
import { GettingStarted } from '@/pages/GettingStarted'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />

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

        {/* Catch-all */}
        <Route path="*" element={<ComingSoon />} />
      </Route>
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
