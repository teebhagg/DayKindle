-- Shared, non-personal daily plan content is read and updated only through the daily-plan Edge Function.
create table if not exists public.daily_plan_catalog (
  id text primary key check (id = 'default'),
  schema_version integer not null default 1 check (schema_version = 1),
  revision bigint not null default 1 check (revision > 0),
  templates jsonb not null check (jsonb_typeof(templates) = 'array'),
  updated_at timestamptz not null default now()
);

alter table public.daily_plan_catalog enable row level security;
revoke all on table public.daily_plan_catalog from public, anon, authenticated;
grant select, update on table public.daily_plan_catalog to service_role;

insert into public.daily_plan_catalog (id, schema_version, revision, templates)
values (
  'default',
  1,
  1,
  $$[
    {
      "id": "daily-plan",
      "dayType": "weekday",
      "daysOfWeek": [0, 1, 2, 3, 4, 5, 6],
      "title": "Daily Plan",
      "blocks": [
        { "id": "morning-anchor", "time": "06:30 AM – 07:15 AM", "title": "Morning Anchor (Spiritual & Health)", "details": "• Devotional time: Bible reading, prayer, and quiet reflection.\n• Morning hygiene & 500ml water before anything else." },
        { "id": "exercise-breakfast", "time": "07:15 AM – 07:45 AM", "title": "Simple Exercise & Breakfast", "details": "• 15–20 min rotation: Bodyweight circuit (push-ups, squats, plank) or a brisk walk.\n• Breakfast: Whole foods (e.g., eggs, fruit, oats/grain). Wash produce thoroughly and cook at home." },
        { "id": "deep-work-one", "time": "08:30 AM – 12:30 PM", "title": "Deep Work Block 1", "details": "• 2x 90-minute focused work blocks (Pomodoro style: 90 min work, 15 min rest).\n• Tackle high-priority tasks first. Zero notifications during blocks." },
        { "id": "lunch-recharge", "time": "12:30 PM – 01:30 PM", "title": "Lunch & Recharge", "details": "• Home-prepared, clean meal.\n• 20-minute step away from screens (short walk or total disconnect)." },
        { "id": "deep-work-two", "time": "01:30 PM – 05:30 PM", "title": "Deep Work Block 2 & Admin", "details": "• Execute remaining tasks, communication, and review.\n• Final 30 mins: Wrap up and plan tasks for the next day." },
        { "id": "loved-ones", "time": "05:30 PM – 07:30 PM", "title": "Loved Ones & Connection", "details": "• Dedicated family/partner/friend time (dinner together, quality conversation)." },
        { "id": "free-time", "time": "07:30 PM – 09:30 PM", "title": "Personal Free Time & Leisure", "details": "• Open block: Play video games, watch a movie, engage in hobbies, or read." },
        { "id": "evening-wind-down", "time": "09:30 PM – 10:00 PM", "title": "Evening Wind-down", "details": "• Gratitude/short prayer, prep workspace for tomorrow, phone away by 10:00 PM." }
      ]
    }
  ]$$::jsonb
)
on conflict (id) do nothing;
