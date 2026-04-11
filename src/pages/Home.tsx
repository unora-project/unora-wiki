import { Link } from 'react-router'
import {
  Swords, Shield, Scroll, Target, Hammer, Sparkles,
  Building2, Crown, Skull, BookOpen, ClipboardList, Calculator,
  MessageCircle, Download, ArrowRight,
} from 'lucide-react'

type Element = 'ignis' | 'tide' | 'verdant' | 'astral'

const elementStyles: Record<Element, { border: string; text: string; textHover: string; glow: string; explore: string }> = {
  ignis: {
    border: 'hover:border-ignis dark:hover:border-ignis',
    text: 'text-ignis',
    textHover: 'group-hover:text-ignis dark:group-hover:text-ignis',
    glow: 'dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.4),0_0_30px_rgba(230,52,25,0.08)]',
    explore: 'text-ignis',
  },
  tide: {
    border: 'hover:border-tide dark:hover:border-tide',
    text: 'text-tide',
    textHover: 'group-hover:text-tide dark:group-hover:text-tide',
    glow: 'dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.4),0_0_30px_rgba(42,143,212,0.08)]',
    explore: 'text-tide',
  },
  verdant: {
    border: 'hover:border-verdant dark:hover:border-verdant',
    text: 'text-verdant',
    textHover: 'group-hover:text-verdant dark:group-hover:text-verdant',
    glow: 'dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.4),0_0_30px_rgba(91,161,44,0.08)]',
    explore: 'text-verdant',
  },
  astral: {
    border: 'hover:border-astral dark:hover:border-astral',
    text: 'text-astral',
    textHover: 'group-hover:text-astral dark:group-hover:text-astral',
    glow: 'dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.4),0_0_30px_rgba(91,63,184,0.08)]',
    explore: 'text-astral',
  },
}

import type { LucideIcon } from 'lucide-react'

interface Category {
  title: string
  description: string
  to: string
  count: number | null
  element: Element
  icon: LucideIcon
  featured: boolean
}

const categories: Category[] = [
  {
    title: 'Classes',
    description: 'Peasant, Monk, Priest, Rogue, Warrior, Wizard',
    to: '/classes',
    count: 6,
    element: 'ignis',
    icon: Swords,
    featured: true,
  },
  {
    title: 'Equipment',
    description: 'Weapons, armor, accessories, and more',
    to: '/equipment',
    count: null,
    element: 'ignis',
    icon: Shield,
    featured: true,
  },
  {
    title: 'Quests',
    description: 'Circle 1 through Master, dailies, and dungeons',
    to: '/quests',
    count: 48,
    element: 'tide',
    icon: Scroll,
    featured: true,
  },
  {
    title: 'Hunting Grounds',
    description: 'Pre-master and master hunting areas',
    to: '/hunting',
    count: 30,
    element: 'ignis',
    icon: Target,
    featured: false,
  },
  {
    title: 'Professions',
    description: 'Alchemy, Smithing, Enchanting, Cooking, and more',
    to: '/professions',
    count: 8,
    element: 'verdant',
    icon: Hammer,
    featured: false,
  },
  {
    title: 'Religion',
    description: 'Miraelis, Serendael, Skandara, Theselene',
    to: '/religion',
    count: 4,
    element: 'astral',
    icon: Sparkles,
    featured: false,
  },
  {
    title: 'Towns',
    description: 'Mileth, Abel, Piet, Loures, and beyond',
    to: '/towns',
    count: 8,
    element: 'verdant',
    icon: Building2,
    featured: false,
  },
  {
    title: 'Mounts',
    description: 'Mounts, cloaks, and cosmetics',
    to: '/mounts',
    count: null,
    element: 'tide',
    icon: Crown,
    featured: false,
  },
  {
    title: 'Boss Drops',
    description: 'Boss encounters and their loot drops',
    to: '/boss-drops',
    count: null,
    element: 'ignis',
    icon: Skull,
    featured: false,
  },
  {
    title: 'Lore',
    description: 'The mythology and history of Unora',
    to: '/lore',
    count: 2,
    element: 'astral',
    icon: BookOpen,
    featured: false,
  },
  {
    title: 'Patch Notes',
    description: 'Complete changelog history',
    to: '/patch-notes',
    count: 57,
    element: 'tide',
    icon: ClipboardList,
    featured: false,
  },
  {
    title: 'Calculators',
    description: 'HP/MP and stat experience calculators',
    to: '/calculators/stats',
    count: 2,
    element: 'verdant',
    icon: Calculator,
    featured: false,
  },
]

export function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative mb-0 flex flex-col items-center px-4 pt-16 pb-0 text-center">
        {/* Ambient elemental glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(230,52,25,0.06),transparent_50%),radial-gradient(ellipse_at_40%_60%,rgba(42,143,212,0.05),transparent_50%),radial-gradient(ellipse_at_60%_40%,rgba(91,161,44,0.05),transparent_50%),radial-gradient(ellipse_at_80%_50%,rgba(91,63,184,0.06),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_20%_50%,rgba(230,52,25,0.04),transparent_50%),radial-gradient(ellipse_at_40%_60%,rgba(42,143,212,0.04),transparent_50%),radial-gradient(ellipse_at_60%_40%,rgba(91,161,44,0.04),transparent_50%),radial-gradient(ellipse_at_80%_50%,rgba(91,63,184,0.05),transparent_50%)]" />

        <h1 className="relative">
          <img
            src={`${import.meta.env.BASE_URL}images/UnoraLogo.png`}
            alt="Unora"
            className="h-40 w-auto sm:h-52 drop-shadow-lg dark:drop-shadow-[0_2px_16px_rgba(201,162,76,0.15)]"
          />
        </h1>
        <p className="relative mt-3 max-w-md font-ui text-base text-parchment-600 dark:text-ivory/60">
          An official compendium for Unora: Elemental Harmony
        </p>

        {/* Gilt ornament under subtitle */}
        <div className="relative mt-4 flex items-center gap-3 text-gilt/40">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-gilt/40" />
          <span className="font-heading text-sm">&loz;</span>
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-gilt/40" />
        </div>

        <div className="relative mt-5 flex flex-wrap justify-center gap-3">
          <a
            href="https://discord.gg/WkqbMVvDJq"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gilt/40 bg-transparent px-4 py-2 font-ui text-sm font-medium text-parchment-700 transition-all hover:-translate-y-0.5 hover:border-gilt hover:text-gilt dark:text-ivory dark:hover:bg-gilt/10"
          >
            <MessageCircle className="h-4 w-4" />
            Discord
          </a>
          <a
            href="https://github.com/Jinori/UnoraLaunchpad/releases/tag/v3.3.2"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gilt/40 bg-transparent px-4 py-2 font-ui text-sm font-medium text-parchment-700 transition-all hover:-translate-y-0.5 hover:border-gilt hover:text-gilt dark:text-ivory dark:hover:bg-gilt/10"
          >
            <Download className="h-4 w-4" />
            Download
          </a>
          <Link
            to="/getting-started"
            className="inline-flex items-center gap-2 rounded-lg border border-gilt/40 bg-transparent px-4 py-2 font-ui text-sm font-medium text-parchment-700 transition-all hover:-translate-y-0.5 hover:border-gilt hover:text-gilt dark:text-ivory dark:hover:bg-gilt/10"
          >
            Getting Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* God portraits — decorative */}
        <div className="relative mt-4 flex items-end justify-center gap-2 sm:gap-6">
          {['serendael', 'skandara', 'miraelis', 'theselene'].map((god) => (
            <img
              key={god}
              src={`${import.meta.env.BASE_URL}images/religion/${god}.png`}
              alt={god.charAt(0).toUpperCase() + god.slice(1)}
              className="h-40 w-auto drop-shadow-lg sm:h-52 lg:h-60"
            />
          ))}
        </div>
      </section>

      {/* Latest update banner */}
      <Link
        to="/patch-notes"
        className="group relative z-20 mb-6 flex items-center gap-3 rounded-lg border border-parchment-300 bg-parchment-200 px-4 py-2.5 shadow-sm transition-colors hover:border-gilt/40 dark:border-ash/20 dark:bg-ink dark:hover:border-gilt/30"
      >
        <span className="rounded-full bg-tide/15 px-2 py-0.5 font-ui text-xs font-semibold text-tide">NEW</span>
        <span className="font-ui text-sm text-parchment-700 dark:text-ivory/80">
          Latest patch: <span className="font-medium text-tide">March 19, 2025</span>
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto text-tide opacity-0 transition-opacity group-hover:opacity-100">
          <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
        </svg>
      </Link>

      {/* Featured categories — "Start here" row */}
      <section className="mb-4 grid gap-4 sm:grid-cols-3">
        {categories.filter((c) => c.featured).map((cat) => {
          const el = elementStyles[cat.element]
          return (
            <Link
              key={cat.to}
              to={cat.to}
              className={`group rounded-xl border border-parchment-300 bg-parchment-100 p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-ash/10 dark:bg-ink dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] ${el.border} ${el.glow}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <cat.icon size={22} className="shrink-0 text-gilt" />
                  <h2 className="font-heading text-xl font-semibold text-gilt transition-colors">
                    {cat.title}
                  </h2>
                </div>
                {cat.count && (
                  <span className="rounded-full bg-parchment-200 px-2 py-0.5 font-ui text-xs font-medium text-parchment-600 dark:bg-obsidian dark:text-ash">
                    {cat.count}
                  </span>
                )}
              </div>
              <p className="mt-2 font-ui text-sm text-parchment-600 dark:text-ash">
                {cat.description}
              </p>
              <div className="mt-3 flex items-center font-ui text-xs font-medium text-gilt opacity-0 transition-opacity group-hover:opacity-100">
                Explore
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              </div>
            </Link>
          )
        })}
      </section>

      {/* Remaining categories */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {categories.filter((c) => !c.featured).map((cat) => {
          const el = elementStyles[cat.element]
          return (
            <Link
              key={cat.to}
              to={cat.to}
              className={`group rounded-xl border border-parchment-300 bg-parchment-100 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-ash/10 dark:bg-ink dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] ${el.border} ${el.glow}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <cat.icon size={18} className="shrink-0 text-gilt" />
                  <h2 className="font-heading text-lg font-semibold text-gilt transition-colors">
                    {cat.title}
                  </h2>
                </div>
                {cat.count && (
                  <span className="rounded-full bg-parchment-200 px-2 py-0.5 font-ui text-xs font-medium text-parchment-600 dark:bg-obsidian dark:text-ash">
                    {cat.count}
                  </span>
                )}
              </div>
              <p className="mt-1.5 font-ui text-sm text-parchment-600 dark:text-ash">
                {cat.description}
              </p>
              <div className="mt-3 flex items-center font-ui text-xs font-medium text-gilt opacity-0 transition-opacity group-hover:opacity-100">
                Explore
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              </div>
            </Link>
          )
        })}
      </section>
    </div>
  )
}
