import { Link } from 'react-router'
import { Heart } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-parchment-300 bg-parchment-100 dark:border-ash/10 dark:bg-ink">
      <div className="flex flex-col items-center gap-4 px-6 py-8 lg:px-10 2xl:px-16 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-4 font-ui text-sm text-ash">
          <Link to="/" className="transition-colors hover:text-gilt">Home</Link>
          <span className="text-ash/30">|</span>
          <a
            href="https://discord.gg/WkqbMVvDJq"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-gilt"
          >
            Discord
          </a>
          <span className="text-ash/30">|</span>
          <a
            href="https://github.com/Jinori/UnoraLaunchpad/releases/tag/v3.3.2"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-gilt"
          >
            Download
          </a>
        </div>
        <div className="flex flex-col items-center gap-1 sm:items-end">
          <p className="font-ui text-xs text-ash/60">
            An official compendium for Unora: Elemental Harmony.
          </p>
          <p className="flex items-center gap-1 font-ui text-xs text-ash/60">
            Made with <Heart size={12} className="fill-ignis text-ignis" /> by Lancelot
          </p>
        </div>
      </div>
    </footer>
  )
}
