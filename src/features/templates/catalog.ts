import type { AppIconName } from '../../components/app-icon';
import type { HabitTrackingType, RecurrenceRule, StarterPlan } from '../home/home-session';
import { dayScheduleTemplates, type DaySchedule, type DayScheduleBlock } from '../home/day-schedules';

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

export type ScheduleAudience = 'General' | 'Student' | 'Employee' | 'Business owner' | 'Caregiver' | 'Shift & flexible worker';
export type ScheduleTemplate = DaySchedule & {
  audience: ScheduleAudience;
  description: string;
};

export const templateAudiences: ScheduleAudience[] = ['General', 'Student', 'Employee', 'Business owner', 'Caregiver', 'Shift & flexible worker'];
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

function blocks(id: string, entries: [string, string, string][]): DayScheduleBlock[] {
  return entries.map(([time, title, details], index) => ({ id: `${id}-block-${index + 1}`, time, title, details }));
}

function schedule(id: string, audience: ScheduleAudience, dayType: DaySchedule['dayType'], title: string, daysOfWeek: number[], description: string, entries: [string, string, string][]): ScheduleTemplate {
  return { id, audience, dayType, daysOfWeek, title, description, blocks: blocks(id, entries) };
}

const generalSchedules: ScheduleTemplate[] = dayScheduleTemplates.map((item) => ({
  ...item,
  audience: 'General',
  description: 'A flexible outline with open space for your own commitments and priorities.',
}));

export const additionalScheduleTemplates: ScheduleTemplate[] = [
  schedule('student-study-flow', 'Student', 'weekday', 'A flexible study day', [1, 2, 3, 4, 5], 'A study-first outline that leaves room for classes, travel, work, and changing deadlines.', [
    ['Before the first commitment', 'Check today’s plan', 'Look at classes, tasks, and available time. Adjust the list to match the day.'],
    ['First available study block', 'Work on one course task', 'Choose a reading, problem set, revision task, or project that fits this window.'],
    ['Between commitments', 'Pause and reset', 'Eat, move, rest, or get ready for the next activity in the way that suits you.'],
    ['Later open block', 'Review or prepare', 'Return to a small study step or prepare materials for a future class.'],
  ]),
  schedule('student-class-day', 'Student', 'weekday', 'A day around classes', [1, 2, 3, 4, 5], 'Place classes first, then fit study and breaks into the spaces that are actually available.', [
    ['Before leaving or logging in', 'Gather what you need', 'Check the next class or learning commitment and bring the essentials.'],
    ['Between classes', 'Capture one reminder', 'Write down a question, task, or topic to revisit when you have time.'],
    ['After a class block', 'Take a real break', 'Choose food, movement, quiet, or a change of setting as needed.'],
    ['When time opens up', 'Choose the next useful step', 'Do one task or leave the rest for another day if capacity is limited.'],
  ]),
  schedule('student-assignment-day', 'Student', 'weekday', 'A project work session day', [1, 2, 3, 4, 5], 'Use project blocks when your schedule allows; deadlines and study capacity can vary.', [
    ['Planning moment', 'Break the project into steps', 'Pick a next action small enough to start in the time available.'],
    ['Available focus block', 'Work on the chosen step', 'Use a study space or method that works for you today.'],
    ['Between work blocks', 'Step away briefly', 'Let the length and kind of break fit your needs.'],
    ['Closing moment', 'Save your place', 'Note what is done and what could come next.'],
  ]),
  schedule('student-campus-day', 'Student', 'weekday', 'A campus and personal day', [1, 2, 3, 4, 5], 'A flexible mix of learning, practical tasks, and personal time for campus days.', [
    ['Start of your campus day', 'Check the day’s essentials', 'Review your commitments and bring what you need.'],
    ['Between activities', 'Handle one small task', 'Reply, review notes, or leave this block open if you need a pause.'],
    ['A suitable break', 'Refuel or get some air', 'Choose a meal, movement, rest, or quiet moment.'],
    ['When you are ready', 'Wrap up or reconnect', 'Finish one small task, meet someone, or head into your next commitment.'],
  ]),
  schedule('employee-flex-day', 'Employee', 'weekday', 'A flexible workday', [1, 2, 3, 4, 5], 'Arrange focus, collaboration, and breaks around your actual working hours and responsibilities.', [
    ['Start of your work period', 'Choose a priority', 'Check meetings and select a realistic next step.'],
    ['First workable focus window', 'Make progress on focused work', 'Use this block only if your workload and schedule allow.'],
    ['Between responsibilities', 'Pause or reset', 'Take a break or handle a practical task that fits the moment.'],
    ['End of your work period', 'Close the loop', 'Capture unfinished items and leave room to disconnect when possible.'],
  ]),
  schedule('employee-meeting-day', 'Employee', 'weekday', 'A meeting-heavy day', [1, 2, 3, 4, 5], 'Keep planning and recovery blocks movable around meetings and team needs.', [
    ['Before the first meeting', 'Check key notes', 'Review the most useful context for your first commitment.'],
    ['Between meetings', 'Capture actions', 'Write down owners or next steps while they are fresh.'],
    ['First open work window', 'Handle one priority task', 'Choose work that fits the length and energy of the window.'],
    ['After the last meeting', 'Reset your workspace', 'Record follow-ups and choose what can wait.'],
  ]),
  schedule('employee-remote-day', 'Employee', 'weekday', 'A work-from-anywhere day', [1, 2, 3, 4, 5], 'Adapt the blocks to home, office, hybrid, or other work settings.', [
    ['Settle into your work setting', 'Prepare for the day', 'Check access, materials, and the commitments that matter.'],
    ['A suitable focus window', 'Work on one task', 'Choose a task that matches the time available and your environment.'],
    ['Midway through your work period', 'Step away if you can', 'Stretch, eat, rest your eyes, or take another useful pause.'],
    ['Before switching contexts', 'Note what comes next', 'Save work and identify a clear restart point.'],
  ]),
  schedule('employee-variable-day', 'Employee', 'weekday', 'A variable workday', [1, 2, 3, 4, 5], 'For days with changing tasks, locations, or availability; shift each block as needed.', [
    ['When the day begins', 'Check what changed', 'Review the current schedule and identify any new constraints.'],
    ['First available window', 'Choose a small priority', 'Select the most useful next action for this block.'],
    ['When there is a gap', 'Take a reset or handle admin', 'Choose based on your energy and current responsibilities.'],
    ['Before you finish', 'Leave a clear handoff', 'Record open items for yourself or your team.'],
  ]),
  schedule('owner-priority-day', 'Business owner', 'weekday', 'A business priority day', [1, 2, 3, 4, 5], 'Balance customer, operational, and planning needs using blocks you can move.', [
    ['Start of your available work period', 'Choose one business priority', 'Consider customer needs, deadlines, and the time you have.'],
    ['First workable focus window', 'Move one priority forward', 'Choose a task you can make progress on without overloading the day.'],
    ['Open admin window', 'Handle essential operations', 'Use this for messages, records, supplies, or another practical need.'],
    ['Before you wrap up', 'Check the next handoff', 'Note follow-ups and decide what can wait.'],
  ]),
  schedule('owner-customer-day', 'Business owner', 'weekday', 'A customer-facing day', [1, 2, 3, 4, 5], 'Leave the timing open around customer demand, appointments, and service work.', [
    ['Before customer work', 'Review the day’s commitments', 'Check appointments, requests, or service needs that are already known.'],
    ['Between customer blocks', 'Record follow-ups', 'Capture details while allowing time for transitions.'],
    ['When demand eases', 'Handle one back-office task', 'Choose admin or preparation that fits the opening.'],
    ['End of your work period', 'Prepare a short handoff', 'Note any customer follow-up or operational item that remains.'],
  ]),
  schedule('owner-planning-day', 'Business owner', 'weekday', 'A planning and operations day', [1, 2, 3, 4, 5], 'Make room for planning while keeping operational work and interruptions in view.', [
    ['Planning window', 'Review current priorities', 'Choose a short list based on current needs and capacity.'],
    ['First open work block', 'Handle one operational task', 'Make progress on a task that supports the business today.'],
    ['A quieter window', 'Review finances or records', 'Choose only the review that is relevant and useful now.'],
    ['Closing moment', 'Choose the next action', 'Leave a note for a future work period.'],
  ]),
  schedule('owner-flex-day', 'Business owner', 'weekday', 'A flexible owner-operator day', [1, 2, 3, 4, 5], 'A movable outline for people balancing several roles or irregular business demands.', [
    ['When you are ready to begin', 'Check the essentials', 'Identify urgent needs and what can be moved.'],
    ['A gap between responsibilities', 'Advance one useful task', 'Choose from operations, service, planning, or leave the time open.'],
    ['A suitable pause', 'Refuel or reset', 'Make room for food, movement, rest, or personal responsibilities.'],
    ['When capacity allows', 'Prepare for the next work window', 'Capture the next step and stop when you need to.'],
  ]),
  schedule('caregiver-flex-day', 'Caregiver', 'weekday', 'A flexible caregiving day', [1, 2, 3, 4, 5, 6, 0], 'Care needs can change quickly; use these as movable prompts and leave blocks open as needed.', [
    ['When the day allows', 'Check immediate needs', 'Review appointments, supplies, or support needs that matter now.'],
    ['During a quiet opening', 'Handle one personal task', 'Choose something small that can be paused or rescheduled.'],
    ['When support is available', 'Take a break for yourself', 'Use the time for rest, a meal, movement, or another need.'],
    ['Before the next transition', 'Prepare one helpful item', 'Only do what fits the care plan and your available energy.'],
  ]),
  schedule('caregiver-appointment-day', 'Caregiver', 'weekday', 'A day with care appointments', [1, 2, 3, 4, 5, 6, 0], 'Adapt around appointments, travel, waiting, and the needs of the person receiving care.', [
    ['Before an appointment', 'Gather useful information', 'Bring questions, documents, or supplies relevant to the visit.'],
    ['Around travel or waiting', 'Leave transition space', 'Allow extra room for changes and rest where possible.'],
    ['After the appointment', 'Capture the next step', 'Record follow-ups or instructions that are useful to remember.'],
    ['When the day settles', 'Check your own needs', 'Choose food, rest, or support if you have the capacity.'],
  ]),
  schedule('caregiver-support-day', 'Caregiver', 'weekday', 'A day with shared support', [1, 2, 3, 4, 5, 6, 0], 'Use only the blocks that fit your support arrangement and the care needs of the day.', [
    ['Before support begins', 'Share key information', 'Pass along routines, contacts, or changes that matter for the handoff.'],
    ['During an available window', 'Choose one personal priority', 'Rest, connect, or handle a task that has been waiting.'],
    ['Before support ends', 'Plan the transition', 'Confirm the next practical step if that is useful.'],
    ['When your day allows', 'Make room to recover', 'Choose a restorative activity without setting a fixed duration.'],
  ]),
  schedule('shift-transition-day', 'Shift & flexible worker', 'weekday', 'A shift transition day', [1, 2, 3, 4, 5, 6, 0], 'Move each block around your actual shift, commute, and recovery needs.', [
    ['Before your shift period', 'Check what you need', 'Review the current commitment and prepare essentials if helpful.'],
    ['During a suitable break', 'Pause and refuel', 'Use the break available to you for food, water, rest, or movement.'],
    ['After the work period', 'Make a gentle transition', 'Choose a quiet activity or practical step that suits your energy.'],
    ['When you are ready to rest', 'Reduce extra demands', 'Leave room for the amount and timing of rest that fits your shift.'],
  ]),
  schedule('shift-variable-week', 'Shift & flexible worker', 'weekday', 'A variable shift week', [1, 2, 3, 4, 5, 6, 0], 'Choose repeat days that match your roster; the blocks do not assume a day or night shift.', [
    ['When you check your roster', 'Mark the next commitment', 'Let your actual shift pattern determine what this week looks like.'],
    ['Before a work period', 'Prepare one practical item', 'Keep this brief and adapt it to the time you have.'],
    ['After a work period', 'Choose a recovery step', 'Rest, eat, connect, or handle a necessary task based on your needs.'],
    ['At a convenient point', 'Review upcoming changes', 'Update selected days or leave the schedule open when shifts change.'],
  ]),
  schedule('flexible-commitments-day', 'Shift & flexible worker', 'weekday', 'A day with changing commitments', [1, 2, 3, 4, 5, 6, 0], 'For rotating, on-call, freelance, or otherwise changing commitments.', [
    ['When your availability is clear', 'Choose one priority', 'Select something that fits the time you actually have.'],
    ['Between commitments', 'Capture what is next', 'Use a note or reminder if several transitions are coming up.'],
    ['When an opening appears', 'Take a useful pause', 'Choose rest, food, movement, or a small practical step.'],
    ['When the plan changes', 'Adjust without penalty', 'Change the selected days or leave a block unused.'],
  ]),
];

export const scheduleTemplates: ScheduleTemplate[] = [...generalSchedules, ...additionalScheduleTemplates];
export const allGoalAndHabitTemplates: (GoalTemplate | HabitTemplate)[] = [...goalTemplates, ...habitTemplates];
export const templateCatalogCounts = {
  goals: goalTemplates.length,
  habits: habitTemplates.length,
  schedules: scheduleTemplates.length,
  total: goalTemplates.length + habitTemplates.length + scheduleTemplates.length,
};
