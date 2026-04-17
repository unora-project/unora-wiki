import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  Swords, Shield, Scroll, Target, Hammer, Sparkles, Skull,
  BookOpen, Calculator, Heart, Users, MapPin, Package, Settings, Bug, Zap,
  ShoppingBag, Castle, Flag, MessageSquare, FileText, Dice5,
  Anchor, Wrench, Flame, HeartHandshake, Cake, PartyPopper,
  type LucideIcon,
} from 'lucide-react'

// Maps a stripped, lowercased patch-note section name to a lucide icon.
// Missed keys fall back to the "Misc" icon.
const ICON_MAP: Record<string, LucideIcon> = {
  // Classes
  'monk': Swords, 'priest': Sparkles, 'priests': Sparkles,
  'light priest': Sparkles, 'dark priest': Sparkles,
  'rogue': Swords, 'rogues': Swords, 'warrior': Swords, 'wizards': Sparkles,
  'class': Swords,
  // Skills/spells
  'skill': Zap, 'skills': Zap, 'spell': Zap, 'spells': Zap,
  'skills/spells': Zap, 'abilities': Zap,
  // Crafting/professions
  'alchemy': Flame, 'alchemy potions': Flame, 'enchanting': Sparkles,
  'cooking': Cake, 'weaponsmithing': Hammer, 'weaponsmith': Hammer,
  'crafting': Hammer, 'recipes': BookOpen, 'hemp/cotton': Package,
  // Gear / items
  'equipment': Shield, 'items': Package, 'monster drops': Package,
  // Quests / zones
  'quest': Scroll, 'quests': Scroll, 'tutorial': BookOpen,
  'maps': MapPin, 'zones': MapPin, 'other zones': MapPin,
  'master dungeon': Castle, 'chaos': Flame, 'chaos 12': Flame,
  'limbo': Skull, 'mythic': Castle, 'mileth': Castle, 'ports': Anchor,
  'cthonic remains': Skull, 'summoner kades (cr11)': Skull,
  'realm of aetheria': Castle, 'medusa': Skull,
  // Social / group
  'group': Users, 'guilds': Users, 'guild halls': Users,
  'marriage': HeartHandshake, 'villagers': Users,
  // Systems
  'balance': Target, 'stats': Calculator, 'experience': Zap,
  'death': Skull, 'religion': Sparkles, 'critical': Zap,
  'inspect': FileText, 'dialog': MessageSquare, 'animation priority': Zap,
  'training dummies': Target, 'boards': Flag, 'arena': Swords,
  'bug reporting': Bug, 'bugfixes': Bug,
  // Events
  'events': PartyPopper, 'easter': PartyPopper, 'paradise': PartyPopper,
  'paradise event': PartyPopper, 'garamonde theatre': PartyPopper,
  'damage game': Target,
  // Services / misc
  'casino': Dice5, 'the exchange': ShoppingBag, 'exchange': ShoppingBag,
  'beauty shop': Heart, 'face shapes': Heart, 'wells': Heart,
  'launcher': Wrench, 'general': Settings, 'misc': Settings, 'world': MapPin,
  'other': Settings,
}

// Strip a leading emoji (or variation selector) + whitespace from a heading
// so `🛠️ Weaponsmith` and `Weaponsmith` both key the same icon.
function stripLeadingEmoji(heading: string): string {
  return heading.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, '').trim()
}

function iconFor(heading: string): LucideIcon | undefined {
  return ICON_MAP[stripLeadingEmoji(heading).toLowerCase()]
}

// Import all patch note markdown files at build time
const patchModules = import.meta.glob<string>('@/content/patch-notes/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

interface PatchNote {
  date: string
  displayDate: string
  content: string
}

function parsePatchNotes(): PatchNote[] {
  const notes: PatchNote[] = []

  for (const [path, raw] of Object.entries(patchModules)) {
    // Extract filename like 20240510.md
    const match = path.match(/(\d{8}(?:-\d+)?)\.md$/)
    if (!match) continue

    const dateStr = match[1].split('-')[0] // Handle 20240514-1.md format
    const year = dateStr.slice(0, 4)
    const month = dateStr.slice(4, 6)
    const day = dateStr.slice(6, 8)

    const displayDate = new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Strip frontmatter
    const content = raw.replace(/^---\n[\s\S]*?\n---\n?/, '').trim()

    notes.push({
      date: dateStr,
      displayDate,
      content,
    })
  }

  // Sort newest first
  notes.sort((a, b) => b.date.localeCompare(a.date))
  return notes
}

export function PatchNotes() {
  const notes = useMemo(() => parsePatchNotes(), [])
  const [filter, setFilter] = useState('')
  const [expandedAll, setExpandedAll] = useState(false)

  const filteredNotes = useMemo(() => {
    if (!filter) return notes
    const lower = filter.toLowerCase()
    return notes.filter(
      (n) =>
        n.content.toLowerCase().includes(lower) ||
        n.displayDate.toLowerCase().includes(lower)
    )
  }, [notes, filter])

  // Group by year
  const grouped = useMemo(() => {
    const groups: Record<string, PatchNote[]> = {}
    for (const note of filteredNotes) {
      const year = note.date.slice(0, 4)
      if (!groups[year]) groups[year] = []
      groups[year].push(note)
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [filteredNotes])

  return (
    <div>
      <PageHeader
        title="Patch Notes"
        description={`${notes.length} patches documented.`}
        accent="tide"
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Patch Notes' }]}
      />

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search patch notes..."
          className="flex-1 rounded-lg border border-parchment-300 bg-parchment-50 px-4 py-2 text-sm text-parchment-900 outline-none transition-colors placeholder:text-parchment-500 focus:border-gilt focus:ring-2 focus:ring-gilt/20 dark:border-ash/20 dark:bg-obsidian dark:text-ivory dark:placeholder:text-ash dark:focus:border-gilt sm:max-w-xs"
        />
        <button
          onClick={() => setExpandedAll(!expandedAll)}
          className="rounded-lg border border-parchment-300 bg-parchment-100 px-3 py-2 text-xs font-medium text-parchment-600 transition-colors hover:border-gilt hover:text-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ash dark:hover:border-gilt"
        >
          {expandedAll ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      {/* Patch Notes */}
      <div className="space-y-8">
        {grouped.map(([year, yearNotes]) => (
          <section key={year}>
            <h2 className="mb-4 font-heading text-2xl font-semibold text-gilt">
              {year}
            </h2>
            <div className="space-y-2">
              {yearNotes.map((note) => (
                <details
                  key={note.date}
                  className="group rounded-lg border border-parchment-300 bg-parchment-100 dark:border-ash/20 dark:bg-ink"
                  open={expandedAll || !!filter}
                >
                  <summary className="flex cursor-pointer items-center justify-between px-4 py-3 font-heading text-sm font-semibold text-gilt transition-colors hover:text-gilt/80">
                    <span>{note.displayDate}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-transform group-open:rotate-180"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </summary>
                  <div className="border-t border-parchment-200 px-4 py-3 dark:border-ash/10">
                    <PatchContent content={note.content} />
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function PatchContent({ content }: { content: string }) {
  // Parse the patch note content into sections
  const lines = content.split('\n')
  const sections: { heading: string; items: string[] }[] = []
  let currentSection: { heading: string; items: string[] } | null = null

  for (const line of lines) {
    const headingMatch = line.match(/^\[(.+)\]$/)
    if (headingMatch) {
      if (currentSection) sections.push(currentSection)
      currentSection = { heading: headingMatch[1], items: [] }
    } else if (line.startsWith('- ') && currentSection) {
      currentSection.items.push(line.slice(2))
    } else if (line.startsWith('    - ') && currentSection) {
      // Sub-item
      const lastItem = currentSection.items.length - 1
      if (lastItem >= 0) {
        currentSection.items[lastItem] += '\n  ' + line.trim().slice(2)
      }
    } else if (line.trim() && !line.startsWith('---') && currentSection) {
      // Standalone text line
      currentSection.items.push(line.trim())
    }
  }
  if (currentSection) sections.push(currentSection)

  if (sections.length === 0) {
    return <p className="whitespace-pre-wrap text-base text-parchment-700 dark:text-parchment-300">{content}</p>
  }

  return (
    <div className="space-y-4">
      {sections.map((section, i) => {
        const Icon = iconFor(section.heading)
        const displayHeading = stripLeadingEmoji(section.heading) || section.heading
        return (
          <div key={i}>
            <h3 className="mb-2 flex items-center gap-2 border-b border-parchment-200 pb-1.5 font-heading text-lg font-semibold text-gilt dark:border-ash/15">
              {Icon && <Icon size={18} className="shrink-0 text-gilt" />}
              {displayHeading}
            </h3>
            <ul className="ml-5 list-disc space-y-1 text-base text-parchment-700 marker:text-gilt dark:text-ivory/75">
              {section.items.map((item, j) => (
                <li key={j} className="whitespace-pre-wrap">{item}</li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
