import { useEffect, useState } from 'react'
import type { FileDiff } from '@/lib/editor-commit'

interface Props {
  open: boolean
  diffs: FileDiff[]
  defaultMessage: string
  onClose: () => void
  onConfirm: (message: string) => void
  busy: boolean
}

export function CommitDialog({ open, diffs, defaultMessage, onClose, onConfirm, busy }: Props) {
  const [msg, setMsg] = useState(defaultMessage)
  const [selected, setSelected] = useState(0)
  useEffect(() => { setMsg(defaultMessage); setSelected(0) }, [defaultMessage, open])
  if (!open) return null

  const cur = diffs[selected]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/80 p-2 sm:p-4">
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-gilt/40 bg-crypt-400 shadow-[0_0_40px_rgba(201,162,76,0.15)]">
        <div className="flex items-center justify-between border-b border-ash/20 bg-crypt-300 px-3 py-2 sm:px-4 sm:py-3">
          <h2 className="font-heading text-base font-bold text-gilt sm:text-lg">Commit Changes</h2>
          <button onClick={onClose} className="text-xl text-ash hover:text-ivory" disabled={busy}>×</button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-[200px_1fr] lg:grid-cols-[220px_1fr]">
          <ul className="max-h-[30vh] overflow-auto border-b border-ash/20 md:max-h-none md:border-b-0 md:border-r">
            {diffs.map((d, i) => (
              <li key={d.path}>
                <button
                  onClick={() => setSelected(i)}
                  className={`block w-full truncate px-3 py-2 text-left font-ui text-xs ${
                    i === selected ? 'bg-gilt/20 text-gilt' : 'text-ivory/80 hover:bg-crypt-300'
                  }`}
                  title={d.path}
                >
                  {d.path.replace('data-source/', '')}
                </button>
              </li>
            ))}
            {diffs.length === 0 && <li className="px-3 py-2 text-xs text-ash">No changes.</li>}
          </ul>
          <div className="grid min-h-0 grid-cols-1 gap-0 overflow-hidden sm:grid-cols-2">
            <div className="border-b border-ash/20 sm:border-b-0 sm:border-r">
              <div className="border-b border-ash/20 bg-crypt-300 px-3 py-1.5 font-ui text-[11px] uppercase text-ash">Before</div>
              <pre className="max-h-[25vh] overflow-auto whitespace-pre p-3 text-[11px] text-ivory/70 sm:max-h-[55vh]">{cur?.before ?? ''}</pre>
            </div>
            <div>
              <div className="border-b border-ash/20 bg-crypt-300 px-3 py-1.5 font-ui text-[11px] uppercase text-gilt">After</div>
              <pre className="max-h-[25vh] overflow-auto whitespace-pre p-3 text-[11px] text-ivory sm:max-h-[55vh]">{cur?.after ?? ''}</pre>
            </div>
          </div>
        </div>

        <div className="border-t border-ash/20 bg-crypt-300 p-2 sm:p-3">
          <label className="mb-1 block font-ui text-[11px] uppercase tracking-wider text-ash">Commit message</label>
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            className="w-full rounded border border-ash/20 bg-crypt-400 px-2 py-1.5 text-sm text-ivory focus:border-gilt focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="font-ui text-xs text-ash">
              {diffs.length} file{diffs.length === 1 ? '' : 's'} • single atomic commit
            </span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={busy}
                className="rounded border border-ash/30 px-3 py-1.5 text-sm text-ash hover:border-gilt hover:text-gilt disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirm(msg)}
                disabled={busy || diffs.length === 0}
                className="rounded bg-gilt px-4 py-1.5 text-sm font-semibold text-ink hover:bg-gilt/90 disabled:opacity-50"
              >
                {busy ? 'Committing…' : 'Commit to GitHub'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
