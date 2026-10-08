import Image from 'next/image'
import Link from 'next/link'

const setupRequirements = [
  ['01', 'Authentication', 'Supabase server configuration'],
  ['02', 'Admin access', 'Dashboard admin membership'],
  ['03', 'Analytics source', 'PostHog Query API access'],
]
const accessRequirements = [
  ['01', 'Sign-in', 'Account is authenticated'],
  ['02', 'Admin access', 'Administrator membership is needed'],
  ['03', 'Analytics', 'Not loaded for this account'],
]

export default function SetupNotice({
  title,
  detail,
  mode = 'configure',
}: {
  title: string
  detail: string
  mode?: 'configure' | 'access'
}) {
  const requirements = mode === 'access' ? accessRequirements : setupRequirements

  return (
    <main className="setup-page">
      <header className="setup-header">
        <Link className="setup-brand" href="/" aria-label="DayKindle analytics home">
          <Image src="/daykindle-logo.png" alt="" width={34} height={34} />
          <span><strong>DayKindle</strong><small>Team analytics</small></span>
        </Link>
        <span className="workspace-label"><span className="workspace-dot" /> INTERNAL WORKSPACE</span>
      </header>

      <div className="setup-content">
        <section className="setup-copy" aria-labelledby="setup-title">
          <p className="setup-eyebrow"><span className="eyebrow-dot" /> {mode === 'access' ? 'ACCOUNT ACCESS' : 'WORKSPACE SETUP'}</p>
          <h1 id="setup-title">{title}</h1>
          <p className="setup-detail">{detail}</p>
          <p className="setup-footnote">Access is checked on the server before any analytics are loaded.</p>
        </section>

        <section className="setup-checklist squircle-edge" aria-labelledby="setup-checklist-title">
          <div className="setup-checklist-heading">
            <div>
              <p>DAYKINDLE ANALYTICS</p>
              <h2 id="setup-checklist-title">{mode === 'access' ? 'Your access check' : 'What this workspace needs'}</h2>
            </div>
            <span className="setup-required">REQUIRED</span>
          </div>
          <div className="setup-requirements">
            {requirements.map(([number, name, description]) => (
              <div className="setup-requirement" key={number}>
                <span className="setup-number">{number}</span>
                <span className="setup-requirement-copy"><strong>{name}</strong><small>{description}</small></span>
                <span className="setup-waiting">{mode === 'access' ? (number === '01' ? 'Ready' : number === '02' ? 'Review' : 'Waiting') : 'Required'}</span>
              </div>
            ))}
          </div>
          <p className="setup-checklist-note">{mode === 'access'
            ? 'The dashboard has not requested analytics for this account.'
            : 'No sample metrics are shown. Real reports appear after the connection is ready.'}</p>
        </section>
      </div>

      <footer className="setup-footer">
        <span>DayKindle</span>
        <span>Private product analytics</span>
      </footer>
    </main>
  )
}
