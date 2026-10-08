import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type { NotificationReminder } from './home-session';

const ownedDataKey = 'daymarkReminderId';
const legacyOwnedDataKey = 'daymarkCategory';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function requestNotificationPermission() {
  if (Platform.OS === 'web') return { granted: false, reason: 'unsupported' as const };
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  return { granted: permission.granted, reason: permission.granted ? 'granted' as const : 'denied' as const };
}

async function cancelOwnedNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter((item) => item.content.data?.[ownedDataKey] || item.content.data?.[legacyOwnedDataKey]).map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
}

function isValidReminderDate(reminder: NotificationReminder) {
  if (!reminder.date || !/^\d{4}-\d{2}-\d{2}$/.test(reminder.date)) return false;
  const date = new Date(`${reminder.date}T${reminder.time}:00`);
  const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return Number.isFinite(date.getTime()) && formattedDate === reminder.date && date.getTime() > Date.now();
}

let syncQueue: Promise<void> = Promise.resolve();

export function syncLocalNotifications(reminders: NotificationReminder[], options: { requestPermission?: boolean } = {}) {
  const operation = syncQueue.then(() => syncLocalNotificationsNow(reminders, options), () => syncLocalNotificationsNow(reminders, options));
  syncQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

async function syncLocalNotificationsNow(reminders: NotificationReminder[], options: { requestPermission?: boolean }) {
  if (Platform.OS === 'web') return { ok: false as const, reason: 'unsupported' as const };
  await cancelOwnedNotifications();
  const activeReminders = reminders.filter((reminder) => /^([01]\d|2[0-3]):[0-5]\d$/.test(reminder.time) && (reminder.repeat === 'daily' || (reminder.repeat === 'once' && isValidReminderDate(reminder))));
  if (!activeReminders.length) return { ok: true as const, reason: 'disabled' as const };
  const permission = options.requestPermission ? await requestNotificationPermission() : await Notifications.getPermissionsAsync();
  if (!permission.granted) return { ok: false as const, reason: 'reason' in permission ? permission.reason : 'denied' as const };
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', { name: 'DayKindle reminders', importance: Notifications.AndroidImportance.DEFAULT, vibrationPattern: [0, 180, 120, 180], lightColor: '#587A66' });
  for (const reminder of activeReminders) {
    const [hourText, minuteText] = reminder.time.split(':');
    const hour = Number(hourText); const minute = Number(minuteText);
    const channel = Platform.OS === 'android' ? { channelId: 'default' } : {};
    const trigger: Notifications.DailyTriggerInput | Notifications.DateTriggerInput = reminder.repeat === 'daily'
      ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, ...channel }
      : { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(`${reminder.date}T${reminder.time}:00`), ...channel };
    await Notifications.scheduleNotificationAsync({
      content: { title: reminder.title, body: 'Your reminder is due.', data: { [ownedDataKey]: reminder.id } },
      trigger,
    });
  }
  return { ok: true as const, reason: 'scheduled' as const };
}

export async function registerPushToken() {
  if (Platform.OS === 'web') return { ok: false as const, reason: 'unsupported' as const };
  if (!Device.isDevice) return { ok: false as const, reason: 'physical_device_required' as const };
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return { ok: false as const, reason: 'project_id_missing' as const };
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', { name: 'DayKindle reminders', importance: Notifications.AndroidImportance.DEFAULT, vibrationPattern: [0, 180, 120, 180], lightColor: '#587A66' });
  const permission = await requestNotificationPermission();
  if (!permission.granted) return { ok: false as const, reason: 'permission_denied' as const };
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    return { ok: true as const, token: result.data };
  } catch {
    return { ok: false as const, reason: 'registration_failed' as const };
  }
}
