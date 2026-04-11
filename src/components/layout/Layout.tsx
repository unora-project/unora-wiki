import { Outlet, useLocation } from 'react-router'
import { useEffect } from 'react'
import { Header } from './Header'
import { LeftNav } from './LeftNav'
import { Footer } from './Footer'
import { SearchModal } from '@/components/search/SearchModal'
import { BackToTop } from '@/components/ui/BackToTop'

export function Layout() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return (
    <div className="min-h-screen bg-parchment-50 dark:bg-obsidian">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-gilt focus:px-4 focus:py-2 focus:font-ui focus:text-sm focus:font-medium focus:text-obsidian"
      >
        Skip to content
      </a>
      <Header />
      <div className="flex">
        {/* Left rail — navigation */}
        <aside className="sticky top-24 hidden h-[calc(100vh-6rem)] w-60 shrink-0 overflow-y-auto border-r border-parchment-300 bg-parchment-100 dark:border-ash/10 dark:bg-ink lg:block">
          <LeftNav />
        </aside>

        {/* Main content */}
        <main id="main-content" className="min-w-0 flex-1 animate-fade-in-up px-6 py-6 lg:px-10 2xl:px-16">
          <Outlet />
        </main>
      </div>
      <Footer />
      <SearchModal />
      <BackToTop />
    </div>
  )
}
