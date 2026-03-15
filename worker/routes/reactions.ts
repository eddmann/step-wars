import type { Context } from "hono";
import type { AppBindings } from "../types";
import { createD1ParticipantRepository } from "../repositories/d1/participant.d1";
import { createD1ReactionRepository } from "../repositories/d1/reaction.d1";
import { createD1NotificationRepository } from "../repositories/d1/notification.d1";
import { toggleReaction } from "../usecases/toggle-reaction.usecase";
import { errorToHttpStatus, errorToMessage } from "../usecases/errors";

// POST /api/challenges/:id/reactions
export async function handleToggleReaction(c: Context<AppBindings>) {
  const user = c.get("user");
  const challengeId = parseInt(c.req.param("id"), 10);
  const body = await c.req.json<{
    target_user_id: number;
    date: string;
    reaction_type: string;
  }>();

  if (!body.target_user_id || !body.date || !body.reaction_type) {
    return c.json(
      { error: "target_user_id, date, and reaction_type are required" },
      400,
    );
  }

  const participantRepository = createD1ParticipantRepository(c.env);
  const reactionRepository = createD1ReactionRepository(c.env);
  const notificationRepository = createD1NotificationRepository(c.env);

  const result = await toggleReaction(
    { participantRepository, reactionRepository, notificationRepository },
    {
      reactorUserId: user.id,
      reactorName: user.name,
      targetUserId: body.target_user_id,
      challengeId,
      date: body.date,
      reactionType: body.reaction_type,
    },
  );

  if (!result.ok) {
    return c.json(
      { error: errorToMessage(result.error) },
      errorToHttpStatus(result.error),
    );
  }

  return c.json({ data: result.value });
}
