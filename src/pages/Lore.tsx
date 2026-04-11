import { useParams } from 'react-router'
import { MarkdownPage } from '@/components/ui/MarkdownPage'
import { PageHeader } from '@/components/ui/PageHeader'
import { Link } from 'react-router'

// Import lore markdown at build time
const loreModules = import.meta.glob<string>('@/content/lore/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

function getLoreContent(slug: string): string | null {
  const key = Object.keys(loreModules).find((k) => k.includes(`/${slug}.md`))
  return key ? loreModules[key] : null
}

export function LoreIndex() {
  return (
    <div>
      <PageHeader
        title="Lore"
        description="The mythology and history of Unora."
        accent="astral"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/lore/overview"
          className="group rounded-xl border border-parchment-300 bg-parchment-100 p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-astral hover:shadow-md dark:border-ash/10 dark:bg-ink dark:hover:border-astral"
        >
          <h2 className="font-heading text-xl font-semibold text-astral group-hover:text-astral dark:text-astral">
            The Lore of Unora
          </h2>
          <p className="mt-2 text-sm text-parchment-600 dark:text-parchment-500">
            The complete creation myth -- from Terminus to the Elemental Gods, the rise and fall of civilizations,
            and the emergence of the four Goddesses.
          </p>
        </Link>
        <Link
          to="/lore/the_great_divine_war"
          className="group rounded-xl border border-parchment-300 bg-parchment-100 p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-astral hover:shadow-md dark:border-ash/10 dark:bg-ink dark:hover:border-astral"
        >
          <h2 className="font-heading text-xl font-semibold text-astral group-hover:text-astral dark:text-astral">
            The Great Divine War
          </h2>
          <p className="mt-2 text-sm text-parchment-600 dark:text-parchment-500">
            The cataclysmic conflict between the gods that shaped the world of Unora.
          </p>
        </Link>
      </div>
    </div>
  )
}

export function LoreDetail() {
  const { slug: paramSlug } = useParams<{ slug: string }>()
  const slug = paramSlug || 'overview'
  const content = getLoreContent(slug)

  if (!content) {
    return (
      <div className="py-20 text-center">
        <h1 className="font-heading text-2xl text-gilt">Lore entry not found</h1>
      </div>
    )
  }

  const titleMatch = content.match(/^#\s+(.+)$/m)
  const title = titleMatch ? titleMatch[1] : slug.replace(/_/g, ' ')

  return (
    <div>
      <PageHeader
        title={title}
        accent="astral"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Lore', to: '/lore' },
          { label: title },
        ]}
      />
      <MarkdownPage content={content.replace(/^#\s+.+$/m, '').trimStart()} />
    </div>
  )
}
