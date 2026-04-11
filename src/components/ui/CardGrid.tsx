import { Link } from 'react-router'
import type { LucideIcon } from 'lucide-react'

export interface CardItem {
  title: string
  description: string
  to: string
  image?: string
  count?: number | null
  icon?: LucideIcon
}

interface CardGridProps {
  items: CardItem[]
  columns?: 2 | 3 | 4
}

export function CardGrid({ items, columns = 3 }: CardGridProps) {
  const gridCols = {
    2: 'sm:grid-cols-2 2xl:grid-cols-3',
    3: 'sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4',
    4: 'sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5',
  }

  return (
    <div className={`grid gap-4 ${gridCols[columns]}`}>
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="group overflow-hidden rounded-xl border border-parchment-300 bg-parchment-100 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gilt hover:shadow-md dark:border-ash/10 dark:bg-ink dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] dark:hover:border-gilt dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.4),0_0_30px_rgba(201,162,76,0.06)]"
        >
          {item.image && (
            <div className="aspect-video overflow-hidden">
              <img
                src={item.image}
                alt={item.title}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
            </div>
          )}
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {item.icon && <item.icon size={20} className="shrink-0 text-gilt" />}
                <h2 className="font-heading text-lg font-semibold text-gilt transition-colors group-hover:text-gilt/80">
                  {item.title}
                </h2>
              </div>
              {item.count != null && (
                <span className="rounded-full bg-parchment-200 px-2 py-0.5 font-ui text-xs font-medium text-parchment-600 dark:bg-obsidian dark:text-ash">
                  {item.count}
                </span>
              )}
            </div>
            <p className="mt-1.5 font-ui text-sm text-parchment-600 dark:text-ash">
              {item.description}
            </p>
            <div className="mt-3 flex items-center font-ui text-xs font-medium text-gilt opacity-0 transition-opacity group-hover:opacity-100">
              Explore
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
