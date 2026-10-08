import { ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export default function SiteHeader() {
  return (
    <header className="site-header">
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
