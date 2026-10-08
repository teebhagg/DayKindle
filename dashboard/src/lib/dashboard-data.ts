import 'server-only'

import { getDashboardAccess } from '@/lib/dashboard-auth'
import { createClient } from '@/lib/supabase/server'

export type DashboardMetrics = {
  engaged7d: number
  activitySignals7d: number
  exceptionSignals7d: number
  activation: { activated: number; onboarded: number }
  weekOneRetention: { returned: number; activated: number }
  followThrough: { users: number; engaged: number }
  reflectionAdoption: { users: number; engaged: number }
  dailyActive: Array<{ label: string; shortLabel: string; users: number }>
  activityEvents: Array<{ event: string; count: number; people: number }>
}

export type DashboardDatabaseMetrics = {
  confirmedUsers: number
  cloudSyncedUsers: number
  savedSnapshots: number
  activePlannerRecords: number
  lastCloudUpdate: string | null
}

type DatabaseReport = {
  metrics: DashboardDatabaseMetrics | null
  state: 'ready' | 'unavailable'
}

type ResultRow = unknown[]

function numberAt(row: ResultRow | undefined, index: number) {
  const value = row?.[index]
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function stringAt(row: ResultRow | undefined, index: number) {
  return typeof row?.[index] === 'string' ? row[index] : ''
}

async function queryPostHog(name: string, query: string): Promise<ResultRow[]> {
  const host = process.env.POSTHOG_API_HOST?.trim().replace(/\/$/, '')
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim()
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY?.trim()

  if (!host || !projectId || !apiKey) {
    throw new Error('PostHog Query API environment is not configured')
  }

  const response = await fetch(host + '/api/projects/' + encodeURIComponent(projectId) + '/query/', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: { kind: 'HogQLQuery', query },
      name: 'DayKindle dashboard · ' + name,
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('PostHog query failed')
  }

  const payload: unknown = await response.json()
  if (!payload || typeof payload !== 'object' || !('results' in payload)) {
    throw new Error('PostHog returned an invalid query result')
  }

  const results = (payload as { results?: unknown }).results
  if (!Array.isArray(results)) {
    throw new Error('PostHog returned an invalid query result')
  }

  return results.filter((row): row is ResultRow => Array.isArray(row))
}

async function loadDatabaseReport(): Promise<DatabaseReport> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('dashboard_database_metrics')
    if (error) throw error

    const row = Array.isArray(data) ? data[0] : data
    if (!row || typeof row !== 'object') throw new Error('Supabase returned no aggregate metrics')
    const values = row as Record<string, unknown>
    const count = (key: string) => {
      const value = Number(values[key])
      return Number.isFinite(value) ? value : 0
    }
    const lastCloudUpdate = typeof values.last_cloud_update === 'string'
      && Number.isFinite(Date.parse(values.last_cloud_update))
      ? values.last_cloud_update
      : null

    return {
      state: 'ready',
      metrics: {
        confirmedUsers: count('confirmed_users'),
        cloudSyncedUsers: count('cloud_synced_users'),
        savedSnapshots: count('saved_snapshots'),
        activePlannerRecords: count('active_planner_records'),
        lastCloudUpdate,
      },
    }
  } catch {
    return { state: 'unavailable', metrics: null }
  }
}

function dayKeys() {
  const keys: string[] = []
  const today = new Date()
  today.setUTCHours(12, 0, 0, 0)
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setUTCDate(date.getUTCDate() - offset)
    keys.push(date.toISOString().slice(0, 10))
  }
  return keys
}

function formatShortDay(day: string) {
  return new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
}

const summarySql = [
  'SELECT',
  "uniqExactIf(distinct_id, timestamp >= now() - INTERVAL 7 DAY AND ((event = 'planner_item_completion_toggled' AND properties.resulting_status = 'completed') OR event IN ('daily_check_in_saved', 'weekly_reflection_saved'))) AS engaged_7d,",
  "countIf(timestamp >= now() - INTERVAL 7 DAY AND event IN ('planner_item_saved', 'planner_item_completion_toggled', 'daily_check_in_saved', 'weekly_reflection_saved')) AS planner_signals_7d,",
  "countIf(timestamp >= now() - INTERVAL 7 DAY AND event = '$exception') AS exceptions_7d",
  'FROM events',
  "WHERE properties.app_environment = 'production'",
  "AND (properties.app_surface = 'mobile' OR properties.app_surface IS NULL)",
  'AND timestamp >= now() - INTERVAL 30 DAY',
].join('\n')

const trendSql = [
  'SELECT toDate(timestamp) AS day, uniqExact(distinct_id) AS users',
  'FROM events',
  "WHERE properties.app_environment = 'production'",
  "AND (properties.app_surface = 'mobile' OR properties.app_surface IS NULL)",
  'AND timestamp >= now() - INTERVAL 14 DAY',
  "AND ((event = 'planner_item_completion_toggled' AND properties.resulting_status = 'completed') OR event IN ('daily_check_in_saved', 'weekly_reflection_saved'))",
  'GROUP BY day',
  'ORDER BY day ASC',
].join('\n')

const activitySql = [
  'SELECT event, count() AS event_count, uniqExact(distinct_id) AS people',
  'FROM events',
  "WHERE properties.app_environment = 'production'",
  "AND (properties.app_surface = 'mobile' OR properties.app_surface IS NULL)",
  'AND timestamp >= now() - INTERVAL 7 DAY',
  "AND event IN ('planner_item_saved', 'planner_item_completion_toggled', 'daily_check_in_saved', 'weekly_reflection_saved')",
  'GROUP BY event',
  'ORDER BY event_count DESC',
].join('\n')

const cohortSql = [
  'WITH user_signals AS (',
  '  SELECT',
  '    distinct_id,',
  "    minIf(timestamp, event = 'onboarding_completed') AS onboarding_at,",
  "    minIf(timestamp, event = 'planner_item_saved' AND properties.action = 'created') AS first_created_at,",
  "    groupArrayIf(timestamp, (event = 'planner_item_completion_toggled' AND properties.resulting_status = 'completed') OR event IN ('daily_check_in_saved', 'weekly_reflection_saved')) AS engaged_at",
  '  FROM events',
  "  WHERE properties.app_environment = 'production'",
  "  AND (properties.app_surface = 'mobile' OR properties.app_surface IS NULL)",
  '  AND timestamp >= now() - INTERVAL 111 DAY',
  '  GROUP BY distinct_id',
  ')',
  'SELECT',
  '  countIf(onboarding_at >= now() - INTERVAL 97 DAY AND onboarding_at <= now() - INTERVAL 7 DAY) AS mature_onboarded,',
  '  countIf(onboarding_at >= now() - INTERVAL 97 DAY AND onboarding_at <= now() - INTERVAL 7 DAY AND first_created_at >= onboarding_at AND first_created_at <= onboarding_at + INTERVAL 7 DAY) AS activated,',
  '  countIf(onboarding_at <= now() - INTERVAL 14 DAY AND first_created_at >= onboarding_at AND first_created_at <= onboarding_at + INTERVAL 7 DAY) AS mature_activated,',
  '  countIf(onboarding_at <= now() - INTERVAL 14 DAY AND first_created_at >= onboarding_at AND first_created_at <= onboarding_at + INTERVAL 7 DAY AND arrayExists(t -> t >= onboarding_at + INTERVAL 7 DAY AND t < onboarding_at + INTERVAL 14 DAY, engaged_at)) AS week_one_returned',
  'FROM user_signals',
  'WHERE onboarding_at >= now() - INTERVAL 111 DAY',
  'AND onboarding_at <= now() - INTERVAL 7 DAY',
].join('\n')

const engagementSql = [
  'SELECT',
  '  countIf(engaged > 0) AS engaged_users,',
  '  countIf(engaged > 0 AND completed_days >= 3) AS follow_through_users,',
  '  countIf(engaged > 0 AND reflections > 0) AS reflection_users',
  'FROM (',
  '  SELECT',
  '    distinct_id,',
  "    countIf((event = 'planner_item_completion_toggled' AND properties.resulting_status = 'completed') OR event IN ('daily_check_in_saved', 'weekly_reflection_saved')) AS engaged,",
  "    countDistinctIf(toDate(timestamp), event = 'planner_item_completion_toggled' AND properties.resulting_status = 'completed') AS completed_days,",
  "    countIf(event = 'weekly_reflection_saved') AS reflections",
  '  FROM events',
  "  WHERE properties.app_environment = 'production'",
  "  AND (properties.app_surface = 'mobile' OR properties.app_surface IS NULL)",
  '  AND timestamp >= now() - INTERVAL 7 DAY',
  "  AND event IN ('planner_item_completion_toggled', 'daily_check_in_saved', 'weekly_reflection_saved')",
  '  GROUP BY distinct_id',
  ')',
].join('\n')

export async function loadDashboardPageData() {
  const access = await getDashboardAccess()
  if (access.kind !== 'ready') return access

  const databaseReportPromise = loadDatabaseReport()

  if (
    !process.env.POSTHOG_API_HOST ||
    !process.env.POSTHOG_PROJECT_ID ||
    !process.env.POSTHOG_PERSONAL_API_KEY
  ) {
    return { kind: 'analytics-not-configured' as const, databaseReport: await databaseReportPromise }
  }

  try {
    const [summaryRows, trendRows, activityRows, cohortRows, engagementRows, databaseReport] = await Promise.all([
      queryPostHog('summary', summarySql),
      queryPostHog('engaged users by day', trendSql),
      queryPostHog('activity mix', activitySql),
      queryPostHog('mature cohorts', cohortSql),
      queryPostHog('weekly engagement metrics', engagementSql),
      databaseReportPromise,
    ])

    const summary = summaryRows[0]
    const cohort = cohortRows[0]
    const engagement = engagementRows[0]
    const usersByDay = new Map<string, number>()

    for (const row of trendRows) {
      const day = stringAt(row, 0).slice(0, 10)
      if (day) usersByDay.set(day, numberAt(row, 1))
    }

    const dailyActive = dayKeys().map((day) => ({
      label: day,
      shortLabel: formatShortDay(day),
      users: usersByDay.get(day) ?? 0,
    }))

    const activityEvents = activityRows.map((row) => ({
      event: stringAt(row, 0),
      count: numberAt(row, 1),
      people: numberAt(row, 2),
    }))

    return {
      kind: 'ready' as const,
      databaseReport,
      metrics: {
        engaged7d: numberAt(summary, 0),
        activitySignals7d: numberAt(summary, 1),
        exceptionSignals7d: numberAt(summary, 2),
        activation: { onboarded: numberAt(cohort, 0), activated: numberAt(cohort, 1) },
        weekOneRetention: { activated: numberAt(cohort, 2), returned: numberAt(cohort, 3) },
        followThrough: { engaged: numberAt(engagement, 0), users: numberAt(engagement, 1) },
        reflectionAdoption: { engaged: numberAt(engagement, 0), users: numberAt(engagement, 2) },
        dailyActive,
        activityEvents,
      } satisfies DashboardMetrics,
    }
  } catch {
    return { kind: 'analytics-error' as const, databaseReport: await databaseReportPromise }
  }
}
