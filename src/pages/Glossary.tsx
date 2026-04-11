import { PageHeader } from '@/components/ui/PageHeader'

const abbreviations = [
  { term: 'AC', definition: 'Armor Class' },
  { term: 'AFK', definition: 'Away From Keyboard' },
  { term: 'AOE', definition: 'Area of Effect. Selects multiple targets at once.' },
  { term: 'AS', definition: 'Attack Speed' },
  { term: 'CDR', definition: 'Cooldown Reduction' },
  { term: 'CON', definition: 'Constitution' },
  { term: 'DEX', definition: 'Dexterity' },
  { term: 'DMG', definition: 'Damage' },
  { term: 'FHB', definition: 'Flat Heal Bonus' },
  { term: 'GP', definition: 'Game Points' },
  { term: 'HB', definition: 'Heal Bonus' },
  { term: 'HP', definition: 'Health Points' },
  { term: 'INT', definition: 'Intelligence' },
  { term: 'LOC', definition: 'Location' },
  { term: 'LVL', definition: 'Level' },
  { term: 'MP', definition: 'Mana Points' },
  { term: 'MR', definition: 'Magic Resistance' },
  { term: 'SKD', definition: 'Skill Damage' },
  { term: 'SPD', definition: 'Spell Damage' },
  { term: 'STR', definition: 'Strength' },
  { term: 'WGT', definition: 'Weight' },
  { term: 'WIS', definition: 'Wisdom' },
]

export function Glossary() {
  return (
    <div>
      <PageHeader
        title="Glossary"
        accent="astral"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Glossary' },
        ]}
      />

      <p className="mb-6 text-parchment-700 dark:text-ivory/80">
        Common abbreviations and terms used throughout Unora.
      </p>

      <div className="overflow-hidden rounded-lg border border-parchment-300 dark:border-ash/20">
        <table className="w-full">
          <thead>
            <tr className="border-b border-parchment-300 bg-parchment-100 dark:border-ash/20 dark:bg-obsidian/50">
              <th className="px-4 py-2.5 text-left text-sm font-semibold text-parchment-800 dark:text-ivory">
                Abbreviation
              </th>
              <th className="px-4 py-2.5 text-left text-sm font-semibold text-parchment-800 dark:text-ivory">
                Meaning
              </th>
            </tr>
          </thead>
          <tbody>
            {abbreviations.map((entry) => (
              <tr
                key={entry.term}
                className="border-b border-parchment-200 last:border-b-0 dark:border-ash/10"
              >
                <td className="px-4 py-2 font-mono text-sm font-semibold text-gilt">
                  {entry.term}
                </td>
                <td className="px-4 py-2 text-sm text-parchment-700 dark:text-ivory/80">
                  {entry.definition}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
