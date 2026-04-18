export interface ParsedCell {
  value: string
  quoted: boolean
}

export interface ParsedCSV {
  headers: string[]
  rows: Record<string, string>[]
  quotedMask: boolean[][]
  trailingNewline: boolean
}

export function splitCSVLine(line: string): string[] {
  return splitCSVLineWithMeta(line).map((c) => c.value)
}

export function splitCSVLineWithMeta(line: string): ParsedCell[] {
  const cells: ParsedCell[] = []
  let current = ''
  let inQuotes = false
  let cellWasQuoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        if (!inQuotes) cellWasQuoted = true
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push({ value: current, quoted: cellWasQuoted })
      current = ''
      cellWasQuoted = false
    } else {
      current += ch
    }
  }
  cells.push({ value: current, quoted: cellWasQuoted })
  return cells
}

export function parseCSV(content: string): ParsedCSV {
  const trailingNewline = content.endsWith('\n')
  const body = trailingNewline ? content.slice(0, -1) : content
  if (body.length === 0) {
    return { headers: [], rows: [], quotedMask: [], trailingNewline }
  }
  const lines = body.split('\n')
  const headerCells = splitCSVLineWithMeta(lines[0])
  const headers = headerCells.map((c) => c.value)
  const rows: Record<string, string>[] = []
  const quotedMask: boolean[][] = []
  quotedMask.push(headerCells.map((c) => c.quoted))
  for (let li = 1; li < lines.length; li++) {
    const line = lines[li]
    if (line.length === 0) continue
    const cells = splitCSVLineWithMeta(line)
    const row: Record<string, string> = {}
    const mask: boolean[] = []
    headers.forEach((h, i) => {
      row[h] = cells[i]?.value ?? '-'
      mask.push(cells[i]?.quoted ?? false)
    })
    rows.push(row)
    quotedMask.push(mask)
  }
  return { headers, rows, quotedMask, trailingNewline }
}
