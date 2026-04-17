import { PageHeader } from '@/components/ui/PageHeader'

interface Entry {
  date: string
  displayDate: string
  title?: string
  sections: { heading: string; items: string[] }[]
}

const entries: Entry[] = [
  {
    date: '20260416',
    displayDate: 'April 16, 2026',
    title: 'Faster search and smoother browsing',
    sections: [
      {
        heading: 'Class pages',
        items: [
          'Class detail pages now fetch only the skills and spells for the class you opened, instead of pulling every class\u2019s data every time. Warrior, Monk, Priest, Rogue, and Wizard pages all load noticeably faster.',
        ],
      },
      {
        heading: 'Navigation',
        items: [
          'Added idle prefetching across every page on the site: while you read, the wiki quietly pre-loads every other page in the background so clicking almost anywhere feels instant. Skipped automatically on 2G or Data Saver connections.',
        ],
      },
      {
        heading: 'Search',
        items: [
          'Search feels snappier: typing no longer stutters on slower devices, and the search bar only loads its full database the first time you open it.',
        ],
      },
      {
        heading: 'Equipment',
        items: [
          'Equipment pages load much faster, especially on mobile. The big gear list is now fetched on demand instead of up front.',
        ],
      },
      {
        heading: 'Getting around',
        items: [
          'Opening a new section loads quicker — the wiki only pulls in the page you actually visit.',
          'Side menu expand/collapse now remembers what you opened until you navigate somewhere else.',
        ],
      },
      {
        heading: 'Professions',
        items: [
          'Profession pages now only load the recipe list you actually opened, so switching between professions feels snappier.',
        ],
      },
      {
        heading: 'Images',
        items: [
          'Artwork across the wiki — hunting areas, town maps, god portraits, mounts, the Unora logo — now uses modern image formats (AVIF/WebP) with automatic fallback for older browsers. Expect faster page loads and less data used, especially on mobile.',
          'Re-encoded all PNG artwork with stronger compression, cutting file sizes by about 70% with no visible change.',
          'Filled in missing WebP and AVIF variants across towns, religion, mounts, and quests so every modern browser gets the lightest version.',
          'Added explicit dimensions to logos, god portraits, mount and cloak images so the layout no longer shifts as pictures decode.',
        ],
      },
      {
        heading: 'Behind the scenes',
        items: [
          'Shared parts of the site (menus, tables, search, markdown) are now cached separately, so the first visit is lighter and return visits are near-instant.',
          'Added cache headers so browsers hold onto images and assets longer between visits.',
        ],
      },
      {
        heading: 'Calculators',
        items: [
          'Added a new HP/MP calculator: figure out how many raises a given experience pool will buy you.',
          'HP/MP page reorganized into tabs so Between Two Bases and Max Raise from Exp each get their own view.',
        ],
      },
      {
        heading: 'Polish',
        items: [
          'Collapsible sections in wiki pages now have consistent padding so their contents no longer hug the edges.',
        ],
      },
      {
        heading: 'Credits',
        items: [
          'Added this Changelog page, linked in the footer.',
        ],
      },
      {
        heading: 'By the numbers',
        items: [
          'Site artwork total: 242 MB \u2192 113 MB (53% smaller, 129 MB saved).',
          'PNG source files: 186 MB \u2192 57 MB (69% smaller) with no visible change.',
          'Class page data per visit: ~106 KB \u2192 4\u201328 KB depending on class (average around 85% smaller).',
          'Equipment page data still fetched on demand (~1 MB) and cached after first open.',
          'Every page quietly pre-loads in the background while you read, so most clicks feel instant (disabled on slow or metered connections).',
        ],
      },
    ],
  },
  {
    date: '20260412',
    displayDate: 'April 12, 2026',
    title: 'New wiki goes live and a pile of fixes',
    sections: [
      {
        heading: 'Site',
        items: [
          'This rebuilt wiki replaced the previous version at www.unora.wiki.',
          'Added the latest patch notes and fixed their dates showing a day off.',
        ],
      },
      {
        heading: 'Quests & Hunting',
        items: [
          'Main story quests now have jumpable parts and in-page links so you can skip around.',
          'Cthonic Demise got its own page and thumbnail.',
        ],
      },
      {
        heading: 'Equipment tables',
        items: [
          'Item tables now sort numbers correctly (no more 10 coming before 2).',
          'Added missing columns so you can compare gear at a glance.',
          'Better default sort order on each table.',
        ],
      },
      {
        heading: 'Fixes & polish',
        items: [
          'Goddess portraits now scale properly on phones and tablets.',
          'Heading links and embedded videos work again inside collapsible sections.',
          'Updated a cloak entry and a contributor credit.',
        ],
      },
    ],
  },
  {
    date: '20260411',
    displayDate: 'April 11, 2026',
    title: 'Wiki goes live!',
    sections: [
      {
        heading: 'Welcome',
        items: [
          'The Unora Wiki is officially open.',
          'First sections available: Classes, Equipment, Quests, Hunting Grounds, Professions, Religion, Towns, Mounts, Boss Drops, Lore, Patch Notes, Calculators, Glossary, and Getting Started.',
          'Footer links for Discord, downloads, and the people who helped build it.',
          'Special thanks to Mebo for the original wiki that inspired this one.',
        ],
      },
    ],
  },
]

export function Changelog() {
  return (
    <div>
      <PageHeader
        title="Wiki Changelog"
        description={`Updates to the Unora Wiki itself. ${entries.length} entries.`}
        accent="astral"
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Wiki Changelog' }]}
      />

      <div className="space-y-6">
        {entries.map((entry) => (
          <article
            key={entry.date}
            className="rounded-lg border border-parchment-300 bg-parchment-100 p-5 dark:border-ash/20 dark:bg-ink"
          >
            <header className="mb-4 border-b border-parchment-200 pb-3 dark:border-ash/10">
              <h2 className="font-heading text-xl font-semibold text-gilt">
                {entry.displayDate}
              </h2>
              {entry.title && (
                <p className="mt-1 font-ui text-sm text-parchment-700 dark:text-ivory/70">
                  {entry.title}
                </p>
              )}
            </header>

            <div className="space-y-4">
              {entry.sections.map((section, i) => (
                <div key={i}>
                  <h3 className="mb-1.5 text-sm font-semibold text-parchment-800 dark:text-parchment-200">
                    {section.heading}
                  </h3>
                  <ul className="ml-5 list-disc space-y-1 text-base text-parchment-700 marker:text-gilt dark:text-ivory/75">
                    {section.items.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <footer className="mt-5 flex items-center justify-end gap-1.5 border-t border-parchment-200 pt-3 font-ui text-xs italic text-parchment-600 dark:border-ash/10 dark:text-ivory/60">
              <span>— Lancelot</span>
              <img
                src="https://aislingexchange.com/news/images/lancelothead.png"
                alt="Lancelot"
                className="h-4 w-auto"
              />
            </footer>
          </article>
        ))}
      </div>
    </div>
  )
}
