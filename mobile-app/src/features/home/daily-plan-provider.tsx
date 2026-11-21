import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { scheduleTemplates as bundledTemplates, type ScheduleTemplate } from '../templates/catalog';
import type { DaySchedule } from './day-schedules';

const DAILY_PLAN_CACHE_KEY = 'daykindle.daily-plan-cache.v1';
const DAILY_PLAN_SCHEMA_VERSION = 1;
const DAILY_PLAN_DESCRIPTION = 'A complete daily outline with fixed time blocks and clear action prompts.';
const TIME_RANGE_PATTERN = /^(0[1-9]|1[0-2]):[0-5]\d (AM|PM) – (0[1-9]|1[0-2]):[0-5]\d (AM|PM)$/;

type DailyPlanResponse = {
  schemaVersion: number;
  revision: number;
  updatedAt: string;
  templates: DaySchedule[];
};

const DailyPlanContext = createContext<ScheduleTemplate[]>(bundledTemplates);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDaySchedule(value: unknown): value is DaySchedule {
  if (!isRecord(value)
    || typeof value.id !== 'string'
    || !/^[a-z0-9-]{1,80}$/.test(value.id)
    || (value.dayType !== 'weekday' && value.dayType !== 'weekend')
    || typeof value.title !== 'string'
    || value.title.trim().length === 0
    || value.title.length > 120
    || !Array.isArray(value.daysOfWeek)
    || value.daysOfWeek.length === 0
    || value.daysOfWeek.some((day) => !Number.isInteger(day) || (day as number) < 0 || (day as number) > 6)
    || !Array.isArray(value.blocks)
    || value.blocks.length === 0
    || value.blocks.length > 32) return false;

  return value.blocks.every((block) => {
    if (!isRecord(block)
      || typeof block.id !== 'string'
      || !/^[a-z0-9-]{1,100}$/.test(block.id)
      || typeof block.time !== 'string'
      || !TIME_RANGE_PATTERN.test(block.time)
      || typeof block.title !== 'string'
      || block.title.trim().length === 0
      || block.title.length > 160
      || typeof block.details !== 'string'
      || block.details.length > 2000
      || block.details.split('\n').some((line) => !/^•\s+\S/.test(line))) return false;
    if (block.targetValue !== undefined && (typeof block.targetValue !== 'number' || !Number.isFinite(block.targetValue) || block.targetValue <= 0)) return false;
    if (block.targetUnit !== undefined && (typeof block.targetUnit !== 'string' || block.targetUnit.length > 40)) return false;
    return true;
  });
}

function isDailyPlanResponse(value: unknown): value is DailyPlanResponse {
  return isRecord(value)
    && value.schemaVersion === DAILY_PLAN_SCHEMA_VERSION
    && Number.isInteger(value.revision)
    && (value.revision as number) >= 0
    && typeof value.updatedAt === 'string'
    && Number.isFinite(Date.parse(value.updatedAt))
    && Array.isArray(value.templates)
    && value.templates.length > 0
    && value.templates.length <= 20
    && value.templates.every(isDaySchedule);
}

function toScheduleTemplates(templates: DaySchedule[]): ScheduleTemplate[] {
  return templates.map((template) => ({
    ...template,
    audience: 'General',
    description: DAILY_PLAN_DESCRIPTION,
    blocks: template.blocks.map((block) => ({ ...block })),
    daysOfWeek: [...(template.daysOfWeek ?? [])],
  }));
}

export function DailyPlanProvider({ children }: { children: ReactNode }) {
  const [response, setResponse] = useState<DailyPlanResponse | null>(null);
  const templates = useMemo(() => response ? toScheduleTemplates(response.templates) : bundledTemplates, [response]);

  useEffect(() => {
    let active = true;

    const loadPlan = async () => {
      try {
        const cached = await AsyncStorage.getItem(DAILY_PLAN_CACHE_KEY);
        if (cached) {
          const parsed: unknown = JSON.parse(cached);
          if (isDailyPlanResponse(parsed) && active) setResponse(parsed);
        }
      } catch {
        // Keep the bundled default when the device cache is unavailable or unreadable.
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '');
      const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
      if (!active || !supabaseUrl || !publishableKey) return;

      try {
        const result = await fetch(`${supabaseUrl}/functions/v1/daily-plan`, {
          method: 'GET',
          headers: { apikey: publishableKey },
        });
        if (!result.ok) return;
        const payload: unknown = await result.json();
        if (!isDailyPlanResponse(payload)) return;
        try {
          await AsyncStorage.setItem(DAILY_PLAN_CACHE_KEY, JSON.stringify(payload));
        } catch {
          // A cache write failure should not hide a valid response from the active session.
        }
        if (active) setResponse(payload);
      } catch {
        // Cached and bundled templates remain available while offline.
      }
    };

    void loadPlan();
    return () => { active = false; };
  }, []);

  return <DailyPlanContext.Provider value={templates}>{children}</DailyPlanContext.Provider>;
}

export function useDailyPlanTemplates() {
  return useContext(DailyPlanContext);
}
