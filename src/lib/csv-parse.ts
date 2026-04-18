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

// Splits a CSV body into logical records, honoring quoted newlines so that
// multi-line cells (e.g. cooking Pie benefits) parse as a single row instead of
// fragmenting into ghost rows on every preview/commit.
function splitCSVRecords(body: string): string[] {
  const records: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (ch === '"') {
      if (inQuotes && body[i + 1] === '"') { current += '""'; i++ }
      else { inQuotes = !inQuotes; current += '"' }
      continue
    }
    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && body[i + 1] === '\n') i++
      records.push(current)
      current = ''
      continue
    }
    current += ch
  }
  if (current.length > 0 || inQuotes) records.push(current)
  return records
}

export function parseCSV(content: string): ParsedCSV {
  const trailingNewline = content.endsWith('\n')
  const body = trailingNewline ? content.slice(0, -1) : content
  if (body.length === 0) {
    return { headers: [], rows: [], quotedMask: [], trailingNewline }
  }
  const records = splitCSVRecords(body)
  const headerCells = splitCSVLineWithMeta(records[0])
  const headers = headerCells.map((c) => c.value)
  const rows: Record<string, string>[] = []
  const quotedMask: boolean[][] = []
  quotedMask.push(headerCells.map((c) => c.quoted))
  for (let li = 1; li < records.length; li++) {
    const record = records[li]
    if (record.length === 0) continue
    const cells = splitCSVLineWithMeta(record)
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
