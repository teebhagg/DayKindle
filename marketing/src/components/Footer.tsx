import { Link } from '@tanstack/react-router'

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="page-width footer-row">
        <Link to="/" className="footer-brand">
          <img src="/daykindle-logo.png" alt="" width="30" height="30" />
          <span>DayKindle</span>
        </Link>
        <p>A daily planner by Joshua Ansah.</p>
        <nav aria-label="Footer navigation">
          <Link to="/about">About DayKindle</Link>
          <Link to="/author">About Joshua</Link>
          <a href="/#guest-workspace">Guest workspace</a>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </nav>
        <span className="copyright">© {new Date().getFullYear()} DayKindle</span>
      </div>
    </footer>
  )
}
