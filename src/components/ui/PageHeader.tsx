import { Link } from 'react-router'

interface Breadcrumb {
  label: string
  to?: string
}

type Element = 'ignis' | 'tide' | 'verdant' | 'astral'

const accentClasses: Record<Element, { border: string; breadcrumb: string }> = {
  ignis: { border: 'border-l-ignis', breadcrumb: 'hover:text-ignis dark:hover:text-ignis' },
  tide: { border: 'border-l-tide', breadcrumb: 'hover:text-tide dark:hover:text-tide' },
  verdant: { border: 'border-l-verdant', breadcrumb: 'hover:text-verdant dark:hover:text-verdant' },
  astral: { border: 'border-l-astral', breadcrumb: 'hover:text-astral dark:hover:text-astral' },
}

interface PageHeaderProps {
  title: string
  description?: string
  subtitle?: string
  breadcrumbs?: Breadcrumb[]
  accent?: Element
}

export function PageHeader({ title, description, subtitle, breadcrumbs, accent }: PageHeaderProps) {
  const a = accent ? accentClasses[accent] : null

  return (
    <div className={`mb-8 ${a ? `border-l-4 ${a.border} pl-4` : ''}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-3 flex items-center gap-1.5 font-ui text-sm text-ash">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-ash/50">/</span>}
              {crumb.to ? (
                <Link
                  to={crumb.to}
                  className={`transition-colors ${a?.breadcrumb ?? 'hover:text-gilt'}`}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-parchment-700 dark:text-ivory/80">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.08em] text-parchment-900 dark:text-ivory">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 font-subtitle text-sm text-ash italic">
          {subtitle}
        </p>
      )}
      {description && (
        <p className="mt-2 font-ui text-sm text-parchment-600 dark:text-ivory/60">
          {description}
        </p>
      )}
    </div>
  )
}
