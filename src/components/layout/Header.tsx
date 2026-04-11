import { useState } from 'react'
import { Link } from 'react-router'
import { useThemeStore } from '@/stores/theme'
import { LeftNav } from './LeftNav'

export function Header() {
  const { isDark, toggle } = useThemeStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-parchment-300 bg-parchment-100/90 backdrop-blur-sm dark:border-ash/10 dark:bg-ink/90">
      <div className="flex h-24 items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            className="rounded-md p-2 text-parchment-600 lg:hidden dark:text-ash"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>
              </svg>
            )}
          </button>

          <Link to="/" className="flex flex-col items-center">
            <img
              src={`${import.meta.env.BASE_URL}images/UnoraLogo.png`}
              alt="Unora"
              className="h-18 w-auto rounded"
            />
            <span className="font-subtitle text-sm tracking-wide text-parchment-600 dark:text-ash">Elemental Harmony</span>
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Search trigger */}
          <button
            className="flex items-center gap-2 rounded-md border border-parchment-300 bg-parchment-50 px-3 py-1.5 font-ui text-sm text-ash transition-colors hover:border-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ash dark:hover:border-gilt"
            onClick={() => document.dispatchEvent(new CustomEvent('open-search'))}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden rounded bg-parchment-200 px-1.5 py-0.5 font-ui text-xs dark:bg-obsidian sm:inline">Ctrl+K</kbd>
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="rounded-md p-2 text-parchment-600 transition-colors hover:bg-parchment-200 dark:text-ash dark:hover:bg-obsidian"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      <div
        className={`fixed inset-0 top-24 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setMobileOpen(false)}
      />
      <aside
        className={`fixed left-0 top-24 z-50 h-[calc(100vh-6rem)] w-64 overflow-y-auto border-r border-parchment-300 bg-parchment-50 shadow-xl transition-transform duration-200 ease-out lg:hidden dark:border-ash/10 dark:bg-ink ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <LeftNav onNavigate={() => setMobileOpen(false)} />
      </aside>
    </header>
  )
}
