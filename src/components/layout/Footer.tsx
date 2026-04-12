import { Link } from 'react-router'
import { Heart, Home, Compass, MessageCircle, Download } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-parchment-300 bg-parchment-100 dark:border-ash/10 dark:bg-ink">
      <div className="flex flex-col items-center gap-4 px-6 py-8 lg:px-10 2xl:px-16 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-ui text-sm text-ash">
          <Link to="/" className="flex items-center gap-1.5 transition-colors hover:text-gilt">
            <Home size={14} />
            Home
          </Link>
          <span className="text-ash/30">|</span>
          <Link to="/getting-started" className="flex items-center gap-1.5 transition-colors hover:text-gilt">
            <Compass size={14} />
            Getting Started
          </Link>
          <span className="text-ash/30">|</span>
          <a
            href="https://discord.gg/WkqbMVvDJq"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 transition-colors hover:text-gilt"
          >
            <MessageCircle size={14} />
            Discord
          </a>
          <span className="text-ash/30">|</span>
          <a
            href="https://github.com/Jinori/UnoraLaunchpad/releases/tag/v3.3.2"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 transition-colors hover:text-gilt"
          >
            <Download size={14} />
            Download
          </a>
        </div>
        <div className="flex flex-col items-center gap-1 sm:items-end">
          <p className="font-ui text-xs text-ash/60">
            An official compendium for Unora: Elemental Harmony.
          </p>
          <p className="flex items-center gap-1 font-ui text-xs text-ash/60">
            Made with <Heart size={12} className="fill-ignis text-ignis" /> by Lancelot
            <img
              src="https://aislingexchange.com/news/images/lancelothead.png"
              alt="Lancelot"
              className="ml-0.5 h-4 w-auto"
            />
          </p>
        </div>
      </div>
    </footer>
  )
}
