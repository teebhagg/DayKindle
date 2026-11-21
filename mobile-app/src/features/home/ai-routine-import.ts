import type { DayType } from './day-schedules';

export const AI_ROUTINE_PROMPT = `Create a realistic full-day routine for me based on this context: [Add your wake and sleep times, work or study hours, fixed commitments, priorities, preferred breaks, and any constraints.]

Keep it practical, flexible, and leave some open time. Use 4 to 10 blocks across the day. Return only valid JSON, with no markdown or extra commentary, in exactly this shape:
{
  "title": "My weekday routine",
  "dayType": "weekday",
  "daysOfWeek": [1, 2, 3, 4, 5],
  "blocks": [
    {
      "time": "7:00 AM - 7:30 AM",
      "title": "Wake up and get ready",
      "details": "A short, realistic description of this block."
    }
  ]
}

Use "weekday" or "weekend" for dayType. daysOfWeek must be numbers from 0 to 6, where Sunday is 0 and Saturday is 6. Each block must include time, title, and details. You may add targetValue and targetUnit when a measurable target makes sense. Do not add markdown fences, comments, or trailing commas.`;

export type ImportedRoutineBlock = {
  time: string;
  title: string;
  details: string;
  targetValue?: number;
  targetUnit?: string;
};

export type ImportedRoutine = {
  title: string;
  dayType: DayType;
  daysOfWeek: number[];
  blocks: ImportedRoutineBlock[];
};

export type RoutineParseResult =
  | { ok: true; routine: ImportedRoutine }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asOptionalText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced?.[1] ?? text).trim();
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === '{') {
      if (depth === 0) start = index;
      depth += 1;
    } else if (character === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) return body.slice(start, index + 1);
    }
  }

  return body;
}

export function parseAiRoutineResponse(text: string): RoutineParseResult {
  if (!text.trim()) return { ok: false, message: 'Paste the JSON response from your AI assistant first.' };
  if (text.length > 24_000) return { ok: false, message: 'That response is too long. Ask for a shorter routine with 4 to 10 blocks.' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch {
    return { ok: false, message: 'Could not read that response. Ask your AI assistant for only the JSON format shown above, then paste it again.' };
  }
  if (!isRecord(parsed)) return { ok: false, message: 'The response must be a JSON object with a title, repeat days, and blocks.' };

  const title = asOptionalText(parsed.title);
  if (!title) return { ok: false, message: 'The JSON needs a routine title.' };

  const requestedDayType = parsed.dayType;
  if (requestedDayType !== undefined && requestedDayType !== 'weekday' && requestedDayType !== 'weekend') {
    return { ok: false, message: 'Set dayType to "weekday" or "weekend".' };
  }

  let daysOfWeek: number[];
  if (parsed.daysOfWeek === undefined) {
    daysOfWeek = requestedDayType === 'weekend' ? [0, 6] : [1, 2, 3, 4, 5];
  } else if (
    Array.isArray(parsed.daysOfWeek)
    && parsed.daysOfWeek.length > 0
    && parsed.daysOfWeek.every((day) => Number.isInteger(day) && Number(day) >= 0 && Number(day) <= 6)
  ) {
    daysOfWeek = [...new Set(parsed.daysOfWeek as number[])].sort((a, b) => a - b);
  } else {
    return { ok: false, message: 'daysOfWeek must contain at least one day number from 0 to 6.' };
  }

  const inferredDayType: DayType = daysOfWeek.every((day) => day === 0 || day === 6) ? 'weekend' : 'weekday';
  const dayType: DayType = parsed.daysOfWeek === undefined
    ? requestedDayType === 'weekend' ? 'weekend' : 'weekday'
    : inferredDayType;

  if (!Array.isArray(parsed.blocks) || parsed.blocks.length === 0 || parsed.blocks.length > 16) {
    return { ok: false, message: 'Include between 1 and 16 routine blocks in the JSON.' };
  }

  const blocks: ImportedRoutineBlock[] = [];
  for (const [index, item] of parsed.blocks.entries()) {
    if (!isRecord(item)) return { ok: false, message: `Block ${index + 1} must be a JSON object.` };
    const blockTitle = asOptionalText(item.title);
    if (!blockTitle) return { ok: false, message: `Give block ${index + 1} a title.` };

    const targetValue = item.targetValue == null || item.targetValue === '' ? undefined : Number(item.targetValue);
    const targetUnit = asOptionalText(item.targetUnit) || undefined;
    if (targetValue !== undefined && (!Number.isFinite(targetValue) || targetValue <= 0)) {
      return { ok: false, message: `Block ${index + 1} needs a target greater than zero, or no target.` };
    }
    if (targetValue !== undefined && !targetUnit) {
      return { ok: false, message: `Add a targetUnit to block ${index + 1}, or remove its targetValue.` };
    }

    blocks.push({
      time: asOptionalText(item.time) || 'Flexible time',
      title: blockTitle,
      details: asOptionalText(item.details),
      targetValue,
      targetUnit,
    });
  }

  return { ok: true, routine: { title, dayType, daysOfWeek, blocks } };
}
