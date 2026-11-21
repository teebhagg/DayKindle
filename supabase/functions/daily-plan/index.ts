import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const timeRangePattern = /^(0[1-9]|1[0-2]):[0-5]\d (AM|PM) – (0[1-9]|1[0-2]):[0-5]\d (AM|PM)$/;

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...corsHeaders, ...headers } });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validTemplates(value: unknown): value is Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) return false;
  return value.every((schedule) => {
    if (!isRecord(schedule)
      || typeof schedule.id !== 'string'
      || !/^[a-z0-9-]{1,80}$/.test(schedule.id)
      || (schedule.dayType !== 'weekday' && schedule.dayType !== 'weekend')
      || typeof schedule.title !== 'string'
      || schedule.title.trim().length === 0
      || schedule.title.length > 120
      || !Array.isArray(schedule.daysOfWeek)
      || schedule.daysOfWeek.length === 0
      || schedule.daysOfWeek.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
      || !Array.isArray(schedule.blocks)
      || schedule.blocks.length === 0
      || schedule.blocks.length > 32) return false;

    return schedule.blocks.every((block) => {
      if (!isRecord(block)
        || typeof block.id !== 'string'
        || !/^[a-z0-9-]{1,100}$/.test(block.id)
        || typeof block.time !== 'string'
        || !timeRangePattern.test(block.time)
        || typeof block.title !== 'string'
        || block.title.trim().length === 0
        || block.title.length > 160
        || typeof block.details !== 'string'
        || block.details.length === 0
        || block.details.length > 2000
        || block.details.split('\n').some((line) => !/^•\s+\S/.test(line))) return false;
      if (block.targetValue !== undefined && (typeof block.targetValue !== 'number' || !Number.isFinite(block.targetValue) || block.targetValue <= 0)) return false;
      if (block.targetUnit !== undefined && (typeof block.targetUnit !== 'string' || block.targetUnit.length > 40)) return false;
      return true;
    });
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'GET' && request.method !== 'PUT') {
    return jsonResponse({ error: 'Method not allowed.' }, 405, { Allow: 'GET, PUT, OPTIONS' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Daily plan service is not configured.' }, 503);
  }
  if (!request.headers.get('apikey')) {
    return jsonResponse({ error: 'A project API key is required.' }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  if (request.method === 'GET') {
    const { data, error } = await admin
      .from('daily_plan_catalog')
      .select('schema_version, revision, updated_at, templates')
      .eq('id', 'default')
      .single();
    if (error || !data) return jsonResponse({ error: 'Daily plan could not be loaded.' }, 503);
    return jsonResponse({ schemaVersion: data.schema_version, revision: data.revision, updatedAt: data.updated_at, templates: data.templates }, 200, {
      'Cache-Control': 'public, max-age=30, stale-while-revalidate=120',
      ETag: `"daily-plan-${data.revision}"`,
    });
  }

  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return jsonResponse({ error: 'A signed-in dashboard administrator is required.' }, 401);

  const caller = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authError } = await caller.auth.getUser(token);
  if (authError || !user) return jsonResponse({ error: 'The signed-in session could not be verified.' }, 401);

  const { data: adminMembership, error: membershipError } = await caller
    .from('dashboard_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (membershipError) return jsonResponse({ error: 'Administrator access could not be checked.' }, 503);
  if (!adminMembership) return jsonResponse({ error: 'Only dashboard administrators can update the daily plan.' }, 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Request body must be valid JSON.' }, 400);
  }
  if (!isRecord(body)
    || !Number.isSafeInteger(body.expectedRevision)
    || (body.expectedRevision as number) < 1
    || !validTemplates(body.templates)) {
    return jsonResponse({ error: 'Provide the current expectedRevision and valid time-block templates.' }, 400);
  }

  const expectedRevision = body.expectedRevision as number;
  const { data: updated, error: updateError } = await admin
    .from('daily_plan_catalog')
    .update({ revision: expectedRevision + 1, templates: body.templates, updated_at: new Date().toISOString() })
    .eq('id', 'default')
    .eq('revision', expectedRevision)
    .select('schema_version, revision, updated_at, templates')
    .maybeSingle();
  if (updateError) return jsonResponse({ error: 'Daily plan could not be saved.' }, 503);
  if (!updated) return jsonResponse({ error: 'The plan changed on the server. Load the latest version and try again.' }, 409);

  return jsonResponse({ schemaVersion: updated.schema_version, revision: updated.revision, updatedAt: updated.updated_at, templates: updated.templates });
});
