'use client'

import { useEffect, useState } from 'react'
import { Activity, ClipboardList, UsersRound } from 'lucide-react'

const sections = [
  { id: 'overview', label: 'Overview', Icon: Activity },
  { id: 'activity', label: 'Activity', Icon: ClipboardList },
  { id: 'cohorts', label: 'Cohorts', Icon: UsersRound },
] as const

export default function DashboardNavigation() {
  const [activeSection, setActiveSection] = useState<(typeof sections)[number]['id']>('overview')

  useEffect(() => {
    const targets = sections
      .map(({ id }) => document.getElementById(id))
      .filter((target): target is HTMLElement => target !== null)

    if (targets.length === 0) return

    const updateActiveSection = () => {
      const marker = window.innerHeight * 0.32
      const matches = targets
        .filter((target) => {
          const bounds = target.getBoundingClientRect()
          return bounds.top <= marker && bounds.bottom >= marker
        })
        .sort((first, second) => first.getBoundingClientRect().top - second.getBoundingClientRect().top)
      const current = matches[matches.length - 1]

      if (current) setActiveSection(current.id as (typeof sections)[number]['id'])
    }

    let frame = 0
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(updateActiveSection)
    }

    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    updateActiveSection()

    return () => {
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <nav className="sidebar-nav" aria-label="Dashboard sections">
      {sections.map(({ id, label, Icon }) => (
        <a
          className={activeSection === id ? 'sidebar-link active' : 'sidebar-link'}
          href={`#${id}`}
          key={id}
          aria-current={activeSection === id ? 'location' : undefined}
          aria-label={label}
          title={label}
          onClick={() => setActiveSection(id)}
        >
          <Icon size={17} aria-hidden="true" />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  )
}
