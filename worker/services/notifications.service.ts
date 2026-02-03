import type { NotificationRepository } from "../repositories/interfaces/notification.repository";

export interface NotificationServiceDeps {
  notificationRepository: NotificationRepository;
}

export async function createNotification(
  deps: NotificationServiceDeps,
  userId: number,
  type: string,
  title: string,
  message: string,
  badgeType: string | null,
  challengeId: number | null,
): Promise<void> {
  await deps.notificationRepository.create(
    userId,
    type,
    title,
    message,
    badgeType,
    challengeId,
  );
}
