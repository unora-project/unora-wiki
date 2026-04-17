import { Link } from 'react-router'
import { PageHeader } from '@/components/ui/PageHeader'
import { Admonition } from '@/components/ui/Admonition'
import { GiltDivider } from '@/components/ui/GiltDivider'
import { OptimizedImage } from '@/components/ui/OptimizedImage'
import {
  Download, MessageCircle, Swords, Hand, Heart, Eye, Wand2,
  Scroll, Target, Shield, Hammer,
  Calculator, BookOpen, Skull, BookA, ArrowRight,
  FlaskConical, Wand, Gem, Anvil, UtensilsCrossed, Fish, Leaf,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/* ── tiny reusable bits ── */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 font-heading text-2xl font-semibold uppercase tracking-[0.08em] text-gilt">
      {children}
    </h2>
  )
}

function StepCard({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div className="relative rounded-xl border border-parchment-300 bg-parchment-100 p-5 dark:border-ash/10 dark:bg-ink">
      <span className="absolute -top-3 left-4 rounded-full bg-tide px-2.5 py-0.5 font-ui text-xs font-bold text-white">
        {step}
      </span>
      <h3 className="mt-1 font-heading text-lg font-semibold text-parchment-900 dark:text-ivory">
        {title}
      </h3>
      <p className="mt-2 font-ui text-sm leading-relaxed text-parchment-700 dark:text-ivory/75">
        {children}
      </p>
    </div>
  )
}

function LinkCard({ to, icon: Icon, title, description, element }: {
  to: string; icon: LucideIcon; title: string; description: string; element: 'ignis' | 'tide' | 'verdant' | 'astral'
}) {
  const hover: Record<string, string> = {
    ignis: 'hover:border-ignis dark:hover:border-ignis',
    tide: 'hover:border-tide dark:hover:border-tide',
    verdant: 'hover:border-verdant dark:hover:border-verdant',
    astral: 'hover:border-astral dark:hover:border-astral',
  }
  const text: Record<string, string> = {
    ignis: 'text-ignis', tide: 'text-tide', verdant: 'text-verdant', astral: 'text-astral',
  }
  return (
    <Link
      to={to}
      className={`group flex items-start gap-3 rounded-xl border border-parchment-300 bg-parchment-100 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-ash/10 dark:bg-ink ${hover[element]}`}
    >
      <Icon size={20} className={`mt-0.5 shrink-0 ${text[element]}`} />
      <div className="min-w-0">
        <h3 className="font-heading text-base font-semibold text-gilt">{title}</h3>
        <p className="mt-0.5 font-ui text-sm text-parchment-600 dark:text-ash">{description}</p>
      </div>
      <ArrowRight size={14} className="ml-auto mt-1 shrink-0 text-gilt opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  )
}

/* ── class data ── */

const classes: { name: string; icon: LucideIcon; role: string }[] = [
  { name: 'Warrior', icon: Swords, role: 'Melee fighter — fury and blades are your forte.' },
  { name: 'Monk', icon: Hand, role: 'Martial artist — channel elemental forces with discipline.' },
  { name: 'Priest', icon: Heart, role: 'Healer — protect and sustain your allies through faith.' },
  { name: 'Rogue', icon: Eye, role: 'Assassin — strike from the shadows with deadly precision.' },
  { name: 'Wizard', icon: Wand2, role: 'Spellcaster — bend the elements for devastating magic.' },
]

/* ── page ── */

export function GettingStarted() {
  return (
    <div>
      <PageHeader
        title="Getting Started"
        description="Everything you need to begin your journey in Unora: Elemental Harmony."
        accent="tide"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Getting Started' },
        ]}
      />

      {/* Intro */}
      <p className="mb-6 max-w-[72ch] leading-relaxed text-parchment-800 dark:text-ivory/90">
        Welcome to <strong className="text-parchment-900 dark:text-ivory">Unora: Elemental Harmony</strong> — a
        free-to-play online RPG set in a world shaped by gods, elements, and endless adventure.
        This guide will walk you through everything you need to know to begin your journey as an Aisling.
      </p>

      {/* ────── Download & Install ────── */}
      <GiltDivider />
      <SectionHeading>Download &amp; Install</SectionHeading>

      <div className="mb-4 flex flex-wrap gap-3">
        <a
          href="https://github.com/Jinori/UnoraLaunchpad/releases/tag/v3.3.2"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-gilt/40 bg-transparent px-4 py-2 font-ui text-sm font-medium text-parchment-700 transition-all hover:-translate-y-0.5 hover:border-gilt hover:text-gilt dark:text-ivory dark:hover:bg-gilt/10"
        >
          <Download className="h-4 w-4" />
          Download Launcher
        </a>
        <a
          href="https://discord.gg/WkqbMVvDJq"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-gilt/40 bg-transparent px-4 py-2 font-ui text-sm font-medium text-parchment-700 transition-all hover:-translate-y-0.5 hover:border-gilt hover:text-gilt dark:text-ivory dark:hover:bg-gilt/10"
        >
          <MessageCircle className="h-4 w-4" />
          Join Discord
        </a>
      </div>

      <ol className="mb-4 ml-6 list-decimal space-y-1 font-ui text-sm text-parchment-800 marker:text-gilt dark:text-ivory/90">
        <li>Download <strong className="text-parchment-900 dark:text-ivory">UnoraLaunchpad</strong> from the link above</li>
        <li>Run <strong className="text-parchment-900 dark:text-ivory">UnoraLaunchpad.exe</strong> — it will automatically download and install the game client</li>
        <li>Create an account and log in</li>
      </ol>

      <Admonition type="tip" title="Tip">
        <p>Join the Unora Discord for community help, updates, and to connect with other players.</p>
      </Admonition>

      {/* ────── Tutorial ────── */}
      <GiltDivider />
      <SectionHeading>The Tutorial</SectionHeading>

      <p className="mb-6 font-ui text-sm text-parchment-700 dark:text-ivory/75">
        Your adventure begins at the <strong className="text-parchment-900 dark:text-ivory">Mileth Inn</strong> with
        an NPC named <strong className="text-parchment-900 dark:text-ivory">Riona</strong>. She'll guide you through the
        basics of Unora step by step.
      </p>

      <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StepCard step={1} title="Riona's Rat Problem">
          Speak to Riona and help her deal with the rats in the inn. Kill 5 rats walking around to complete the first task.
        </StepCard>
        <StepCard step={2} title="Get Your First Weapon">
          Visit <strong>Callo</strong> the weaponsmith at (5,38). Collect 6 branches outside town and he'll craft you a stick and wooden shield.
        </StepCard>
        <StepCard step={3} title="Choose Your Class">
          Head to the <strong>Temple of Choosing</strong> at (9,5). Speak to Aoife, enter the Inner Sanctum, and dedicate yourself to a class. See class descriptions below to help decide.
        </StepCard>
        <StepCard step={4} title="Slay the Crypt">
          Find <strong>Skarn</strong> at (58,25) near the Mileth Crypt. Accept the Slayer of the Crypt quest and clear it out.
        </StepCard>
        <StepCard step={5} title="Earn Your Mount">
          Riona gives you a permanent mount! Visit <strong>Josephine</strong> at (51,49) for gold, XP, game points, and a new weapon.
        </StepCard>
        <StepCard step={6} title="Pick a Profession">
          Learn one of 8 crafting professions from an NPC, then report back to Riona.
        </StepCard>
      </div>

      <Admonition type="tip" title="Reactor Tiles">
        <p>
          When collecting branches, look for <strong>reactor tiles</strong> — spots that trigger when you walk over them.
          Once you find a branch tile near the armorsmith (13,24), walk on and off it repeatedly to collect all 6 quickly.
        </p>
      </Admonition>

      <p className="mt-4 font-ui text-sm text-parchment-700 dark:text-ivory/75">
        Finally, Riona asks you to reach <strong className="text-parchment-900 dark:text-ivory">level 11</strong> through
        hunting or questing. Return to her for a reward and the tutorial is complete!
      </p>

      {/* ────── Classes ────── */}
      <GiltDivider />
      <SectionHeading>Choose Your Class</SectionHeading>

      <p className="mb-4 font-ui text-sm text-parchment-700 dark:text-ivory/75">
        Every Aisling starts as a Peasant and chooses a class at the Temple of Choosing. There are 5 paths:
      </p>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {classes.map((c) => (
          <Link
            key={c.name}
            to={`/classes/${c.name.toLowerCase()}`}
            className="group flex items-start gap-3 rounded-xl border border-parchment-300 bg-parchment-100 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-ignis hover:shadow-md dark:border-ash/10 dark:bg-ink dark:hover:border-ignis"
          >
            <c.icon size={20} className="mt-0.5 shrink-0 text-ignis" />
            <div>
              <h3 className="font-heading text-base font-semibold text-gilt">{c.name}</h3>
              <p className="mt-0.5 font-ui text-xs text-parchment-600 dark:text-ash">{c.role}</p>
            </div>
          </Link>
        ))}
      </div>

      <Admonition type="info" title="Skills & Spells">
        <p>
          Each class has a unique set of skills and spells that define their playstyle.
          Visit the <a href="#/classes" className="font-medium text-tide underline decoration-tide/60 hover:decoration-tide">Classes</a> section for full details.
        </p>
      </Admonition>

      {/* ────── Early Game ────── */}
      <GiltDivider />
      <SectionHeading>Early Game Progression</SectionHeading>

      <p className="mb-4 font-ui text-sm text-parchment-700 dark:text-ivory/75">
        After completing the tutorial, here's what to focus on:
      </p>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-parchment-300 bg-parchment-100 p-5 dark:border-ash/10 dark:bg-ink">
          <div className="mb-2 flex items-center gap-2">
            <Scroll size={18} className="text-tide" />
            <h3 className="font-heading text-lg font-semibold text-gilt">Questing</h3>
          </div>
          <p className="font-ui text-sm text-parchment-700 dark:text-ivory/75">
            Quests are organized into <strong className="text-parchment-900 dark:text-ivory">Circles 1–5</strong>,
            plus side quests, slayer quests, and events. Start with Circle 1 to learn the ropes.
          </p>
        </div>
        <div className="rounded-xl border border-parchment-300 bg-parchment-100 p-5 dark:border-ash/10 dark:bg-ink">
          <div className="mb-2 flex items-center gap-2">
            <Target size={18} className="text-ignis" />
            <h3 className="font-heading text-lg font-semibold text-gilt">Hunting</h3>
          </div>
          <p className="font-ui text-sm text-parchment-700 dark:text-ivory/75">
            Explore <strong className="text-parchment-900 dark:text-ivory">30 hunting areas</strong> from beginner to
            grandmaster. Start at the Mileth Crypt, then venture into the Mythic zones.
          </p>
        </div>
        <div className="rounded-xl border border-parchment-300 bg-parchment-100 p-5 dark:border-ash/10 dark:bg-ink">
          <div className="mb-2 flex items-center gap-2">
            <Shield size={18} className="text-verdant" />
            <h3 className="font-heading text-lg font-semibold text-gilt">Equipment</h3>
          </div>
          <p className="font-ui text-sm text-parchment-700 dark:text-ivory/75">
            Upgrade your weapons, armor, and accessories as you level. Gear is class-specific, so check
            what's available for your path.
          </p>
        </div>
      </div>

      {/* ────── Professions ────── */}
      <GiltDivider />
      <SectionHeading>Professions &amp; Crafting</SectionHeading>

      <p className="mb-4 font-ui text-sm text-parchment-700 dark:text-ivory/75">
        Unora features <strong className="text-parchment-900 dark:text-ivory">8 crafting professions</strong> that
        let you create useful items. You'll pick your first during the tutorial.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { name: 'Alchemy', icon: FlaskConical },
          { name: 'Armorsmithing', icon: Shield },
          { name: 'Weaponsmithing', icon: Anvil },
          { name: 'Enchanting', icon: Wand },
          { name: 'Cooking', icon: UtensilsCrossed },
          { name: 'Fishing', icon: Fish },
          { name: 'Foraging', icon: Leaf },
          { name: 'Jewelcrafting', icon: Gem },
        ].map((p) => (
          <Link
            key={p.name}
            to={`/professions/${p.name.toLowerCase()}`}
            className="flex items-center gap-2 rounded-lg border border-parchment-300 bg-parchment-100 px-3 py-2 font-ui text-sm font-medium text-parchment-800 transition-all hover:-translate-y-0.5 hover:border-verdant hover:text-verdant dark:border-ash/10 dark:bg-ink dark:text-ivory/80 dark:hover:border-verdant dark:hover:text-verdant"
          >
            <p.icon size={16} className="shrink-0 text-verdant" />
            {p.name}
          </Link>
        ))}
      </div>

      {/* ────── Religion ────── */}
      <GiltDivider />
      <SectionHeading>Religion &amp; Blessings</SectionHeading>

      <p className="mb-4 font-ui text-sm text-parchment-700 dark:text-ivory/75">
        Four Goddesses watch over Unora, each offering unique blessings that cost faith to activate.
      </p>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { name: 'Miraelis', domain: 'Light & Life', image: 'miraelis' },
          { name: 'Serendael', domain: 'Fortune & Harmony', image: 'serendael' },
          { name: 'Skandara', domain: 'War & Conflict', image: 'skandara' },
          { name: 'Theselene', domain: 'Moon & Mystery', image: 'theselene' },
        ].map((g) => (
          <Link
            key={g.name}
            to={`/religion/${g.name.toLowerCase()}`}
            className="group overflow-hidden rounded-xl border border-parchment-300 bg-parchment-100 shadow-sm transition-all hover:-translate-y-0.5 hover:border-astral hover:shadow-md dark:border-ash/10 dark:bg-ink dark:hover:border-astral"
          >
            <div className="flex justify-center bg-parchment-200/50 py-3 dark:bg-obsidian/50">
              <OptimizedImage
                src={`${import.meta.env.BASE_URL}images/religion/${g.image}.png`}
                alt={g.name}
                className="h-24 w-auto drop-shadow-md transition-transform group-hover:scale-105"
              />
            </div>
            <div className="p-3 text-center">
              <h3 className="font-heading text-base font-semibold text-astral">{g.name}</h3>
              <p className="font-ui text-xs text-parchment-600 dark:text-ash">{g.domain}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ────── Towns ────── */}
      <GiltDivider />
      <SectionHeading>Towns &amp; The World</SectionHeading>

      <p className="mb-4 font-ui text-sm text-parchment-700 dark:text-ivory/75">
        Unora is made up of <strong className="text-parchment-900 dark:text-ivory">8 major towns</strong>, each with
        banks, magic masters, bartenders, quest givers, and specialty shops.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { name: 'Mileth', desc: 'Starting town' },
          { name: 'Abel', desc: 'Coastal hub' },
          { name: 'Piet', desc: 'Mountain fortress' },
          { name: 'Loures', desc: 'Grand capital' },
          { name: 'Undine', desc: 'Lakeside village' },
          { name: 'Suomi', desc: 'Farming community' },
          { name: 'Rucesion', desc: 'Arcane city' },
          { name: 'Tagor', desc: 'Desert outpost' },
        ].map((t) => (
          <Link
            key={t.name}
            to={`/towns/${t.name.toLowerCase()}`}
            className="rounded-lg border border-parchment-300 bg-parchment-100 px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:border-verdant hover:shadow-sm dark:border-ash/10 dark:bg-ink dark:hover:border-verdant"
          >
            <div className="font-heading text-sm font-semibold text-gilt">{t.name}</div>
            <div className="font-ui text-xs text-parchment-600 dark:text-ash">{t.desc}</div>
          </Link>
        ))}
      </div>

      {/* ────── Useful Resources ────── */}
      <GiltDivider />
      <SectionHeading>Useful Resources</SectionHeading>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <LinkCard to="/calculators/stats" icon={Calculator} title="Stat Calculator" description="Plan your stat distribution" element="verdant" />
        <LinkCard to="/calculators/hpmp" icon={Calculator} title="HP/MP Calculator" description="Calculate health and mana pools" element="verdant" />
        <LinkCard to="/equipment" icon={Shield} title="Equipment Database" description="Browse all weapons, armor, and accessories" element="ignis" />
        <LinkCard to="/boss-drops" icon={Skull} title="Boss Drops" description="See what loot bosses drop" element="ignis" />
        <LinkCard to="/glossary" icon={BookA} title="Glossary" description="Look up game terms and mechanics" element="tide" />
        <LinkCard to="/patch-notes" icon={Scroll} title="Patch Notes" description="Stay up to date with latest changes" element="tide" />
        <LinkCard to="/lore" icon={BookOpen} title="Lore" description="Discover the mythology of Unora" element="astral" />
        <LinkCard to="/hunting" icon={Target} title="Hunting Grounds" description="Find areas for your level" element="ignis" />
        <LinkCard to="/professions" icon={Hammer} title="Professions" description="Recipes and crafting details" element="verdant" />
      </div>
    </div>
  )
}
