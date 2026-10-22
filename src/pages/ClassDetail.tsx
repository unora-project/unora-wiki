import { Link, useParams } from 'react-router'
import { useState, useMemo, useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { DataTable, compareLevels } from '@/components/tables/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import classInfo from '@/data/metadata/classes.json'
import { CLASS_FAMILIES, classLabel } from '@/lib/class-families'
import { ChevronDown, ClipboardList, Eye, EyeOff, Sparkles, Swords, X } from 'lucide-react'

interface SkillSpell {
  name: string
  class: string
  element?: string
  image?: string
  levelRequirement: string
  statRequirements: string
  goldRequired: string
  itemRequirements: string
  prerequisites: string
  learningLocation: string
  description: string
}

interface Dugon {
  name: string
  target: string
  meditation: string
}

interface Shard {
  skills: SkillSpell[]
  spells: SkillSpell[]
}

const EMPTY_SHARD: Shard = { skills: [], spells: [] }

const typedClassInfo = classInfo as Record<string, {
  description: string
  mastering: string[]
  dedication: string[]
  dedicationCarryOver: string
  statCaps: { progression: string; str: number; int: number; wis: number; con: number; dex: number }[]
}>

const skillColumnHelper = createColumnHelper<SkillSpell>()

function highlightPure(text: string, className = 'text-pink-500 dark:text-pink-400') {
  return text.split(/(pure only\.)/i).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className={className}>
        {part}
      </span>
    ) : (
      part
    )
  )
}

// Descriptions like "...; Fire: Sets them burning, Earth: Strikes all enemies adjacent; Water: ...;
// Lightning: ..." get each element on its own line with the element word coloured.
// Only descriptions that name two or more elements are changed.
const ELEMENT_TEXT: Record<string, string> = {
  Fire: 'text-red-500 dark:text-red-400',
  Earth: 'text-amber-700 dark:text-[#c08a4a]',
  Water: 'text-blue-600 dark:text-blue-400',
  Lightning: 'text-purple-600 dark:text-purple-400',
  Neutral: 'text-slate-500 dark:text-slate-300',
}
// Tide / Storm are the Water / Lightning stances under their other names.
ELEMENT_TEXT.Tide = ELEMENT_TEXT.Water
ELEMENT_TEXT.Storm = ELEMENT_TEXT.Lightning

const EL = '(?:Fire|Earth|Water|Lightning|Tide|Storm|Neutral)'
// A label is one element or several joined by "/", ",", "&", "+" or "and"
// (e.g. "Fire/Earth/Water:", "Fire, Earth & Water:").
const SEP = '(?:[\\s\\u00a0]*[\\/,&+][\\s\\u00a0]*|[\\s\\u00a0]+and[\\s\\u00a0]+)'
const LABEL = `${EL}(?:${SEP}${EL})*[\\s\\u00a0]*:`
const LABEL_COUNT_RE = new RegExp(`\\b${LABEL}`, 'g')
const LABEL_START_RE = new RegExp(`^(${EL}(?:${SEP}${EL})*)[\\s\\u00a0]*:[\\s\\u00a0]*([\\s\\S]*)$`)
const EL_WORD_RE = /(Fire|Earth|Water|Lightning|Tide|Storm|Neutral)/

// Every element word in the label gets its own colour; the separators stay plain.
function ElementLabel({ label }: { label: string }) {
  const bits = label.replace(/[\s\u00a0]*:$/, '').split(EL_WORD_RE)
  return (
    <span className="whitespace-nowrap font-semibold">
      {bits.map((w, i) =>
        ELEMENT_TEXT[w] ? (
          <span key={i} className={ELEMENT_TEXT[w]}>
            {w}
          </span>
        ) : (
          <span key={i}>{w}</span>
        )
      )}
      :
    </span>
  )
}

// List view: keep the text in its original order and run-on, only colouring the labels.
function renderDescriptionInline(text: string): ReactNode {
  const labels = text.match(LABEL_COUNT_RE)
  if (!labels || labels.length < 2) return highlightPure(text)
  const pieces = text.split(new RegExp(`(\\b${LABEL})`))
  return pieces.map((p, i) =>
    i % 2 === 1 ? <ElementLabel key={i} label={p} /> : <span key={i}>{highlightPure(p)}</span>
  )
}

function renderDescription(text: string): ReactNode {
  const labels = text.match(LABEL_COUNT_RE)
  if (!labels || labels.length < 2) return highlightPure(text)

  // Cut at the start of each whole label (so "Fire/Earth/Water:" stays in one piece).
  const cuts = [...text.matchAll(LABEL_COUNT_RE)].map((m) => m.index as number)
  const bounds = [0, ...cuts.filter((c) => c > 0), text.length]
  const parts = bounds
    .slice(0, -1)
    .map((start, i) => text.slice(start, bounds[i + 1]))
    .filter((x) => x.trim())
  const lastBody = (parts[parts.length - 1].match(LABEL_START_RE)?.[2] ?? '').trim()
  const hasTail = /^.*?\.\s+\S/.test(lastBody)
  let tail = ''
  const nodes = parts.map((part, i) => {
    const m = part.match(LABEL_START_RE)
    if (!m) {
      // Text before the first element, e.g. "Sweeps the enemies ... your stance;"
      const intro = part.trim().replace(/\s*[;,]\s*$/, hasTail ? '.' : ':')
      return (
        <span key={i} className="block">
          {highlightPure(intro)}
        </span>
      )
    }
    let body = m[2].trim().replace(/\s*[;,]\s*$/, '')
    if (i === parts.length - 1) {
      // Anything after the last element's first sentence applies to the whole skill.
      const split = body.match(/^(.*?\.)\s+([\s\S]+)$/)
      if (split) {
        body = split[1]
        tail = split[2]
      }
    }
    return (
      <span key={i} className="mt-1.5 block">
        <ElementLabel label={m[1]} /> {highlightPure(body)}
      </span>
    )
  })
  if (tail) {
    // Skill-wide sentence goes right after the intro, before the element lines.
    const hasIntro = !LABEL_START_RE.test(parts[0])
    nodes.splice(
      hasIntro ? 1 : 0,
      0,
      <span key="tail" className="mt-1.5 block">
        {highlightPure(tail)}
      </span>
    )
  }
  return nodes
}

const descriptionCell = (info: { getValue: () => unknown }) => {
  const v = info.getValue()
  return v == null ? null : renderDescriptionInline(String(v))
}

const textCell = (info: { getValue: () => unknown }) => {
  const v = info.getValue()
  return v == null ? null : highlightPure(String(v))
}

const skillColumns = [
  skillColumnHelper.accessor('name', { header: 'Name', cell: textCell }),
  skillColumnHelper.accessor('levelRequirement', { header: 'Level', sortingFn: compareLevels, cell: textCell }),
  skillColumnHelper.accessor('statRequirements', { header: 'Stats', cell: textCell }),
  skillColumnHelper.accessor('goldRequired', { header: 'Gold', cell: textCell }),
  skillColumnHelper.accessor('itemRequirements', { header: 'Items', cell: textCell }),
  skillColumnHelper.accessor('prerequisites', { header: 'Prereqs', cell: textCell }),
  skillColumnHelper.accessor('learningLocation', { header: 'Location', cell: textCell }),
  skillColumnHelper.accessor('description', { header: 'Description', cell: descriptionCell }),
]

function normalizeElement(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
}

function elementLabel(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1)
}

const ELEMENT_ORDER = ['fire', 'water', 'earth', 'wind']

// Same columns as skillColumns, plus an Element column after Name. Used on
// the "All" view so people can see which attunement each spell belongs to.
const skillColumnsWithElement = [
  skillColumnHelper.accessor('name', { header: 'Name' }),
  skillColumnHelper.accessor(
    (row) => (normalizeElement(row.element) ? elementLabel(normalizeElement(row.element)) : 'Any'),
    { id: 'element', header: 'Element' }
  ),
  ...skillColumns.slice(1),
]

const dugonColumnHelper = createColumnHelper<Dugon>()

const dugonColorMap: Record<string, string> = {
  White: 'text-parchment-800 dark:text-ivory',
  Green: 'text-green-600 dark:text-green-400',
  Blue: 'text-blue-600 dark:text-blue-400',
  Yellow: 'text-yellow-600 dark:text-yellow-400',
  Purple: 'text-purple-600 dark:text-purple-400',
  Brown: 'text-amber-700 dark:text-amber-500',
  Red: 'text-red-600 dark:text-red-400',
  Black: 'text-parchment-900 dark:text-parchment-200',
}

const dugonColumns = [
  dugonColumnHelper.accessor('name', {
    header: 'Name',
    cell: ({ getValue }) => {
      const name = getValue()
      const colorKey = Object.keys(dugonColorMap).find((c) => name.startsWith(c))
      const colorClass = colorKey ? dugonColorMap[colorKey] : ''
      return <span className={`font-medium ${colorClass}`}>{name}</span>
    },
  }),
  dugonColumnHelper.accessor('target', {
    header: 'Target',
    cell: ({ getValue }) => renderTextWithLinks(getValue()),
  }),
  dugonColumnHelper.accessor('meditation', { header: 'Meditation Location' }),
]

const classShardCache = new Map<string, Shard>()
const dugonCache = new Map<string, Dugon[]>()

async function loadClassShard(slug: string): Promise<Shard> {
  const cached = classShardCache.get(slug)
  if (cached) return cached
  const base = import.meta.env.BASE_URL + 'data/classes/' + slug
  const [skills, spells] = await Promise.all([
    fetch(base + '/skills.json').then((r) => (r.ok ? (r.json() as Promise<SkillSpell[]>) : [])).catch(() => []),
    fetch(base + '/spells.json').then((r) => (r.ok ? (r.json() as Promise<SkillSpell[]>) : [])).catch(() => []),
  ])
  const result = { skills, spells }
  classShardCache.set(slug, result)
  return result
}

async function loadDugons(className: string): Promise<Dugon[]> {
  const cached = dugonCache.get(className)
  if (cached) return cached
  const base = import.meta.env.BASE_URL + 'data/classes/' + className
  const dugons = await fetch(base + '/dugons.json')
    .then((r) => (r.ok ? (r.json() as Promise<Dugon[]>) : []))
    .catch(() => [])
  dugonCache.set(className, dugons)
  return dugons
}

function SubTabs({
  items,
  active,
  onChange,
}: {
  items: { slug: string; label: string; count: number }[]
  active: string
  onChange: (slug: string) => void
}) {
  if (items.length <= 1) return null
  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <button
          key={item.slug}
          onClick={() => onChange(item.slug)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            active === item.slug
              ? 'border border-gilt bg-transparent text-gilt'
              : 'border border-parchment-300 bg-parchment-100 text-parchment-600 hover:border-gilt hover:text-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ash dark:hover:border-gilt'
          }`}
        >
          {item.label} ({item.count})
        </button>
      ))}
    </div>
  )
}

function ElementTabs({
  items,
  active,
  onChange,
  label,
}: {
  items: { id: string; label: string; count: number }[]
  active: string
  onChange: (id: string) => void
  label: string
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-medium uppercase tracking-wider text-parchment-500 dark:text-parchment-600">
        {label}:
      </span>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            active === item.id
              ? 'border border-gilt bg-transparent text-gilt'
              : 'border border-parchment-300 bg-parchment-100 text-parchment-600 hover:border-gilt hover:text-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ash dark:hover:border-gilt'
          }`}
        >
          {item.label} ({item.count})
        </button>
      ))}
    </div>
  )
}

const hasText = (v: unknown): v is string =>
  typeof v === 'string' && v.trim() !== '' && v.trim() !== '-'

// One sortable number per level: 1-99, then Master, Grandmaster, then Ab #.
function levelSortKey(raw: unknown): number {
  const s = String(raw ?? '').trim()
  if (!s || s === '-') return Number.MAX_SAFE_INTEGER
  const n = s.match(/\d+/)
  const num = n ? parseFloat(n[0]) : 0
  if (/^ab\s*\d+/i.test(s)) return 3000 + num
  if (/^(grand\s*master|gm)$/i.test(s)) return 2000
  if (/^master$/i.test(s)) return 1000
  return n ? num : 4000
}

function cardImageSrc(image?: string): string | null {
  if (!image?.trim()) return null
  if (/^https?:\/\//i.test(image)) return image
  return import.meta.env.BASE_URL + image.replace(/^\/+/, '')
}

// Stat colors follow the UNORA logo: U (red), N (blue), O (green), R (cream), A (purple).
const STAT_STYLES = [
  { label: 'STR', cls: 'text-ignis' },
  { label: 'INT', cls: 'text-tide' },
  { label: 'WIS', cls: 'text-verdant' },
  { label: 'CON', cls: 'text-amber-700 dark:text-ivory' },
  { label: 'DEX', cls: 'text-astral' },
]

// Shrinks the text inside the REQ circle for longer levels like "Master".
function reqFontClass(level: string): string {
  const n = level.length
  if (n <= 3) return 'text-xl'
  if (n <= 5) return 'text-base'
  if (n <= 8) return 'text-xs'
  return 'text-[9px]'
}

// Shortens long level names so they fit inside the REQ circle. "(Pure)" is
// shown above the name instead, so it's dropped from the circle.
function shortLevel(level: string): string {
  const cleaned = level.replace(/\s*\(pure\)\s*/gi, ' ').trim()
  if (/^(grand\s*master|gm)$/i.test(cleaned)) return 'GM'
  if (/^master$/i.test(cleaned)) return 'M'
  return cleaned
}

// Pulls "Pure only." out of a description so the card can show it above the name.
function splitPure(text: string): { isPure: boolean; rest: string } {
  const pattern = /pure only\./i
  if (!pattern.test(text)) return { isPure: false, rest: text }
  const rest = text.replace(/pure only\./gi, '').replace(/\s{2,}/g, ' ').trim()
  return { isPure: true, rest }
}

const pillCls = (active: boolean) =>
  `rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
    active
      ? 'border border-gilt bg-transparent text-gilt'
      : 'border border-parchment-300 bg-parchment-100 text-parchment-600 hover:border-gilt hover:text-gilt dark:border-ash/20 dark:bg-obsidian dark:text-ash dark:hover:border-gilt'
  }`

function ViewToggle({
  value,
  onChange,
  hiddenCount,
  onResetHidden,
  planOpen,
  planCount,
  onTogglePlan,
}: {
  value: 'list' | 'cards'
  onChange: (v: 'list' | 'cards') => void
  hiddenCount: number
  onResetHidden: () => void
  planOpen: boolean
  planCount: number
  onTogglePlan: () => void
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-medium uppercase tracking-wider text-parchment-500 dark:text-parchment-600">
        View:
      </span>
      {(['list', 'cards'] as const).map((mode) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={`${pillCls(value === mode)} capitalize`}
        >
          {mode}
        </button>
      ))}
      <button
        type="button"
        onClick={onResetHidden}
        disabled={hiddenCount === 0}
        title="Show every hidden card for this class again"
        className={`${pillCls(false)} ml-2 disabled:cursor-default disabled:opacity-40 disabled:hover:border-parchment-300 disabled:hover:text-parchment-600`}
      >
        Reset Hidden{hiddenCount > 0 ? ` (${hiddenCount})` : ''}
      </button>
      <button
        type="button"
        onClick={onTogglePlan}
        title="Pick skills and spells to total up the gold and items you need"
        className={pillCls(planOpen)}
      >
        Build Plan{planCount > 0 ? ` (${planCount})` : ''}
      </button>
    </div>
  )
}

// Same grid everywhere cards are shown. Cards never get narrower than 320px (max 5 per row).
const CARD_GRID = 'grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,max(320px,calc((100%_-_4rem)/5))),1fr))]'

// Remembers a value in localStorage so it survives page reloads.
function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* ignore */
    }
  }, [key, value])
  return [value, setValue] as const
}

const itemKey = (kind: 'skills' | 'spells', name: string) => `${kind}|${name}`

// "vertical": one item per line. "horizontal": comma-separated, wrapping.
const ITEMS_LAYOUT: 'vertical' | 'horizontal' = 'vertical'

// Splits "Losgann Tail (3), Black Shocker Piece (5)" into separate items,
// ignoring any commas that sit inside parentheses.
function splitList(value: string): string[] {
  return value.split(/,\s*(?![^()]*\))/).map((s) => s.trim()).filter(Boolean)
}

function CardDetail({ label, value, list }: { label: string; value?: string; list?: boolean }) {
  if (!hasText(value)) return null
  const entries = list && ITEMS_LAYOUT === 'vertical' ? splitList(value) : null
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-xs font-semibold uppercase tracking-wider text-ash">{label}</dt>
      <dd className="text-right text-base text-parchment-800 dark:text-ivory">
        {entries && entries.length > 1 ? (
          <ul className="space-y-0.5">
            {entries.map((entry, i) => (
              <li key={i}>{highlightPure(entry)}</li>
            ))}
          </ul>
        ) : (
          highlightPure(value)
        )}
      </dd>
    </div>
  )
}


function SkillSpellCard({
  item,
  kind,
  onHide,
  onShow,
  planMode = false,
  selected = false,
  onToggleSelect,
}: {
  item: SkillSpell
  kind: 'skills' | 'spells'
  onHide?: () => void
  onShow?: () => void
  planMode?: boolean
  selected?: boolean
  onToggleSelect?: () => void
}) {
  const img = cardImageSrc(item.image)
  const Placeholder = kind === 'spells' ? Sparkles : Swords
  const rawLevel = hasText(item.levelRequirement) ? item.levelRequirement.trim() : null
  const levelIsPure = rawLevel ? /\(pure\)/i.test(rawLevel) : false
  const level = rawLevel ? shortLevel(rawLevel) : null
  const statParts = hasText(item.statRequirements)
    ? item.statRequirements.split('/').map((s) => s.trim())
    : []
  const showStatGrid = statParts.length === 5
  const element = normalizeElement(item.element)
  const hasDetails =
    hasText(item.goldRequired) || hasText(item.itemRequirements) || hasText(item.prerequisites)
  const { isPure: descIsPure, rest: descriptionText } = hasText(item.description)
    ? splitPure(item.description)
    : { isPure: false, rest: '' }
  const isPure = descIsPure || levelIsPure

  return (
    <article
      onClick={
        planMode && onToggleSelect
          ? (e) => {
              if ((e.target as HTMLElement).closest('a, [data-no-select]')) return
              onToggleSelect()
            }
          : undefined
      }
      className={`flex flex-col rounded-2xl border bg-parchment-100 p-4 text-parchment-800 shadow-sm transition-colors dark:bg-ink dark:text-ivory/90 ${
        planMode ? 'cursor-pointer select-none' : ''
      } ${
        selected
          ? 'border-gilt ring-2 ring-gilt/60'
          : 'border-parchment-300 hover:border-gilt/50 dark:border-ash/10'
      } ${onShow ? 'opacity-80' : ''}`}
    >
      {(onHide || onShow || planMode) && (
        <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-ash">
          {planMode && onToggleSelect ? (
            <span className="pointer-events-none flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected}
                onChange={() => {}}
                className="h-4 w-4 rounded border-ash/40 accent-gilt"
              />
              {selected ? 'In plan' : 'Add to plan'}
            </span>
          ) : (
            <span />
          )}
          {onHide && (
            <button
              type="button"
              data-no-select
              onClick={(e) => {
                e.stopPropagation()
                onHide()
              }}
              title="Hide this card"
              className="flex items-center gap-1 rounded px-1.5 py-0.5 normal-case tracking-normal transition-colors hover:text-gilt"
            >
              <EyeOff size={14} /> Hide
            </button>
          )}
          {onShow && (
            <button
              type="button"
              data-no-select
              onClick={(e) => {
                e.stopPropagation()
                onShow()
              }}
              title="Show this card again"
              className="flex items-center gap-1 rounded border border-gilt/40 px-2 py-0.5 normal-case tracking-normal text-gilt transition-colors hover:bg-gilt/10"
            >
              <Eye size={14} /> Show
            </button>
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
                <div className="flex h-[70px] w-[70px] shrink-0 items-center justify-center overflow-hidden rounded-sm border border-gilt/40 bg-parchment-200 dark:bg-obsidian">
          {img ? (
            <img src={img} alt="" width={70} height={70} loading="lazy" className="h-[70px] w-[70px] object-cover" />
          ) : (
            <Placeholder size={30} className="text-gilt/60" />
          )}
        </div>

        <div className="min-w-0 flex-1 text-center">
          {isPure && (
            <p className="text-sm font-bold uppercase leading-tight tracking-wider text-pink-500 dark:text-pink-400">
              Pure only.
            </p>
          )}
          <h3 className="break-words text-xl font-semibold italic leading-tight text-gilt">
            {highlightPure(item.name)}
          </h3>
          {hasText(item.learningLocation) && (
            <p className="mt-0.5 text-sm font-semibold italic text-parchment-600 dark:text-parchment-400">
              {highlightPure(item.learningLocation)}
            </p>
          )}
          {element && (
            <p className="mt-1">
              <span className="rounded-full border border-gilt/50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-gilt">
                {elementLabel(element)}
              </span>
            </p>
          )}
        </div>

        {level ? (
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-2 border-gilt bg-gilt/10 text-center leading-none text-gilt">
            <span className="text-[10px] font-semibold uppercase tracking-wider">REQ</span>
            <span className={`mt-0.5 font-bold ${reqFontClass(level)}`}>{level}</span>
          </div>
        ) : (
          <div className="h-14 w-14 shrink-0" />
        )}
      </div>

      {showStatGrid ? (
        <div className="mt-3 grid grid-cols-5 gap-1 text-center">
          {STAT_STYLES.map((stat, i) => (
            <div key={stat.label} className={stat.cls}>
              <p className="text-xs font-semibold uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-bold leading-tight">{statParts[i] || '-'}</p>
            </div>
          ))}
        </div>
      ) : hasText(item.statRequirements) ? (
        <p className="mt-3 text-center text-sm">
          <span className="text-ash">Stats: </span>
          {item.statRequirements}
        </p>
      ) : null}

      {hasDetails && (
        <dl className="mt-3 space-y-1.5 border-t border-parchment-300 pt-3 dark:border-ash/20">
          <CardDetail label="Gold" value={item.goldRequired} />
          <CardDetail label="Items" value={item.itemRequirements} list />
          <CardDetail label="Prereqs" value={item.prerequisites} />
        </dl>
      )}

      {hasText(descriptionText) && (
        <div className="mt-3 flex flex-1 flex-col border-t border-parchment-300 pt-3 dark:border-ash/20">
          <p className="my-auto text-center font-ui text-base leading-relaxed text-parchment-800 dark:text-ivory">
            {renderDescription(descriptionText)}
          </p>
        </div>
      )}
    </article>
  )
}

// ---- List view with a Plan checkbox column ---------------------------------

function SkillSpellList({
  data,
  kind,
  withElementColumn,
  searchPlaceholder,
  planOpen,
  selectedKeys,
  onToggle,
}: {
  data: SkillSpell[]
  kind: 'skills' | 'spells'
  withElementColumn: boolean
  searchPlaceholder: string
  planOpen: boolean
  selectedKeys: Set<string>
  onToggle: (item: SkillSpell) => void
}) {
  const toggleRef = useRef(onToggle)
  toggleRef.current = onToggle
  // Rebuild the columns only when the selection actually changes.
  const selSig = [...selectedKeys].join('\n')

  const columns = useMemo(() => {
    const base = (withElementColumn ? skillColumnsWithElement : skillColumns) as ColumnDef<SkillSpell, any>[]
    if (!planOpen) return base
    const sel = new Set(selSig ? selSig.split('\n') : [])
    const planColumn = skillColumnHelper.display({
      id: 'plan',
      header: 'Plan',
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={sel.has(itemKey(kind, row.original.name))}
          onChange={() => toggleRef.current(row.original)}
          aria-label={`Add ${row.original.name} to build plan`}
          className="h-4 w-4 rounded border-ash/40 accent-gilt"
        />
      ),
    }) as ColumnDef<SkillSpell, any>
    return [planColumn, ...base]
  }, [planOpen, selSig, withElementColumn, kind])

  return (
    <DataTable
      data={data}
      columns={columns}
      searchPlaceholder={searchPlaceholder}
      initialSorting={[{ id: 'levelRequirement', desc: false }]}
    />
  )
}

// ---- Hidden cards ----------------------------------------------------------

function HiddenSection({
  entries,
  onShow,
}: {
  entries: { kind: 'skills' | 'spells'; item: SkillSpell }[]
  onShow: (kind: 'skills' | 'spells', item: SkillSpell) => void
}) {
  const [open, setOpen] = useState(false)
  if (entries.length === 0) return null
  return (
    <section className="mt-10 border-t border-parchment-300 pt-4 dark:border-ash/20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 font-heading text-lg font-semibold text-gilt"
      >
        <ChevronDown size={18} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
        Hidden ({entries.length})
      </button>
      {open && (
        <div className={`mt-4 ${CARD_GRID}`}>
          {entries.map(({ kind, item }, i) => (
            <SkillSpellCard
              key={`${kind}-${item.name}-${i}`}
              item={item}
              kind={kind}
              onShow={() => onShow(kind, item)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

// ---- Build Plan ------------------------------------------------------------

interface PlanEntry {
  key: string
  kind: 'skills' | 'spells'
  item: SkillSpell
}

function parseGold(v?: string): number {
  if (!hasText(v)) return 0
  const n = parseInt(v.replace(/[^0-9]/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

// "Wolf Teeth (2), Raw Bronze (5), Fur" -> [{Wolf Teeth, 2}, {Raw Bronze, 5}, {Fur, 1}]
function parseItems(v?: string): { name: string; qty: number }[] {
  if (!hasText(v)) return []
  return splitList(v)
    .map((entry) => {
      const m = entry.match(/^(.*?)\s*\((\d+)\)\s*$/)
      return m ? { name: m[1].trim(), qty: parseInt(m[2], 10) } : { name: entry.trim(), qty: 1 }
    })
    .filter((e) => e.name)
}

function BuildPlanPanel({
  title,
  entries,
  onRemove,
  onClear,
  onClose,
}: {
  title: string
  entries: PlanEntry[]
  onRemove: (key: string) => void
  onClear: () => void
  onClose: () => void
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; origTop: number; origLeft: number } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (pos !== null) return
    const width = 380
    setPos({ top: 96, left: Math.max(16, window.innerWidth - width - 24) })
  }, [pos])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!pos) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, origTop: pos.top, origLeft: pos.left }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const { startX, startY, origTop, origLeft } = dragRef.current
    const panelWidth = panelRef.current?.offsetWidth ?? 380
    const panelHeight = panelRef.current?.offsetHeight ?? 460
    const newLeft = Math.max(8, Math.min(origLeft + (e.clientX - startX), window.innerWidth - panelWidth - 8))
    const newTop = Math.max(8, Math.min(origTop + (e.clientY - startY), window.innerHeight - panelHeight - 8))
    setPos({ top: newTop, left: newLeft })
  }

  const handlePointerUp = () => {
    dragRef.current = null
  }

  const sorted = useMemo(
    () =>
      [...entries].sort(
        (a, b) =>
          levelSortKey(a.item.levelRequirement) - levelSortKey(b.item.levelRequirement) ||
          a.item.name.localeCompare(b.item.name, undefined, { numeric: true })
      ),
    [entries]
  )

  const totals = useMemo(() => {
    let gold = 0
    const items = new Map<string, { name: string; qty: number }>()
    for (const { item } of entries) {
      gold += parseGold(item.goldRequired)
      for (const it of parseItems(item.itemRequirements)) {
        const k = it.name.toLowerCase()
        const cur = items.get(k)
        if (cur) cur.qty += it.qty
        else items.set(k, { ...it })
      }
    }
    return {
      gold,
      items: [...items.values()].sort((a, b) => a.name.localeCompare(b.name)),
    }
  }, [entries])

  if (!pos) return null

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-[100] flex min-h-[260px] min-w-[300px] max-h-[calc(100vh-32px)] max-w-[calc(100vw-32px)] resize flex-col overflow-hidden rounded-lg border border-parchment-300 bg-parchment-50 shadow-[0_8px_30px_rgba(0,0,0,0.3)] dark:border-ash/20 dark:bg-obsidian"
      style={{ top: pos.top, left: pos.left, width: size?.width ?? 380, height: size?.height ?? 460 }}
      onMouseUp={() => {
        if (panelRef.current) {
          setSize({ width: panelRef.current.offsetWidth, height: panelRef.current.offsetHeight })
        }
      }}
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex shrink-0 cursor-move items-center justify-between gap-2 rounded-t-lg border-b border-parchment-300 bg-parchment-100 px-3 py-2 dark:border-ash/20 dark:bg-ink"
      >
        <h3 className="flex select-none items-center gap-1.5 font-heading text-sm font-semibold text-gilt">
          <ClipboardList size={15} /> Build Plan: {title}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            disabled={entries.length === 0}
            className="rounded border border-parchment-300 px-2 py-1 text-xs font-medium text-parchment-600 hover:border-gilt hover:text-gilt disabled:opacity-40 dark:border-ash/20 dark:text-ash"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="rounded border border-parchment-300 px-2 py-1 text-xs font-medium text-parchment-600 hover:border-gilt hover:text-gilt dark:border-ash/20 dark:text-ash"
          >
            Close
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm">
        {entries.length === 0 ? (
          <p className="text-parchment-500 dark:text-parchment-600">
            Click skill or spell cards (or tick the Plan box in List view) to add them. Your picks are saved for this class.
          </p>
        ) : (
          <>
            <div className="rounded-lg border border-parchment-300 bg-parchment-100 p-3 dark:border-ash/10 dark:bg-ink">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-parchment-500 dark:text-parchment-600">
                Total needed
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-ash">Gold</span>
                <span className="text-lg font-bold text-gilt">{totals.gold.toLocaleString('en-US')}</span>
              </div>
              {totals.items.length > 0 && (
                <ul className="mt-2 space-y-0.5 border-t border-parchment-300 pt-2 dark:border-ash/20">
                  {totals.items.map((it) => (
                    <li key={it.name} className="flex justify-between gap-3">
                      <span className="text-parchment-800 dark:text-ivory">{it.name}</span>
                      <span className="font-semibold text-gilt">{it.qty}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-parchment-500 dark:text-parchment-600">
                Selected ({entries.length})
              </p>
              <ul className="divide-y divide-parchment-300 rounded-lg border border-parchment-300 dark:divide-ash/10 dark:border-ash/20">
                {sorted.map((e) => {
                  const g = parseGold(e.item.goldRequired)
                  return (
                    <li key={e.key} className="flex items-center gap-2 px-3 py-1.5">
                      <span className="min-w-0 flex-1 truncate text-parchment-800 dark:text-ivory">{e.item.name}</span>
                      {g > 0 && <span className="shrink-0 text-xs text-ash">{g.toLocaleString('en-US')} g</span>}
                      <button
                        type="button"
                        onClick={() => onRemove(e.key)}
                        title="Remove from plan"
                        className="shrink-0 rounded p-0.5 text-ash hover:text-gilt"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

function SkillSpellCards({
  rows,
  kind,
  searchPlaceholder,
  planMode,
  selectedKeys,
  onToggleSelect,
  onHide,
}: {
  rows: SkillSpell[]
  kind: 'skills' | 'spells'
  searchPlaceholder: string
  planMode: boolean
  selectedKeys: Set<string>
  onToggleSelect: (item: SkillSpell) => void
  onHide: (item: SkillSpell) => void
}) {
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const sorted = [...rows].sort(
      (a, b) =>
        levelSortKey(a.levelRequirement) - levelSortKey(b.levelRequirement) ||
        a.name.localeCompare(b.name, undefined, { numeric: true })
    )
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((r) =>
      [
        r.name, r.element, r.levelRequirement, r.statRequirements, r.goldRequired,
        r.itemRequirements, r.prerequisites, r.learningLocation, r.description,
      ].some((v) => typeof v === 'string' && v.toLowerCase().includes(q))
    )
  }, [rows, query])

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={searchPlaceholder}
        className="mb-4 w-full rounded-lg border border-parchment-300 bg-parchment-50 px-4 py-2 font-ui text-sm text-parchment-900 outline-none transition-colors placeholder:text-ash focus:border-gilt focus:ring-2 focus:ring-gilt/20 dark:border-ash/20 dark:bg-obsidian dark:text-ivory dark:placeholder:text-ash dark:focus:border-gilt sm:max-w-xs"
      />
      {visible.length === 0 ? (
        <p className="py-10 text-center text-parchment-500 dark:text-parchment-600">No matches.</p>
      ) : (
        <div className={CARD_GRID}>
          {visible.map((item, i) => (
            <SkillSpellCard
              key={`${item.name}-${i}`}
              item={item}
              kind={kind}
              planMode={planMode}
              selected={selectedKeys.has(itemKey(kind, item.name))}
              onToggleSelect={() => onToggleSelect(item)}
              onHide={() => onHide(item)}
            />
          ))}
        </div>
      )}
      <p className="mt-4 font-ui text-sm text-ash">{visible.length} items</p>
    </div>
  )
}

export function ClassDetail() {
  const { className } = useParams<{ className: string }>()
  const info = className ? typedClassInfo[className] : null

  // The class itself plus its two Medenia branches (e.g. monk, adept, druid).
  const family = useMemo(
    () => (className ? CLASS_FAMILIES[className] ?? [className] : []),
    [className]
  )

  const [shards, setShards] = useState<Record<string, Shard>>({})
  const [dugons, setDugons] = useState<Dugon[]>(className ? dugonCache.get(className) ?? [] : [])
  const [activeSub, setActiveSub] = useState('')
  const [activeElement, setActiveElement] = useState('all')
  const [viewMode, setViewMode] = useState<'list' | 'cards'>(() => {
    try {
      return localStorage.getItem('classViewMode') === 'cards' ? 'cards' : 'list'
    } catch {
      return 'list'
    }
  })
  const changeView = (v: 'list' | 'cards') => {
    setViewMode(v)
    try {
      localStorage.setItem('classViewMode', v)
    } catch {
      /* ignore */
    }
  }

  // Per class (e.g. wizard, elementalist), remembered in the browser.
  const [hiddenMap, setHiddenMap] = usePersistentState<Record<string, string[]>>('abilityHidden.v1', {})
  const [planMap, setPlanMap] = usePersistentState<Record<string, string[]>>('abilityPlan.v1', {})
  const [planOpenMap, setPlanOpenMap] = usePersistentState<Record<string, boolean>>('abilityPlanOpen.v1', {})

  useEffect(() => {
    setActiveSub('')
  }, [className])

  useEffect(() => {
    setActiveElement('all')
  }, [className, activeSub])

  useEffect(() => {
    let alive = true
    Promise.all(
      family.map(async (slug) => [slug, await loadClassShard(slug)] as const)
    ).then((entries) => {
      if (!alive) return
      setShards((prev) => ({ ...prev, ...Object.fromEntries(entries) }))
    })
    return () => { alive = false }
  }, [family])

  useEffect(() => {
    if (className !== 'monk') {
      setDugons([])
      return
    }
    let alive = true
    loadDugons(className).then((data) => {
      if (!alive) return
      setDugons(data)
    })
    return () => { alive = false }
  }, [className])

  const familyData = useMemo(
    () =>
      family.map((slug) => ({
        slug,
        label: classLabel(slug),
        shard: shards[slug] ?? classShardCache.get(slug) ?? EMPTY_SHARD,
      })),
    [family, shards]
  )

  const totalSkills = familyData.reduce((n, f) => n + f.shard.skills.length, 0)
  const totalSpells = familyData.reduce((n, f) => n + f.shard.spells.length, 0)

  const tabs = useMemo(() => {
    const t: { id: string; label: string }[] = []
    if (info && info.statCaps.length > 0) t.push({ id: 'overview', label: 'Overview' })
    if (totalSkills > 0) t.push({ id: 'skills', label: `Skills (${totalSkills})` })
    if (totalSpells > 0) t.push({ id: 'spells', label: `Spells (${totalSpells})` })
    if (className === 'monk' && dugons.length > 0) t.push({ id: 'dugons', label: `Dugons (${dugons.length})` })
    return t
  }, [info, totalSkills, totalSpells, dugons, className])

  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? 'overview')

  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTab)) {
      setActiveTab(tabs[0]?.id ?? 'overview')
    }
  }, [tabs, activeTab])

  if (!info || !className) {
    return (
      <div className="py-20 text-center">
        <h1 className="font-heading text-2xl text-gilt">Class not found</h1>
      </div>
    )
  }

  const displayName = classLabel(className)
  const currentSub = family.includes(activeSub) ? activeSub : (family[0] ?? '')
  const currentShard = familyData.find((f) => f.slug === currentSub)?.shard ?? EMPTY_SHARD

  const hiddenKeys = new Set(hiddenMap[currentSub] ?? [])
  const selectedKeys = new Set(planMap[currentSub] ?? [])
  const planOpen = !!planOpenMap[currentSub]

  const hideItem = (kind: 'skills' | 'spells', item: SkillSpell) =>
    setHiddenMap((prev) => {
      const key = itemKey(kind, item.name)
      const cur = prev[currentSub] ?? []
      return cur.includes(key) ? prev : { ...prev, [currentSub]: [...cur, key] }
    })
  const showItem = (kind: 'skills' | 'spells', item: SkillSpell) =>
    setHiddenMap((prev) => ({
      ...prev,
      [currentSub]: (prev[currentSub] ?? []).filter((k) => k !== itemKey(kind, item.name)),
    }))
  const resetHidden = () => setHiddenMap((prev) => ({ ...prev, [currentSub]: [] }))

  const toggleSelect = (kind: 'skills' | 'spells', item: SkillSpell) =>
    setPlanMap((prev) => {
      const key = itemKey(kind, item.name)
      const cur = prev[currentSub] ?? []
      return { ...prev, [currentSub]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] }
    })
  const removeFromPlan = (key: string) =>
    setPlanMap((prev) => ({ ...prev, [currentSub]: (prev[currentSub] ?? []).filter((k) => k !== key) }))
  const clearPlan = () => setPlanMap((prev) => ({ ...prev, [currentSub]: [] }))
  const setPlanOpen = (open: boolean) => setPlanOpenMap((prev) => ({ ...prev, [currentSub]: open }))

  const planEntries: PlanEntry[] = (planMap[currentSub] ?? []).flatMap((key) => {
    const [kind, ...rest] = key.split('|')
    if (kind !== 'skills' && kind !== 'spells') return []
    const name = rest.join('|')
    const item = currentShard[kind].find((i) => i.name === name)
    return item ? [{ key, kind, item }] : []
  })

  const renderSkillSpellPanel = (kind: 'skills' | 'spells') => {
    const rows = currentShard[kind]

    const isElementalist = currentSub === 'elementalist'
    const groupWord = isElementalist ? 'Attunement' : 'Element'

    const elementsPresent = Array.from(
      new Set(rows.map((r) => normalizeElement(r.element)).filter(Boolean))
    ).sort((a, b) => {
      const ai = ELEMENT_ORDER.indexOf(a)
      const bi = ELEMENT_ORDER.indexOf(b)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.localeCompare(b)
    })
    const hasElements = elementsPresent.length > 0
    const activeEl = hasElements && elementsPresent.includes(activeElement) ? activeElement : 'all'

    const elementRows =
      activeEl === 'all' ? rows : rows.filter((r) => normalizeElement(r.element) === activeEl)
    const anyRows = activeEl === 'all' ? [] : rows.filter((r) => !normalizeElement(r.element))

    const searchPlaceholder = `Search ${classLabel(currentSub)} ${kind}...`

    const renderEntries = (data: SkillSpell[], id: string, withElementColumn: boolean) =>
      viewMode === 'cards' ? (
        <SkillSpellCards
          key={`cards-${id}`}
          rows={data.filter((r) => !hiddenKeys.has(itemKey(kind, r.name)))}
          kind={kind}
          searchPlaceholder={searchPlaceholder}
          planMode={planOpen}
          selectedKeys={selectedKeys}
          onToggleSelect={(item) => toggleSelect(kind, item)}
          onHide={(item) => hideItem(kind, item)}
        />
      ) : (
        <SkillSpellList
          key={`list-${id}`}
          data={data}
          kind={kind}
          withElementColumn={withElementColumn}
          searchPlaceholder={searchPlaceholder}
          planOpen={planOpen}
          selectedKeys={selectedKeys}
          onToggle={(item) => toggleSelect(kind, item)}
        />
      )

    return (
      <section>
        <SubTabs
          items={familyData.map((f) => ({ slug: f.slug, label: f.label, count: f.shard[kind].length }))}
          active={currentSub}
          onChange={setActiveSub}
        />

        <ViewToggle
          value={viewMode}
          onChange={changeView}
          hiddenCount={hiddenKeys.size}
          onResetHidden={resetHidden}
          planOpen={planOpen}
          planCount={planEntries.length}
          onTogglePlan={() => setPlanOpen(!planOpen)}
        />

        {hasElements && (
          <ElementTabs
            label={groupWord}
            items={[
              { id: 'all', label: 'All', count: rows.length },
              ...elementsPresent.map((el) => ({
                id: el,
                label: elementLabel(el),
                count: rows.filter((r) => normalizeElement(r.element) === el).length,
              })),
            ]}
            active={activeEl}
            onChange={setActiveElement}
          />
        )}

        {rows.length === 0 ? (
          <p className="py-10 text-center text-parchment-500 dark:text-parchment-600">
            No {kind} added for {classLabel(currentSub)} yet.
          </p>
        ) : (
          <>
            {activeEl !== 'all' && (
              <h3 className="mb-3 font-heading text-lg font-semibold text-gilt">
                {isElementalist ? `${elementLabel(activeEl)} Attunement` : elementLabel(activeEl)}
              </h3>
            )}
            {renderEntries(
              elementRows,
              `${kind}-${currentSub}-${activeEl}`,
              hasElements && activeEl === 'all'
            )}

            {anyRows.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-1 font-heading text-lg font-semibold text-gilt">
                  {isElementalist ? 'Any Attunement' : 'No Element'}
                </h3>
                <p className="mb-3 text-sm text-parchment-600 dark:text-parchment-400">
                  {isElementalist
                    ? `These ${kind} don't depend on which element you're attuned to.`
                    : `These ${kind} aren't tied to an element.`}
                </p>
                {renderEntries(anyRows, `${kind}-${currentSub}-any`, false)}
              </div>
            )}

            {viewMode === 'cards' && (
              <HiddenSection
                entries={rows
                  .filter((r) => hiddenKeys.has(itemKey(kind, r.name)))
                  .map((item) => ({ kind, item }))}
                onShow={showItem}
              />
            )}
          </>
        )}
      </section>
    )
  }

  return (
    <div>
      <PageHeader
        title={displayName}
        description={info.description}
        accent="ignis"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Classes', to: '/classes' },
          { label: displayName },
        ]}
      />

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="mb-6 flex gap-1 border-b border-parchment-300 dark:border-ash/20">
          {tabs.map((tab) => (
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
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Stat Caps */}
          {info.statCaps.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 font-heading text-2xl font-semibold text-gilt">
                Stat Caps
              </h2>
              <p className="mb-3 text-sm text-parchment-600 dark:text-parchment-400">
                Maximum stat points per progression level for {displayName}s.
              </p>
              <div className="overflow-x-auto rounded-lg border border-parchment-300 dark:border-ash/20">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-parchment-300 bg-parchment-200 dark:border-ash/20 dark:bg-ink">
                      {['Progression', 'STR', 'INT', 'WIS', 'CON', 'DEX'].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-parchment-600 dark:text-parchment-400">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {info.statCaps.map((row, i) => (
                      <tr key={i} className={`border-b border-parchment-200 dark:border-ash/10 ${i % 2 ? 'bg-parchment-100/50 dark:bg-ink/20' : ''}`}>
                        <td className="px-3 py-2 font-semibold text-gilt">{row.progression}</td>
                        <td className="px-3 py-2 text-parchment-800 dark:text-parchment-300">{row.str}</td>
                        <td className="px-3 py-2 text-parchment-800 dark:text-parchment-300">{row.int}</td>
                        <td className="px-3 py-2 text-parchment-800 dark:text-parchment-300">{row.wis}</td>
                        <td className="px-3 py-2 text-parchment-800 dark:text-parchment-300">{row.con}</td>
                        <td className="px-3 py-2 text-parchment-800 dark:text-parchment-300">{row.dex}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Mastering & Dedication side by side */}
          <div className="grid gap-6 sm:grid-cols-2">
            {info.mastering.length > 0 && (
              <section className="rounded-lg border border-parchment-300 bg-parchment-100 p-5 dark:border-ash/10 dark:bg-ink">
                <h2 className="mb-3 font-heading text-xl font-semibold text-gilt">
                  Mastering Requirements
                </h2>
                <ul className="ml-5 list-disc space-y-1 text-sm text-parchment-800 marker:text-gilt dark:text-ivory/90">
                  {info.mastering.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </section>
            )}

            {info.dedication.length > 0 && (
              <section className="rounded-lg border border-parchment-300 bg-parchment-100 p-5 dark:border-ash/10 dark:bg-ink">
                <h2 className="mb-3 font-heading text-xl font-semibold text-gilt">
                  Class Dedication (Subbing)
                </h2>
                <ul className="ml-5 list-disc space-y-1 text-sm text-parchment-800 marker:text-gilt dark:text-ivory/90">
                  {info.dedication.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-parchment-600 dark:text-parchment-400">
                  {info.dedicationCarryOver}
                </p>
              </section>
            )}
          </div>
        </>
      )}

      {/* Skills Tab */}
      {activeTab === 'skills' && renderSkillSpellPanel('skills')}

      {/* Spells Tab */}
      {activeTab === 'spells' && renderSkillSpellPanel('spells')}

      {/* Build Plan window: follows the selected class across the Skills and Spells tabs */}
      {(activeTab === 'skills' || activeTab === 'spells') && planOpen && (
        <BuildPlanPanel
          title={classLabel(currentSub)}
          entries={planEntries}
          onRemove={removeFromPlan}
          onClear={clearPlan}
          onClose={() => setPlanOpen(false)}
        />
      )}

      {/* Dugons Tab */}
      {activeTab === 'dugons' && dugons.length > 0 && (
        <section>
          <p className="mb-4 text-center text-base text-parchment-600 dark:text-parchment-400">
            Dugons are an important part of the Monk class! Start by heading to Sapphire Streams and speaking to Sabonim!
            <br /><br />
            When you're ready say "Sabonim, Please teach me the -color- dugon." (ie. Sabonim, Please teach me the White dugon.)
            <br /><br />
            After meditating (which can take a bit of time), return to Sabonim and say "Sabonim, I understand the -color- dugon." (ie. Sabonim, I understand the White dugon.)
          </p>
          <DataTable
            data={dugons}
            columns={dugonColumns}
            searchPlaceholder="Search Dugons..."
          />
        </section>
      )}
    </div>
  )
}

function renderTextWithLinks(text: string) {
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g
  const parts: (string | JSX.Element)[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let keyIndex = 0

  while ((match = linkPattern.exec(text)) !== null) {
    const [fullMatch, label, url] = match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const isInternal = url.startsWith('/')
    const currentKey = keyIndex
    keyIndex += 1

    parts.push(
      isInternal ? (
        <Link
          key={currentKey}
          to={url}
          className="underline decoration-gilt/60 hover:decoration-gilt"
        >
          {label}
        </Link>
      ) : (
        <a
          key={currentKey}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-gilt/60 hover:decoration-gilt"
        >
          {label}
        </a>
      )
    )

    lastIndex = match.index + fullMatch.length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}