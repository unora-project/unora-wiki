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

// Bracketed heading, optionally prefixed with an emoji: `[Skills]`, `🎮 [Mount Merry]`.
const BRACKET_HEADING_RE = /^[\p{Extended_Pictographic}\uFE0F\u200D\s]*\[(.+?)\]\s*$/u
// Emoji-prefixed bare heading used by some mid-2025 notes: `⚔️ Warrior Skills`.
const EMOJI_HEADING_RE = /^[\p{Extended_Pictographic}][\p{Extended_Pictographic}\uFE0F\u200D\s]*\S/u
// Bullet markers used across note formats.
const BULLET_RE = /^\s*[-•*]\s+/

// Document-title lines that should be dropped rather than rendered as a section.
function isDocTitle(heading: string): boolean {
  const t = heading.toLowerCase().replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').trim()
  if (!t) return true
  if (t.startsWith('patch notes')) return true
  if (t.startsWith('unora patch notes')) return true
  return false
}

function isShortPlainHeading(line: string): boolean {
  const t = line.trim()
  if (!t || t.length > 60) return false
  if (BULLET_RE.test(t)) return false
  // Must look title-like: no trailing period / comma / colon, at least one letter.
  if (/[.,:;]$/.test(t)) return false
  if (!/[A-Za-z]/.test(t)) return false
  return true
}

function looksLikeEmojiHeading(line: string): boolean {
  const t = line.trim()
  if (!t || t.length > 60) return false
  if (BULLET_RE.test(t)) return false
  return EMOJI_HEADING_RE.test(t)
}

type ParsedSection = { heading: string; items: string[] }

function PatchContent({ content }: { content: string }) {
  const lines = content.split('\n')
  const sections: ParsedSection[] = []
  let currentSection: ParsedSection | null = null

  const nextNonBlank = (start: number): string | null => {
    for (let k = start; k < lines.length; k++) {
      const t = lines[k]?.trim()
      if (t) return t
    }
    return null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed.startsWith('---')) continue

    // Heading detection — bracket, emoji-prefixed bare, or plain-short-followed-by-bullet.
    const bracket = line.match(BRACKET_HEADING_RE)
    let headingText: string | null = null
    if (bracket) {
      headingText = bracket[1]
    } else if (looksLikeEmojiHeading(line)) {
      headingText = trimmed
    } else if (isShortPlainHeading(line)) {
      const peek = nextNonBlank(i + 1)
      if (peek && BULLET_RE.test(peek)) headingText = trimmed
    }

    if (headingText !== null) {
      if (isDocTitle(headingText)) continue
      if (currentSection) sections.push(currentSection)
      currentSection = { heading: headingText, items: [] }
      continue
    }

    if (!currentSection) continue

    const section: ParsedSection = currentSection

    const bulletMatch = line.match(BULLET_RE)
    if (bulletMatch) {
      section.items.push(line.slice(bulletMatch[0].length))
      continue
    }

    if (/^\s{2,}[-•*]\s+/.test(line)) {
      const lastItem = section.items.length - 1
      if (lastItem >= 0) {
        section.items[lastItem] += '\n  ' + trimmed.replace(BULLET_RE, '')
      }
      continue
    }

    if (trimmed) section.items.push(trimmed)
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
