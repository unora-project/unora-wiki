import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { CardArt, CardFacts, CardFilterBar, FoilStyles } from '@/components/tcg/TcgCard'
import {
  CARDS,
  ELEMENT_ORDER,
  VARIANT_LABELS,
  chip,
  chipActive,
  chipIdle,
  panelClass,
  rarityColor,
  useCardFilters,
  useDetailScale,
  type Card,
  type Element,
  type Variant,
} from '@/lib/tcg'

function CardDetail({ card }: { card: Card }) {
  const scale = useDetailScale()
  const [variant, setVariant] = useState<Variant>('normal')
  const [foil, setFoil] = useState(false)
  const shown = card.variants.includes(variant) ? variant : 'normal'

  return (
    <div className={panelClass}>
      <div className="flex justify-center">
        <div className="rounded-md p-1 shadow-[0_6px_24px_rgba(0,0,0,0.35)]">
          <CardArt key={`${card.slug}-${shown}-${foil}`} card={card} variant={shown} scale={scale} foil={foil} eager />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-1.5" role="group" aria-label="Card version">
        {card.variants.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVariant(v)}
            aria-pressed={shown === v}
            className={`${chip} ${shown === v ? chipActive : chipIdle}`}
          >
            {VARIANT_LABELS[v]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setFoil((f) => !f)}
          aria-pressed={foil}
          className={`${chip} inline-flex items-center gap-1.5 ${foil ? chipActive : chipIdle}`}
        >
          <Sparkles size={14} /> Foil
        </button>
      </div>

      <div className="mt-5">
        <h2 className="font-heading text-2xl font-semibold leading-tight text-gilt">{card.name}</h2>
        <p className="font-subtitle text-base" style={{ color: rarityColor(card.rarity) }}>
          <span className="rounded bg-obsidian/80 px-1.5 py-0.5">{card.rarity}</span>
        </p>
      </div>

      <div className="mt-4">
        <CardFacts card={card} />
      </div>
    </div>
  )
}

export function TCGCardGallery() {
  const [params, setParams] = useSearchParams()

  const elementParam = params.get('element') as Element | null
  const element = elementParam && ELEMENT_ORDER.includes(elementParam) ? elementParam : null
  const filters = useCardFilters(element)
  const { filtered } = filters

  const selectedSlug = params.get('card')
  const selected = filtered.find((c) => c.slug === selectedSlug) ?? CARDS.find((c) => c.slug === selectedSlug) ?? filtered[0]

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) next.delete(k)
      else next.set(k, v)
    }
    setParams(next, { replace: true })
  }

  return (
    <div>
      <FoilStyles />
      <PageHeader
        title="Card Gallery"
        description={`All ${CARDS.length} cards of Unora Card Battle TCG. Select a card to see every version, its foil, and its crafting cost.`}
        accent="astral"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Unora Card Battle TCG', to: '/tcg' },
          { label: 'Card Gallery' },
        ]}
      />

      <CardFilterBar element={element} onElement={(e) => update({ element: e })} filters={filters} />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Grid */}
        <section className="order-2 min-w-0 flex-1 lg:order-1" aria-label="Cards">
          <p className="mb-3 font-ui text-xs text-ash">
            Showing {filtered.length} of {CARDS.length} cards
          </p>
          {filtered.length === 0 ? (
            <p className="py-12 text-center font-ui text-sm text-ash">No cards match these filters.</p>
          ) : (
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(124px,1fr))] justify-items-center gap-3 p-0">
              {filtered.map((c) => {
                const active = selected?.slug === c.slug
                return (
                  <li key={c.slug}>
                    <button
                      type="button"
                      onClick={() => update({ card: c.slug })}
                      aria-pressed={active}
                      aria-label={c.name}
                      title={c.name}
                      className={`block rounded-[3px] p-0.5 transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-gilt ${
                        active ? 'bg-gilt shadow-[0_0_12px_rgba(201,162,76,0.6)]' : 'bg-transparent'
                      }`}
                    >
                      <CardArt card={c} scale={1} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Selected card */}
        {selected && (
          <aside className="order-1 lg:sticky lg:top-20 lg:order-2 lg:w-[400px] xl:w-[440px]" aria-label="Selected card">
            <CardDetail key={selected.slug} card={selected} />
          </aside>
        )}
      </div>
    </div>
  )
}
