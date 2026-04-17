import { memo, type ImgHTMLAttributes } from 'react'

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
}

function swapExt(src: string, newExt: string): string | null {
  // Only rewrite sources we know we generate siblings for (local PNG/JPG/JPEG).
  const match = src.match(/^(.*)\.(png|jpe?g)(\?.*)?$/i)
  if (!match) return null
  const [, base, , query = ''] = match
  return `${base}.${newExt}${query}`
}

export const OptimizedImage = memo(function OptimizedImage({ src, alt, ...rest }: OptimizedImageProps) {
  const isExternal = /^https?:\/\//i.test(src)
  const avif = isExternal ? null : swapExt(src, 'avif')
  const webp = isExternal ? null : swapExt(src, 'webp')

  // If we can't derive alt sources (e.g. already a webp/avif/svg), just render plain img.
  if (!avif && !webp) {
    return <img src={src} alt={alt} loading="lazy" decoding="async" {...rest} />
  }

  return (
    <picture style={{ display: 'contents' }}>
      {avif && <source type="image/avif" srcSet={avif} />}
      {webp && <source type="image/webp" srcSet={webp} />}
      <img src={src} alt={alt} loading="lazy" decoding="async" {...rest} />
    </picture>
  )
})
