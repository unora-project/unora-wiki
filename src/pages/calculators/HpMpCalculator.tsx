import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'

type TabId = 'exp-between' | 'max-raise'

const TABS: { id: TabId; label: string }[] = [
  { id: 'exp-between', label: 'Between Two Bases' },
  { id: 'max-raise', label: 'Max Raise from Exp' },
]

function formatNumber(num: number): string {
  return num.toLocaleString()
}

function calculateExp(startBase: number, endBase: number, increment: number): number | null {
  if (isNaN(startBase) || isNaN(endBase) || startBase >= endBase) return null
  const diff = endBase - startBase
  if (diff % increment !== 0) return null

  let total = 0
  const steps = diff / increment
  for (let step = 1; step <= steps; step++) {
    const current = startBase + increment * step
    total += current * 500
  }
  return total
}

function maxRaiseFromExp(
  currentBase: number,
  availableExp: number,
  increment: 50 | 25,
): { newBase: number; leftoverExp: number } | null {
  if (isNaN(currentBase) || isNaN(availableExp)) return null
  if (currentBase < 0 || availableExp < 0) return null
  let point = currentBase
  let exp = availableExp
  let nextCost = (point + increment) * 500
  while (exp - nextCost >= 0) {
    point += increment
    exp -= nextCost
    nextCost = (point + increment) * 500
  }
  return { newBase: point, leftoverExp: exp }
}

const INPUT_CLASS =
  'w-24 rounded border border-parchment-300 bg-parchment-50 px-2 py-1.5 text-sm outline-none focus:border-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ivory'
const BUTTON_CLASS =
  'mt-4 rounded-lg border border-gilt bg-transparent px-6 py-2.5 text-sm font-semibold text-gilt transition-colors hover:bg-gilt/15'
const RESULT_CLASS =
  'mt-4 rounded-lg border border-parchment-300 bg-parchment-100 p-4 dark:border-ash/10 dark:bg-ink'
const RESULT_TEXT = 'whitespace-pre-wrap font-heading text-sm font-semibold text-gilt'
const TABLE_WRAPPER = 'overflow-hidden rounded-lg border border-parchment-300 dark:border-ash/20'
const TABLE_HEAD_ROW = 'border-b border-parchment-300 bg-parchment-200 dark:border-ash/20 dark:bg-ink'
const TABLE_HEAD_CELL =
  'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-parchment-600 dark:text-parchment-400'

export function HpMpCalculator() {
  const [activeTab, setActiveTab] = useState<TabId>('exp-between')

  // Calc1: max raise from exp pool
  const [calc1Stat, setCalc1Stat] = useState<'HP' | 'MP'>('HP')
  const [calc1Base, setCalc1Base] = useState('')
  const [calc1Exp, setCalc1Exp] = useState('')
  const [calc1Result, setCalc1Result] = useState<string | null>(null)

  // Calc2: exp between two bases
  const [startHP, setStartHP] = useState('')
  const [endHP, setEndHP] = useState('')
  const [startMP, setStartMP] = useState('')
  const [endMP, setEndMP] = useState('')
  const [calc2Result, setCalc2Result] = useState<string | null>(null)

  function calculateMaxRaise() {
    const base = parseInt(calc1Base)
    const exp = parseInt(calc1Exp)
    const increment: 50 | 25 = calc1Stat === 'HP' ? 50 : 25

    if (isNaN(base) || isNaN(exp)) {
      setCalc1Result('Please enter both current base and available experience.')
      return
    }
    if (base < 0 || exp < 0) {
      setCalc1Result('Values must be zero or positive.')
      return
    }
    const out = maxRaiseFromExp(base, exp, increment)
    if (!out) {
      setCalc1Result('Invalid input.')
      return
    }
    const raises = (out.newBase - base) / increment
    setCalc1Result(
      `New ${calc1Stat} base: ${formatNumber(out.newBase)} (${raises} raise${raises === 1 ? '' : 's'})\nLeftover exp: ${formatNumber(out.leftoverExp)}`,
    )
  }

  function calculate() {
    let total = 0
    const errors: string[] = []

    const sHP = parseInt(startHP)
    const eHP = parseInt(endHP)
    const sMP = parseInt(startMP)
    const eMP = parseInt(endMP)

    if (!isNaN(sHP) && !isNaN(eHP)) {
      if (sHP >= eHP) {
        errors.push('HP: Ending base must be greater than starting base.')
      } else if ((eHP - sHP) % 50 !== 0) {
        errors.push('HP: Please use increments of 50.')
      } else {
        total += calculateExp(sHP, eHP, 50) || 0
      }
    }

    if (!isNaN(sMP) && !isNaN(eMP)) {
      if (sMP >= eMP) {
        errors.push('MP: Ending base must be greater than starting base.')
      } else if ((eMP - sMP) % 25 !== 0) {
        errors.push('MP: Please use increments of 25.')
      } else {
        total += calculateExp(sMP, eMP, 25) || 0
      }
    }

    if (errors.length > 0) {
      setCalc2Result(errors.join('\n'))
    } else if (total > 0) {
      setCalc2Result(`Total experience needed: ${formatNumber(total)}`)
    } else {
      setCalc2Result('Please enter at least HP or MP values.')
    }
  }

  return (
    <div>
      <PageHeader
        title="HP/MP Calculator"
        description="Experience math for raising HP/MP base values."
        accent="ignis"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Calculators' },
          { label: 'HP/MP' },
        ]}
      />

      <div className="mb-4 rounded-lg border-l-4 border-gilt bg-gilt/10 p-4 dark:bg-gilt/5">
        <p className="text-sm text-parchment-700 dark:text-parchment-300">
          HP is added in increments of <strong>50</strong>. MP is added in increments of <strong>25</strong>.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-parchment-300 dark:border-ash/20">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-4 py-2.5 font-ui text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-gilt'
                : 'text-ash hover:text-parchment-800 dark:hover:text-ivory'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-gilt" />
            )}
          </button>
        ))}
      </div>

      <div className="max-w-2xl">
        {activeTab === 'exp-between' && (
          <section>
            <p className="mb-3 text-sm text-parchment-600 dark:text-parchment-400">
              Calculate total experience needed to raise HP/MP from a starting base to an ending base.
            </p>

            <div className={TABLE_WRAPPER}>
              <table className="w-full text-sm">
                <thead>
                  <tr className={TABLE_HEAD_ROW}>
                    <th className={TABLE_HEAD_CELL}>Attribute</th>
                    <th className={TABLE_HEAD_CELL}>Increments</th>
                    <th className={TABLE_HEAD_CELL}>Starting Base</th>
                    <th className={TABLE_HEAD_CELL}>Ending Base</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-parchment-200 dark:border-ash/10">
                    <td className="px-4 py-3 font-semibold text-ignis">HP</td>
                    <td className="px-4 py-3 text-parchment-600 dark:text-parchment-400">+50</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={startHP}
                        onChange={(e) => setStartHP(e.target.value)}
                        min="0"
                        step="50"
                        className={INPUT_CLASS}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={endHP}
                        onChange={(e) => setEndHP(e.target.value)}
                        min="0"
                        step="50"
                        className={INPUT_CLASS}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-tide">MP</td>
                    <td className="px-4 py-3 text-parchment-600 dark:text-parchment-400">+25</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={startMP}
                        onChange={(e) => setStartMP(e.target.value)}
                        min="0"
                        step="25"
                        className={INPUT_CLASS}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={endMP}
                        onChange={(e) => setEndMP(e.target.value)}
                        min="0"
                        step="25"
                        className={INPUT_CLASS}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button onClick={calculate} className={BUTTON_CLASS}>
              Calculate
            </button>

            {calc2Result && (
              <div className={RESULT_CLASS}>
                <p className={RESULT_TEXT}>{calc2Result}</p>
              </div>
            )}
          </section>
        )}

        {activeTab === 'max-raise' && (
          <section>
            <p className="mb-3 text-sm text-parchment-600 dark:text-parchment-400">
              Given a current base and an experience pool, calculate how many raises fit.
            </p>

            <div className="mb-3 flex flex-wrap items-center gap-4">
              <div className="flex gap-3">
                {(['HP', 'MP'] as const).map((s) => (
                  <label
                    key={s}
                    className="flex items-center gap-1.5 text-sm text-parchment-700 dark:text-parchment-300"
                  >
                    <input
                      type="radio"
                      name="calc1Stat"
                      value={s}
                      checked={calc1Stat === s}
                      onChange={() => setCalc1Stat(s)}
                      className="accent-gilt"
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            <div className={TABLE_WRAPPER}>
              <table className="w-full text-sm">
                <thead>
                  <tr className={TABLE_HEAD_ROW}>
                    <th className={TABLE_HEAD_CELL}>Current Base</th>
                    <th className={TABLE_HEAD_CELL}>Available Exp</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={calc1Base}
                        onChange={(e) => setCalc1Base(e.target.value)}
                        min="0"
                        step={calc1Stat === 'HP' ? 50 : 25}
                        className={INPUT_CLASS}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={calc1Exp}
                        onChange={(e) => setCalc1Exp(e.target.value)}
                        min="0"
                        className={`${INPUT_CLASS} w-36`}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button onClick={calculateMaxRaise} className={BUTTON_CLASS}>
              Calculate
            </button>

            {calc1Result && (
              <div className={RESULT_CLASS}>
                <p className={RESULT_TEXT}>{calc1Result}</p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
