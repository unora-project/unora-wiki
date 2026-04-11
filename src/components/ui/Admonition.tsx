const typeStyles: Record<string, { border: string; bg: string; iconColor: string; sigil: string }> = {
  info: {
    border: 'border-tide',
    bg: 'bg-tide/10 dark:bg-tide/5',
    iconColor: 'text-tide',
    sigil: '◆',
  },
  tip: {
    border: 'border-verdant',
    bg: 'bg-verdant/10 dark:bg-verdant/5',
    iconColor: 'text-verdant',
    sigil: '❧',
  },
  warning: {
    border: 'border-ignis',
    bg: 'bg-ignis/10 dark:bg-ignis/5',
    iconColor: 'text-ignis',
    sigil: '⚠',
  },
  danger: {
    border: 'border-ignis',
    bg: 'bg-ignis/10 dark:bg-ignis/5',
    iconColor: 'text-ignis',
    sigil: '✦',
  },
  note: {
    border: 'border-astral',
    bg: 'bg-astral/10 dark:bg-astral/5',
    iconColor: 'text-astral',
    sigil: '✧',
  },
  abstract: {
    border: 'border-tide',
    bg: 'bg-tide/10 dark:bg-tide/5',
    iconColor: 'text-tide',
    sigil: '❖',
  },
  example: {
    border: 'border-gilt',
    bg: 'bg-gilt/10 dark:bg-gilt/5',
    iconColor: 'text-gilt',
    sigil: '↻',
  },
}

interface AdmonitionProps {
  type: string
  title: string
  children: React.ReactNode
}

export function Admonition({ type, title, children }: AdmonitionProps) {
  const style = typeStyles[type] || typeStyles.info
  return (
    <div
      className={`relative my-4 overflow-hidden rounded-lg border-l-4 ${style.border} ${style.bg} p-4`}
    >
      {/* Corner sigil */}
      <span
        className={`pointer-events-none absolute right-3 top-3 text-2xl opacity-10 ${style.iconColor}`}
        aria-hidden="true"
      >
        {style.sigil}
      </span>
      <div className={`mb-1 flex items-center gap-2 font-heading text-sm font-semibold text-parchment-900 dark:text-ivory`}>
        <span className={`text-xs ${style.iconColor}`}>{style.sigil}</span>
        {title}
      </div>
      <div className="text-sm text-parchment-700 dark:text-ivory/75">
        {children}
      </div>
    </div>
  )
}
