import { useParams, Link } from 'react-router'
import { PageHeader } from '@/components/ui/PageHeader'

interface QuestLink {
  name: string
  slug: string
  circle: string
}

const circles: Record<string, { title: string; levelRange: string; description: string; quests: QuestLink[] }> = {
  circle_1: {
    title: 'Circle 1',
    levelRange: '1-10',
    description: 'The first circle of quests, available to new aislings starting their journey.',
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
  circle_2: {
    title: 'Circle 2',
    levelRange: '11-40',
    description: 'Quests for aislings who have proven themselves in the first circle.',
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
  circle_3: {
    title: 'Circle 3',
    levelRange: '41-70',
    description: 'Challenging quests for experienced aislings venturing into dangerous territory.',
    quests: [
      { name: 'Feeding the Beggar', slug: 'feeding_the_beggar', circle: 'circle_3' },
      { name: 'Queen Octopus', slug: 'queen_octopus', circle: 'circle_3' },
      { name: 'Dragon Scale', slug: 'dragon_scale', circle: 'circle_3' },
      { name: "Louegie's Ghost Problem", slug: 'louegies_ghost_problem', circle: 'circle_3' },
      { name: 'Supply Loures Army', slug: 'supply_loures_army', circle: 'circle_3' },
      { name: 'Pentagram', slug: 'pentagram', circle: 'circle_3' },
    ],
  },
  circle_4: {
    title: 'Circle 4',
    levelRange: '71-98',
    description: 'Late-game quests that test even the most seasoned aislings.',
    quests: [
      { name: 'Werewolf of Piet', slug: 'werewolf_of_piet', circle: 'circle_4' },
      { name: 'Protect Lynith Pirate Ship', slug: 'protect_lynith_pirate_ship', circle: 'circle_4' },
      { name: 'Challenge the Carnun', slug: 'challenge_the_carnun', circle: 'circle_4' },
      { name: 'Nightmare', slug: 'nightmare', circle: 'circle_4' },
    ],
  },
  circle_5: {
    title: 'Circle 5',
    levelRange: '99+',
    description: 'The final circle of quests for master-level aislings.',
    quests: [
      { name: 'Help Daltoo Escape', slug: 'help_daltoo_escape', circle: 'circle_5' },
      { name: 'Find the Summoner Again', slug: 'find_the_summoner_again', circle: 'circle_5' },
      { name: 'Bounty Board', slug: 'bounty_board', circle: 'circle_5' },
    ],
  },
  side: {
    title: 'Daily Quests',
    levelRange: 'Any',
    description: 'Quests which can be completed more than once (with a cooldown).',
    quests: [
      { name: "Antonio's Vault Squeaks", slug: 'antonios_vault_squeaks', circle: 'side' },
      { name: 'Blade Material', slug: 'blade_material', circle: 'side' },
      { name: 'Burning Wood', slug: 'burning_wood', circle: 'side' },
      { name: 'Crude Leather', slug: 'crude_leather', circle: 'side' },
      { name: 'Decorating the Inn', slug: 'decorating_the_inn', circle: 'side' },
      { name: 'Pretty Flower', slug: 'pretty_flower', circle: 'side' },
      { name: 'Red Potion', slug: 'red_potion', circle: 'side' },
      { name: 'Suomi Tavern', slug: 'suomi_tavern', circle: 'side' },
    ],
  },
  slayers: {
    title: 'Kill Quests',
    levelRange: 'Any',
    description: 'Repeatable quests that involve defeating monsters in a given area.',
    quests: [
      { name: 'Slayer of the Crypt', slug: 'slayer_of_the_crypt', circle: 'slayers' },
      { name: 'East Woodlands Slayer', slug: 'east_woodlands_slayer', circle: 'slayers' },
      { name: 'Astrid Slayer', slug: 'astrid_slayer', circle: 'slayers' },
      { name: 'Dubhaim Castle Slayer', slug: 'dubhaim_castle_slayer', circle: 'slayers' },
      { name: 'West Woodlands Slayer', slug: 'west_woodlands_slayer', circle: 'slayers' },
      { name: 'Piet Sewer Slayer', slug: 'piet_sewer_slayer', circle: 'side' },
      { name: 'Karlopos Slayer', slug: 'karlopos_slayer', circle: 'slayers' },
      { name: 'Abel Dungeon Slayer', slug: 'abel_dungeon_slayer', circle: 'slayers' },
    ],
  },
  events: {
    title: 'Event Quests',
    levelRange: 'Any',
    description: 'Seasonal and limited-time event quests.',
    quests: [
      { name: "Lucky Charms (St. Patrick's Day)", slug: 'lucky_charms', circle: 'events' },
      { name: 'Hopocalypse (Easter Event)', slug: 'hopocalypse', circle: 'events' },
    ],
  },
}

export function QuestCircle() {
  const { circle } = useParams<{ circle: string }>()

  const data = circle ? circles[circle] : null

  if (!data) {
    return (
      <div className="py-20 text-center">
        <h1 className="font-heading text-2xl text-gilt">Circle not found</h1>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={data.title}
        accent="tide"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Quests', to: '/quests' },
          { label: data.title },
        ]}
      />

      <div className="mb-4 flex items-center gap-3">
        <span className="rounded-full bg-tide/10 px-2.5 py-0.5 font-ui text-xs font-medium text-tide">
          Lv. {data.levelRange}
        </span>
        <span className="font-ui text-xs text-ash">
          {data.quests.length} quests
        </span>
      </div>

      <p className="mb-6 text-sm text-parchment-600 dark:text-parchment-400">
        {data.description}
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {data.quests.map((quest) => (
          <Link
            key={quest.slug}
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
        ))}
      </div>
    </div>
  )
}
