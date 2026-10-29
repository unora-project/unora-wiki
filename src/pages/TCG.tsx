import { useParams } from 'react-router'
import { MarkdownPage } from '@/components/ui/MarkdownPage'
import { PageHeader } from '@/components/ui/PageHeader'
import { Link } from 'react-router'

// Import TCG markdown at build time
    const tcgModules = import.meta.glob<string>('@/pages/tcg/*.md', {
      query: '?raw',
      import: 'default',
      eager: true,
    })

    // Import TCG images at build time so Vite bundles them and gives us their public URLs
    const tcgImages = import.meta.glob<string>('@/pages/tcg/**/*.{png,jpg,jpeg,webp,avif}', {
      query: '?url',
      import: 'default',
      eager: true,
    })

    // `./path` images resolve to src/pages/tcg/ when bundled there, otherwise to public/images/tcg/
    // (where the card renders live, e.g. ./Neutral/Cultist.png).
    function resolveTCGImages(markdown: string): string {
      return markdown.replace(/!\[([^\]]*)\]\(\.\/([^)]+)\)/g, (_match, alt, relPath) => {
        const key = Object.keys(tcgImages).find((k) => k.endsWith(`/tcg/${relPath}`))
        return `![${alt}](${key ? tcgImages[key] : `${import.meta.env.BASE_URL}images/tcg/${relPath}`})`
      })
    }

function getTCGContent(slug: string): string | null {
  const key = Object.keys(tcgModules).find((k) => k.includes(`/${slug}.md`))
  return key ? tcgModules[key] : null
}

export function TCGIndex() {
  return (
    <div>
      <PageHeader
        title="Unora Card Battle TCG"
        description="Rules, strategies, and cards of the Unora Trading Card Game."
        accent="astral"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/tcg/how_to_play"
          className="group rounded-xl border border-parchment-300 bg-parchment-100 p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-astral hover:shadow-md dark:border-ash/10 dark:bg-ink dark:hover:border-astral"
        >
          <h2 className="font-heading text-xl font-semibold text-astral group-hover:text-astral dark:text-astral">
            How to Play
          </h2>
          <p className="mt-2 text-sm text-parchment-600 dark:text-parchment-500">
            Learn the rules, deck building requirements, turn structure, and mechanics of Unora Card Battle TCG.
          </p>
        </Link>
        <Link
          to="/tcg/card_gallery"
          className="group rounded-xl border border-parchment-300 bg-parchment-100 p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-astral hover:shadow-md dark:border-ash/10 dark:bg-ink dark:hover:border-astral"
        >
          <h2 className="font-heading text-xl font-semibold text-astral group-hover:text-astral dark:text-astral">
            Card Gallery
          </h2>
          <p className="mt-2 text-sm text-parchment-600 dark:text-parchment-500">
            Browse the complete collection of Unora Card Battle TCG cards.
          </p>
        </Link>
        <Link
          to="/tcg/deck_builder"
          className="group rounded-xl border border-parchment-300 bg-parchment-100 p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-astral hover:shadow-md dark:border-ash/10 dark:bg-ink dark:hover:border-astral"
        >
          <h2 className="font-heading text-xl font-semibold text-astral group-hover:text-astral dark:text-astral">
            Deck Builder
          </h2>
          <p className="mt-2 text-sm text-parchment-600 dark:text-parchment-500">
            Build, test, and share 40-card decks, with legality checks, a mana curve, and opening-hand draws.
          </p>
        </Link>
      </div>
    </div>
  )
}

export function TCGDetail() {
  const { slug: paramSlug } = useParams<{ slug: string }>()
  const slug = paramSlug || 'how_to_play'
  const content = getTCGContent(slug)

  if (!content) {
    return (
      <div className="py-20 text-center">
        <h1 className="font-heading text-2xl text-gilt">TCG entry not found</h1>
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
          { label: 'Unora Card Battle TCG', to: '/tcg' },
          { label: title },
        ]}
      />
      <MarkdownPage content={resolveTCGImages(content.replace(/^#\s+.+$/m, '').trimStart())} />
    </div>
  )
}
