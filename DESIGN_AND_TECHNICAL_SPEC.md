# Product Design and Technical Design Document

## 1. Design Vision

The application should feel like:

> A premium personal journal, intelligent planner, and responsive native application combined.

The aesthetic should emphasize:

- craftsmanship
- warmth
- calm
- tactile interaction
- expressive but restrained animation
- personal identity
- strong typography
- organic visuals

The interface should not resemble:

- enterprise software
- corporate dashboards
- generic Material applications
- highly gamified mobile games
- dense SaaS interfaces

---

# 2. Design Principles

## 2.1 Calm by Default

Most surfaces should remain visually quiet.

Motion should appear when:

- something changes
- something completes
- the user performs a gesture
- progress is revealed
- an achievement deserves celebration

## 2.2 Premium Through Restraint

Premium does not mean:

- excessive gradients
- constant animation
- dozens of cards
- glass everywhere

Premium means:

- excellent typography
- precise spacing
- responsive interaction
- beautiful motion
- consistent visual hierarchy
- high-quality micro-interactions

---

# 3. Typography

Use two coordinated typography roles that adapt to the selected visual style.

## 3.1 Primary UI Typeface

Expressive display typeface:

```text
Delicious Handrawn
```

Use for expressive headings, greetings, section labels, achievement titles, and short decorative copy. Keep long-form and accessibility-critical content readable.

## 3.2 Functional Typeface

Use **Satoshi** for:

- long-form body text
- navigation labels
- forms and settings
- metrics, dates, forms, and settings

Satoshi is also the display and body typeface in Formal mode. In Expressive mode it remains the body typeface while Delicious Handrawn provides the display personality.

## 3.3 User-selected visual style

Onboarding must ask users to select exactly one complete visual style. Do not offer independent font and icon selectors or allow users to mix the two icon families.

| Style | Display and body type | Icon family | Personality |
|---|---|---|---|
| **Refined (Formal)** | Satoshi throughout | Hugeicons Free, consistent rounded outline variant | Clean, precise, minimal |
| **Expressive** | Delicious Handrawn for display; Satoshi for functional/body copy | Doodle-style SVG icons, including curated Khushmeen icons or project-drawn equivalents | Warm, personal, handcrafted |

Show clear previews named for how they feel, with font and icon families as supporting detail. The selection controls the full visual language, not only typography. Users can change it later in Appearance. Keep it independent from the colour scheme (System, Light, Dark).

Do not duplicate screens for each style. Shared components should render the selected style. Use one semantic icon vocabulary and one application-level API:

```tsx
<AppIcon name="goal" />
```

The icon renderer selects Hugeicons or the matching doodle illustration from the visual-style preference. Keep icon-library-specific names out of feature screens. Use matched styles for progress graphics, section dividers, checkmarks, illustrations, charts, and motion as these are implemented.

## 3.4 Display Numbers

Use a strong Satoshi weight in Refined mode. Expressive mode may use Delicious Handrawn for prominent numbers only when the value remains easy to read; dense or detailed metrics stay in Satoshi.

Examples:

```text
84%
12 days
3 / 4
```

---

# 4. Iconography

The app supports two coordinated icon languages selected as part of the visual style.

Refined uses Hugeicons Free in one consistent rounded outline variant. Expressive uses a coherent family of hand-drawn SVG icons, including curated Khushmeen Doodle Icons or project-drawn equivalents. Do not mix icon styles within a selected mode. Use semantic names through a shared `AppIcon` component so the selected family can be changed centrally.

Expressive mode may use organic progress strokes, scribble separators, hand-drawn checks, and doodle illustrations. Refined mode uses precise charts, clean dividers, precise animated checks, and minimal vector illustrations. Keep layout geometry and core interaction affordances consistent between modes.

### Onboarding selection

Include a required Appearance Style onboarding step with live preview cards:

- **Refined:** Satoshi + Hugeicons; clean and focused.
- **Expressive:** Delicious Handrawn display + Satoshi body + doodles; warm and handcrafted.

Exactly one can be selected. Communicate that it can be changed later under Appearance.

Characteristics:

- rounded strokes
- slight irregularity
- organic curves
- imperfect symmetry
- simple silhouette

Icons should be implemented primarily as SVG.

Core icon set should include:

```text
home
calendar
goal
flag
habit
repeat
routine
journal
health
career
learning
finance
relationship
social
sleep
achievement
progress
focus
settings
profile
check
skip
reschedule
pause
```

---

# 5. Colour System

Do not rely on pure white or pure black.

## Light Theme

Recommended direction:

```text
background: warm ivory
surface: soft white
text: ink black
secondary text: graphite
border: muted stone
```

## Dark Theme

Recommended direction:

```text
background: deep charcoal
surface: elevated graphite
text: warm off-white
secondary text: muted grey
```

Life areas may use distinct accent colours.

---

# 6. Shape Language

Use medium and large rounded corners throughout interface components. Avoid sharp rectangular corners.

Preferred radius scale:

```text
small: 8
medium: 12
large: 16
xl: 24
pill: 999
```

Cards and grouped surfaces should use large or extra-large radii (16–24px). Compact controls may use medium radii (12–16px). Icon containers and icon buttons should be pill-shaped or circular; keep the icon glyph itself centered and visually simple. Do not force long text controls into pill shapes when that harms readability or touch-target clarity.

All buttons must be pill-shaped, including primary, secondary, text-action, and icon-only buttons. Icon-only buttons should use a circular pill container with a centered icon.

---

# 7. Spacing Scale

Recommended:

```text
4
8
12
16
20
24
32
40
48
64
```

Most screen content should use 16–24px horizontal padding.

---

# 8. Motion System

Motion stack:

```text
React Native Reanimated
React Native Skia
Gesture Handler
Expo Haptics
```

---

# 9. Motion Responsibility

Use Reanimated for:

- layout transitions
- presses
- navigation motion
- sheets
- draggable items
- tab transitions
- card expansion

Use Skia for:

- charts
- animated paths
- progress rings
- particles
- organic backgrounds
- achievement animations
- life visualizations

---

# 10. Motion Tokens

```ts
export const motionDuration = {
  instant: 120,
  quick: 180,
  normal: 280,
  expressive: 420,
  celebration: 700,
};
```

Suggested spring categories:

```text
button
card
sheet
gentle
playful
```

---

# 11. Motion Hierarchy

### Level 1 — Feedback
100–200ms

Used for:
- checkbox
- button
- toggle

### Level 2 — State change
200–350ms

Used for:
- filter
- tab
- completion

### Level 3 — Navigation
300–500ms

Used for:
- sheets
- route transitions
- expanding cards

### Level 4 — Expressive
500–1200ms

Used for:
- achievements
- onboarding
- weekly review
- major progress moments

---

# 12. Signature Interactions

## 12.1 Animated Task Check

```text
press
↓
circle compress
↓
checkmark draws
↓
haptic
↓
text transitions
↓
row settles
```

## 12.2 Swipe to Complete

Swipe right. At threshold: haptic. Release: complete.

## 12.3 Swipe to Reschedule

Swipe left. Reveal reschedule and skip.

## 12.4 Organic Progress Ring

Implemented in Skia with irregular path, animated drawing, percentage count, and subtle glow.

## 12.5 Morphing Add Button

Floating plus expands into Task, Habit, Goal, Journal.

## 12.6 Handwritten Tab Underline

Active tab receives animated scribble underline.

## 12.7 Interactive Life Wheel

Skia visualization for life areas.

## 12.8 Weekly Review Story

Metrics reveal progressively.

## 12.9 Achievement Celebration

Major goals trigger a full-screen Skia animation.

## 12.10 Accountability Recovery Sheet

Missed action transitions into a guided bottom sheet.

---

# 13. Haptics

| Action | Feedback |
|---|---|
| Standard press | light |
| Completion | light |
| Swipe threshold | medium |
| Slider tick | selection |
| Warning | warning |
| Goal complete | success |
| Major achievement | custom sequence |

Haptic feedback should remain restrained.

---

# 14. Main Navigation

Primary tabs:

```text
Today
Goals
Progress
Coach
Profile
```

The bottom bar should use:

- floating treatment
- subtle blur
- animated selection
- handwritten accent

---

# 15. Today Screen

Structure:

```text
Header
Greeting
Daily intention
Top priorities
Schedule
Habits
Routines
Commitments
Quick reflection
```

Avoid wrapping every section inside separate cards.

Use spacing and typography as primary hierarchy.

---

# 16. Goal Detail Screen

Sections:

```text
Goal Hero
Progress
Why
Milestones
Habits
Tasks
Commitments
History
Insights
```

---

# 17. Progress Screen

Sections:

```text
Period selector
Overall trends
Life areas
Goal progress
Habit consistency
Commitment consistency
Personal bests
You vs Previous Period
```

Graphs should be custom and organic.

---

# 18. Coach Screen

Initial version:

```text
Insights
Suggestions
Weekly Review
Reflection Prompts
```

Future:

```text
AI Conversation
```

The Coach screen should not launch as an empty chatbot.

---

# 19. Journal UI

Visual characteristics:

- subtle paper texture
- handwritten heading
- readable body font
- organic separators

Journal interaction should feel private and calm.

---

# 20. Accessibility

The interface must support:

- VoiceOver
- TalkBack
- scalable fonts
- reduced motion
- sufficient contrast
- large touch targets
- semantic labels

Reduced motion mode should replace expressive motion with fades, immediate state changes, or simple transforms.

---

# 21. Technology Architecture

```text
React Native
Expo
TypeScript
Expo Router
Uniwind
Reanimated
Skia
Gesture Handler
Zustand
Expo SQLite
Drizzle ORM
Supabase
PostHog
Sentry
```

---

# 22. Local-First Architecture

The application database on the device is the primary operational data store.

```text
UI
↓
Repository Layer
↓
SQLite
↓
Sync Engine
↓
Supabase
```

The UI should never require constant Supabase reads for core planning actions.

---

# 23. Local Database

Recommended stack:

```text
expo-sqlite
drizzle-orm
```

Core tables:

```text
users
life_areas
goals
milestones
tasks
task_occurrences
habits
habit_occurrences
routines
routine_items
commitments
check_ins
journals
achievements
relationships
templates_cache
sync_queue
```

---

# 24. Entity Design

Base entity fields:

```ts
type SyncableEntity = {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;

  syncStatus:
    | "local"
    | "pending"
    | "synced"
    | "conflict"
    | "failed";

  localUpdatedAt: string;
  serverUpdatedAt?: string | null;
};
```

---

# 25. Occurrence Model

Do not duplicate recurring entities unnecessarily.

Use:

```text
Habit
↓
Recurrence Rule
↓
Habit Occurrence
```

Likewise:

```text
Task
↓
Recurrence Rule
↓
Task Occurrence
```

---

# 26. Suggested Goal Schema

```ts
type Goal = {
  id: string;
  userId: string;
  title: string;
  description?: string;
  lifeAreaId: string;
  why?: string;
  priority: "low" | "medium" | "high";
  status:
    | "draft"
    | "active"
    | "paused"
    | "completed"
    | "abandoned"
    | "archived";
  startDate?: string;
  targetDate?: string;
  targetType?:
    | "boolean"
    | "quantity"
    | "percentage"
    | "qualitative";
  targetValue?: number;
  unit?: string;
  progress: number;
};
```

---

# 27. Task Schema

```ts
type Task = {
  id: string;
  goalId?: string;
  milestoneId?: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  scheduledAt?: string;
  dueAt?: string;
  estimatedMinutes?: number;
  target?: {
    value: number;
    unit: string;
  };
  progressByDate?: Record<string, number>;
  status:
    | "planned"
    | "completed"
    | "missed"
    | "skipped"
    | "rescheduled"
    | "cancelled";
};

type TaskProgressStatus = "low" | "mid" | "high";

// Derived from progressByDate[date] / target.value; never persisted as source data.
function getTaskProgressStatus(task: Task, date: string): TaskProgressStatus | undefined {
  const target = task.target?.value;
  const progress = task.progressByDate?.[date];
  if (!Number.isFinite(target) || target == null || target <= 0 || !Number.isFinite(progress) || progress == null || progress < 0) return undefined;
  const ratio = progress / target;
  return ratio <= 0.3 ? "low" : ratio < 0.7 ? "mid" : "high";
}
```

---

# 28. Habit Schema

```ts
type Habit = {
  id: string;
  goalId?: string;
  title: string;
  measurementType:
    | "boolean"
    | "quantity"
    | "duration";
  targetValue?: number;
  unit?: string;
  recurrenceRule: string;
  isPaused: boolean;
};
```

---

# 29. Completion Schema

```ts
type Completion = {
  id: string;
  entityType:
    | "task"
    | "habit"
    | "routine";
  entityId: string;
  scheduledAt: string;
  status:
    | "completed"
    | "missed"
    | "skipped"
    | "rescheduled";
  completedAt?: string;
  missReason?: string;
  note?: string;
  rescheduledTo?: string;
};
```

---

# 30. Sync Queue

```ts
type SyncQueueItem = {
  id: string;
  entityType: string;
  entityId: string;
  operation:
    | "CREATE"
    | "UPDATE"
    | "DELETE";
  attemptCount: number;
  createdAt: string;
  lastAttemptAt?: string;
  status:
    | "pending"
    | "processing"
    | "failed";
};
```

---

# 31. Cloud Architecture

Supabase services:

```text
Postgres
Auth
Storage
Realtime
Edge Functions
Cron
RLS
```

Supabase is used for:

- authentication
- cloud sync
- templates
- accountability partners
- server push
- AI proxy
- admin content

---

# 32. AI Architecture

Create a provider-independent interface.

```ts
interface AIProvider {
  generateGoalPlan(input: GoalPlanInput): Promise<GoalPlan>;
  summarizeWeek(input: WeeklyData): Promise<string>;
  explainInsight(input: InsightData): Promise<string>;
  generateReflection(input: ReflectionInput): Promise<string>;
}
```

Providers may include:

```text
Groq
OpenRouter
Gemini
Future providers
```

AI keys must remain server-side.

---

# 33. Recommendation Engine

Pipeline:

```text
Behaviour Data
↓
Rules
↓
Pattern Detection
↓
Insight Candidate
↓
Optional AI Explanation
↓
Recommendation
```

Calculations should be deterministic whenever possible.

AI should explain patterns rather than discover all raw metrics.

---

# 34. Notifications Architecture

## Local

```text
expo-notifications
```

Used for:

- tasks
- habits
- routines
- check-ins

## Remote

```text
Supabase Cron
↓
Edge Function
↓
Expo Push Service
↓
Device
```

---

# 35. State Management

Use Zustand for:

```text
UI state
filters
selected date
temporary flow state
modal state
onboarding state
preferences
```

Do not use Zustand as the primary persistent database.

---

# 36. Forms

Stack:

```text
React Hook Form
Zod
```

Schemas should be reusable.

---

# 37. Admin Dashboard

Stack:

```text
Next.js
TypeScript
Tailwind
shadcn/ui
Supabase
Vercel
```

Admin functionality:

```text
Users
Templates
Template versions
Achievements
Feature flags
AI usage
Notifications
App versions
Feedback
Analytics
```

---

# 38. Template Data Model

Recommended tables:

```text
templates
template_versions
template_goals
template_milestones
template_tasks
template_habits
template_routines
template_commitments
template_prompts
```

Template activation performs:

```text
Template
↓
Clone
↓
User-owned entities
```

---

# 39. Analytics

PostHog events:

```text
onboarding_started
onboarding_completed
template_viewed
template_selected
goal_created
goal_completed
task_created
task_completed
task_missed
task_rescheduled
habit_created
habit_completed
habit_missed
commitment_created
commitment_completed
checkin_completed
weekly_review_started
weekly_review_completed
recommendation_viewed
recommendation_applied
```

---

# 40. Error Monitoring

Sentry should capture:

- JS exceptions
- native crashes
- sync errors
- migration failures
- Edge Function failures
- unexpected state errors

Sensitive content must be scrubbed.

---

# 41. Testing Strategy

## Unit

Use Vitest or Jest.

Test:

- recurrence
- habit consistency
- progress calculations
- recommendation logic
- sync conflict handling

## Components

Use React Native Testing Library.

## End-to-End

Use Maestro.

Critical E2E flow:

```text
sign up
↓
onboarding
↓
activate template
↓
complete habit
↓
miss habit
↓
record reason
↓
reschedule
↓
weekly review
```

---

# 42. Repository Structure

Recommended monorepo:

```text
apps/
├── mobile/
└── admin/

packages/
├── domain/
├── database/
├── validation/
├── types/
├── analytics/
├── ai/
├── config/
└── design-tokens/
```

Tooling:

```text
pnpm
Turborepo
```

---

# 43. Mobile Application Structure

```text
apps/mobile/

app/
├── (auth)/
├── (onboarding)/
├── (app)/
│   ├── (tabs)/
│   ├── goal/
│   ├── habit/
│   ├── task/
│   ├── routine/
│   ├── journal/
│   └── review/
└── _layout.tsx

src/
├── components/
├── features/
├── hooks/
├── stores/
├── repositories/
├── database/
├── services/
├── animations/
├── theme/
└── utils/
```

---

# 44. Design System Structure

```text
src/theme/

colors.ts
typography.ts
spacing.ts
radius.ts
shadows.ts
motion.ts
haptics.ts
```

And:

```text
src/components/ui/

Button
Card
Text
Icon
Input
Progress
Sheet
Modal
Tabs
Checkbox
Switch
Slider
Toast
Skeleton
```

---

# 45. Performance Rules

1. use Skia only when justified
2. keep standard UI in native views
3. keep animations on UI thread
4. avoid unnecessary React rerenders
5. virtualize long histories
6. lazy-load large visualization modules
7. avoid excessive blur
8. avoid excessive transparency layers

---

# 46. Security

Required:

- Supabase RLS
- encrypted network communication
- SecureStore
- optional SQLCipher
- private journaling by default
- explicit sharing permissions
- server-side AI keys

---

# 47. Privacy Model

### Local-first sensitive

```text
journal
mood
reflection
relationship notes
```

### Syncable private

```text
goals
habits
tasks
commitments
```

### Shared only explicitly

```text
selected goals
selected progress
selected commitments
```

---

# 48. Release Environments

Use:

```text
development
preview
production
```

Each environment should have independent:

- Supabase config
- Sentry config
- PostHog settings
- AI configuration
- Expo build profiles

---

# 49. CI/CD

```text
GitHub
↓
GitHub Actions
↓
Tests
↓
Lint
↓
Type Check
↓
EAS Build
↓
Preview / Production
```

---

# 50. Initial Build Order

## Phase 1

```text
design system
navigation
SQLite
Drizzle
repositories
```

## Phase 2

```text
onboarding
life areas
templates
```

## Phase 3

```text
goals
milestones
tasks
habits
routines
```

## Phase 4

```text
Today screen
completion flows
accountability
replanning
```

## Phase 5

```text
check-ins
weekly review
progress
achievements
```

## Phase 6

```text
Supabase sync
auth
remote backup
```

## Phase 7

```text
notifications
server accountability
```

## Phase 8

```text
recommendation engine
AI assistance
```

## Phase 9

```text
admin dashboard
template management
feature flags
analytics
```

---

# 51. Final Product Architecture

```text
                     ADMIN
                       │
                       ▼
                Next.js Dashboard
                       │
                       ▼
                  SUPABASE
          ┌────────────┼────────────┐
          │            │            │
       Postgres      Auth      Edge Functions
          │                         │
       Realtime                    AI
          │                         │
          └───────────┬─────────────┘
                      │
                Sync / Remote
                      │
                      ▼
            REACT NATIVE MOBILE
                      │
          ┌───────────┴───────────┐
          │                       │
       Zustand                 UI Layer
                                  │
                       Uniwind / Reanimated
                              / Skia
                                  │
                                  ▼
                           Repository Layer
                                  │
                                  ▼
                           SQLite + Drizzle
                                  │
                                  ▼
                           LOCAL SOURCE
                             OF TRUTH
```

---

# 52. Final UX Principle

The product should follow one rule:

> Every important action should feel responsive. Every meaningful achievement should feel special. Everything else should remain calm.

The product succeeds when the technology disappears and the user primarily experiences:

```text
clarity
progress
reflection
accountability
improvement
```
