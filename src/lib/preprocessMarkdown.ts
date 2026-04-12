function convertCollapsibles(md: string): string {
  const lines = md.split('\n')
  const result: string[] = []
  let i = 0

  while (i < lines.length) {
    const match = lines[i].match(/^(\?{3}\+?)\s+\w+\s*(?:"([^"]*)")?\s*$/)
    if (!match) {
      result.push(lines[i])
      i++
      continue
    }

    const marker = match[1]
    const title = match[2] ?? ''
    i++

    // Collect indented content, allowing blank lines inside the block
    const contentLines: string[] = []
    while (i < lines.length) {
      const line = lines[i]
      if (/^(?:    |\t)/.test(line)) {
        contentLines.push(line.replace(/^(?:    |\t)/, ''))
        i++
        continue
      }
      if (line.trim() === '') {
        // Peek ahead: if the next non-blank line is still indented, keep going.
        let j = i + 1
        while (j < lines.length && lines[j].trim() === '') j++
        if (j < lines.length && /^(?:    |\t)/.test(lines[j])) {
          contentLines.push('')
          i++
          continue
        }
      }
      break
    }

    const open = marker.includes('+') ? ' open' : ''
    const cleanContent = contentLines.join('\n').trim()
    result.push(`<details${open}><summary>${title}</summary>`)
    result.push('')
    result.push(cleanContent)
    result.push('')
    result.push('</details>')
    result.push('')
  }

  return result.join('\n')
}

function convertAdmonitions(md: string): string {
  const lines = md.split('\n')
  const result: string[] = []
  let i = 0

  while (i < lines.length) {
    const admonMatch = lines[i].match(/^!{3}\s+(\w+)\s*(?:"([^"]*)")?/)
    if (!admonMatch) {
      result.push(lines[i])
      i++
      continue
    }

    const type = admonMatch[1]
    const rawTitle = admonMatch[2] // undefined if no quotes, '' if empty quotes ""
    i++

    // Collect content: indented lines first, then if empty, unindented lines after blank
    const contentLines: string[] = []

    // Skip one optional blank line after the !!!
    if (i < lines.length && lines[i].trim() === '') {
      i++
    }

    // Collect indented content (4 spaces or tab)
    const startedIndented = i < lines.length && /^(?:    |\t)/.test(lines[i])
    if (startedIndented) {
      while (i < lines.length && (/^(?:    |\t)/.test(lines[i]) || lines[i].trim() === '')) {
        contentLines.push(lines[i].replace(/^(?:    |\t)/, ''))
        i++
      }
    } else {
      // Unindented content: collect until next admonition, collapsible, heading, or double blank line
      let blankCount = 0
      while (i < lines.length) {
        // Stop at next admonition or collapsible
        if (/^!{3}\s+\w+/.test(lines[i]) || /^\?{3}\+?\s+\w+/.test(lines[i])) break
        // Stop at headings
        if (/^#{1,6}\s/.test(lines[i])) break

        if (lines[i].trim() === '') {
          blankCount++
          // Double blank line ends the block
          if (blankCount >= 2) break
          contentLines.push(lines[i])
          i++
        } else {
          blankCount = 0
          contentLines.push(lines[i])
          i++
        }
      }
    }

    const cleanContent = contentLines.join('\n').trim()

    // Empty title ("") means this is just a content wrapper, not a real admonition
    if (rawTitle === '') {
      result.push('')
      result.push(cleanContent)
      result.push('')
      continue
    }

    const title = rawTitle ?? (type.charAt(0).toUpperCase() + type.slice(1))
    // Strip MkDocs icon shortcodes from titles (e.g. :octicons-people-16:)
    const cleanTitle = title.replace(/:[\w-]+:\s*/g, '').trim()

    result.push(`<div class="admonition admonition-${type}" data-type="${type}"><div class="admonition-title">${cleanTitle}</div><div class="admonition-content">\n\n${cleanContent}\n\n</div></div>`)
    result.push('')
  }

  return result.join('\n')
}

/**
 * Converts MkDocs-flavored markdown to standard markdown/HTML
 * that react-markdown + rehype-raw can render.
 */
export function preprocessMarkdown(raw: string, imageBasePath = `${import.meta.env.BASE_URL}images`): string {
  let md = raw

  // Strip YAML frontmatter
  md = md.replace(/^---\n[\s\S]*?\n---\n?/, '')

  // Strip MkDocs icon links like [:octicons-arrow-left-24: Back to ...]
  md = md.replace(/\[:[\w-]+:\s*[^\]]*\]\([^)]*\)/g, '')

  // Strip {{ read_csv('...') }} macros
  md = md.replace(/\{\{\s*read_csv\([^)]*\)\s*\}\}/g, '')

  // Convert admonitions: !!! type "title" or !!! type
  // MkDocs admonitions can have indented content OR unindented content after a blank line.
  // Empty-title admonitions (!!! info "") are rendered as plain content, not callout boxes.
  // We process line-by-line instead of regex to correctly capture unindented content blocks.
  md = convertAdmonitions(md)

  // Convert collapsible blocks: ???+ type "title" or ??? type "title"
  md = convertCollapsibles(md)

  // Strip MkDocs image attributes like { width="900"; } or { align=right }
  md = md.replace(/\{[^}]*(?:width|align|loading)[^}]*\}/g, '')

  // Rewrite relative image paths to absolute paths
  // ![alt](../assets/foo.png) or ![alt](./assets/foo.png)
  md = md.replace(
    /!\[([^\]]*)\]\((?:\.\.?\/)*assets\/([^)]+)\)/g,
    `![$1](${imageBasePath}/$2)`
  )

  // Clean up excessive blank lines
  md = md.replace(/\n{4,}/g, '\n\n\n')

  return md.trim()
}
