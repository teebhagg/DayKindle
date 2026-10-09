import { siteLogoUrl, siteUrl } from '@/lib/site'

type PageSeoOptions = {
  title: string
  description: string
  pathname?: string
  type?: 'website' | 'profile'
  noIndex?: boolean
}

export function createPageSeo({
  title,
  description,
  pathname,
  type = 'website',
  noIndex = false,
}: PageSeoOptions) {
  const canonicalUrl = siteUrl && pathname ? new URL(pathname, `${siteUrl}/`).href : undefined

  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:site_name', content: 'DayKindle' },
      { property: 'og:type', content: type },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      ...(canonicalUrl ? [{ property: 'og:url', content: canonicalUrl }] : []),
      ...(siteLogoUrl
        ? [
            { property: 'og:image', content: siteLogoUrl },
            { property: 'og:image:alt', content: 'DayKindle app logo' },
            { property: 'og:image:type', content: 'image/png' },
            { name: 'twitter:image', content: siteLogoUrl },
            { name: 'twitter:image:alt', content: 'DayKindle app logo' },
          ]
        : []),
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      ...(noIndex ? [{ name: 'robots', content: 'noindex, nofollow' }] : []),
    ],
    links: canonicalUrl ? [{ rel: 'canonical', href: canonicalUrl }] : [],
  }
}
