import { Link, useLocation } from 'react-router'
import { memo, useRef, useEffect, useCallback, useMemo, useState } from 'react'
import {
  Swords, Shield, Target, Skull, Scroll, ClipboardList, Crown,
  Hammer, Building2, Sparkles, BookOpen, Calculator, BookA,
  Hand, Heart, Eye, Wand2, Wheat, ChevronRight,
  FlaskConical, Gem, Anvil, UtensilsCrossed, Fish, Leaf, Wand,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface SubLink {
  to: string
  label: string
  icon?: LucideIcon
}

interface SubGroup {
  label?: string
  links: SubLink[]
}

interface NavLink {
  to: string
  label: string
  icon: LucideIcon
  children?: (SubLink | SubGroup)[]
}

interface NavSection {
  label: string
  sublabel: string
  element: 'ignis' | 'tide' | 'verdant' | 'astral'
  links: NavLink[]
}

function isSubGroup(item: SubLink | SubGroup): item is SubGroup {
  return 'links' in item
}

const sections: NavSection[] = [
  {
    label: 'Of Flame & Steel',
    sublabel: 'Combat',
    element: 'ignis',
    links: [
      { to: '/classes', label: 'Classes', icon: Swords, children: [
        { to: '/classes/warrior', label: 'Warrior', icon: Swords },
        { to: '/classes/monk', label: 'Monk', icon: Hand },
        { to: '/classes/priest', label: 'Priest', icon: Heart },
        { to: '/classes/rogue', label: 'Rogue', icon: Eye },
        { to: '/classes/wizard', label: 'Wizard', icon: Wand2 },
        { to: '/classes/peasant', label: 'Peasant', icon: Wheat },
      ]},
      { to: '/equipment', label: 'Equipment', icon: Shield },
      { to: '/hunting', label: 'Hunting Grounds', icon: Target },
      { to: '/boss-drops', label: 'Boss Drops', icon: Skull },
    ],
  },
  {
    label: 'Of the Tides',
    sublabel: 'Adventure',
    element: 'tide',
    links: [
      { to: '/quests', label: 'Quests', icon: Scroll, children: [
        { label: 'Story', links: [
          { to: '/quests/circle_1', label: 'Circle 1' },
          { to: '/quests/circle_2', label: 'Circle 2' },
          { to: '/quests/circle_3', label: 'Circle 3' },
          { to: '/quests/circle_4', label: 'Circle 4' },
          { to: '/quests/circle_5', label: 'Circle 5' },
        ]},
        { label: 'Other', links: [
          { to: '/quests/side', label: 'Daily Quests' },
          { to: '/quests/slayers', label: 'Kill Quests' },
          { to: '/quests/events', label: 'Events' },
        ]},
      ]},
      { to: '/patch-notes', label: 'Patch Notes', icon: ClipboardList },
      { to: '/mounts', label: 'Mounts', icon: Crown },
    ],
  },
  {
    label: 'Of the Earth',
    sublabel: 'World',
    element: 'verdant',
    links: [
      { to: '/professions', label: 'Professions', icon: Hammer, children: [
        { label: 'Primary', links: [
          { to: '/professions/alchemy', label: 'Alchemy', icon: FlaskConical },
          { to: '/professions/armorsmithing', label: 'Armorsmithing', icon: Shield },
          { to: '/professions/enchanting', label: 'Enchanting', icon: Wand },
          { to: '/professions/jewelcrafting', label: 'Jewelcrafting', icon: Gem },
          { to: '/professions/weaponsmithing', label: 'Weaponsmithing', icon: Anvil },
        ]},
        { label: 'Secondary', links: [
          { to: '/professions/cooking', label: 'Cooking', icon: UtensilsCrossed },
          { to: '/professions/fishing', label: 'Fishing', icon: Fish },
          { to: '/professions/foraging', label: 'Foraging', icon: Leaf },
        ]},
      ]},
      { to: '/towns', label: 'Towns', icon: Building2, children: [
        { to: '/towns/mileth', label: 'Mileth' },
        { to: '/towns/abel', label: 'Abel' },
        { to: '/towns/piet', label: 'Piet' },
        { to: '/towns/loures', label: 'Loures' },
        { to: '/towns/undine', label: 'Undine' },
        { to: '/towns/suomi', label: 'Suomi' },
        { to: '/towns/rucesion', label: 'Rucesion' },
        { to: '/towns/tagor', label: 'Tagor' },
      ]},
    ],
  },
  {
    label: 'Of the Aetheric Arts',
    sublabel: 'Arcane',
    element: 'astral',
    links: [
      { to: '/religion', label: 'Religion', icon: Sparkles, children: [
        { to: '/religion/miraelis', label: 'Miraelis' },
        { to: '/religion/serendael', label: 'Serendael' },
        { to: '/religion/skandara', label: 'Skandara' },
        { to: '/religion/theselene', label: 'Theselene' },
      ]},
      { to: '/lore', label: 'Lore', icon: BookOpen },
    ],
  },
  {
    label: 'Tools',
    sublabel: 'Utilities',
    element: 'verdant',
    links: [
      { to: '/calculators/hpmp', label: 'HP/MP Calculator', icon: Calculator },
      { to: '/calculators/stats', label: 'Stat Calculator', icon: Calculator },
      { to: '/glossary', label: 'Glossary', icon: BookA },
    ],
  },
]

const elementActiveClass: Record<string, string> = {
  ignis: 'border-l-ignis text-ignis',
  tide: 'border-l-tide text-tide',
  verdant: 'border-l-verdant text-verdant',
  astral: 'border-l-astral text-astral',
}

/* ── Animated collapsible panel ── */

function Collapsible({ open, children }: { open: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  const measure = useCallback(() => {
    if (ref.current) setHeight(ref.current.scrollHeight)
  }, [])

  useEffect(() => {
    measure()
    // Re-measure if children change
    const observer = new MutationObserver(measure)
    if (ref.current) observer.observe(ref.current, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [measure, open])

  return (
    <div
      className="overflow-hidden transition-all duration-200 ease-out"
      style={{ height: open ? height : 0, opacity: open ? 1 : 0 }}
    >
      <div ref={ref}>
        {children}
      </div>
    </div>
  )
}

/* ── Main nav ── */

interface LeftNavProps {
  onNavigate?: () => void
}

export function LeftNav({ onNavigate }: LeftNavProps) {
  const location = useLocation()

  // Derive active route's expandable link during render — no effect needed
  const routeExpandedLink = useMemo(() => {
    for (const link of sections.flatMap((s) => s.links)) {
      if (link.children && (location.pathname === link.to || location.pathname.startsWith(link.to + '/'))) {
        return link.to
      }
    }
    return null
  }, [location.pathname])

  // User-toggled override; reset when route changes
  const [userExpandedLink, setUserExpandedLink] = useState<string | null>(null)
  const [prevPathname, setPrevPathname] = useState(location.pathname)
  if (prevPathname !== location.pathname) {
    setPrevPathname(location.pathname)
    setUserExpandedLink(null)
  }

  const expandedLink = userExpandedLink ?? routeExpandedLink
  const setExpandedLink = setUserExpandedLink

  return (
    <nav className="flex flex-col gap-6 py-4 font-ui">
      {sections.map((section, si) => (
        <div key={section.label}>
          {si > 0 && (
            <div className="mb-4 h-px bg-gradient-to-r from-transparent via-gilt/30 to-transparent" />
          )}
          <p className="mb-2 px-4 font-subtitle text-sm text-gilt/70">
            {section.label}
            <span className="ml-2 font-ui text-[10px] uppercase tracking-wider text-ash/60">{section.sublabel}</span>
          </p>
          <ul className="space-y-0.5">
            {section.links.map((link) => {
              const isActive = location.pathname === link.to || location.pathname.startsWith(link.to + '/')
              const hasChildren = link.children && link.children.length > 0
              const isOpen = expandedLink === link.to
              return (
                <li key={link.to}>
                  <div className="flex items-center">
                    <Link
                      to={link.to}
                      onClick={onNavigate}
                      className={`flex min-w-0 flex-1 items-center gap-2 border-l-2 px-4 py-1.5 text-sm transition-colors ${
                        isActive
                          ? `${elementActiveClass[section.element]} border-l-2 font-medium`
                          : 'border-l-transparent text-ash hover:border-l-gilt/40 hover:text-parchment-800 dark:hover:text-ivory'
                      }`}
                    >
                      <link.icon size={14} className="shrink-0" />
                      {link.label}
                    </Link>
                    {hasChildren && (
                      <button
                        onClick={() => setExpandedLink(isOpen ? null : link.to)}
                        className="mr-2 rounded p-1 text-ash/60 transition-colors hover:text-gilt"
                        aria-label={isOpen ? `Collapse ${link.label}` : `Expand ${link.label}`}
                      >
                        <ChevronRight
                          size={12}
                          className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                        />
                      </button>
                    )}
                  </div>
                  {hasChildren && (
                    <Collapsible open={isOpen}>
                      <ul className="ml-4 space-y-0.5 border-l border-parchment-300 py-1 dark:border-ash/10">
                        {link.children!.map((item, i) => {
                          if (isSubGroup(item)) {
                            return (
                              <li key={item.label ?? i}>
                                {item.label && (
                                  <p className="px-4 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-ash/50 first:pt-0.5">
                                    {item.label}
                                  </p>
                                )}
                                <ul className="space-y-0.5">
                                  {item.links.map((child) => (
                                    <ChildLink
                                      key={child.to}
                                      child={child}
                                      element={section.element}
                                      pathname={location.pathname}
                                      onNavigate={onNavigate}
                                    />
                                  ))}
                                </ul>
                              </li>
                            )
                          }
                          return (
                            <ChildLink
                              key={item.to}
                              child={item}
                              element={section.element}
                              pathname={location.pathname}
                              onNavigate={onNavigate}
                            />
                          )
                        })}
                      </ul>
                    </Collapsible>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

const ChildLink = memo(function ChildLink({ child, element, pathname, onNavigate }: {
  child: SubLink
  element: string
  pathname: string
  onNavigate?: () => void
}) {
  const isChildActive = pathname === child.to || pathname.startsWith(child.to + '/')
  return (
    <li>
      <Link
        to={child.to}
        onClick={onNavigate}
        className={`flex items-center gap-2 px-4 py-1 text-sm transition-all duration-150 ${
          isChildActive
            ? `${elementActiveClass[element]} font-medium`
            : 'text-ash hover:text-parchment-800 dark:hover:text-ivory hover:translate-x-0.5'
        }`}
      >
        {child.icon && <child.icon size={12} className="shrink-0" />}
        {child.label}
      </Link>
    </li>
  )
})
