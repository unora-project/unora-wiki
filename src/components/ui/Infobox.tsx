type ElementColor = 'ignis' | 'tide' | 'verdant' | 'astral' | 'gilt'

const borderColors: Record<ElementColor, string> = {
  ignis: 'border-t-ignis',
  tide: 'border-t-tide',
  verdant: 'border-t-verdant',
  astral: 'border-t-astral',
  gilt: 'border-t-gilt',
}

const titleColors: Record<ElementColor, string> = {
  ignis: 'text-ignis',
  tide: 'text-tide',
  verdant: 'text-verdant',
  astral: 'text-astral',
  gilt: 'text-gilt',
}

interface InfoboxEntry {
  label: string
  value: string | number | React.ReactNode
}

interface InfoboxProps {
  title: string
  element?: ElementColor
  image?: string
  entries: InfoboxEntry[]
}

export function Infobox({ title, element = 'gilt', image, entries }: InfoboxProps) {
  return (
    <div className={`rounded-lg border-t-4 ${borderColors[element]} border-b border-b-${element}/30 bg-parchment-100 dark:bg-ink`}>
      {/* Header */}
      <div className="px-4 py-3">
        <h3 className={`font-heading text-sm font-semibold uppercase tracking-[0.08em] ${titleColors[element]}`}>
          {title}
        </h3>
      </div>

      {/* Optional image */}
      {image && (
        <div className="px-4 pb-3">
          <img
            src={image}
            alt={title}
            className="w-full rounded border border-gilt/20"
            loading="lazy"
          />
        </div>
      )}

      {/* Key-value pairs */}
      <div className="divide-y divide-ash/10">
        {entries.map((entry, i) => (
          <div key={i} className="flex justify-between gap-4 px-4 py-2">
            <span className="font-ui text-xs font-semibold uppercase tracking-wider text-ash">
              {entry.label}
            </span>
            <span className="text-right text-sm text-parchment-800 dark:text-ivory">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
