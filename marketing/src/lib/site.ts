function normalizeSiteUrl(value: string | undefined) {
  if (!value?.trim()) return ''

  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return ''
    if (url.username || url.password) return ''
    return url.origin
  } catch {
    return ''
  }
}

export const siteUrl = normalizeSiteUrl(import.meta.env.VITE_SITE_URL)
export const siteLogoUrl = siteUrl ? new URL('/daykindle-logo.png', siteUrl).href : ''
