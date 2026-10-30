// Builds the equipment list the site uses from the single ID-based file data-source/items/equipment.csv.
// The conversion itself lives in src/lib/equipment-v2.ts (shared with the editor).
import { existsSync, readFileSync } from 'node:fs'
import { parseEquipmentCsv, type EquipmentItem } from '../src/lib/equipment-v2.ts'

export { parseEquipmentCsv }
export type { EquipmentItem }

export function buildEquipmentV2(csvPath: string): EquipmentItem[] {
  if (!existsSync(csvPath)) return []
  const { entries, problems } = parseEquipmentCsv(readFileSync(csvPath, 'utf8'))
  if (problems.length) throw new Error(`${csvPath} has problems:\n  ${problems.join('\n  ')}`)
  return entries
}
