import type { Result } from "../utils/result";
import { ok } from "../utils/result";
import type { UseCaseError } from "./errors";
import type { NotificationRepository } from "../repositories/interfaces/notification.repository";

export interface MarkNotificationsReadDeps {
  notificationRepository: NotificationRepository;
}

export interface MarkNotificationsReadInput {
  userId: number;
  notificationIds: number[];
}

export async function markNotificationsRead(
  deps: MarkNotificationsReadDeps,
  input: MarkNotificationsReadInput,
): Promise<Result<{ success: true }, UseCaseError>> {
  await deps.notificationRepository.markAsRead(
    input.userId,
    input.notificationIds,
  );
  return ok({ success: true });
}
