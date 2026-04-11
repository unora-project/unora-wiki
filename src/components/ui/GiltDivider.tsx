interface GiltDividerProps {
  ornament?: string
  className?: string
}

export function GiltDivider({ ornament = '◆', className = '' }: GiltDividerProps) {
  return (
    <div className={`gilt-divider ${className}`} aria-hidden="true">
      <span className="gilt-divider-ornament">{ornament}</span>
    </div>
  )
}
