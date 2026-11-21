import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type { NotificationReminder } from './home-session';

const ownedDataKey = 'daymarkReminderId';
const legacyOwnedDataKey = 'daymarkCategory';
const importanceDataKey = 'daymarkImportance';
const repeatDataKey = 'daymarkRepeat';
const snoozedDataKey = 'daymarkSnoozed';
const reminderChannelId = 'daykindle-reminders-warm-v1';
const importantReminderChannelId = 'daykindle-reminders-important-warm-v1';
const onceReminderCategoryId = 'daykindle_reminder_once';
const dailyReminderCategoryId = 'daykindle_reminder_daily';
const reminderSoundFilename = 'daykindle-reminder-warm.wav';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    const isReminder = Boolean(data?.[ownedDataKey] || data?.[legacyOwnedDataKey]);
    return { shouldShowBanner: true, shouldShowList: true, shouldPlaySound: isReminder, shouldSetBadge: false };
  },
});

export async function requestNotificationPermission() {
  if (Platform.OS === 'web') return { granted: false, reason: 'unsupported' as const };
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  return { granted: permission.granted, reason: permission.granted ? 'granted' as const : 'denied' as const };
}

async function cancelOwnedNotifications(preservedReminderIds: Set<string>) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const preservedSnoozes = scheduled.filter((item) => {
    const data = item.content.data;
    return data?.[snoozedDataKey] === true && typeof data?.[ownedDataKey] === 'string' && preservedReminderIds.has(data[ownedDataKey] as string);
  });
  await Promise.all(scheduled
    .filter((item) => {
      const data = item.content.data;
      const isOwned = data?.[ownedDataKey] || data?.[legacyOwnedDataKey];
      const isPreservedSnooze = data?.[snoozedDataKey] === true && typeof data?.[ownedDataKey] === 'string' && preservedReminderIds.has(data[ownedDataKey] as string);
      return isOwned && !isPreservedSnooze;
    })
    .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
  return preservedSnoozes.length;
}

async function ensureReminderCategory(repeat: NotificationReminder['repeat']) {
  const identifier = repeat === 'daily' ? dailyReminderCategoryId : onceReminderCategoryId;
  await Notifications.setNotificationCategoryAsync(identifier, [
    { identifier: 'snooze_10_minutes', buttonTitle: 'Snooze 10 min', options: { opensAppToForeground: true } },
    { identifier: 'mark_done', buttonTitle: repeat === 'daily' ? 'Done today' : 'Done', options: { opensAppToForeground: true } },
  ]);
  return identifier;
}

async function ensureReminderChannel(important: boolean) {
  if (Platform.OS !== 'android') return undefined;
  const channelId = important ? importantReminderChannelId : reminderChannelId;
  const existingChannel = await Notifications.getNotificationChannelAsync(channelId);
  if (existingChannel) return channelId;

  // Android channel behavior is user-controlled and immutable after creation.
  // Carry a silent or low-importance choice forward to the newly created channel.
  const previousChannel = important
    ? await Notifications.getNotificationChannelAsync(reminderChannelId) ?? await Notifications.getNotificationChannelAsync('default')
    : await Notifications.getNotificationChannelAsync('default');
  const previousChannelWasSilent = Boolean(previousChannel && (
    previousChannel.sound === null ||
    previousChannel.importance === Notifications.AndroidImportance.NONE ||
    previousChannel.importance === Notifications.AndroidImportance.MIN ||
    previousChannel.importance === Notifications.AndroidImportance.LOW
  ));
  await Notifications.setNotificationChannelAsync(channelId, {
    name: important ? 'DayKindle important reminders' : 'DayKindle reminders',
    importance: previousChannelWasSilent
      ? previousChannel?.importance ?? Notifications.AndroidImportance.DEFAULT
      : important ? Notifications.AndroidImportance.HIGH : previousChannel?.importance ?? Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: previousChannel?.vibrationPattern ?? [0, 180, 120, 180],
    enableVibrate: previousChannel?.enableVibrate ?? true,
    enableLights: previousChannel?.enableLights ?? true,
    lightColor: previousChannel?.lightColor || '#587A66',
    sound: previousChannelWasSilent ? null : reminderSoundFilename,
  });
  return channelId;
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
  const preservedSnoozes = await cancelOwnedNotifications(new Set(reminders.map((reminder) => reminder.id)));
  const activeReminders = reminders.filter((reminder) => /^([01]\d|2[0-3]):[0-5]\d$/.test(reminder.time) && (reminder.repeat === 'daily' || (reminder.repeat === 'once' && isValidReminderDate(reminder))));
  if (!activeReminders.length) return { ok: true as const, reason: preservedSnoozes ? 'scheduled' as const : 'disabled' as const };
  const permission = options.requestPermission ? await requestNotificationPermission() : await Notifications.getPermissionsAsync();
  if (!permission.granted) return { ok: false as const, reason: 'reason' in permission ? permission.reason : 'denied' as const };
  const categoryIds = new Map<NotificationReminder['repeat'], string>();
  for (const repeat of new Set(activeReminders.map((reminder) => reminder.repeat))) categoryIds.set(repeat, await ensureReminderCategory(repeat));
  const channelIds = new Map<boolean, string | undefined>();
  for (const important of new Set(activeReminders.map((reminder) => reminder.importance === 'important'))) channelIds.set(important, await ensureReminderChannel(important));
  for (const reminder of activeReminders) {
    const [hourText, minuteText] = reminder.time.split(':');
    const hour = Number(hourText); const minute = Number(minuteText);
    const important = reminder.importance === 'important';
    const channelId = channelIds.get(important);
    const channel = channelId ? { channelId } : {};
    const trigger: Notifications.DailyTriggerInput | Notifications.DateTriggerInput = reminder.repeat === 'daily'
      ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, ...channel }
      : { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(`${reminder.date}T${reminder.time}:00`), ...channel };
    await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: 'Your reminder is due.',
        sound: reminderSoundFilename,
        categoryIdentifier: categoryIds.get(reminder.repeat),
        ...(important ? { sticky: true, autoDismiss: false, interruptionLevel: 'timeSensitive' as const } : {}),
        data: { [ownedDataKey]: reminder.id, [importanceDataKey]: important ? 'important' : 'normal', [repeatDataKey]: reminder.repeat },
      },
      trigger,
    });
  }
  return { ok: true as const, reason: 'scheduled' as const };
}

export async function scheduleSnoozedReminderNotification(notification: Notifications.Notification) {
  if (Platform.OS === 'web') return { ok: false as const, reason: 'unsupported' as const };
  const sourceData = notification.request.content.data;
  const reminderId = sourceData?.[ownedDataKey];
  if (typeof reminderId !== 'string') return { ok: false as const, reason: 'invalid_reminder' as const };
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return { ok: false as const, reason: 'permission_denied' as const };
  const repeat = sourceData?.[repeatDataKey] === 'daily' ? 'daily' : 'once';
  const important = sourceData?.[importanceDataKey] === 'important';
  const categoryIdentifier = await ensureReminderCategory(repeat);
  const channelId = await ensureReminderChannel(important);
  const channel = channelId ? { channelId } : {};
  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.request.content.title ?? 'Reminder',
      body: 'Your snoozed reminder is due.',
      sound: reminderSoundFilename,
      categoryIdentifier,
      ...(important ? { sticky: true, autoDismiss: false, interruptionLevel: 'timeSensitive' as const } : {}),
      data: { ...sourceData, [snoozedDataKey]: true },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + 10 * 60 * 1000),
      ...channel,
    },
  });
  return { ok: true as const };
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
