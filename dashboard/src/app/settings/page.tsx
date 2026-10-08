import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, KeyRound } from 'lucide-react'
import { signOut } from '@/app/actions'
import PasswordChangeForm from '@/components/password-change-form'
import SetupNotice from '@/components/setup-notice'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getDashboardAccess } from '@/lib/dashboard-auth'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Account settings',
  robots: { index: false, follow: false },
}

export default async function SettingsPage() {
  const access = await getDashboardAccess()

  if (access.kind === 'not-configured') {
    return <SetupNotice title="Team sign-in is not configured" detail="Set the dashboard Supabase URL and publishable key before changing account settings." />
  }
  if (access.kind === 'unauthenticated') redirect('/login')
  if (access.kind === 'authorization-not-configured') {
    return <SetupNotice title="Admin access is not ready" detail="Apply the dashboard admins migration and confirm that its table is available to authenticated users." />
  }
  if (access.kind === 'not-allowed') {
    return <SetupNotice mode="access" title="Team access is required" detail="This account is not listed as an administrator for the dashboard." />
  }

  return (
    <div className="settings-shell">
      <aside className="settings-sidebar">
        <Link className="settings-brand" href="/">
          <Image src="/daykindle-logo.png" alt="" width={36} height={36} />
          <span><strong>DayKindle</strong><small>Team analytics</small></span>
        </Link>
        <span className="settings-sidebar-label">Account</span>
        <Link className="settings-sidebar-link active" href="/settings" aria-current="page"><KeyRound size={16} /><span>Password</span></Link>
        <p className="settings-sidebar-foot">Private product analytics</p>
      </aside>
      <div className="settings-main-column">
        <header className="topbar settings-topbar">
          <div className="topbar-left"><span className="topbar-label">DAYKINDLE</span><span className="topbar-date">Account settings</span></div>
          <div className="topbar-right">
            <Link className="account-settings-link" href="/"><ArrowLeft size={14} aria-hidden="true" /><span>Overview</span></Link>
            <form action={signOut}><Button className="logout-button" variant="outline" size="sm" type="submit">Sign out</Button></form>
          </div>
        </header>
        <main className="settings-main">
          <div className="settings-heading">
            <p className="page-kicker"><span className="eyebrow-dot" /> ACCOUNT</p>
            <h1>Account settings</h1>
            <p>Update your password for the private DayKindle dashboard.</p>
          </div>
          <Card className="settings-card">
            <div className="settings-card-heading">
              <span className="settings-card-icon"><KeyRound size={17} aria-hidden="true" /></span>
              <div><h2>Change password</h2><p>Choose a strong password you do not use elsewhere.</p></div>
            </div>
            <PasswordChangeForm />
          </Card>
        </main>
      </div>
    </div>
  )
}
