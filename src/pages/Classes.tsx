import { PageHeader } from '@/components/ui/PageHeader'
import { CardGrid, type CardItem } from '@/components/ui/CardGrid'
import { Swords, Hand, Heart, Eye, Wand2, Wheat } from 'lucide-react'

const classes: CardItem[] = [
  {
    title: 'Warrior',
    description: 'Your enemies will fall to your blades with the fury of a thousand suns. Fighting is your forte.',
    to: '/classes/warrior',
    icon: Swords,
  },
  {
    title: 'Monk',
    description: 'Through discipline and inner strength, you channel elemental forces with your bare hands.',
    to: '/classes/monk',
    icon: Hand,
  },
  {
    title: 'Priest',
    description: 'A divine conduit of healing and protection, supporting allies through faith and devotion.',
    to: '/classes/priest',
    icon: Heart,
  },
  {
    title: 'Rogue',
    description: 'Silent and deadly, you strike from the shadows with cunning traps and precision attacks.',
    to: '/classes/rogue',
    icon: Eye,
  },
  {
    title: 'Wizard',
    description: 'Master of the arcane arts, bending the elements to unleash devastating magical attacks.',
    to: '/classes/wizard',
    icon: Wand2,
  },
  {
    title: 'Peasant',
    description: 'A humble beginning. All Aislings start as peasants before choosing their path.',
    to: '/classes/peasant',
    icon: Wheat,
  },
]

export function Classes() {
  return (
    <div>
      <PageHeader
        title="Classes"
        description="Choose your path in Unora. Each class offers unique skills, spells, and playstyles."
        accent="ignis"
      />
      <CardGrid items={classes} columns={3} />
    </div>
  )
}
