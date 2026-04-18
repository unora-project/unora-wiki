import { Plus, X } from 'lucide-react'
import type { EditorItem, EditorRecipe } from '@/types/editor'
import { CLASSES, GENDERS, ITEM_TYPES, SET_BONUSES, CRAFT_RANKS } from '@/types/editor'

type ItemFormTab = 'items' | 'jewelcrafting' | 'armorsmithing' | 'weaponsmithing'

const inputCls =
  'w-full rounded border border-ash/20 bg-crypt-300 px-2 py-2 text-sm text-ivory outline-none focus:border-gilt focus:ring-1 focus:ring-gilt/40'
const labelCls = 'block font-ui text-xs font-semibold text-ivory/80 mb-1'
const sectionCls = 'mt-5 mb-2 font-heading text-xs font-bold uppercase tracking-wider text-gilt border-b border-ash/20 pb-1'

function N({ label, value, onChange, step }: { label: string; value: any; onChange: (v: any) => void; step?: number }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type="number"
        step={step}
        className={inputCls}
        value={value === '' || value == null ? '' : value}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      />
    </div>
  )
}

function S({ label, value, onChange, placeholder }: { label: string; value: any; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type="text"
        className={inputCls}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function Sel({ label, value, onChange, options }: { label: string; value: any; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <select className={inputCls} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>{o || '(None)'}</option>
        ))}
      </select>
    </div>
  )
}

interface Props {
  tab: ItemFormTab
  value: EditorItem | EditorRecipe
  onChange: (v: EditorItem | EditorRecipe) => void
}

export function ItemForm({ tab, value, onChange }: Props) {
  const up = (patch: Partial<EditorItem | EditorRecipe>) => onChange({ ...value, ...patch } as any)
  const isCraft = tab !== 'items'
  const rec = (value as EditorRecipe).recipe ?? []

  const addIng = () => {
    const qtyEl = document.getElementById('ing_qty') as HTMLInputElement | null
    const nameEl = document.getElementById('ing_name') as HTMLInputElement | null
    if (!qtyEl || !nameEl) return
    const qty = qtyEl.value.trim()
    const name = nameEl.value.trim()
    if (!qty || !name) return
    const next = [...rec, { qty, name }]
    up({ recipe: next } as any)
    qtyEl.value = '1'
    nameEl.value = ''
    nameEl.focus()
  }

  const rmIng = (i: number) => {
    const next = rec.filter((_, idx) => idx !== i)
    up({ recipe: next } as any)
  }

  return (
    <div className="text-ivory">
      {isCraft && (
        <>
          <div className={sectionCls}>Crafting</div>
          <div className="grid grid-cols-1 gap-2">
            <Sel label="Rank" value={(value as EditorRecipe).craft_rank} onChange={(v) => up({ craft_rank: v } as any)} options={CRAFT_RANKS} />
          </div>
          <div className="mt-3 rounded bg-crypt-300/40 p-2">
            <div className="flex items-end gap-2">
              <div style={{ width: 56 }}>
                <label className={labelCls}>Qty</label>
                <input id="ing_qty" type="number" className={inputCls} defaultValue="1" />
              </div>
              <div className="flex-1">
                <label className={labelCls}>Ingredient</label>
                <input id="ing_name" type="text" className={inputCls} placeholder="Name" />
              </div>
              <button
                type="button"
                onClick={addIng}
                className="inline-flex items-center gap-1.5 rounded bg-gilt px-3 py-2 text-sm font-semibold text-ink hover:bg-gilt/90"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add
              </button>
            </div>
            <ul className="mt-2 divide-y divide-ash/10 rounded border border-ash/10 bg-crypt-400">
              {rec.length === 0 && <li className="px-3 py-2 text-xs text-ash">No ingredients.</li>}
              {rec.map((ing, i) => (
                <li key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span><b className="text-gilt">{ing.qty}x</b> {ing.name}</span>
                  <button
                    type="button"
                    aria-label="Remove ingredient"
                    title="Remove"
                    className="inline-flex h-7 w-7 items-center justify-center rounded border border-ignis/40 bg-ignis/10 text-ignis hover:bg-ignis/25 focus:outline-none focus:ring-2 focus:ring-ignis/60"
                    onClick={() => rmIng(i)}
                  ><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <div className={sectionCls}>Item Details</div>
      <div className="grid grid-cols-1 gap-2">
        <S label="Item Name *" value={value.item_name} onChange={(v) => up({ item_name: v })} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Sel label="Type *" value={value.type} onChange={(v) => up({ type: v })} options={ITEM_TYPES} />
        {!isCraft && <S label="Location/Source" value={value.location} onChange={(v) => up({ location: v })} />}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <N label="Value (Gold)" value={value.value} onChange={(v) => up({ value: v })} />
        <N label="Weight *" value={value.weight} onChange={(v) => up({ weight: v })} />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Sel label="Class" value={value.class} onChange={(v) => up({ class: v })} options={CLASSES} />
        <N label="Level *" value={value.level} onChange={(v) => up({ level: v })} />
        <Sel label="Gender" value={value.gender} onChange={(v) => up({ gender: v })} options={GENDERS} />
      </div>

      <div className={sectionCls}>Stats</div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        <N label="STR" value={value.str} onChange={(v) => up({ str: v })} />
        <N label="INT" value={value.int} onChange={(v) => up({ int: v })} />
        <N label="WIS" value={value.wis} onChange={(v) => up({ wis: v })} />
        <N label="CON" value={value.con} onChange={(v) => up({ con: v })} />
        <N label="DEX" value={value.dex} onChange={(v) => up({ dex: v })} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <N label="HP" value={value.hp} onChange={(v) => up({ hp: v })} />
        <N label="MP" value={value.mp} onChange={(v) => up({ mp: v })} />
        <N label="AC" value={value.ac} onChange={(v) => up({ ac: v })} />
        <N label="MR" value={value.mr} onChange={(v) => up({ mr: v })} />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <N label="DMG" value={value.dmg} onChange={(v) => up({ dmg: v })} />
        <N label="HIT" value={value.hit} onChange={(v) => up({ hit: v })} />
        <N label="Atk Spd" value={value.attack_speed} onChange={(v) => up({ attack_speed: v })} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <N label="Skill(F)" value={value.skill_dmg_flat} onChange={(v) => up({ skill_dmg_flat: v })} />
        <N label="Skill(%)" value={value.skill_dmg_pct} onChange={(v) => up({ skill_dmg_pct: v })} />
        <N label="Spell(F)" value={value.spell_dmg_flat} onChange={(v) => up({ spell_dmg_flat: v })} />
        <N label="Spell(%)" value={value.spell_dmg_pct} onChange={(v) => up({ spell_dmg_pct: v })} />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <N label="Heal(F)" value={value.heal_flat} onChange={(v) => up({ heal_flat: v })} />
        <N label="Heal(%)" value={value.heal_pct} onChange={(v) => up({ heal_pct: v })} />
        <N label="CDR(%)" value={value.cdr_pct} onChange={(v) => up({ cdr_pct: v })} />
      </div>

      {!isCraft && (
        <>
          <div className={sectionCls}>Bonus</div>
          <Sel label="Set Bonus" value={value.set_bonus} onChange={(v) => up({ set_bonus: v })} options={SET_BONUSES} />
        </>
      )}
    </div>
  )
}
