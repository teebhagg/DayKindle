import type { ReactNode } from 'react'

type LegalPageProps = {
  title: string
  intro: string
  children: ReactNode
}

export default function LegalPage({ title, intro, children }: LegalPageProps) {
  return (
    <main id="main" className="legal-page section-width">
      <header className="legal-heading">
        <p className="eyebrow"><span className="eyebrow-dot" /> DayKindle · Legal</p>
        <h1>{title}</h1>
        <p>{intro}</p>
      </header>

      <aside className="legal-draft squircle-edge" role="note">
        <strong>Working draft</strong>
        <span>
          Add the postal address and confirm data-retention and hosting details before publishing. Have a Ghana-qualified lawyer review this copy.
        </span>
      </aside>

      <div className="legal-document">{children}</div>
    </main>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="legal-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}
