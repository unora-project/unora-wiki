function mustQuote(v: string): boolean {
  return /[",\n\r]/.test(v)
}

function escapeCell(v: string, preserveQuoted: boolean): string {
  if (mustQuote(v) || preserveQuoted) {
    return `"${v.replace(/"/g, '""')}"`
  }
  return v
}

export function serializeCSV(
  headers: string[],
  rows: Record<string, string>[],
  opts: {
    trailingNewline?: boolean
    quotedMask?: boolean[][]
  } = {}
): string {
  const trailingNewline = opts.trailingNewline ?? true
  const quotedMask = opts.quotedMask
  const out: string[] = []
  out.push(
    headers
      .map((h, i) => escapeCell(h, quotedMask?.[0]?.[i] ?? false))
      .join(',')
  )
  rows.forEach((row, ri) => {
    const mask = quotedMask?.[ri + 1]
    out.push(
      headers
        .map((h, ci) => escapeCell(row[h] ?? '-', mask?.[ci] ?? false))
        .join(',')
    )
  })
  return out.join('\n') + (trailingNewline ? '\n' : '')
}
