import { Calculator, HeartPulse, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { CardGrid, type CardItem } from '@/components/ui/CardGrid'

const calculators: CardItem[] = [
  {
    title: 'HP/MP Calculator',
    description: 'Experience math for raising HP/MP base values.',
    to: '/calculators/hpmp',
    icon: HeartPulse,
  },
  {
    title: 'HP/MP Optimizer',
    description: 'Minimum-EXP plan to reach target stats via free points and purchases.',
    to: '/calculators/optimizer',
    icon: TrendingUp,
  },
  {
    title: 'Stat Calculator',
    description: 'Calculate how much experience is needed to max your stats.',
    to: '/calculators/stats',
    icon: Calculator,
  },
]

export function Calculators() {
  return (
    <div>
      <PageHeader
        title="Calculators"
        description="Plan your character's growth with experience and stat calculators."
        accent="verdant"
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Calculators' }]}
      />
      <CardGrid items={calculators} columns={3} />
    </div>
  )
}
