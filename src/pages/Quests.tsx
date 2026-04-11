import { useState } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  Compass, Repeat, Sword, CalendarClock, PartyPopper,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface QuestLink {
  name: string
  slug: string
  circle: string
}

const circleQuests: { title: string; levelRange: string; circle: string; quests: QuestLink[] }[] = [
  {
    title: 'Circle 1',
    levelRange: '1-10',
    circle: 'circle_1',
    quests: [
      { name: 'Tutorial', slug: 'tutorial', circle: 'circle_1' },
      { name: 'Find the Mysterious Artifact', slug: 'find_the_mysterious_artifact', circle: 'circle_1' },
      { name: 'Holy Research', slug: 'holy_research', circle: 'circle_1' },
      { name: 'Dark Research', slug: 'dark_research', circle: 'circle_1' },
      { name: 'Wolf Problem', slug: 'wolf_problem', circle: 'circle_1' },
      { name: 'Bee Problem', slug: 'bee_problem', circle: 'circle_1' },
      { name: 'Leaders of Mythic', slug: 'leaders_of_mythic', circle: 'circle_1' },
      { name: 'Terror of the Crypt', slug: 'terror_of_the_crypt', circle: 'circle_1' },
    ],
  },
  {
    title: 'Circle 2',
    levelRange: '11-40',
    circle: 'circle_2',
    quests: [
      { name: 'The Sacrifice', slug: 'the_sacrifice', circle: 'circle_2' },
      { name: 'Swamp Maze', slug: 'swamp_maze', circle: 'circle_2' },
      { name: 'Ice Wall', slug: 'ice_wall', circle: 'circle_2' },
      { name: 'Porte Forest', slug: 'porte_forest', circle: 'circle_2' },
      { name: 'Antique Necklace', slug: 'antique_necklace', circle: 'circle_2' },
      { name: "Fisk's Secret", slug: 'fisks_secret', circle: 'circle_2' },
      { name: 'Sick Child', slug: 'sick_child', circle: 'circle_2' },
    ],
  },
  {
    title: 'Circle 3',
    levelRange: '41-70',
    circle: 'circle_3',
    quests: [
      { name: 'Feeding the Beggar', slug: 'feeding_the_beggar', circle: 'circle_3' },
      { name: 'Queen Octopus', slug: 'queen_octopus', circle: 'circle_3' },
      { name: 'Dragon Scale', slug: 'dragon_scale', circle: 'circle_3' },
      { name: "Louegie's Ghost Problem", slug: 'louegies_ghost_problem', circle: 'circle_3' },
      { name: 'Supply Loures Army', slug: 'supply_loures_army', circle: 'circle_3' },
      { name: 'Pentagram', slug: 'pentagram', circle: 'circle_3' },
    ],
  },
  {
    title: 'Circle 4',
    levelRange: '71-98',
    circle: 'circle_4',
    quests: [
      { name: 'Werewolf of Piet', slug: 'werewolf_of_piet', circle: 'circle_4' },
      { name: 'Protect Lynith Pirate Ship', slug: 'protect_lynith_pirate_ship', circle: 'circle_4' },
      { name: 'Challenge the Carnun', slug: 'challenge_the_carnun', circle: 'circle_4' },
      { name: 'Nightmare', slug: 'nightmare', circle: 'circle_4' },
    ],
  },
  {
    title: 'Circle 5',
    levelRange: '99+',
    circle: 'circle_5',
    quests: [
      { name: 'Help Daltoo Escape', slug: 'help_daltoo_escape', circle: 'circle_5' },
      { name: 'Find the Summoner Again', slug: 'find_the_summoner_again', circle: 'circle_5' },
      { name: 'Bounty Board', slug: 'bounty_board', circle: 'circle_5' },
    ],
  },
]

const dailyQuests: QuestLink[] = [
  { name: "Antonio's Vault Squeaks", slug: 'antonios_vault_squeaks', circle: 'side' },
  { name: 'Blade Material', slug: 'blade_material', circle: 'side' },
  { name: 'Burning Wood', slug: 'burning_wood', circle: 'side' },
  { name: 'Crude Leather', slug: 'crude_leather', circle: 'side' },
  { name: 'Decorating the Inn', slug: 'decorating_the_inn', circle: 'side' },
  { name: 'Pretty Flower', slug: 'pretty_flower', circle: 'side' },
  { name: 'Red Potion', slug: 'red_potion', circle: 'side' },
  { name: 'Suomi Tavern', slug: 'suomi_tavern', circle: 'side' },
]

const slayerQuests: QuestLink[] = [
  { name: 'Slayer of the Crypt', slug: 'slayer_of_the_crypt', circle: 'slayers' },
  { name: 'East Woodlands Slayer', slug: 'east_woodlands_slayer', circle: 'slayers' },
  { name: 'Astrid Slayer', slug: 'astrid_slayer', circle: 'slayers' },
  { name: 'Dubhaim Castle Slayer', slug: 'dubhaim_castle_slayer', circle: 'slayers' },
  { name: 'West Woodlands Slayer', slug: 'west_woodlands_slayer', circle: 'slayers' },
  { name: 'Piet Sewer Slayer', slug: 'piet_sewer_slayer', circle: 'side' },
  { name: 'Karlopos Slayer', slug: 'karlopos_slayer', circle: 'slayers' },
  { name: 'Abel Dungeon Slayer', slug: 'abel_dungeon_slayer', circle: 'slayers' },
]

const eventQuests: QuestLink[] = [
  { name: 'Lucky Charms (St. Patrick\'s Day)', slug: 'lucky_charms', circle: 'events' },
  { name: 'Hopocalypse (Easter Event)', slug: 'hopocalypse', circle: 'events' },
]

const repeatableDungeons: QuestLink[] = [
  { name: 'Terror of the Crypt', slug: 'terror_of_the_crypt', circle: 'circle_1' },
  { name: 'Lost Woodlands', slug: 'lost_woodlands', circle: 'side' },
  { name: 'Purple Whopper Scales', slug: 'purple_whopper_scales', circle: 'side' },
]

type TabId = 'story' | 'daily' | 'slayer' | 'dungeons' | 'events'

interface Tab {
  id: TabId
  label: string
  icon: LucideIcon
  count: number
}

const tabs: Tab[] = [
  { id: 'story', label: 'Story', icon: Compass, count: circleQuests.reduce((n, c) => n + c.quests.length, 0) },
  { id: 'daily', label: 'Daily', icon: CalendarClock, count: dailyQuests.length },
  { id: 'slayer', label: 'Kill Quests', icon: Sword, count: slayerQuests.length },
  { id: 'dungeons', label: 'Dungeons', icon: Repeat, count: repeatableDungeons.length },
  { id: 'events', label: 'Events', icon: PartyPopper, count: eventQuests.length },
]

function QuestCard({ quest }: { quest: QuestLink }) {
  return (
    <Link
      to={`/quests/${quest.circle}/${quest.slug}`}
      className="group flex items-center justify-between rounded-lg border border-parchment-300 bg-parchment-100 px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-tide hover:shadow-sm dark:border-ash/10 dark:bg-ink dark:hover:border-tide/60"
    >
      <span className="font-ui text-sm font-medium text-parchment-800 transition-colors group-hover:text-tide dark:text-ivory/90 dark:group-hover:text-tide">
        {quest.name}
      </span>
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ash/40 transition-colors group-hover:text-tide">
        <path d="m9 18 6-6-6-6"/>
      </svg>
    </Link>
  )
}

function StoryTab() {
  return (
    <div className="space-y-8">
      {circleQuests.map((circle) => (
        <section key={circle.title}>
          <div className="mb-3 flex items-center gap-3">
            <h3 className="font-heading text-lg font-semibold text-gilt">
              {circle.title}
            </h3>
            <span className="rounded-full bg-tide/10 px-2.5 py-0.5 font-ui text-xs font-medium text-tide">
              Lv. {circle.levelRange}
            </span>
            <span className="font-ui text-xs text-ash">
              {circle.quests.length} quests
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {circle.quests.map((q) => (
              <QuestCard key={`${q.circle}/${q.slug}`} quest={q} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function SimpleQuestGrid({ quests, description }: { quests: QuestLink[]; description?: string }) {
  return (
    <div>
      {description && (
        <p className="mb-4 font-ui text-sm text-parchment-600 dark:text-ash">
          {description}
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {quests.map((q) => (
          <QuestCard key={`${q.circle}/${q.slug}`} quest={q} />
        ))}
      </div>
    </div>
  )
}

export function Quests() {
  const [activeTab, setActiveTab] = useState<TabId>('story')

  return (
    <div>
      <PageHeader
        title="Quests"
        description='A "circle" in Unora is simply a level range (i.e. levels 1-10). Use the tabs below to browse by quest type.'
        accent="tide"
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-parchment-300 bg-parchment-100 p-1 dark:border-ash/10 dark:bg-ink">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 font-ui text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-tide/10 text-tide'
                : 'text-ash hover:text-parchment-800 dark:hover:text-ivory'
            }`}
          >
            <tab.icon size={15} className="shrink-0" />
            <span>{tab.label}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              activeTab === tab.id
                ? 'bg-tide/15 text-tide'
                : 'bg-parchment-200 text-ash dark:bg-obsidian'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in-up">
        {activeTab === 'story' && <StoryTab />}
        {activeTab === 'daily' && (
          <SimpleQuestGrid
            quests={dailyQuests}
            description="Quests which can be completed more than once (with a cooldown)."
          />
        )}
        {activeTab === 'slayer' && (
          <SimpleQuestGrid
            quests={slayerQuests}
            description="Repeatable quests that involve defeating monsters in a given area."
          />
        )}
        {activeTab === 'dungeons' && (
          <SimpleQuestGrid
            quests={repeatableDungeons}
            description="Dungeons that can be run multiple times for rewards."
          />
        )}
        {activeTab === 'events' && (
          <SimpleQuestGrid
            quests={eventQuests}
            description="Seasonal and limited-time event quests."
          />
        )}
      </div>
    </div>
  )
}
