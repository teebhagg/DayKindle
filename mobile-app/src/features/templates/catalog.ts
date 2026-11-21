import type { AppIconName } from '../../components/app-icon';
import type { HabitTrackingType, RecurrenceRule, StarterPlan } from '../home/home-session';
import { dayScheduleTemplates, type DaySchedule } from '../home/day-schedules';

export const templateCategories = [
  'Health & Fitness',
  'Sleep & Recovery',
  'Productivity',
  'Career',
  'Learning',
  'Finance',
  'Relationships',
  'Personal Development',
  'Mental Wellbeing',
  'Social Development',
  'Lifestyle',
  'Reading',
  'General Goals',
] as const;

export type TemplateCategory = typeof templateCategories[number];
export type GoalTemplate = StarterPlan & {
  kind: 'goal';
  category: TemplateCategory;
  description: string;
  context: string;
  icon: AppIconName;
};

export type HabitTemplate = {
  id: string;
  kind: 'habit';
  category: TemplateCategory;
  title: string;
  description: string;
  context: string;
  icon: AppIconName;
  suggestedRecurrence: RecurrenceRule;
  suggestedDaysOfWeek?: number[];
  trackingType: HabitTrackingType;
  targetValue?: number;
  targetUnit?: string;
};

export type ScheduleAudience = 'General';
export type ScheduleTemplate = DaySchedule & {
  audience: ScheduleAudience;
  description: string;
};

export const templateAudiences: ScheduleAudience[] = ['General'];
export const categoryIcons: Record<TemplateCategory, AppIconName> = {
  'Health & Fitness': 'fitness',
  'Sleep & Recovery': 'sleep',
  Productivity: 'focus',
  Career: 'work',
  Learning: 'goals',
  Finance: 'money',
  Relationships: 'relationships',
  'Personal Development': 'sparkle',
  'Mental Wellbeing': 'mind',
  'Social Development': 'relationships',
  Lifestyle: 'home',
  Reading: 'goals',
  'General Goals': 'goals',
};

export const goalTemplates: GoalTemplate[] = [
  { id: 'template_move_more', kind: 'goal', title: 'Move a little more', category: 'Health & Fitness', icon: 'fitness', description: 'Build a movement routine that fits your week.', context: 'Start with the time and energy you already have, then adjust the plan as needed.', firstStep: 'Choose one kind of movement you would enjoy trying.' },
  { id: 'template_strength', kind: 'goal', title: 'Feel stronger', category: 'Health & Fitness', icon: 'progress', description: 'Start a strength practice at a comfortable pace.', context: 'Choose a starting point that feels manageable and change it as your needs shift.', firstStep: 'Pick one simple strength activity to explore.' },
  { id: 'template_hydration', kind: 'goal', title: 'Drink more water', category: 'Health & Fitness', icon: 'sun', description: 'Make hydration easier to remember.', context: 'A visible reminder or convenient place to refill can make this goal easier to fit into your day.', firstStep: 'Choose a place to keep water within reach.' },
  { id: 'template_evening', kind: 'goal', title: 'Wind down in the evening', category: 'Sleep & Recovery', icon: 'sleep', description: 'Explore a gentle transition into rest.', context: 'A familiar closing activity may help you make room for rest while leaving space for changing days.', firstStep: 'Choose one calming activity to try before you rest.' },
  { id: 'template_sleep', kind: 'goal', title: 'Find a steadier rest rhythm', category: 'Sleep & Recovery', icon: 'sleep', description: 'Make room for a rest routine that can flex with your life.', context: 'Notice what supports your rest and choose a small adjustment that feels realistic for your circumstances.', firstStep: 'Notice one thing that helps or interrupts your rest.' },
  { id: 'template_focus', kind: 'goal', title: 'Protect focus time', category: 'Productivity', icon: 'focus', description: 'Give an important task your attention.', context: 'A shorter, protected block can make it easier to begin when your day is busy.', firstStep: 'Choose one task and a focus window that fits today.' },
  { id: 'template_plan_week', kind: 'goal', title: 'Plan the week ahead', category: 'Productivity', icon: 'calendar', description: 'Start with a clearer sense of direction.', context: 'A brief review can help you choose priorities that fit the time you actually have.', firstStep: 'Write down the few things that matter most this week.' },
  { id: 'template_screen_break', kind: 'goal', title: 'Take mindful screen breaks', category: 'Productivity', icon: 'sparkle', description: 'Create pauses between stretches of screen time.', context: 'A break can be as simple as looking away, moving, or stepping away when it suits you.', firstStep: 'Choose one moment today to pause away from a screen.' },
  { id: 'template_journal', kind: 'goal', title: 'Write a little each day', category: 'Personal Development', icon: 'goals', description: 'Make space to reflect and notice what matters.', context: 'Short notes can help you collect thoughts without needing a polished entry.', firstStep: 'Write one sentence about something on your mind.' },
  { id: 'template_reading', kind: 'goal', title: 'Read more often', category: 'Reading', icon: 'goals', description: 'Return to a book or subject you enjoy.', context: 'Keep reading at a scale that feels enjoyable, and adjust the amount to fit your day.', firstStep: 'Choose a book or article you would like to return to.' },
  { id: 'template_learning', kind: 'goal', title: 'Learn a new skill', category: 'Learning', icon: 'sparkle', description: 'Turn curiosity into a practical next step.', context: 'A beginner resource can help you decide whether a topic is worth exploring further.', firstStep: 'Find one beginner lesson or guide.' },
  { id: 'template_connect', kind: 'goal', title: 'Stay connected with friends', category: 'Relationships', icon: 'profile', description: 'Make it easier to reach out to people you value.', context: 'A thoughtful, low-pressure check-in can make room for connection.', firstStep: 'Choose someone you would like to check in with.' },
  { id: 'template_family', kind: 'goal', title: 'Make time for family', category: 'Relationships', icon: 'profile', description: 'Create more space for people close to you.', context: 'A shared meal, call, or small tradition can fit different schedules and preferences.', firstStep: 'Choose one way to connect that works for everyone involved.' },
  { id: 'template_money', kind: 'goal', title: 'Check in on your money', category: 'Finance', icon: 'progress', description: 'Build a calm, regular money review.', context: 'A short review can help you see what needs attention and choose a useful next step.', firstStep: 'Choose a time to review one part of your finances.' },
  { id: 'template_simplify', kind: 'goal', title: 'Make daily life feel lighter', category: 'Lifestyle', icon: 'sparkle', description: 'Simplify one routine that takes more energy than it needs.', context: 'Look for one repeated task where a small change could reduce friction.', firstStep: 'Name one daily task you would like to make easier.' },
  { id: 'template_career_direction', kind: 'goal', title: 'Explore your next career step', category: 'Career', icon: 'work', description: 'Clarify one direction you want to explore at work.', context: 'A small research or reflection task can help you decide what to investigate next.', firstStep: 'Write down one role, skill, or opportunity you want to learn about.' },
  { id: 'template_career_portfolio', kind: 'goal', title: 'Build a portfolio of your work', category: 'Career', icon: 'work', description: 'Collect examples that show what you can do.', context: 'Start with work you are allowed to share and add examples at a pace that suits you.', firstStep: 'Choose one completed project to document.' },
  { id: 'template_course_progress', kind: 'goal', title: 'Make progress in a course', category: 'Learning', icon: 'goals', description: 'Choose a manageable next step in a course or subject.', context: 'A clear next action can make it easier to return to learning around other commitments.', firstStep: 'Open your course and identify the next lesson or exercise.' },
  { id: 'template_practice_skill', kind: 'goal', title: 'Practice a skill you care about', category: 'Learning', icon: 'sparkle', description: 'Make space for practice that fits your current routine.', context: 'Keep the plan adjustable so it remains useful as time and energy change.', firstStep: 'Choose one small practice activity to try.' },
  { id: 'template_savings_buffer', kind: 'goal', title: 'Work toward a savings buffer', category: 'Finance', icon: 'money', description: 'Set a personal savings target that fits your situation.', context: 'The amount and pace are yours to choose; start by understanding what feels feasible.', firstStep: 'Choose a savings goal or review your current plan.' },
  { id: 'template_personal_boundary', kind: 'goal', title: 'Practice a personal boundary', category: 'Personal Development', icon: 'mind', description: 'Identify a boundary that would support your wellbeing.', context: 'Consider what feels respectful and realistic for you and the people involved.', firstStep: 'Write down one situation where you want to communicate a limit.' },
  { id: 'template_manage_stress', kind: 'goal', title: 'Find a way to reset during stress', category: 'Mental Wellbeing', icon: 'mind', description: 'Explore a small pause or support that feels right for you.', context: 'Different approaches work for different people; choose one low-pressure option to try.', firstStep: 'List one activity or person that helps you feel supported.' },
  { id: 'template_social_confidence', kind: 'goal', title: 'Feel more at ease in social settings', category: 'Social Development', icon: 'relationships', description: 'Choose a social step that feels comfortable for you.', context: 'You can set the pace and choose settings that match your needs and interests.', firstStep: 'Think of one low-pressure way to connect with someone.' },
  { id: 'template_general_goal', kind: 'goal', title: 'Make progress on something important', category: 'General Goals', icon: 'goals', description: 'Turn a personal priority into one clear next step.', context: 'Keep the plan connected to what matters to you and make changes when life shifts.', firstStep: 'Write down what progress would look like for you.' },
  { id: 'template_fresh_start', kind: 'goal', title: 'Start a goal of your own', category: 'General Goals', icon: 'sparkle', description: 'Create a flexible starting point for any area of life.', context: 'Your goal can be specific or exploratory, and it can change as you learn what you need.', firstStep: 'Give your goal a working title and one next action.' },
];

export const habitTemplates: HabitTemplate[] = [
  { id: 'habit_movement', kind: 'habit', category: 'Health & Fitness', title: 'Move in a way that feels good', description: 'Record movement that fits your body and day.', context: 'Choose your preferred frequency and change it whenever your circumstances change.', icon: 'fitness', suggestedRecurrence: 'selected_days', suggestedDaysOfWeek: [1, 3, 5], trackingType: 'duration', targetValue: 10, targetUnit: 'minutes' },
  { id: 'habit_rest_reflection', kind: 'habit', category: 'Sleep & Recovery', title: 'Pause and check in with your rest', description: 'Notice how rest is fitting into your life.', context: 'A simple check-in can be descriptive; there is no required sleep schedule.', icon: 'sleep', suggestedRecurrence: 'daily', trackingType: 'boolean' },
  { id: 'habit_rest_transition', kind: 'habit', category: 'Sleep & Recovery', title: 'Make space for a wind-down activity', description: 'Try a low-pressure activity when it works for you.', context: 'Choose an activity and recurrence that suit your routine; skip or adjust it when needed.', icon: 'sleep', suggestedRecurrence: 'selected_days', suggestedDaysOfWeek: [1, 2, 3, 4, 5], trackingType: 'boolean' },
  { id: 'habit_daily_priority', kind: 'habit', category: 'Productivity', title: 'Choose a priority for the day', description: 'Name one thing you would like to give attention to.', context: 'Keep the action small enough to fit alongside your other responsibilities.', icon: 'focus', suggestedRecurrence: 'weekdays', trackingType: 'boolean' },
  { id: 'habit_career_learning', kind: 'habit', category: 'Career', title: 'Spend time on a work skill', description: 'Practice or explore a skill relevant to your work.', context: 'Choose how often and for how long based on your available time.', icon: 'work', suggestedRecurrence: 'selected_days', suggestedDaysOfWeek: [2, 4], trackingType: 'duration', targetValue: 15, targetUnit: 'minutes' },
  { id: 'habit_career_network', kind: 'habit', category: 'Career', title: 'Keep a work connection warm', description: 'Make a thoughtful professional check-in when useful.', context: 'This could be a message, a reply, or a conversation that feels appropriate to you.', icon: 'work', suggestedRecurrence: 'selected_days', suggestedDaysOfWeek: [5], trackingType: 'boolean' },
  { id: 'habit_learning_notes', kind: 'habit', category: 'Learning', title: 'Capture one learning note', description: 'Write down an idea or question from something you are learning.', context: 'A phrase or question is enough; use a cadence that fits your studies or interests.', icon: 'goals', suggestedRecurrence: 'selected_days', suggestedDaysOfWeek: [1, 3, 5], trackingType: 'boolean' },
  { id: 'habit_finance_review', kind: 'habit', category: 'Finance', title: 'Review one recent money choice', description: 'Notice a recent transaction or decision without judgment.', context: 'Choose a schedule that feels useful and safe for your circumstances.', icon: 'money', suggestedRecurrence: 'selected_days', suggestedDaysOfWeek: [0], trackingType: 'boolean' },
  { id: 'habit_relationship_checkin', kind: 'habit', category: 'Relationships', title: 'Check in with someone you care about', description: 'Make room for a message, call, or shared moment.', context: 'Choose a frequency that respects both your schedule and theirs.', icon: 'relationships', suggestedRecurrence: 'selected_days', suggestedDaysOfWeek: [2, 5], trackingType: 'boolean' },
  { id: 'habit_relationship_listen', kind: 'habit', category: 'Relationships', title: 'Give someone your attention', description: 'Create a moment for listening or shared time.', context: 'Keep it flexible; meaningful connection can take many forms.', icon: 'relationships', suggestedRecurrence: 'selected_days', suggestedDaysOfWeek: [0], trackingType: 'boolean' },
  { id: 'habit_personal_reflection', kind: 'habit', category: 'Personal Development', title: 'Reflect on one choice', description: 'Notice what you learned from something you did.', context: 'A brief private note or quiet reflection is enough if that suits you.', icon: 'sparkle', suggestedRecurrence: 'selected_days', suggestedDaysOfWeek: [1, 4], trackingType: 'boolean' },
  { id: 'habit_mindful_pause', kind: 'habit', category: 'Mental Wellbeing', title: 'Take a mindful pause', description: 'Pause for a breath or notice what is around you.', context: 'Use a version that feels comfortable; this is an optional personal practice.', icon: 'mind', suggestedRecurrence: 'daily', trackingType: 'duration', targetValue: 2, targetUnit: 'minutes' },
  { id: 'habit_name_feeling', kind: 'habit', category: 'Mental Wellbeing', title: 'Name how you are feeling', description: 'Check in with yourself without judging the answer.', context: 'You can keep this private and skip it whenever it does not feel useful.', icon: 'mind', suggestedRecurrence: 'selected_days', suggestedDaysOfWeek: [1, 3, 5], trackingType: 'boolean' },
  { id: 'habit_social_reachout', kind: 'habit', category: 'Social Development', title: 'Start a small conversation', description: 'Practice a social interaction in a setting you choose.', context: 'Choose a pace and setting that feel comfortable and respectful to you.', icon: 'relationships', suggestedRecurrence: 'selected_days', suggestedDaysOfWeek: [6], trackingType: 'boolean' },
  { id: 'habit_social_listen', kind: 'habit', category: 'Social Development', title: 'Practice attentive listening', description: 'Give a conversation your attention when the moment allows.', context: 'This is a flexible prompt, not a requirement to seek out interactions.', icon: 'relationships', suggestedRecurrence: 'selected_days', suggestedDaysOfWeek: [2, 4], trackingType: 'boolean' },
  { id: 'habit_lifestyle_reset', kind: 'habit', category: 'Lifestyle', title: 'Reset one small space', description: 'Tidy or prepare a small area when it helps.', context: 'Choose a small scope so the action remains flexible around your energy.', icon: 'home', suggestedRecurrence: 'selected_days', suggestedDaysOfWeek: [1, 4], trackingType: 'boolean' },
  { id: 'habit_lifestyle_prepare', kind: 'habit', category: 'Lifestyle', title: 'Prepare one thing for later', description: 'Make a small task easier for your future self.', context: 'It can be a meal item, a note, a bag, or something else that suits your day.', icon: 'home', suggestedRecurrence: 'selected_days', suggestedDaysOfWeek: [0, 3], trackingType: 'boolean' },
  { id: 'habit_read_pages', kind: 'habit', category: 'Reading', title: 'Read a little when you can', description: 'Return to a book, article, or topic you enjoy.', context: 'Choose a reading amount and cadence that feel enjoyable and easy to adjust.', icon: 'goals', suggestedRecurrence: 'selected_days', suggestedDaysOfWeek: [1, 3, 5], trackingType: 'duration', targetValue: 10, targetUnit: 'minutes' },
  { id: 'habit_read_note', kind: 'habit', category: 'Reading', title: 'Save a line or idea from reading', description: 'Keep one note from something you read.', context: 'A quote, question, or short summary can help you remember what caught your attention.', icon: 'goals', suggestedRecurrence: 'selected_days', suggestedDaysOfWeek: [6], trackingType: 'boolean' },
  { id: 'habit_general_checkin', kind: 'habit', category: 'General Goals', title: 'Take one small step toward a goal', description: 'Choose a next action that fits the day you have.', context: 'Adjust the action or cadence as your priorities and circumstances change.', icon: 'sparkle', suggestedRecurrence: 'selected_days', suggestedDaysOfWeek: [1, 3, 5], trackingType: 'boolean' },
];

const generalSchedules: ScheduleTemplate[] = dayScheduleTemplates.map((item) => ({
  ...item,
  audience: "General",
  description: "A complete daily outline with fixed time blocks and clear action prompts.",
}));

export const scheduleTemplates: ScheduleTemplate[] = generalSchedules;

export const allGoalAndHabitTemplates: (GoalTemplate | HabitTemplate)[] = [...goalTemplates, ...habitTemplates];
export const templateCatalogCounts = {
  goals: goalTemplates.length,
  habits: habitTemplates.length,
  schedules: scheduleTemplates.length,
  total: goalTemplates.length + habitTemplates.length + scheduleTemplates.length,
};
