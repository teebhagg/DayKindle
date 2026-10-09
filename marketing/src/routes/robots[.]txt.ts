import { createFileRoute } from '@tanstack/react-router'
import type {} from '@tanstack/react-start'
import { siteUrl } from '@/lib/site'

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = siteUrl || new URL(request.url).origin
        return new Response('User-agent: *\nAllow: /\n\nSitemap: ' + origin + '/sitemap.xml\n', {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      },
    },
  },
})
