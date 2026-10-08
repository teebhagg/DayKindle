import { createFileRoute } from '@tanstack/react-router'
import { ArrowRight, MoveRight } from 'lucide-react'
import { siteUrl } from '@/lib/site'

export const Route = createFileRoute('/about')({
  head: () => ({
    meta: [
      { title: 'Why DayKindle exists — a planner for real days' },
      {
        name: 'description',
        content:
          'DayKindle began with a personal hope: to live with more intention and deepen my relationship with God. Here’s the thinking behind the planner.',
      },
      { property: 'og:title', content: 'Why DayKindle exists' },
      {
        property: 'og:description',
        content: 'A personal reason for making a planner that leaves room for real life.',
      },
    ],
    links: siteUrl ? [{ rel: 'canonical', href: siteUrl + '/about' }] : [],
  }),
  component: AboutPage,
})

function AboutPage() {
  return (
    <main id="main" className="about-page section-width">
      <div className="about-intro">
        <p className="eyebrow"><span className="eyebrow-dot" /> Why DayKindle exists</p>
        <h1>Built for the days that don’t go to plan.</h1>
        <p>
          I started DayKindle because I wanted to improve my lifestyle and deepen my relationship with God as a Christian. I wanted a planner that could help me keep those intentions close, even when the day changed.
        </p>
      </div>
      <div className="about-story">
        <p>
          DayKindle keeps goals, routines, and daily actions in one place. Make a plan, record what happened, and move something when the day no longer fits. You can pick up where you left off tomorrow.
        </p>
        <p>
          My faith is part of why I made it, but you don’t need to share my beliefs to use the app. I’m building DayKindle in the open so the community can use, inspect, and help improve it.
        </p>
      </div>
      <div className="about-details">
        <div><span>01</span><p><strong>Make a plan</strong>Keep goals, routines, and daily actions together.</p></div>
        <div><span>02</span><p><strong>Notice what happened</strong>Record the day as it was, not as you hoped it would be.</p></div>
        <div><span>03</span><p><strong>Begin again</strong>Move an action or change the plan when life shifts.</p></div>
      </div>
      <div className="about-actions">
        <a className="about-primary-link" href="/author">
          Meet Joshua <ArrowRight size={16} aria-hidden="true" />
        </a>
        <a className="guest-link" href="/#how-it-works">
          See how the planner works <MoveRight size={16} aria-hidden="true" />
        </a>
      </div>
    </main>
  )
}
