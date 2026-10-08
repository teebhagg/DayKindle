import { redirect } from 'next/navigation'
import DashboardView from '@/components/dashboard-view'
import SetupNotice from '@/components/setup-notice'
import { loadDashboardPageData } from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const result = await loadDashboardPageData()

  if (result.kind === 'not-configured') {
    return <SetupNotice title="Connect the analytics workspace" detail="Set up Supabase sign-in, add a confirmed administrator, and connect the PostHog Query API to load real reports. This page contains no sample metrics." />
  }

  if (result.kind === 'authorization-not-configured') {
    return <SetupNotice title="Admin access is not ready" detail="Apply the dashboard admins migration and confirm that its table is available to authenticated users." />
  }

  if (result.kind === 'unauthenticated') {
    redirect('/login')
  }

  if (result.kind === 'not-allowed') {
    return <SetupNotice mode="access" title="Team access is required" detail="This account is not on the dashboard team list. Ask an administrator to add a confirmed team account." />
  }

  if (result.kind === 'analytics-not-configured') {
    return <DashboardView state="analytics-not-configured" database={result.databaseReport.metrics} databaseState={result.databaseReport.state} />
  }

  if (result.kind === 'analytics-error') {
    return <DashboardView state="analytics-error" database={result.databaseReport.metrics} databaseState={result.databaseReport.state} />
  }

  return <DashboardView state="ready" metrics={result.metrics} database={result.databaseReport.metrics} databaseState={result.databaseReport.state} />
}
