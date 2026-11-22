import type { NotificationReminder } from './home-session';

export type CheckInPeriod = 'morning' | 'evening';

export const CHECK_IN_REMINDER_IDS: Record<CheckInPeriod, string> = {
  morning: 'checkin-morning',
  evening: 'checkin-evening',
};

// The evening check-in fires this many minutes before the saved sleep time.
export const EVENING_CHECK_IN_LEAD_MINUTES = 60;

const CLOCK_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isClockTime(value: unknown): value is string {
  return typeof value === 'string' && CLOCK_TIME.test(value);
}

export function eveningCheckInTime(sleepTime: string, leadMinutes = EVENING_CHECK_IN_LEAD_MINUTES) {
  const [hours, minutes] = sleepTime.split(':').map(Number);
  const dayMinutes = 24 * 60;
  const total = ((hours * 60 + minutes - leadMinutes) % dayMinutes + dayMinutes) % dayMinutes;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

// Builds the daily check-in reminders for whichever times are set. Unset times produce no reminder.
export function buildCheckInReminders({ wakeTime, sleepTime }: { wakeTime?: string; sleepTime?: string }): NotificationReminder[] {
  const reminders: NotificationReminder[] = [];
  if (isClockTime(wakeTime)) {
    reminders.push({ id: CHECK_IN_REMINDER_IDS.morning, title: 'Morning check-in', time: wakeTime, repeat: 'daily', importance: 'normal', checkInPeriod: 'morning' });
  }
  if (isClockTime(sleepTime)) {
    reminders.push({ id: CHECK_IN_REMINDER_IDS.evening, title: 'Evening check-in', time: eveningCheckInTime(sleepTime), repeat: 'daily', importance: 'normal', checkInPeriod: 'evening' });
  }
  return reminders;
}

// Replaces every check-in reminder in the list with the given set, keeping all other reminders as they are.
export function replaceCheckInReminders(reminders: NotificationReminder[], checkInReminders: NotificationReminder[]) {
  return [...reminders.filter((reminder) => !reminder.checkInPeriod), ...checkInReminders];
}
