import { useEffect } from 'react'
import { useRouterState } from '@tanstack/react-router'

export default function MarketingAnalytics() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  useEffect(() => {
    const token = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN
    const host = import.meta.env.VITE_POSTHOG_HOST
    if (!token || !host) return

    void import('posthog-js').then(({ default: posthog }) => {
      if (!posthog.__loaded) {
        posthog.init(token, {
          api_host: host,
          autocapture: false,
          capture_pageview: false,
          capture_pageleave: false,
          disable_session_recording: true,
          person_profiles: 'identified_only',
        })
      }

      posthog.register({
        app_environment: import.meta.env.PROD ? 'production' : 'development',
        app_surface: 'marketing',
      })
      posthog.capture('$pageview', {
        $current_url: window.location.origin + pathname,
        app_surface: 'marketing',
      })
    })
  }, [pathname])

  return null
}
