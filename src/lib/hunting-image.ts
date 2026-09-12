/** Resolve CMS public URLs while preserving the original filename-only thumbnail format. */
export function resolveHuntingImage(image: string | undefined, baseUrl = '/'): string | undefined {
  const value = image?.trim()
  if (!value) return undefined
  if (/^(https?:)?\/\//i.test(value)) return value
  // Local absolute filesystem paths cannot be served by the website.
  if (/^[a-z][a-z\d+.-]*:/i.test(value)) return undefined

  // Older manually entered repo paths may use Windows separators. URLs always use '/'.
  let path = value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/?public\//, '/')
  if (!path.includes('/')) {
    // These names refer to the pre-generated thumbnails, not newly uploaded assets.
    path = `images/hunting/thumbs/${path.replace(/\.png$/i, '.webp')}`
  }
  const base = baseUrl.replace(/\/?$/, '/')
  if (base !== '/' && path.startsWith(base)) return path
  return base + path.replace(/^\/+/, '')
}
