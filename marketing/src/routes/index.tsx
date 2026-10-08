import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { ArrowRight, CalendarDays, Check, MoveRight } from 'lucide-react'
import InteractivePreview from '@/components/InteractivePreview'
import ScrollReveal from '@/components/ScrollReveal'
import { siteUrl } from '@/lib/site'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'DayKindle — a daily planner that can change' },
      {
        name: 'description',
        content:
          'Plan goals, routines, and daily actions with DayKindle. Move an action when the day does not go to plan.',
      },
      { property: 'og:title', content: 'DayKindle — a daily planner that can change' },
      {
        property: 'og:description',
        content:
          'A mobile planner for goals, routines, and daily actions. Move an item or leave it for tomorrow when plans change.',
      },
      { property: 'og:type', content: 'website' },
      ...(siteUrl ? [{ property: 'og:url', content: siteUrl + '/' }] : []),
      ...(siteUrl ? [{ property: 'og:image', content: siteUrl + '/daykindle-logo.png' }] : []),
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: siteUrl ? [{ rel: 'canonical', href: siteUrl + '/' }] : [],
  }),
  component: HomePage,
})

const heroScreens = [
  {
    id: 'outer-left',
    src: '/mockups/goal-template-expressive.png',
    alt: 'DayKindle goal template screen with a flexible learning goal.',
  },
  {
    id: 'inner-left',
    src: '/mockups/templates-expressive.png',
    alt: 'DayKindle template library with daily routines and goals.',
  },
  {
    id: 'center',
    src: '/mockups/today-formal.png',
    alt: 'DayKindle Today screen with the weekly routine and daily actions.',
  },
  {
    id: 'inner-right',
    src: '/mockups/progress-expressive.png',
    alt: 'DayKindle progress screen with an action completion chart.',
  },
  {
    id: 'outer-right',
    src: '/mockups/full-day-rhythm-formal.png',
    alt: 'DayKindle full-day rhythm routine screen.',
  },
] as const

function HomePage() {
  const heroDevicesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const rail = heroDevicesRef.current
    if (!rail) return

    const screens = Array.from(rail.querySelectorAll<HTMLElement>('.hero-device')).map((screen) => ({
      screen,
      mockup: screen.querySelector<HTMLElement>('.hero-device-screen'),
    }))

    const updatePositions = () => {
      const progress = Math.min(1, Math.max(0, window.scrollY / 300))

      screens.forEach(({ screen, mockup }) => {
        if (!mockup) return

        const stagger = Number.parseFloat(getComputedStyle(screen).marginTop) || 0
        mockup.style.setProperty('--hero-device-scroll-y', `${-stagger * progress}px`)
      })
    }

    let frame = 0
    const scheduleUpdate = () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        updatePositions()
      })
    }

    updatePositions()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    window.addEventListener('resize', scheduleUpdate)
    motionPreference.addEventListener('change', scheduleUpdate)

    return () => {
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      motionPreference.removeEventListener('change', scheduleUpdate)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <main id="main">
      <section className="hero-section page-width">
        <ScrollReveal>
          <div className="hero-copy">
            <span className="hero-brand-mark" aria-hidden="true">
              <img src="/daykindle-logo.png" alt="" width="48" height="48" />
            </span>
            <p className="eyebrow"><span className="eyebrow-dot" /> A daily planner for real life</p>
            <h1>Make room for <em>change.</em></h1>
            <p className="hero-description">
              Keep goals, routines, and daily actions together. Make a plan for today, then move things around when the day changes.
            </p>
            <p className="hero-note">
              <Check size={16} aria-hidden="true" />
              <span>Open source. Guest mode is available in the mobile app.</span>
            </p>
            <div className="hero-actions">
              <a className="hero-button" href="#app-screens">Explore the app <ArrowRight size={17} aria-hidden="true" /></a>
              <a className="hero-text-link" href="#sample-day">Try the sample day <ArrowRight size={15} aria-hidden="true" /></a>
            </div>
          </div>
        </ScrollReveal>
        <div ref={heroDevicesRef} className="hero-devices" role="group" aria-label="Five DayKindle app screens">
          {heroScreens.map((screen, index) => (
            <div key={screen.id} className={`hero-device hero-device--${screen.id}`}>
              <div className="hero-device-screen">
                <img
                  src={screen.src}
                  alt={screen.alt}
                  width="1419"
                  height="2796"
                  fetchPriority={index === 2 ? 'high' : 'auto'}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="app-screens" className="screens-section section-width" aria-labelledby="screens-heading">
        <ScrollReveal>
          <div className="screens-heading section-heading-centered">
            <p className="eyebrow"><span className="eyebrow-dot" /> Experience DayKindle</p>
            <h2 id="screens-heading">A day, from plan to review.</h2>
            <p>Set up a routine, work through the day, and look back at what you recorded.</p>
          </div>
        </ScrollReveal>
        <div className="feature-list">
          <ScrollReveal>
            <article className="feature-row">
              <figure className="feature-visual">
                <img
                  className="feature-device"
                  src="/mockups/today-formal.png"
                  alt="The DayKindle Today screen shown on an iPhone."
                  width="1419"
                  height="2796"
                  loading="lazy"
                  decoding="async"
                />
              </figure>
              <div className="feature-copy">
                <p className="eyebrow"><span className="eyebrow-dot" /> Today</p>
                <h3>Keep today in view.</h3>
                <p>See your routine, choose what to do, and mark what happened.</p>
              </div>
            </article>
          </ScrollReveal>
          <ScrollReveal delay={20}>
            <article className="feature-row feature-row--reverse">
              <figure className="feature-visual">
                <img
                  className="feature-device"
                  src="/mockups/templates-expressive.png"
                  alt="The DayKindle template library shown on an iPhone."
                  width="1419"
                  height="2796"
                  loading="lazy"
                  decoding="async"
                />
              </figure>
              <div className="feature-copy">
                <p className="eyebrow"><span className="eyebrow-dot" /> Templates</p>
                <h3>Start with a routine that fits.</h3>
                <p>Choose a starting point, then edit the steps to fit your week.</p>
              </div>
            </article>
          </ScrollReveal>
          <ScrollReveal delay={40}>
            <article className="feature-row">
              <figure className="feature-visual">
                <img
                  className="feature-device"
                  src="/mockups/progress-expressive.png"
                  alt="The DayKindle Progress screen shown on an iPhone."
                  width="1419"
                  height="2796"
                  loading="lazy"
                  decoding="async"
                />
              </figure>
              <div className="feature-copy">
                <p className="eyebrow"><span className="eyebrow-dot" /> Progress</p>
                <h3>See how the days add up.</h3>
                <p>Review the actions you recorded over the time range you choose.</p>
              </div>
            </article>
          </ScrollReveal>
        </div>
      </section>

      <section id="how-it-works" className="how-section section-width">
        <ScrollReveal>
          <div className="section-heading section-heading-centered">
            <p className="eyebrow"><span className="eyebrow-dot" /> Start small</p>
            <h2>A plan you can rework.</h2>
            <p>Pick what matters today. Change the list when you need to.</p>
          </div>
        </ScrollReveal>
        <ScrollReveal>
          <ol className="day-flow" aria-label="Three steps for using DayKindle">
            <li>
              <span className="day-flow-number">01</span>
              <span className="day-flow-icon"><CalendarDays size={19} strokeWidth={1.8} aria-hidden="true" /></span>
              <span className="day-flow-copy"><strong>Choose a few actions</strong><small>Pick goals, routines, or tasks for the day.</small></span>
              <ArrowRight className="day-flow-arrow" size={16} aria-hidden="true" />
            </li>
            <li>
              <span className="day-flow-number">02</span>
              <span className="day-flow-icon"><Check size={19} strokeWidth={1.8} aria-hidden="true" /></span>
              <span className="day-flow-copy"><strong>Mark what happened</strong><small>Complete an action, skip it, or leave it open.</small></span>
              <ArrowRight className="day-flow-arrow" size={16} aria-hidden="true" />
            </li>
            <li>
              <span className="day-flow-number">03</span>
              <span className="day-flow-icon"><MoveRight size={19} strokeWidth={1.8} aria-hidden="true" /></span>
              <span className="day-flow-copy"><strong>Adjust when you need to</strong><small>Move an action when the timing no longer fits.</small></span>
              <ArrowRight className="day-flow-arrow" size={16} aria-hidden="true" />
            </li>
          </ol>
        </ScrollReveal>
      </section>

      <section className="sample-section section-width" aria-labelledby="sample-heading">
        <ScrollReveal>
          <div className="sample-copy">
            <p className="eyebrow"><span className="eyebrow-dot" /> Give it a try</p>
            <h2 id="sample-heading">Tap through a sample day.</h2>
            <p>Mark an action done or move it to tomorrow. This small demo won’t save anything.</p>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={35}>
          <InteractivePreview />
        </ScrollReveal>
      </section>

      <section id="gentle-by-design" className="change-section">
        <div className="change-inner page-width">
          <div className="change-copy">
            <p className="eyebrow eyebrow-light"><span className="eyebrow-dot" /> If something comes up</p>
            <h2>Plans change.</h2>
            <p>
              Move one action or leave it open. The rest of your day can stay as it is.
            </p>
          </div>
          <div className="change-list" aria-label="Ways to update a plan">
            <div><span>01</span><span>Move an action</span><ArrowRight size={16} aria-hidden="true" /></div>
            <div><span>02</span><span>Mark it skipped or missed</span><ArrowRight size={16} aria-hidden="true" /></div>
            <div><span>03</span><span>Leave it open for later</span><ArrowRight size={16} aria-hidden="true" /></div>
          </div>
        </div>
      </section>

      <section id="guest-workspace" className="guest-section section-width">
        <div className="guest-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> Guest mode</p>
          <h2>Start without an account.</h2>
          <p>
            In the mobile app, Guest mode keeps planner data on this device. Add goals and routines, record daily actions, and write a reflection when you want to review the week.
          </p>
          <p className="guest-note">
            Reminders are scheduled on your device and depend on your notification settings.
          </p>
        </div>
        <aside className="guest-card squircle-edge" aria-label="Guest workspace details">
          <div className="guest-card-heading">
            <span className="guest-card-mark"><Check size={17} aria-hidden="true" /></span>
            <span><strong>Guest workspace</strong><small>On this device</small></span>
          </div>
          <div className="guest-card-row"><span>Planner data</span><strong>Stored locally</strong></div>
          <div className="guest-card-row"><span>Daily reminders</span><strong>Device scheduled</strong></div>
          <p className="guest-card-bottom">Your reminders use this device’s notification settings.</p>
        </aside>
      </section>

      <section className="founder-section section-width" aria-labelledby="founder-heading">
        <div className="founder-story squircle-edge">
          <div className="founder-story-copy">
            <p className="eyebrow"><span className="eyebrow-dot" /> A personal reason</p>
            <h2 id="founder-heading">A little more intention for the life you’re building.</h2>
            <p>
              DayKindle began with my own routines, priorities, and Christian faith. I wanted a planner that could give them room in an ordinary day, then decided to share what I was building.
            </p>
          </div>
          <div className="founder-story-actions">
            <a className="about-primary-link" href="/about">
              The story of DayKindle <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a className="founder-author-link" href="/author">About Joshua</a>
          </div>
        </div>
      </section>
    </main>
  )
}
