import { useEffect } from 'react'
import { useLocation } from 'react-router'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import { preprocessMarkdown } from '@/lib/preprocessMarkdown'
import { Admonition } from './Admonition'
import type { Components } from 'react-markdown'

interface MarkdownPageProps {
  content: string
  imageBasePath?: string
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mb-4 font-heading text-3xl font-bold uppercase tracking-[0.08em] text-parchment-900 dark:text-ivory">
      {children}
    </h1>
  ),
  h2: ({ children, id }) => (
    <h2 id={id} className="mb-3 mt-8 scroll-mt-24 font-heading text-2xl font-semibold uppercase tracking-[0.08em] text-gilt">
      {children}
    </h2>
  ),
  h3: ({ children, id }) => (
    <h3 id={id} className="mb-2 mt-6 scroll-mt-24 font-heading text-xl font-semibold text-parchment-800 dark:text-ivory">
      {children}
    </h3>
  ),
  h4: ({ children, id }) => (
    <h4 id={id} className="mb-2 mt-4 scroll-mt-24 font-heading text-lg font-medium text-parchment-700 dark:text-ivory/80">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="mb-4 max-w-[68ch] leading-relaxed text-parchment-800 dark:text-ivory/90">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 ml-6 list-disc space-y-1 text-parchment-800 marker:text-gilt dark:text-ivory/90">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 ml-6 list-decimal space-y-1 text-parchment-800 marker:text-gilt dark:text-ivory/90">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-4 border-gilt bg-parchment-100/50 py-3 pl-4 pr-4 italic text-parchment-700 dark:border-gilt dark:bg-ink/50 dark:text-ivory/70">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-parchment-800 underline decoration-gilt/60 decoration-1 underline-offset-3 transition-all hover:decoration-gilt hover:decoration-2 visited:text-ash dark:text-ivory dark:decoration-gilt/50 dark:hover:decoration-gilt"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-ash/20">
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2.5 font-heading text-xs font-semibold uppercase tracking-wider text-gilt">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-ash/10 px-3 py-2 text-sm text-parchment-800 dark:text-ivory/85">
      {children}
    </td>
  ),
  tr: ({ children }) => (
    <tr className="transition-colors hover:bg-parchment-100/50 dark:hover:bg-ink/40">
      {children}
    </tr>
  ),
  img: ({ src, alt }) => (
    <figure className="my-4">
      <img
        src={src}
        alt={alt || ''}
        className="max-w-full rounded-lg border border-gilt/30 shadow-md shadow-black/20"
        loading="lazy"
        style={{ boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.15)' }}
      />
      {alt && (
        <figcaption className="mt-2 text-center font-subtitle text-sm text-ash">
          {alt}
        </figcaption>
      )}
    </figure>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <code className={`${className} block overflow-x-auto rounded-lg bg-parchment-200 p-4 font-ui text-sm dark:bg-ink`}>
          {children}
        </code>
      )
    }
    return (
      <code className="rounded bg-parchment-200 px-1.5 py-0.5 font-ui text-sm font-medium text-gilt dark:bg-ink dark:text-gilt">
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-lg bg-parchment-200 p-4 dark:bg-ink">
      {children}
    </pre>
  ),
  hr: () => (
    <div className="gilt-divider" aria-hidden="true">
      <span className="gilt-divider-ornament">&loz;</span>
    </div>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-parchment-900 dark:text-ivory">
      {children}
    </strong>
  ),
  // Handle admonition divs from preprocessor
  div: ({ className, children }) => {
    // Pass through inner admonition divs (title/content) — must check BEFORE the outer match
    if (className?.includes('admonition-title') || className?.includes('admonition-content')) {
      return <>{children}</>
    }
    // Match only the outer wrapper: class="admonition admonition-warning"
    if (className?.includes('admonition')) {
      // Extract type from class name (admonition-warning, admonition-danger, etc.)
      const typeMatch = className.match(/\badmonition-(\w+)/)
      const type = typeMatch ? typeMatch[1] : 'info'
      const childArray = Array.isArray(children) ? children : [children]
      let title = type.charAt(0).toUpperCase() + type.slice(1)
      let content = children

      // Try to extract title from nested divs
      const titleChild = childArray.find(
        (c: any) => c?.props?.className?.includes('admonition-title')
      )
      if (titleChild) {
        title = titleChild.props.children
        content = childArray.filter((c: any) => c !== titleChild)
      }

      return (
        <Admonition type={type} title={title}>
          {content}
        </Admonition>
      )
    }
    return <div className={className}>{children}</div>
  },
  details: ({ children, ...props }) => (
    <details
      className="group my-3 rounded-lg border border-parchment-300 bg-parchment-100 dark:border-ash/20 dark:bg-ink"
      {...(props as Record<string, unknown>)}
    >
      {children}
    </details>
  ),
  summary: ({ children }) => (
    <summary className="cursor-pointer px-4 py-3 font-heading text-sm font-semibold text-gilt transition-colors hover:text-gilt/80">
      {children}
    </summary>
  ),
}

export function MarkdownPage({ content, imageBasePath }: MarkdownPageProps) {
  const processed = preprocessMarkdown(content, imageBasePath)
  const { hash } = useLocation()

  // HashRouter puts the route in window.location.hash, so in-page anchors
  // live in the route-level hash (e.g. /quests/.../foo#part-5 → location.hash = '#part-5').
  // Browser won't auto-scroll; do it ourselves after markdown renders.
  useEffect(() => {
    if (!hash) return
    const id = hash.slice(1)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [hash, processed])

  return (
    <div className="prose-unora max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSlug]}
        components={components}
      >
        {processed}
      </ReactMarkdown>
    </div>
  )
}
