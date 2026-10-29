import { useState, type ReactNode } from 'react'
import { Download, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

const ZIP_URL = '/ahk/UnoraOverlay.zip'

function Shot({ src, alt }: { src: string; alt: string }) {
  const [ok, setOk] = useState(true)
  if (!ok) return null
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setOk(false)}
      className="mx-auto max-h-[560px] w-auto max-w-full rounded-lg border border-parchment-300 shadow-lg dark:border-ash/20"
    />
  )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="mb-3 font-heading text-2xl font-bold text-gilt">{title}</h2>
      <div className="space-y-4 text-parchment-700 dark:text-parchment-300">{children}</div>
    </section>
  )
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="divide-y divide-parchment-300 rounded-lg border border-parchment-300 bg-parchment-100 dark:divide-ash/10 dark:border-ash/10 dark:bg-ink">
      {rows.map(([k, v]) => (
        <div key={k} className="grid gap-1 px-4 py-3 sm:grid-cols-[13rem_1fr] sm:gap-4">
          <dt className="font-semibold text-parchment-900 dark:text-ivory">{k}</dt>
          <dd className="text-sm">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-parchment-300 bg-parchment-50 px-1.5 py-0.5 font-mono text-xs dark:border-ash/30 dark:bg-obsidian">
      {children}
    </kbd>
  )
}

const TOC = [
  ['menu', 'The Menu'],
  ['wiki', 'The Wiki Overlay'],
  ['options', 'Options'],
  ['hpmp', 'HP/MP Calculator'],
  ['stats', 'Stat Calculator'],
  ['planner', 'Build Planner'],
  ['install', 'Install'],
] as const

export function Overlay() {
  return (
    <div>
      <PageHeader
        title="Unora Overlay"
        description="The Unora Wiki, right on top of your game."
        accent="ignis"
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Overlay' }]}
      />

      <div className="mb-8 flex flex-wrap items-center gap-4 rounded-lg border-l-4 border-gilt bg-gilt/10 p-4 dark:bg-gilt/5">
        <a
          href={ZIP_URL}
          download
          className="inline-flex items-center gap-2 rounded-lg bg-gilt px-5 py-2.5 text-sm font-semibold text-obsidian transition hover:brightness-110"
        >
          <Download className="h-4 w-4" />
          Download Unora Overlay
        </a>
        <p className="min-w-[16rem] flex-1 text-sm text-parchment-700 dark:text-parchment-300">
          Free, Windows 10/11. Unzip the folder anywhere you can write files (Documents or Desktop), then
          double-click <strong>UnoraOverlay.exe</strong>. Updates itself from this site.
        </p>
      </div>

      <div className="mb-8 rounded-lg border-l-4 border-amber-500 bg-amber-500/10 p-4 text-sm text-parchment-700 dark:text-parchment-300">
        <p className="mb-1 flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
          <TriangleAlert className="h-4 w-4" />
          Antivirus or Windows may warn about the download
        </p>
        <p>
          <strong>UnoraOverlay.exe</strong> is the official, unmodified AutoHotkey v2 program, only renamed so it runs
          the overlay script automatically. Some antivirus tools and Windows SmartScreen are cautious about AutoHotkey
          programs and may flag or block it. This is a false alarm. If that happens, allow the folder in your antivirus,
          or choose "More info" then "Run anyway" in SmartScreen. You can also install AutoHotkey v2 from{' '}
          <a
            href="https://www.autohotkey.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gilt underline hover:brightness-110"
          >
            autohotkey.com
          </a>{' '}
          and double-click <strong>UnoraOverlay.ahk</strong> instead. The overlay is a plain, readable script, so you can
          open it in Notepad and see everything it does.
        </p>
      </div>

      <nav className="mb-10 flex flex-wrap gap-2 text-sm">
        {TOC.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
            className="rounded-full border border-parchment-300 px-3 py-1 text-parchment-700 hover:border-gilt hover:text-gilt dark:border-ash/20 dark:text-parchment-300"
          >
            {label}
          </button>
        ))}
      </nav>

      <Section id="menu" title="The Menu">
        <p>
          Press <Key>Ctrl</Key>+<Key>Alt</Key>+<Key>U</Key> in game to open the menu. It has two parts: the wiki
          pages, and small tools that each get their own window.
        </p>
        <Shot src="/overlay/menu.png" alt="The Unora Overlay menu" />
        <Rows
          rows={[
            ['Classes', 'Skills and spells for every class. Use "Build Plan" on a class page to plan what to learn.'],
            ['Items', 'All equipment. Use Compare Equipment to compare items, and pick an enchant or set piece to see how it changes the stats.'],
            ['Quests', 'Quest guides.'],
            ['Professions', 'Recipes and tables for each profession.'],
            ['Build Planner', 'A small window with just your build plan (Ctrl+Alt+B).'],
            ['HP/MP Calculator', 'A small window for HP/MP experience costs (Ctrl+Alt+H).'],
            ['Stat Calculator', 'A small window for stat experience (Ctrl+Alt+S).'],
            ['Options', 'Keybinds, appearance, window, game and update settings (Ctrl+Alt+O).'],
            ['Close', 'Closes the menu. The overlay keeps running in the system tray.'],
            ['?', 'Explains whatever window you are looking at. Every overlay window has one.'],
          ]}
        />
        <p className="text-sm">
          The footer shows your two main keys. Menu: <Key>Ctrl+Alt+U</Key> and Window: <Key>Ctrl+Alt+W</Key> (show / hide
          the wiki window).
        </p>
      </Section>

      <Section id="wiki" title="The Wiki Overlay">
        <p>
          The whole wiki, at your fingertips. Check a quest guide, look up an item, compare gear or plan your skills
          without alt-tabbing to a browser. The overlay shows the real website, so it is always up to date, and the
          window can be moved, resized and pinned on top of the game.
        </p>
        <Shot src="/overlay/wiki.png" alt="The wiki shown over the game" />
        <p className="text-sm">
          The bar along the top has Back, Forward and Reload, plus Menu, Planner, Pin, Options and <strong>?</strong>.
          Closing the window only hides it, and your page is waiting when you open it again.
        </p>
      </Section>

      <Section id="options" title="Options">
        <p>
          Open Options from the menu, the tray icon, or <Key>Ctrl+Alt+O</Key>. Your choices are saved and never touched by
          updates.
        </p>
        <Shot src="/overlay/options.png" alt="The overlay Options window" />
        <h3 className="font-heading text-lg font-semibold text-parchment-900 dark:text-ivory">Keybinds</h3>
        <Rows
          rows={[
            ['Open the menu', 'Ctrl+Alt+U'],
            ['Show / hide the wiki window', 'Ctrl+Alt+W'],
            ['Open the Build Planner', 'Ctrl+Alt+B'],
            ['Open the HP/MP Calculator', 'Ctrl+Alt+H'],
            ['Open the Stat Calculator', 'Ctrl+Alt+S'],
            ['Open Options', 'Ctrl+Alt+O'],
            ['Add skill/spell from game', 'Ctrl+Alt+Middle click (changeable from a list: other modifier combos, or the Mouse 4 / Mouse 5 side buttons, or Off)'],
          ]}
        />
        <p className="text-sm">
          Click a box and press the keys you want. Backspace clears one. Each action needs its own key, and Reset keys
          restores the defaults.
        </p>
        <h3 className="font-heading text-lg font-semibold text-parchment-900 dark:text-ivory">Everything else</h3>
        <Rows
          rows={[
            ['Appearance', 'Colour theme (Unora, Dark, Light, Midnight, Crimson, Forest), "Fade when not in use" so the game shows through when the mouse is away (100 = off), and Page size (zoom).'],
            ['Window', 'Keep the wiki window on top of the game.'],
            ['Game', 'Start automatically when the game launcher opens. The overlay waits quietly in the tray and switches on when the launcher appears.'],
            ['Updates', 'Check for a new version when the overlay starts. "Check now" does it any time. Updating keeps your settings and keybinds.'],
          ]}
        />
      </Section>

      <Section id="hpmp" title="HP/MP Calculator">
        <p>
          A slim window with just the calculator, opened with <Key>Ctrl+Alt+H</Key>. It stays on top of the game and
          remembers where you put it. HP goes up in steps of 50 and MP in steps of 25.
        </p>
        <Shot src="/overlay/hpmp.png" alt="The overlay HP/MP Calculator" />
        <Rows
          rows={[
            ['Between Two Bases', 'Type a starting and ending base for HP, MP or both and press Calculate for the total experience.'],
            ['Max Raise from Exp', 'Type your current base and the experience you have to see the base you can reach and what is left over.'],
          ]}
        />
      </Section>

      <Section id="stats" title="Stat Calculator">
        <p>
          Opened with <Key>Ctrl+Alt+S</Key>. Works out the experience needed to max your stats.
        </p>
        <Shot src="/overlay/stats.png" alt="The overlay Stat Calculator" />
        <ol className="list-decimal space-y-1 pl-6 text-sm">
          <li>Pick your Class and Progression (Pre-Master, Master or Grandmaster). The maximum for each stat is filled in.</li>
          <li>Type your current STR, INT, WIS, CON and DEX.</li>
          <li>Optional: XP/hour (in millions) gives an estimated time, and Current Experience is taken off the total.</li>
        </ol>
      </Section>

      <Section id="planner" title="Build Planner and Add From Game">
        <p>
          <Key>Ctrl+Alt+B</Key> opens a small window with just your build plan. Type a skill or spell name to add it, and
          the plan shows where to learn it, the stats needed and the materials you can tick off. Picks are shared with the
          wiki window.
        </p>
        <Shot src="/overlay/planner.png" alt="The overlay Build Planner" />
        <p>
          Point your mouse at a skill or spell name in the game and press <Key>Ctrl+Alt+Middle click</Key>. The overlay
          reads the name text, finds the skill and adds it to your plan. It reads only the name, never the icon, and works
          at any game window size from 640x480 up. If two names look alike it tells you it is not sure instead of guessing.
        </p>
      </Section>

      <Section id="install" title="Install">
        <ol className="list-decimal space-y-1 pl-6 text-sm">
          <li>Unzip the whole UnoraOverlay folder somewhere you can write files (not Program Files).</li>
          <li>Double-click UnoraOverlay.exe. The menu opens the first time.</li>
          <li>Run the game in Windowed or Borderless mode. If the game runs as administrator, run the overlay as administrator too.</li>
        </ol>
        <p className="text-sm">
          Needs the Microsoft Edge WebView2 Runtime, which is already on Windows 11 and up-to-date Windows 10. The README in
          the zip has troubleshooting.
        </p>
        <a
          href={ZIP_URL}
          download
          className="inline-flex items-center gap-2 rounded-lg bg-gilt px-5 py-2.5 text-sm font-semibold text-obsidian transition hover:brightness-110"
        >
          <Download className="h-4 w-4" />
          Download Unora Overlay
        </a>
      </Section>
    </div>
  )
}
