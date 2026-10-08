"use client"

import {
  createContext,
  useContext,
  type ComponentProps,
  type CSSProperties,
  type ReactElement,
} from "react"
import { ResponsiveContainer, Tooltip, type TooltipContentProps } from "recharts"

export type ChartConfig = Record<string, { label: string; color: string }>

const ChartContext = createContext<ChartConfig>({})

type ChartContainerProps = Omit<ComponentProps<"div">, "children"> & {
  config: ChartConfig
  children: ReactElement
}

export function ChartContainer({
  config,
  children,
  className,
  style,
  ...props
}: ChartContainerProps) {
  const colors = Object.fromEntries(
    Object.entries(config).map(([key, value]) => [`--color-${key}`, value.color]),
  ) as CSSProperties

  return (
    <ChartContext.Provider value={config}>
      <div
        data-slot="chart"
        className={["chart-container", className].filter(Boolean).join(" ")}
        style={{ ...colors, ...style }}
        {...props}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

export { Tooltip as ChartTooltip }

type ChartTooltipContentProps = {
  active?: TooltipContentProps<number, string>["active"]
  payload?: TooltipContentProps<number, string>["payload"]
  label?: TooltipContentProps<number, string>["label"]
  labelKey?: string
  secondaryKey?: string
}

function displayValue(value: unknown) {
  if (typeof value === "number") return value.toLocaleString("en-US")
  if (typeof value === "string") return value
  return "—"
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  labelKey,
  secondaryKey,
}: ChartTooltipContentProps) {
  const config = useContext(ChartContext)
  const item = payload?.[0]

  if (!active || !item) return null

  const point = item.payload as Record<string, unknown> | undefined
  const pointLabel = labelKey ? point?.[labelKey] : label
  const key = typeof item.dataKey === "string" ? item.dataKey : ""
  const valueLabel = config[key]?.label ?? item.name ?? "Value"
  const pointColor = item.color ?? config[key]?.color ?? "#356348"
  const secondaryLabel = secondaryKey ? config[secondaryKey]?.label : undefined

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-heading">{displayValue(pointLabel)}</p>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-marker" style={{ backgroundColor: pointColor }} />
        <span>{valueLabel}</span>
        <strong>{displayValue(item.value)}</strong>
      </div>
      {secondaryKey && secondaryLabel && point && (
        <div className="chart-tooltip-row chart-tooltip-secondary">
          <span className="chart-tooltip-marker chart-tooltip-marker-muted" />
          <span>{secondaryLabel}</span>
          <strong>{displayValue(point[secondaryKey])}</strong>
        </div>
      )}
    </div>
  )
}
