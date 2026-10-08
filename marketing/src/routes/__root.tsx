import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { MotionConfig } from 'motion/react'
import MarketingAnalytics from '@/components/MarketingAnalytics'
import SiteFooter from '@/components/Footer'
import SiteHeader from '@/components/Header'
import appCss from '@/styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        title: 'DayKindle — a daily planner with room to adjust',
      },
      {
        name: 'description',
        content:
          'Plan your goals, routines, and daily actions. Review the day and revise your list when plans change.',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
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
