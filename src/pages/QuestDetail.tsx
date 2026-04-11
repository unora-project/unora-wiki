import { useParams } from 'react-router'
import { MarkdownPage } from '@/components/ui/MarkdownPage'
import { PageHeader } from '@/components/ui/PageHeader'

// Import all quest markdown files at build time
const questModules = import.meta.glob<string>('@/content/quests/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const circleNames: Record<string, string> = {
  circle_1: 'Circle 1',
  circle_2: 'Circle 2',
  circle_3: 'Circle 3',
  circle_4: 'Circle 4',
  circle_5: 'Circle 5',
  side: 'Side Quests',
  slayers: 'Daily Kill Quests',
  events: 'Event Quests',
}

export function QuestDetail() {
  const { circle, slug } = useParams<{ circle: string; slug: string }>()

  if (!circle || !slug) {
    return (
      <div className="py-20 text-center">
        <h1 className="font-heading text-2xl text-gilt">Quest not found</h1>
      </div>
    )
  }

  // Find the matching markdown content
  const key = Object.keys(questModules).find((k) =>
    k.includes(`/${circle}/${slug}.md`)
  )
  const content = key ? questModules[key] : null

  if (!content) {
    return (
      <div className="py-20 text-center">
        <h1 className="font-heading text-2xl text-gilt">Quest not found</h1>
        <p className="mt-2 text-parchment-500">
          No content found for {circle}/{slug}
        </p>
      </div>
    )
  }

  // Extract title from first H1 in content
  const titleMatch = content.match(/^#\s+(.+)$/m)
  const title = titleMatch ? titleMatch[1] : slug.replace(/_/g, ' ')

  return (
    <div>
      <PageHeader
        title={title}
        accent="tide"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Quests', to: '/quests' },
          { label: circleNames[circle] || circle },
          { label: title },
        ]}
      />
      <MarkdownPage content={content.replace(/^#\s+.+$/m, '').trimStart()} imageBasePath={`${import.meta.env.BASE_URL}images/quests`} />
    </div>
  )
}
