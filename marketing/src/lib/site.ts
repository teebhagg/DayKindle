const configuredSiteUrl = import.meta.env.VITE_SITE_URL?.trim()

export const siteUrl = configuredSiteUrl
  ? configuredSiteUrl.replace(/\/$/, '')
  : ''
