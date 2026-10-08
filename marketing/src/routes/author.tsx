import { createFileRoute } from '@tanstack/react-router'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { siteUrl } from '@/lib/site'

export const Route = createFileRoute('/author')({
  head: () => ({
    meta: [
      { title: 'Joshua Ansah — the person behind DayKindle' },
      {
        name: 'description',
        content:
          'Meet Joshua Ansah, the software engineer behind DayKindle, and the personal reason he started building it.',
      },
      { property: 'og:title', content: 'Joshua Ansah — the person behind DayKindle' },
      {
        property: 'og:description',
        content: 'A little about the person, the work, and the reason DayKindle began.',
      },
      { property: 'og:type', content: 'profile' },
      ...(siteUrl ? [{ property: 'og:url', content: siteUrl + '/author' }] : []),
    ],
    links: siteUrl ? [{ rel: 'canonical', href: siteUrl + '/author' }] : [],
  }),
  component: AuthorPage,
})

function AuthorPage() {
  return (
    <main id="main" className="author-page section-width">
      <div className="author-hero">
        <div className="author-intro">
          <p className="eyebrow"><span className="eyebrow-dot" /> The person behind DayKindle</p>
          <h1>Joshua Ansah</h1>
          <p className="author-deck">Software engineer, Christian, and builder of DayKindle.</p>
          <p>
            DayKindle grew from that hope: a place to make small plans, follow through where I can, and begin again when the day takes a different turn.
          </p>
        </div>
        <aside className="author-note squircle-edge">
          <span className="author-note-label">Where it began</span>
          <p>I wanted to improve my lifestyle and deepen my relationship with God as a Christian.</p>
          <span className="author-note-caption">A personal reason for making a practical planner.</span>
        </aside>
      </div>

      <section className="author-work" aria-labelledby="author-work-title">
        <div>
          <p className="eyebrow"><span className="eyebrow-dot" /> Beyond DayKindle</p>
          <h2 id="author-work-title">I build software for everyday work.</h2>
        </div>
        <div className="author-work-copy">
          <p>
            I have 3+ years of experience building production fintech and SaaS products across web and mobile. My work also includes education and logistics. I use TypeScript, React and Next.js, Node.js and NestJS, Flutter, and React Native.
          </p>
          <a
            className="author-portfolio-link"
            href="https://joshua-ansah.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
          >
            More about my work <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      </section>

      <section className="author-close squircle-edge">
        <div>
          <p className="eyebrow"><span className="eyebrow-dot" /> A note on the project</p>
          <p>DayKindle is an open-source project. I hope it’s useful to people shaping a life that matters to them, one ordinary day at a time.</p>
        </div>
        <a className="about-primary-link" href="/about">
          Why DayKindle exists <ArrowRight size={16} aria-hidden="true" />
        </a>
      </section>
    </main>
  )
}
