"use client"

import { useId } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { DashboardMetrics } from "@/lib/dashboard-data"

const engagementConfig = {
  users: { label: "Engaged users", color: "#356348" },
} satisfies ChartConfig

const activityConfig = {
  count: { label: "Events", color: "#64896b" },
  people: { label: "People", color: "#a8b5a8" },
} satisfies ChartConfig

const eventLabels: Record<string, string> = {
  planner_item_saved: "Planner items saved",
  planner_item_completion_toggled: "Completion changes",
  daily_check_in_saved: "Daily check-ins",
  weekly_reflection_saved: "Weekly reflections",
}

function formatCount(value: number) {
  return value.toLocaleString("en-US")
}

export function EngagementChart({
  data,
}: {
  data: DashboardMetrics["dailyActive"]
}) {
  const gradientId = `engagement-fill-${useId().replace(/:/g, "")}`

  if (data.every((item) => item.users === 0)) {
    return (
      <div className="chart-empty squircle-surface" role="status">
        No engaged activity captured in this period.
      </div>
    )
  }

  const chartData = data.map((item) => ({
    ...item,
    dateLabel: new Date(`${item.label}T12:00:00Z`).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
  }))

  return (
    <>
    <ChartContainer
      config={engagementConfig}
      className="engagement-chart"
      role="group"
      aria-label="Unique engaged users by day over the last two weeks"
    >
      <AreaChart accessibilityLayer data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-users)" stopOpacity={0.24} />
            <stop offset="100%" stopColor="var(--color-users)" stopOpacity={0.015} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#e7ece6" />
        <XAxis
          dataKey="shortLabel"
          interval={1}
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          tick={{ fill: "#66766b", fontSize: 11 }}
        />
        <YAxis
          allowDecimals={false}
          width={30}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fill: "#66766b", fontSize: 11 }}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent labelKey="dateLabel" />}
        />
        <Area
          type="monotone"
          dataKey="users"
          stroke="var(--color-users)"
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          activeDot={{ r: 4, fill: "#fff", stroke: "var(--color-users)", strokeWidth: 2 }}
        />
      </AreaChart>
    </ChartContainer>
    <table className="sr-only">
      <caption>Engaged users by day over the last 14 days</caption>
      <thead>
        <tr><th scope="col">Date</th><th scope="col">Unique engaged users</th></tr>
      </thead>
      <tbody>
        {chartData.map((item) => (
          <tr key={item.label}>
            <th scope="row"><time dateTime={item.label}>{item.dateLabel}</time></th>
            <td>{formatCount(item.users)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </>
  )
}

export function ActivityChart({
  data,
}: {
  data: DashboardMetrics["activityEvents"]
}) {
  if (data.length === 0) {
    return (
      <div className="chart-empty activity-chart-empty squircle-surface" role="status">
        No planner events were captured in this period.
      </div>
    )
  }

  const chartData = data.map((item) => ({
    ...item,
    eventLabel: eventLabels[item.event] ?? item.event,
  }))

  return (
    <>
      <ChartContainer
        config={activityConfig}
        className="activity-chart"
        role="group"
        aria-label="Planner activity event counts for the last seven days"
      >
        <BarChart
          accessibilityLayer
          layout="vertical"
          data={chartData}
          margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid horizontal={false} stroke="#e7ece6" />
          <XAxis
            type="number"
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fill: "#66766b", fontSize: 10 }}
          />
          <YAxis
            type="category"
            dataKey="eventLabel"
            width={126}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fill: "#536258", fontSize: 10 }}
          />
          <ChartTooltip
            cursor={{ fill: "#f3f6f2" }}
            content={
              <ChartTooltipContent
                labelKey="eventLabel"
                secondaryKey="people"
              />
            }
          />
          <Bar
            dataKey="count"
            fill="var(--color-count)"
            radius={[0, 5, 5, 0]}
            barSize={16}
          />
        </BarChart>
      </ChartContainer>
      <table className="event-list" aria-label="Activity event counts and unique people">
        <thead>
          <tr className="event-row">
            <th className="event-col-label" scope="col">Event</th>
            <th className="event-col-label" scope="col">Count</th>
            <th className="event-col-label" scope="col">People</th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((item) => (
            <tr className="event-row" key={item.event}>
              <th className="event-name" scope="row">{item.eventLabel}</th>
              <td className="event-total">{formatCount(item.count)}</td>
              <td className="event-people">{formatCount(item.people)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
