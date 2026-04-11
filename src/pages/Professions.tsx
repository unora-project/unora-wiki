import { PageHeader } from '@/components/ui/PageHeader'
import { CardGrid, type CardItem } from '@/components/ui/CardGrid'
import {
  FlaskConical, Shield, Wand, Gem, Anvil,
  UtensilsCrossed, Fish, Leaf,
} from 'lucide-react'

const primary: CardItem[] = [
  {
    title: 'Alchemy',
    description: 'Create potions which grant temporary benefits during battle.',
    to: '/professions/alchemy',
    icon: FlaskConical,
  },
  {
    title: 'Armorsmithing',
    description: 'Craft class armors, gauntlets, and belts from fibers.',
    to: '/professions/armorsmithing',
    icon: Shield,
  },
  {
    title: 'Enchanting',
    description: 'Add various stats to equipment through enchantment scrolls.',
    to: '/professions/enchanting',
    icon: Wand,
  },
  {
    title: 'Jewelcrafting',
    description: 'Craft rings, necklaces, and earrings from gems and ores.',
    to: '/professions/jewelcrafting',
    icon: Gem,
  },
  {
    title: 'Weaponsmithing',
    description: 'Craft weapons and improve their quality with stones.',
    to: '/professions/weaponsmithing',
    icon: Anvil,
  },
]

const secondary: CardItem[] = [
  {
    title: 'Cooking',
    description: 'Prepare dishes that provide strong buffs to the player.',
    to: '/professions/cooking',
    icon: UtensilsCrossed,
  },
  {
    title: 'Fishing',
    description: 'Catch fish for gold, quests, and passive experience.',
    to: '/professions/fishing',
    icon: Fish,
  },
  {
    title: 'Foraging',
    description: 'Collect flowers, fruit and vegetables from bushes.',
    to: '/professions/foraging',
    icon: Leaf,
  },
]

export function Professions() {
  return (
    <div>
      <PageHeader
        title="Professions"
        description="Craftsman jobs that allow you to specialize. You may learn 1 primary profession and all 3 secondary professions."
        accent="verdant"
      />

      <h2 className="mb-4 font-heading text-2xl font-semibold text-gilt">
        Primary Professions
      </h2>
      <p className="mb-4 text-sm text-parchment-600 dark:text-parchment-400">
        An aisling may only learn one primary profession. Each requires resources that may need to be refined.
        Fiber can be refined at the Armorsmith building in the Wilderness, Gems at the Jewelcraft building in Rucesion, and Ores at the Weaponsmith building in Tagor.
      </p>
      <CardGrid items={primary} columns={3} />

      <h2 className="mb-4 mt-10 font-heading text-2xl font-semibold text-gilt">
        Secondary Professions
      </h2>
      <p className="mb-4 text-sm text-parchment-600 dark:text-parchment-400">
        All three secondary professions can be learned by any aisling.
      </p>
      <CardGrid items={secondary} columns={3} />
    </div>
  )
}
