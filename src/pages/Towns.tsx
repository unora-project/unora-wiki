import { PageHeader } from '@/components/ui/PageHeader'
import { CardGrid, type CardItem } from '@/components/ui/CardGrid'
import { TOWN_REGIONS } from '@/lib/town-regions'

const thumbs = import.meta.env.BASE_URL + 'images/towns/thumbs/'

const townCards: Record<string, CardItem> = {
  mileth: { title: 'Mileth', description: 'The starting town. Home to class trainers and Miraelis.', to: '/towns/mileth', image: `${thumbs}mileth.webp` },
  abel: { title: 'Abel', description: 'A coastal town with the fishing market and boat access.', to: '/towns/abel', image: `${thumbs}abel.webp` },
  piet: { title: 'Piet', description: 'Home to the Alchemy lab and Skandara\'s temple.', to: '/towns/piet', image: `${thumbs}piet.webp` },
  loures: { title: 'Loures', description: 'A grand city with connections to various areas.', to: '/towns/loures', image: `${thumbs}loures.webp` },
  undine: { title: 'Undine', description: 'Location of the Enchanting building.', to: '/towns/undine', image: `${thumbs}undine.webp` },
  suomi: { title: 'Suomi', description: 'The Cherry Farmer\'s home. Serendael resides here.', to: '/towns/suomi', image: `${thumbs}suomi.webp` },
  rucesion: { title: 'Rucesion', description: 'Home to Jewelcrafting and Theselene\'s temple.', to: '/towns/rucesion', image: `${thumbs}rucesion.webp` },
  tagor: { title: 'Tagor', description: 'Location of the Weaponsmithing forge.', to: '/towns/tagor', image: `${thumbs}tagor.webp` },
  asilon: { title: 'Asilon', description: 'Your first step into Medenia.', to: '/towns/asilon', image: `${thumbs}asilon.webp` },
}

export function Towns() {
  return (
    <div>
      <PageHeader
        title="Towns"
        description="The towns and settlements of Unora."
        accent="verdant"
      />
      {TOWN_REGIONS.map((region) => {
        const items = region.towns
          .map((slug) => townCards[slug])
          .filter((card): card is CardItem => Boolean(card))
        if (items.length === 0) return null
        return (
          <section key={region.label} className="mb-10">
            <h2 className="mb-4 font-heading text-2xl font-semibold text-gilt">
              {region.label}
            </h2>
            <CardGrid items={items} columns={4} />
          </section>
        )
      })}
    </div>
  )
}