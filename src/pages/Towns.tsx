import { PageHeader } from '@/components/ui/PageHeader'
import { CardGrid, type CardItem } from '@/components/ui/CardGrid'

const thumbs = import.meta.env.BASE_URL + 'images/towns/thumbs/'

const towns: CardItem[] = [
  { title: 'Mileth', description: 'The starting town. Home to class trainers and Miraelis.', to: '/towns/mileth', image: `${thumbs}mileth.webp` },
  { title: 'Abel', description: 'A coastal town with the fishing market and boat access.', to: '/towns/abel', image: `${thumbs}abel.webp` },
  { title: 'Piet', description: 'Home to the Alchemy lab and Skandara\'s temple.', to: '/towns/piet', image: `${thumbs}piet.webp` },
  { title: 'Loures', description: 'A grand city with connections to various areas.', to: '/towns/loures', image: `${thumbs}loures.webp` },
  { title: 'Undine', description: 'Location of the Enchanting building.', to: '/towns/undine', image: `${thumbs}undine.webp` },
  { title: 'Suomi', description: 'The Cherry Farmer\'s home. Serendael resides here.', to: '/towns/suomi', image: `${thumbs}suomi.webp` },
  { title: 'Rucesion', description: 'Home to Jewelcrafting and Theselene\'s temple.', to: '/towns/rucesion', image: `${thumbs}rucesion.webp` },
  { title: 'Tagor', description: 'Location of the Weaponsmithing forge.', to: '/towns/tagor', image: `${thumbs}tagor.webp` },
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
