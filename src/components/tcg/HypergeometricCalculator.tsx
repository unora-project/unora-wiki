import { useId, useMemo, useState } from 'react'
import { cardBySlug, chip, chipActive, chipIdle, panelClass, selectClass } from '@/lib/tcg'
import { DECK_SIZE, HAND_SIZE, MAX_COPIES, countCopies, hypergeometricOdds, type Deck } from '@/lib/tcg-deck'

// Modelled on AetherHub's hypergeometric calculator, with the population fixed at a legal deck size.

const percent = (p: number) => `${(p * 100).toFixed(2)}%`

function NumberField({
  label,
  value,
  onChange,
  max,
  caption,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  max: number
  caption?: string
}) {
  const id = useId()
  // Keep the raw text so the field can be cleared while typing; the number used is clamped.
  const [text, setText] = useState(String(value))
  const shown = Number(text) === value || text === '' ? text : String(value)
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-ui text-sm font-semibold text-parchment-800 dark:text-ivory/90">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={shown}
        onChange={(e) => {
          setText(e.target.value)
          const n = Math.round(Number(e.target.value))
          if (e.target.value !== '' && Number.isFinite(n)) onChange(Math.min(max, Math.max(0, n)))
        }}
        onBlur={() => setText(String(value))}
        className={`${selectClass} w-full`}
      />
      {caption && <p className="mb-0 mt-1 font-ui text-xs text-parchment-600 dark:text-ash">{caption}</p>}
    </div>
  )
}

export function HypergeometricCalculator({ deck }: { deck: Deck }) {
  const [hand, setHand] = useState(HAND_SIZE)
  const [copies, setCopies] = useState(MAX_COPIES)
  const [wanted, setWanted] = useState(1)

  const odds = useMemo(() => hypergeometricOdds(DECK_SIZE, copies, hand, wanted), [copies, hand, wanted])
  const deckCounts = useMemo(() => [...countCopies(deck)].filter(([slug]) => cardBySlug(slug)), [deck])

  const rows: [string, number, boolean?][] = [
    [`Exactly ${wanted}`, odds.exactly],
    [`Fewer than ${wanted}`, odds.fewer],
    [`${wanted} or fewer`, odds.atMost],
    [`More than ${wanted}`, odds.more],
    [`At least ${wanted}`, odds.atLeast, true],
  ]
  const peak = Math.max(...odds.distribution, 0.0001)

  return (
    <section className={`${panelClass} mt-6`} aria-labelledby="hypergeometric-heading">
      <h2 id="hypergeometric-heading" className="mb-1 mt-0 font-heading text-xl font-semibold text-gilt">
        Hypergeometric Calculator
      </h2>
      <p className="mb-4 mt-0 max-w-[80ch] font-ui text-sm text-parchment-700 dark:text-ivory/70">
        Work out the chance of starting with a card. Calculations always assume a {DECK_SIZE}-card deck, the size of every
        legal deck. This tool does not factor in mulligans.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div>
            <NumberField
              label="Cards in Opening Hand (Sample Size)"
              value={hand}
              onChange={setHand}
              max={DECK_SIZE}
              caption={`Both players begin with ${HAND_SIZE} cards in hand, but the player going 2nd begins their turn by drawing an extra card (${HAND_SIZE + 1} cards).`}
            />
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Hand size presets">
              {[
                [HAND_SIZE, 'Going 1st'],
                [HAND_SIZE + 1, 'Going 2nd'],
              ].map(([n, label]) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setHand(n as number)}
                  aria-pressed={hand === n}
                  className={`${chip} px-2 py-0.5 text-xs ${hand === n ? chipActive : chipIdle}`}
                >
                  {label} ({n})
                </button>
              ))}
            </div>
          </div>

          <div>
            <NumberField label="Copies of desired card in the deck" value={copies} onChange={setCopies} max={DECK_SIZE} />
            {deckCounts.length > 0 && (
              <select
                aria-label="Use the copies of a card in your deck"
                value=""
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (n) setCopies(Math.min(DECK_SIZE, n))
                }}
                className={`${selectClass} mt-2 w-full text-xs`}
              >
                <option value="">Use a card from your deck…</option>
                {deckCounts.map(([slug, n]) => (
                  <option key={slug} value={n}>
                    {cardBySlug(slug)?.name} ({n} {n === 1 ? 'copy' : 'copies'})
                  </option>
                ))}
              </select>
            )}
          </div>

          <NumberField label="Copies of Desired Card in Opening Hand" value={wanted} onChange={setWanted} max={DECK_SIZE} />
        </div>

        <div>
          <h3 className="mb-2 mt-0 font-ui text-xs font-semibold uppercase tracking-wider text-parchment-600 dark:text-ash">
            Chance with {copies} {copies === 1 ? 'copy' : 'copies'} in {DECK_SIZE} cards, drawing {hand}
          </h3>
          <table className="w-full border-collapse font-ui text-sm">
            <tbody>
              {rows.map(([label, p, key]) => (
                <tr key={label} className="border-b border-parchment-200 last:border-0 dark:border-ash/10">
                  <th scope="row" className={`py-1.5 pr-3 text-left font-normal ${key ? 'font-semibold text-gilt' : ''}`}>
                    {label}
                  </th>
                  <td className="w-1/2 py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-parchment-200 dark:bg-obsidian">
                        <div className={`h-full rounded-full ${key ? 'bg-gilt' : 'bg-gilt/50'}`} style={{ width: percent(p) }} />
                      </div>
                      <span className={`w-16 text-right tabular-nums ${key ? 'font-semibold text-gilt' : ''}`}>{percent(p)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {odds.distribution.length > 1 && (
            <>
              <h3 className="mb-2 mt-5 font-ui text-xs font-semibold uppercase tracking-wider text-parchment-600 dark:text-ash">
                Copies in opening hand
              </h3>
              <div
                className="flex h-28 items-end gap-1.5 font-ui text-[11px]"
                role="img"
                aria-label={odds.distribution.map((p, i) => `${i}: ${percent(p)}`).join(', ')}
              >
                {odds.distribution.map((p, i) => (
                  <div key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-ash tabular-nums">{(p * 100).toFixed(1)}%</span>
                    <div
                      className={`w-full max-w-12 rounded-t-sm ${i === wanted ? 'bg-gilt' : 'bg-gilt/40'}`}
                      style={{ height: `${(p / peak) * 64}px` }}
                    />
                    <span className={i === wanted ? 'font-semibold text-gilt' : ''}>{i}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
