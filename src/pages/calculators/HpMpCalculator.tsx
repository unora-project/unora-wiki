import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'

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

export function HpMpCalculator() {
  const [startHP, setStartHP] = useState('')
  const [endHP, setEndHP] = useState('')
  const [startMP, setStartMP] = useState('')
  const [endMP, setEndMP] = useState('')
  const [result, setResult] = useState<string | null>(null)

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
      setResult(errors.join('\n'))
    } else if (total > 0) {
      setResult(`Total experience needed: ${formatNumber(total)}`)
    } else {
      setResult('Please enter at least HP or MP values.')
    }
  }

  return (
    <div>
      <PageHeader
        title="HP/MP Calculator"
        description="Calculate how much experience is needed to increase your base HP/MP."
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

      <div className="max-w-lg">
        <div className="overflow-hidden rounded-lg border border-parchment-300 dark:border-ash/20">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-parchment-300 bg-parchment-200 dark:border-ash/20 dark:bg-ink">
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-parchment-600 dark:text-parchment-400">Attribute</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-parchment-600 dark:text-parchment-400">Increments</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-parchment-600 dark:text-parchment-400">Starting Base</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-parchment-600 dark:text-parchment-400">Ending Base</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-parchment-200 dark:border-ash/10">
                <td className="px-4 py-3 font-semibold text-ignis">HP</td>
                <td className="px-4 py-3 text-parchment-600 dark:text-parchment-400">+50</td>
                <td className="px-4 py-3">
                  <input type="number" value={startHP} onChange={(e) => setStartHP(e.target.value)} min="0" step="50"
                    className="w-24 rounded border border-parchment-300 bg-parchment-50 px-2 py-1.5 text-sm outline-none focus:border-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ivory"
                  />
                </td>
                <td className="px-4 py-3">
                  <input type="number" value={endHP} onChange={(e) => setEndHP(e.target.value)} min="0" step="50"
                    className="w-24 rounded border border-parchment-300 bg-parchment-50 px-2 py-1.5 text-sm outline-none focus:border-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ivory"
                  />
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-tide">MP</td>
                <td className="px-4 py-3 text-parchment-600 dark:text-parchment-400">+25</td>
                <td className="px-4 py-3">
                  <input type="number" value={startMP} onChange={(e) => setStartMP(e.target.value)} min="0" step="25"
                    className="w-24 rounded border border-parchment-300 bg-parchment-50 px-2 py-1.5 text-sm outline-none focus:border-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ivory"
                  />
                </td>
                <td className="px-4 py-3">
                  <input type="number" value={endMP} onChange={(e) => setEndMP(e.target.value)} min="0" step="25"
                    className="w-24 rounded border border-parchment-300 bg-parchment-50 px-2 py-1.5 text-sm outline-none focus:border-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ivory"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <button
          onClick={calculate}
          className="mt-4 rounded-lg border border-gilt bg-transparent px-6 py-2.5 text-sm font-semibold text-gilt transition-colors hover:bg-gilt/15"
        >
          Calculate
        </button>

        {result && (
          <div className="mt-4 rounded-lg border border-parchment-300 bg-parchment-100 p-4 dark:border-ash/10 dark:bg-ink">
            <p className="whitespace-pre-wrap font-heading text-sm font-semibold text-gilt">
              {result}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
