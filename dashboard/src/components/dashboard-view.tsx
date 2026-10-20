import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Cloud,
  Database,
  Files,
  RefreshCw,
  Sparkles,
  UsersRound,
  KeyRound,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { signOut } from '@/app/actions'
import type { DashboardDatabaseMetrics, DashboardMetrics } from '@/lib/dashboard-data'
import { ActivityChart, EngagementChart } from '@/components/dashboard-charts'
import DashboardNavigation from '@/components/dashboard-navigation'

type Props = {
  state: 'ready' | 'analytics-not-configured' | 'analytics-error'
  metrics?: DashboardMetrics
  database: DashboardDatabaseMetrics | null
  databaseState: 'ready' | 'unavailable'
}

function numberText(value: number) {
  return value.toLocaleString('en-US')
}

function percentage(numerator: number, denominator: number) {
  if (denominator === 0) return '—'
  return Math.round((numerator / denominator) * 100) + '%'
}

function lastUpdateText(value: string | null) {
  if (!value) return { value: 'No sync', note: 'No cloud update recorded yet' }
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return { value: '—', note: 'Update time unavailable' }
  return {
    value: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date),
    note: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date),
  }
}

function MetricCard({
  title,
  value,
  note,
  icon: Icon,
  className = '',
}: {
  title: string
  value: string
  note: string
  icon: typeof UsersRound
  className?: string
}) {
  return (
    <Card className={'metric-card ' + className}>
      <div className="metric-card-inner">
        <div className="metric-title">
          <span>{title}</span>
          <span className="metric-icon"><Icon size={15} aria-hidden="true" /></span>
        </div>
        <div className="metric-value">{value}</div>
        <div className="metric-note">{note}</div>
      </div>
    </Card>
  )
}

export default function DashboardView({ state, metrics, database, databaseState }: Props) {
  const latestCloudUpdate = database ? lastUpdateText(database.lastCloudUpdate) : null

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Image src="/daykindle-logo.png" alt="" width={36} height={36} />
          <span><strong>DayKindle</strong><small>Team analytics</small></span>
        </div>
        <p className="sidebar-label">Workspace</p>
        <DashboardNavigation />
        <p className="sidebar-foot">Production events only.<br />No personal plan or reflection content is shown.</p>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-label">DAYKINDLE</span>
            <span className="topbar-date">Team workspace</span>
          </div>
          <div className="topbar-right">
            <Badge variant="secondary"><span className="status-dot" /> Production</Badge>
            <form className="refresh-form" action="/" method="get">
              <Button className="refresh-button" variant="outline" size="sm" type="submit" aria-label="Refresh report">
                <RefreshCw size={14} aria-hidden="true" /><span>Refresh</span>
              </Button>
            </form>
            <Link className="account-settings-link" href="/settings" aria-label="Account settings"><KeyRound size={14} aria-hidden="true" /><span>Password</span></Link>
            <form action={signOut}>
              <Button className="logout-button" variant="outline" size="sm" type="submit">Sign out</Button>
            </form>
          </div>
        </header>

        <main className="dashboard-main">
          <div className="dashboard-title-row" id="overview">
            <div>
              <p className="page-kicker"><span className="eyebrow-dot" /> Team analytics</p>
              <h1 className="dashboard-title">Product activity</h1>
              <p className="dashboard-subtitle">User counts and recorded product activity from production.</p>
            </div>
            <span className="range-label"><CalendarDays size={14} aria-hidden="true" /> Rolling 7 days</span>
          </div>

          {state !== 'ready' && (
            <section className="report-state squircle-surface" role={state === 'analytics-error' ? 'alert' : 'status'} aria-labelledby="report-state-title">
              <div className="report-state-mark"><Activity size={18} aria-hidden="true" /></div>
              <div className="report-state-copy">
                <span className="report-state-kicker">{state === 'analytics-error' ? 'REPORT UNAVAILABLE' : 'SETUP REQUIRED'}</span>
                <h2 id="report-state-title">{state === 'analytics-error' ? 'PostHog could not load these metrics.' : 'Add the PostHog query settings.'}</h2>
                <p>{state === 'analytics-error'
                  ? 'Check the private API host, project ID, key access, and event names. The dashboard hides partial results so the rates stay consistent.'
                  : 'Set the private API host, project ID, and personal API key in the dashboard environment. Only live results appear here.'}</p>
                {state === 'analytics-not-configured' && (
                  <div className="report-setup-list" aria-label="Dashboard PostHog settings">
                    <div><span>API host</span><code>POSTHOG_API_HOST</code></div>
                    <div><span>Project ID</span><code>POSTHOG_PROJECT_ID</code></div>
                    <div><span>Query key</span><code>POSTHOG_PERSONAL_API_KEY</code></div>
                  </div>
                )}
              </div>
              <span className="report-state-label">{state === 'analytics-error' ? 'Check connection' : 'No demo numbers'}</span>
            </section>
          )}

          <>
              <section className={metrics ? 'stats-grid' : 'stats-grid stats-grid-sparse'} aria-label="Account and usage metrics">
                {metrics && <MetricCard className="metric-card-featured" title="Engaged IDs" value={numberText(metrics.engaged7d)} note="IDs with a completion, check-in, or reflection · 7 days" icon={Activity} />}
                <MetricCard title="Confirmed users" value={database ? numberText(database.confirmedUsers) : '—'} note={database ? 'Confirmed Auth accounts · Supabase' : 'Supabase aggregate unavailable'} icon={UsersRound} />
                {metrics && <MetricCard title="Planner activity" value={numberText(metrics.activitySignals7d)} note="Planner, check-in, and reflection events · 7 days" icon={ClipboardList} />}
                {metrics && <MetricCard title="Exception events" value={numberText(metrics.exceptionSignals7d)} note="PostHog `$exception` events · 7 days" icon={AlertTriangle} />}
              </section>

              <section className="database-section" aria-labelledby="database-title">
                <div className="database-heading">
                  <div>
                    <h2 id="database-title">Cloud database</h2>
                    <p>Aggregate counts only. No plan, reflection, or check-in content is shown.</p>
                  </div>
                  <Badge variant="secondary"><Database size={13} aria-hidden="true" /> Supabase</Badge>
                </div>
                {database && (
                  <div className="database-grid">
                    <MetricCard title="Cloud-backed users" value={numberText(database.cloudSyncedUsers)} note="Accounts with saved cloud data" icon={Cloud} />
                    <MetricCard title="Saved snapshots" value={numberText(database.savedSnapshots)} note="Planner backups stored in Supabase" icon={Files} />
                    <MetricCard title="Active synced records" value={numberText(database.activePlannerRecords)} note="Current records across planner collections" icon={ClipboardList} />
                    <MetricCard title="Latest cloud update" value={latestCloudUpdate?.value ?? '—'} note={latestCloudUpdate?.note ?? 'Update time unavailable'} icon={Clock3} />
                  </div>
                )}
                {!database && (
                  <div className="database-unavailable squircle-surface" role="status">
                    <span className="report-state-kicker">DATABASE REPORT UNAVAILABLE</span>
                    <p>{databaseState === 'unavailable' ? 'The aggregate report could not load. Confirm the migration and Supabase connection.' : 'The database report is not ready.'}</p>
                  </div>
                )}
              </section>

              {metrics && <section className="dashboard-grid" aria-label="Activity overview">
                <Card className="panel-card">
                  <div className="panel-inner">
                    <div className="panel-heading">
                      <div>
                        <h2>Daily engagement</h2>
                        <p>Unique IDs with a completed action, check-in, or reflection · 14 days</p>
                      </div>
                      <Badge variant="outline">Daily</Badge>
                    </div>
                    <EngagementChart data={metrics.dailyActive} />
                  </div>
                </Card>

                <Card className="panel-card" id="activity">
                  <div className="panel-inner">
                    <div className="panel-heading">
                      <div>
                        <h2>Activity mix</h2>
                        <p>Planner, check-in, and reflection events · 7 days</p>
                      </div>
                      <Badge variant="outline">By event</Badge>
                    </div>
                    <ActivityChart data={metrics.activityEvents} />
                  </div>
                </Card>
              </section>}

              {metrics && <section className="cohort-section" id="cohorts">
                <div className="cohort-heading">
                  <div>
                    <h2>Activation and follow-through</h2>
                    <p>The counts behind each rate are shown beside it.</p>
                  </div>
                  <Badge variant="secondary"><CheckCircle2 size={13} /> Mature cohorts</Badge>
                </div>
                <div className="cohort-grid">
                  <MetricCard className="cohort-card" title="Activation" value={percentage(metrics.activation.activated, metrics.activation.onboarded)} note={numberText(metrics.activation.activated) + ' of ' + numberText(metrics.activation.onboarded) + ' mature onboardings'} icon={ArrowUpRight} />
                  <MetricCard className="cohort-card" title="Week-one return" value={percentage(metrics.weekOneRetention.returned, metrics.weekOneRetention.activated)} note={numberText(metrics.weekOneRetention.returned) + ' of ' + numberText(metrics.weekOneRetention.activated) + ' activated users'} icon={ArrowDownRight} />
                  <MetricCard className="cohort-card" title="Follow-through" value={percentage(metrics.followThrough.users, metrics.followThrough.engaged)} note={numberText(metrics.followThrough.users) + ' of ' + numberText(metrics.followThrough.engaged) + ' engaged users · 3+ days'} icon={Sparkles} />
                  <MetricCard className="cohort-card" title="Reflection adoption" value={percentage(metrics.reflectionAdoption.users, metrics.reflectionAdoption.engaged)} note={numberText(metrics.reflectionAdoption.users) + ' of ' + numberText(metrics.reflectionAdoption.engaged) + ' engaged users'} icon={CalendarDays} />
                </div>
                <div className="provisional-note">
                  <AlertTriangle size={14} aria-hidden="true" />
                  <span>A completion tap can be counted before its local save finishes. Exception totals come from PostHog and do not include native crashes.</span>
                </div>
              </section>}
          </>
        </main>
      </div>
    </div>
  )
}
