import { createFileRoute } from '@tanstack/react-router'
import type {} from '@tanstack/react-start'

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin
        const body =
          '<?xml version="1.0" encoding="UTF-8"?>' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
          '<url><loc>' + origin + '/</loc></url>' +
          '<url><loc>' + origin + '/about</loc></url>' +
          '<url><loc>' + origin + '/author</loc></url>' +
          '</urlset>'
        return new Response(body, {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          },
        })
      },
    },
  },
})
