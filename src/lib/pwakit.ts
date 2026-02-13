import { isNative, haptics, ios, push } from "@eddmann/pwa-kit-sdk";

export const isPWAKit = isNative;

const REMINDER_NOTIFICATION_ID = "daily-step-reminder";

export async function initHealthKit(): Promise<boolean> {
  try {
    const { available } = await ios.healthKit.isAvailable();
    if (!available) return false;

    const { success } = await ios.healthKit.requestAuthorization({
      read: ["stepCount"],
    });
    return success;
  } catch {
    return false;
  }
}

export async function queryStepsForDate(date: string): Promise<number> {
  const startDate = `${date}T00:00:00Z`;
  const endDate = `${date}T23:59:59Z`;

  const { totalSteps } = await ios.healthKit.queryStepCount({
    startDate,
    endDate,
  });

  return Math.round(totalSteps);
}

export async function isStepReminderScheduled(): Promise<boolean> {
  const pending = await ios.notifications.getPending();
  return pending.some((n) => n.id === REMINDER_NOTIFICATION_ID);
}

export async function scheduleStepReminder(): Promise<boolean> {
  const permission = await push.requestPermission();
  if (permission !== "granted") return false;

  await ios.notifications.schedule({
    id: REMINDER_NOTIFICATION_ID,
    title: "Step Wars",
    body: "Open the app to sync your steps from Health!",
    sound: "default",
    trigger: {
      type: "calendar",
      hour: 8,
      minute: 0,
      repeats: true,
    },
  });

  return true;
}

export async function cancelStepReminder(): Promise<void> {
  await ios.notifications.cancel(REMINDER_NOTIFICATION_ID);
}

export async function triggerSyncHaptic(): Promise<void> {
  await haptics.notification("success");
}
