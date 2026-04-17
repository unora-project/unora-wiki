export interface SearchItem {
  title: string
  category: string
  path: string
}

// ── Static pages (synchronous, tiny) ──
const staticPages: SearchItem[] = [
  // Classes
  { title: 'Warrior', category: 'Classes', path: '/classes/warrior' },
  { title: 'Monk', category: 'Classes', path: '/classes/monk' },
  { title: 'Priest', category: 'Classes', path: '/classes/priest' },
  { title: 'Rogue', category: 'Classes', path: '/classes/rogue' },
  { title: 'Wizard', category: 'Classes', path: '/classes/wizard' },
  { title: 'Peasant', category: 'Classes', path: '/classes/peasant' },
  // Professions
  { title: 'Alchemy', category: 'Professions', path: '/professions/alchemy' },
  { title: 'Armorsmithing', category: 'Professions', path: '/professions/armorsmithing' },
  { title: 'Enchanting', category: 'Professions', path: '/professions/enchanting' },
  { title: 'Jewelcrafting', category: 'Professions', path: '/professions/jewelcrafting' },
  { title: 'Weaponsmithing', category: 'Professions', path: '/professions/weaponsmithing' },
  { title: 'Cooking', category: 'Professions', path: '/professions/cooking' },
  { title: 'Fishing', category: 'Professions', path: '/professions/fishing' },
  { title: 'Foraging', category: 'Professions', path: '/professions/foraging' },
  // Religion
  { title: 'Miraelis', category: 'Religion', path: '/religion/miraelis' },
  { title: 'Serendael', category: 'Religion', path: '/religion/serendael' },
  { title: 'Skandara', category: 'Religion', path: '/religion/skandara' },
  { title: 'Theselene', category: 'Religion', path: '/religion/theselene' },
  // Towns
  { title: 'Mileth', category: 'Towns', path: '/towns/mileth' },
  { title: 'Abel', category: 'Towns', path: '/towns/abel' },
  { title: 'Piet', category: 'Towns', path: '/towns/piet' },
  { title: 'Loures', category: 'Towns', path: '/towns/loures' },
  { title: 'Undine', category: 'Towns', path: '/towns/undine' },
  { title: 'Suomi', category: 'Towns', path: '/towns/suomi' },
  { title: 'Rucesion', category: 'Towns', path: '/towns/rucesion' },
  { title: 'Tagor', category: 'Towns', path: '/towns/tagor' },
  // Main sections
  { title: 'Equipment', category: 'Equipment', path: '/equipment' },
  { title: 'Quests', category: 'Quests', path: '/quests' },
  { title: 'Hunting Grounds', category: 'Hunting', path: '/hunting' },
  { title: 'Mounts & Cloaks', category: 'Mounts', path: '/mounts' },
  { title: 'Boss Drops', category: 'Boss Drops', path: '/boss-drops' },
  { title: 'Lore of Unora', category: 'Lore', path: '/lore/overview' },
  { title: 'The Great Divine War', category: 'Lore', path: '/lore/the_great_divine_war' },
  { title: 'Patch Notes', category: 'Patch Notes', path: '/patch-notes' },
  { title: 'HP/MP Calculator', category: 'Tools', path: '/calculators/hpmp' },
  { title: 'Stat Calculator', category: 'Tools', path: '/calculators/stats' },
  { title: 'Glossary', category: 'Reference', path: '/glossary' },
  // Hunting areas
  { title: 'Mileth Crypt', category: 'Hunting', path: '/hunting/mileth_crypt' },
  { title: 'East Woodlands', category: 'Hunting', path: '/hunting/east_woodlands' },
  { title: 'West Woodlands', category: 'Hunting', path: '/hunting/west_woodlands' },
  { title: 'Dubhaim Castle', category: 'Hunting', path: '/hunting/dubhaim_castle' },
  { title: 'Abel Dungeon', category: 'Hunting', path: '/hunting/abel_dungeon' },
  { title: 'Kasmanium Mines', category: 'Hunting', path: '/hunting/kasmanium_mines' },
  { title: 'Deep Crypt', category: 'Hunting', path: '/hunting/deep_crypt' },
  { title: 'Shinewood Forest', category: 'Hunting', path: '/hunting/shinewood_forest' },
  { title: 'Cthonic Remains', category: 'Hunting', path: '/hunting/cthonic_remains' },
  { title: 'Chaos', category: 'Hunting', path: '/hunting/chaos' },
  { title: 'Limbo', category: 'Hunting', path: '/hunting/limbo' },
  { title: 'Mount Giragan', category: 'Hunting', path: '/hunting/mount_giragan' },
  { title: 'Porte Forest', category: 'Hunting', path: '/hunting/porte_forest' },
  { title: 'Astrid', category: 'Hunting', path: '/hunting/astrid' },
  { title: 'Eingren Manor', category: 'Hunting', path: '/hunting/eingren_manor' },
  { title: 'House Macabre', category: 'Hunting', path: '/hunting/house_macabre' },
  { title: 'Karlopos Island', category: 'Hunting', path: '/hunting/karlopos_island' },
  { title: 'Piet/Loures Sewer', category: 'Hunting', path: '/hunting/piet_sewers' },
  { title: 'Lost Woodlands', category: 'Hunting', path: '/hunting/lost_woodlands' },
  { title: 'Undine Field', category: 'Hunting', path: '/hunting/undine_field' },
  { title: 'Grassy Fields', category: 'Hunting', path: '/hunting/grassy_fields' },
  { title: 'Nobis Maze', category: 'Hunting', path: '/hunting/nobis_maze' },
  { title: 'Oren Ruins', category: 'Hunting', path: '/hunting/oren_ruins' },
  { title: 'Mehadi', category: 'Hunting', path: '/hunting/mehadi' },
  // All quests
  { title: 'Tutorial', category: 'Quests', path: '/quests/circle_1/tutorial' },
  { title: 'Find the Mysterious Artifact', category: 'Quests', path: '/quests/circle_1/find_the_mysterious_artifact' },
  { title: 'Bee Problem', category: 'Quests', path: '/quests/circle_1/bee_problem' },
  { title: 'Wolf Problem', category: 'Quests', path: '/quests/circle_1/wolf_problem' },
  { title: 'Terror of the Crypt', category: 'Quests', path: '/quests/circle_1/terror_of_the_crypt' },
  { title: 'Dark Research', category: 'Quests', path: '/quests/circle_1/dark_research' },
  { title: 'Holy Research', category: 'Quests', path: '/quests/circle_1/holy_research' },
  { title: 'Leaders of Mythic', category: 'Quests', path: '/quests/circle_1/leaders_of_mythic' },
  { title: 'The Sacrifice', category: 'Quests', path: '/quests/circle_2/the_sacrifice' },
  { title: 'Swamp Maze', category: 'Quests', path: '/quests/circle_2/swamp_maze' },
  { title: 'Antique Necklace', category: 'Quests', path: '/quests/circle_2/antique_necklace' },
  { title: "Fisk's Secret", category: 'Quests', path: '/quests/circle_2/fisks_secret' },
  { title: 'Ice Wall', category: 'Quests', path: '/quests/circle_2/ice_wall' },
  { title: 'Porte Forest Quest', category: 'Quests', path: '/quests/circle_2/porte_forest' },
  { title: 'Sick Child', category: 'Quests', path: '/quests/circle_2/sick_child' },
  { title: 'Pentagram', category: 'Quests', path: '/quests/circle_3/pentagram' },
  { title: 'Dragon Scale', category: 'Quests', path: '/quests/circle_3/dragon_scale' },
  { title: 'Feeding the Beggar', category: 'Quests', path: '/quests/circle_3/feeding_the_beggar' },
  { title: "Louegie's Ghost Problem", category: 'Quests', path: '/quests/circle_3/louegies_ghost_problem' },
  { title: 'Queen Octopus', category: 'Quests', path: '/quests/circle_3/queen_octopus' },
  { title: 'Supply Loures Army', category: 'Quests', path: '/quests/circle_3/supply_loures_army' },
  { title: 'Nightmare', category: 'Quests', path: '/quests/circle_4/nightmare' },
  { title: 'Challenge the Carnun', category: 'Quests', path: '/quests/circle_4/challenge_the_carnun' },
  { title: 'Protect Lynith Pirate Ship', category: 'Quests', path: '/quests/circle_4/protect_lynith_pirate_ship' },
  { title: 'Werewolf of Piet', category: 'Quests', path: '/quests/circle_4/werewolf_of_piet' },
  { title: 'Bounty Board', category: 'Quests', path: '/quests/circle_5/bounty_board' },
  { title: 'Find the Summoner Again', category: 'Quests', path: '/quests/circle_5/find_the_summoner_again' },
  { title: 'Help Daltoo Escape', category: 'Quests', path: '/quests/circle_5/help_daltoo_escape' },
  // Side quests
  { title: "Antonio's Vault Squeaks", category: 'Side Quests', path: '/quests/side/antonios_vault_squeaks' },
  { title: 'Blade Material', category: 'Side Quests', path: '/quests/side/blade_material' },
  { title: 'Burning Wood', category: 'Side Quests', path: '/quests/side/burning_wood' },
  { title: 'Crude Leather', category: 'Side Quests', path: '/quests/side/crude_leather' },
  { title: 'Decorating the Inn', category: 'Side Quests', path: '/quests/side/decorating_the_inn' },
  { title: 'Lost Woodlands Quest', category: 'Side Quests', path: '/quests/side/lost_woodlands' },
  { title: 'Pretty Flower', category: 'Side Quests', path: '/quests/side/pretty_flower' },
  { title: 'Purple Whopper Scales', category: 'Side Quests', path: '/quests/side/purple_whopper_scales' },
  { title: 'Red Potion', category: 'Side Quests', path: '/quests/side/red_potion' },
  { title: 'Suomi Tavern', category: 'Side Quests', path: '/quests/side/suomi_tavern' },
  // Slayer quests
  { title: 'Abel Dungeon Slayer', category: 'Slayer Quests', path: '/quests/slayers/abel_dungeon_slayer' },
  { title: 'Astrid Slayer', category: 'Slayer Quests', path: '/quests/slayers/astrid_slayer' },
  { title: 'Dubhaim Castle Slayer', category: 'Slayer Quests', path: '/quests/slayers/dubhaim_castle_slayer' },
  { title: 'East Woodlands Slayer', category: 'Slayer Quests', path: '/quests/slayers/east_woodlands_slayer' },
  { title: 'Karlopos Slayer', category: 'Slayer Quests', path: '/quests/slayers/karlopos_slayer' },
  { title: 'Piet Sewer Slayer', category: 'Slayer Quests', path: '/quests/slayers/piet_sewer_slayer' },
  { title: 'Slayer of the Crypt', category: 'Slayer Quests', path: '/quests/slayers/slayer_of_the_crypt' },
  { title: 'West Woodlands Slayer', category: 'Slayer Quests', path: '/quests/slayers/west_woodlands_slayer' },
  // Events
  { title: 'Hopocalypse', category: 'Events', path: '/quests/events/hopocalypse' },
  { title: 'Lucky Charms', category: 'Events', path: '/quests/events/lucky_charms' },
]

// Exported lightweight synchronous index — safe for eager consumers.
// Heavy data (equipment / skills / spells / npcs / bosses) loads via loadFullSearchIndex.
export const searchIndex: SearchItem[] = staticPages

function deduplicateByTitle(items: SearchItem[]): SearchItem[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = `${item.title}|${item.path}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

let fullIndexCache: SearchItem[] | null = null
let fullIndexPromise: Promise<SearchItem[]> | null = null

async function buildFullIndex(): Promise<SearchItem[]> {
  const [equipmentRes, skillsMod, spellsMod, npcsMod, bossesMod] = await Promise.all([
    fetch('/data/equipment.json').then((r) => r.json() as Promise<{ name: string; category: string; class: string }[]>),
    import('@/data/classes/skills.json'),
    import('@/data/classes/spells.json'),
    import('@/data/towns/npcs.json'),
    import('@/data/hunting/bosses.json'),
  ])

  const skillsData = skillsMod.default as { name: string; class: string }[]
  const spellsData = spellsMod.default as { name: string; class: string }[]
  const npcsData = npcsMod.default as { name: string; town: string; type: string }[]
  const bossesData = bossesMod.default as { boss: string; locationSlug: string }[]

  const equipmentItems: SearchItem[] = (() => {
    const seen = new Set<string>()
    const items: SearchItem[] = []
    for (const item of equipmentRes) {
      if (!seen.has(item.name)) {
        seen.add(item.name)
        items.push({ title: item.name, category: 'Equipment', path: '/equipment' })
      }
    }
    return items
  })()

  const skillItems: SearchItem[] = skillsData.map((s) => ({
    title: s.name,
    category: `${s.class.charAt(0).toUpperCase() + s.class.slice(1)} Skill`,
    path: `/classes/${s.class}`,
  }))

  const spellItems: SearchItem[] = spellsData.map((s) => ({
    title: s.name,
    category: `${s.class.charAt(0).toUpperCase() + s.class.slice(1)} Spell`,
    path: `/classes/${s.class}`,
  }))

  const npcItems: SearchItem[] = (() => {
    const seen = new Set<string>()
    const items: SearchItem[] = []
    for (const npc of npcsData) {
      const key = `${npc.name}-${npc.town}`
      if (!seen.has(key)) {
        seen.add(key)
        items.push({
          title: npc.name,
          category: `NPC (${npc.town.charAt(0).toUpperCase() + npc.town.slice(1)})`,
          path: `/towns/${npc.town}`,
        })
      }
    }
    return items
  })()

  const bossItems: SearchItem[] = bossesData.map((b) => ({
    title: b.boss,
    category: 'Boss',
    path: '/boss-drops',
  }))

  return deduplicateByTitle([
    ...staticPages,
    ...skillItems,
    ...spellItems,
    ...bossItems,
    ...npcItems,
    ...equipmentItems,
  ])
}

export function loadFullSearchIndex(): Promise<SearchItem[]> {
  if (fullIndexCache) return Promise.resolve(fullIndexCache)
  if (!fullIndexPromise) {
    fullIndexPromise = buildFullIndex().then((items) => {
      fullIndexCache = items
      return items
    })
  }
  return fullIndexPromise
}

export function getCachedFullSearchIndex(): SearchItem[] | null {
  return fullIndexCache
}
