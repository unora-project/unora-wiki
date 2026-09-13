import { PageHeader } from '@/components/ui/PageHeader'
import { CardGrid, type CardItem } from '@/components/ui/CardGrid'

const thumbs = import.meta.env.BASE_URL + 'images/towns/'

const towns: CardItem[] = [
  { title: 'Mileth', description: 'The starting town. Home to class trainers and Miraelis.', to: '/towns/mileth', image: `mileth.avif` },
  { title: 'Abel', description: 'A coastal town with the fishing market and boat access.', to: '/towns/abel', image: `abel.avif` },
  { title: 'Piet', description: 'Home to the Alchemy lab and Skandara\'s temple.', to: '/towns/piet', image: `piet.avif` },
  { title: 'Loures', description: 'A grand city with connections to various areas.', to: '/towns/loures', image: `loures.avif` },
  { title: 'Undine', description: 'Location of the Enchanting building.', to: '/towns/undine', image: `undine.avif` },
  { title: 'Suomi', description: 'The Cherry Farmer\'s home. Serendael resides here.', to: '/towns/suomi', image: `suomi.avif` },
  { title: 'Rucesion', description: 'Home to Jewelcrafting and Theselene\'s temple.', to: '/towns/rucesion', image: `rucesion.avif` },
  { title: 'Tagor', description: 'Location of the Weaponsmithing forge.', to: '/towns/tagor', image: `tagor.avif` },
]

export function Towns() {
  return (
    <div>
      <PageHeader
        title="Towns"
        description="The towns and settlements of Unora."
        accent="verdant"
      />
      <CardGrid items={towns} columns={4} />
    </div>
  )
}
