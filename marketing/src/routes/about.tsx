import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { ArrowRight, MoveRight } from 'lucide-react'
import { createPageSeo } from '@/lib/seo'

export const Route = createFileRoute('/about')({
  head: () => ({
    ...createPageSeo({
      title: 'About DayKindle',
      description:
        "DayKindle is an open-source daily planner. Read why Joshua Ansah started it, and how personal routines, priorities, and faith shaped the project.",
      pathname: '/about',
    }),
  }),
  component: AboutPage,
})

function AboutPage() {
  useEffect(() => {
    if (window.location.hash !== '#about-joshua') return

    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}`,
    )
  }, [])

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
      <section className="author-work" id="about" aria-labelledby="author-work-title">
        <div className="author-intro">
          <p className="eyebrow"><span className="eyebrow-dot" /> About the author</p>
          <h2 id="author-work-title">Joshua Ansah</h2>
          <p className="author-deck">Software engineer and creator of DayKindle.</p>
        </div>
        <div className="author-work-copy">
          <p>
            I started DayKindle with my own routines and priorities in mind. I wanted a planner that helped me make a plan, notice what actually happened, and adjust when the day changed. I'm sharing it in the open so others can use it and help shape it.
          </p>
          <a
            className="author-portfolio-link"
            href="https://joshua-ansah.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
          >
            More About Me <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </section>
      <div className="about-actions">
        <a className="about-primary-link" href="/#sample-day">
          Try the sample day <ArrowRight size={16} aria-hidden="true" />
        </a>
        <a className="guest-link" href="/#app-screens">
          See the app <MoveRight size={16} aria-hidden="true" />
        </a>
      </div>
    </main>
  )
}
