// Each Temuair class and the two Medenia classes that branch from it.
export const CLASS_FAMILIES: Record<string, string[]> = {
  warrior: ['warrior', 'berserker', 'warlord'],
  monk: ['monk', 'adept', 'druid'],
  priest: ['priest', 'bard', 'plague-doctor'],
  rogue: ['rogue', 'archer', 'assassin'],
  wizard: ['wizard', 'arcanist', 'elementalist'],
}

// Normalizes whatever was typed into the CMS class field
// ("Plague Doctor", "plague doctor", "plague-doctor") to a folder slug.
export function classSlug(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-')
}

export function classLabel(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// "adept" -> "monk". Temuair classes map to themselves.
export function parentClass(slug: string): string {
  for (const [parent, family] of Object.entries(CLASS_FAMILIES)) {
    if (family.includes(slug)) return parent
  }
  return slug
}