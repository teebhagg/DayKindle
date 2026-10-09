import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export default function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const updateScrolledState = () => setIsScrolled(window.scrollY >= 80)
    updateScrolledState()
    window.addEventListener('scroll', updateScrolledState, { passive: true })
    return () => window.removeEventListener('scroll', updateScrolledState)
  }, [])

  return (
    <header className={`site-header${isScrolled ? ' site-header--scrolled' : ''}`}>
      <nav className="site-nav page-width" aria-label="Main navigation">
        <Link to="/" className="brand-link" aria-label="DayKindle home">
          <img src="/daykindle-logo.png" alt="" width="36" height="36" />
          <span>DayKindle</span>
        </Link>
        <a className="nav-cta" href="/#app-screens">
          See the app <ArrowRight size={16} aria-hidden="true" />
        </a>
      </nav>
    </header>
  )
}
