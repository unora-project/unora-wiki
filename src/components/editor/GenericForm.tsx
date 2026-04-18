import type { GenericRow, GenericTabSchema } from '@/types/editor'

interface Props {
  schema: GenericTabSchema
  value: GenericRow
  onChange: (v: GenericRow) => void
}

const inputCls =
  'w-full rounded border border-ash/20 bg-crypt-300 px-2 py-2 text-sm text-ivory outline-none focus:border-gilt focus:ring-1 focus:ring-gilt/40'
const labelCls = 'block font-ui text-xs font-semibold text-ivory/80 mb-1'
const sectionCls = 'mt-1 mb-3 font-heading text-xs font-bold uppercase tracking-wider text-gilt border-b border-ash/20 pb-1'

const MULTILINE_HEADERS = new Set([
  'Effects', 'Benefits', 'Ingredients', 'Where to obtain', 'Where to learn', 'Learned From',
])

export function GenericForm({ schema, value, onChange }: Props) {
  const set = (h: string, v: string) => onChange({ ...value, [h]: v })
  return (
    <div className="text-ivory">
      <div className={sectionCls}>{schema.label}</div>
      <div className="flex flex-col gap-3">
        {schema.headers.map((h) => {
          const v = value[h] ?? ''
          const multi = MULTILINE_HEADERS.has(h) && (v.length > 40 || v.includes(','))
          return (
            <div key={h}>
              <label className={labelCls}>
                {h}{h === schema.nameKey && ' *'}
              </label>
              {multi ? (
                <textarea
                  className={`${inputCls} min-h-[72px] resize-y`}
                  value={v}
                  onChange={(e) => set(h, e.target.value)}
                />
              ) : (
                <input
                  type="text"
                  className={inputCls}
                  value={v}
                  onChange={(e) => set(h, e.target.value)}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
