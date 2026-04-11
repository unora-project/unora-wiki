import { PageHeader } from '@/components/ui/PageHeader'
import { CardGrid, type CardItem } from '@/components/ui/CardGrid'

const gods: CardItem[] = [
  {
    title: 'Miraelis',
    description: 'Goddess of compassion, nature, and intellect. Resides in Mileth.',
    to: '/religion/miraelis',
    image: `${import.meta.env.BASE_URL}images/religion/miraelis.png`,
  },
  {
    title: 'Serendael',
    description: 'Goddess of luck and intellect. Resides in Suomi.',
    to: '/religion/serendael',
    image: `${import.meta.env.BASE_URL}images/religion/serendael.png`,
  },
  {
    title: 'Skandara',
    description: 'Goddess of strength and discipline. Resides in Piet.',
    to: '/religion/skandara',
    image: `${import.meta.env.BASE_URL}images/religion/skandara.png`,
  },
  {
    title: 'Theselene',
    description: 'Goddess of knowledge and intuition. Resides in Rucesion.',
    to: '/religion/theselene',
    image: `${import.meta.env.BASE_URL}images/religion/theselene.png`,
  },
]

export function Religion() {
  return (
    <div>
      <PageHeader
        title="Religion"
        description="Devote yourself to one of the four Goddesses of Unora to receive divine blessings."
        accent="astral"
      />

      {/* Overview */}
      <div className="mb-8 space-y-4 text-parchment-800 dark:text-parchment-300">
        <p>
          Religion is tied closely to the lore of Unora. There are currently 4 goddesses you can devote yourself to,
          each providing various buffs through divine blessings when enough faith is spent.
        </p>

        <div className="rounded-lg border-l-4 border-verdant bg-verdant/10 p-4 dark:bg-verdant/5">
          <p className="mb-1 font-heading text-sm font-semibold text-parchment-900 dark:text-parchment-100">Joining a Religion</p>
          <p className="text-sm">
            Speak with the goddess at the temple and select "Join the Temple". She will request 3 Essence of her name.
            Return with the essences and you'll become a worshipper, receiving a goddess stone.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-parchment-300 bg-parchment-100 p-4 dark:border-ash/10 dark:bg-ink">
            <h3 className="mb-2 font-heading text-sm font-semibold text-gilt">Praying</h3>
            <p className="text-sm text-parchment-600 dark:text-parchment-400">
              Pray up to 6 times per day for experience, essence drops, and 1 faith each time.
              Wait 22 hours between full prayer cycles. Use your goddess stone or visit the temple.
            </p>
          </div>
          <div className="rounded-lg border border-parchment-300 bg-parchment-100 p-4 dark:border-ash/10 dark:bg-ink">
            <h3 className="mb-2 font-heading text-sm font-semibold text-gilt">Faith & Passports</h3>
            <p className="text-sm text-parchment-600 dark:text-parchment-400">
              Faith is obtained by praying and interacting with goddess statues in the wild.
              Spend 1 faith for a passport that teleports you home. You can freely change religions, but lose all faith.
            </p>
          </div>
        </div>
      </div>

      <h2 className="mb-4 font-heading text-2xl font-semibold text-gilt">
        The Four Goddesses
      </h2>
      <CardGrid items={gods} columns={4} />
    </div>
  )
}
