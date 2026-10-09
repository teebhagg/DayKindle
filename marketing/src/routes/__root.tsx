import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { MotionConfig } from 'motion/react'
import MarketingAnalytics from '@/components/MarketingAnalytics'
import SiteFooter from '@/components/Footer'
import SiteHeader from '@/components/Header'
import { createPageSeo } from '@/lib/seo'
import appCss from '@/styles.css?url'

export const Route = createRootRoute({
  head: () => {
    const seo = createPageSeo({
      title: 'DayKindle | Make room for change',
      description:
        'Plan goals, routines, and daily actions in one place. DayKindle helps you choose what matters today and adjust when life changes.',
    })

    return {
      ...seo,
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        ...seo.meta,
      ],
      links: [
        { rel: 'icon', type: 'image/png', href: '/daykindle-icon.png' },
        { rel: 'apple-touch-icon', type: 'image/png', href: '/daykindle-icon.png' },
        { rel: 'stylesheet', href: appCss },
        ...seo.links,
      ],
    }
  },
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <MotionConfig reducedMotion="user">
          <a className="skip-link" href="#main">Skip to content</a>
          <SiteHeader />
          {children}
          <SiteFooter />
          <MarketingAnalytics />
        </MotionConfig>
        <Scripts />
      </body>
    </html>
  )
}
