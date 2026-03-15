import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router";
import {
  PageContainer,
  PageHeader,
  LoadingPage,
} from "../components/layout/AppShell";
import { Card, MedalBadge, Clock, Check } from "../components/ui";
import * as api from "../lib/api";
import type { DaySummary, DayRanking } from "../types";
import { REACTION_TYPES, REACTION_EMOJI } from "../../shared/constants";
import type { ReactionType } from "../../shared/constants";

function formatDayDate(dateStr: string): {
  label: string;
  isToday: boolean;
  isYesterday: boolean;
} {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  if (dateOnly.getTime() === today.getTime()) {
    return { label: "Today", isToday: true, isYesterday: false };
  }
  if (dateOnly.getTime() === yesterday.getTime()) {
    return { label: "Yesterday", isToday: false, isYesterday: true };
  }

  const formatted = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return { label: formatted, isToday: false, isYesterday: false };
}

export default function DailyBreakdown() {
  const { id } = useParams<{ id: string }>();
  const challengeId = parseInt(id!, 10);

  const [days, setDays] = useState<DaySummary[]>([]);
  const [challengeTitle, setChallengeTitle] = useState("");
  const [challengeMode, setChallengeMode] = useState<string>("cumulative");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDailyWinner = challengeMode === "daily_winner";

  const handleReaction = async (
    date: string,
    targetUserId: number,
    reactionType: string,
  ) => {
    // Optimistic update
    setDays((prev) =>
      prev.map((day) => {
        if (day.date !== date) return day;
        return {
          ...day,
          rankings: day.rankings.map((r) => {
            if (r.user_id !== targetUserId) return r;
            const isRemoving = r.user_reactions.includes(reactionType);
            const newReactions = { ...r.reactions };
            const currentCount = newReactions[reactionType] ?? 0;
            if (isRemoving) {
              newReactions[reactionType] = Math.max(0, currentCount - 1);
            } else {
              newReactions[reactionType] = currentCount + 1;
            }
            const newUserReactions = isRemoving
              ? r.user_reactions.filter((t) => t !== reactionType)
              : [...r.user_reactions, reactionType];
            return {
              ...r,
              reactions: newReactions,
              user_reactions: newUserReactions,
            };
          }),
        };
      }),
    );

    await api.toggleReaction(challengeId, targetUserId, date, reactionType);
  };

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      const response = await api.getDailyBreakdown(challengeId);
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setDays(response.data.days);
        setChallengeTitle(response.data.challenge_title);
        setChallengeMode(response.data.mode);
      }
      setIsLoading(false);
    }
    fetchData();
  }, [challengeId]);

  if (isLoading) {
    return <LoadingPage />;
  }

  if (error) {
    return (
      <PageContainer>
        <PageHeader title="Daily Breakdown" backButton />
        <Card>
          <p className="text-center text-[var(--color-error)]">{error}</p>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="animate-fade-in">
      <PageHeader
        title="Daily Breakdown"
        subtitle={challengeTitle}
        backButton
      />

      {days.length === 0 ? (
        <Card>
          <p className="text-center text-[var(--color-text-secondary)]">
            No results yet. The challenge hasn't started or no steps have been
            logged.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {days.map((day, index) => {
            const {
              label: dateLabel,
              isToday,
              isYesterday,
            } = formatDayDate(day.date);
            const isPending = day.status === "pending";

            return (
              <Card
                key={day.date}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[17px] font-semibold text-[var(--color-text-primary)]">
                    {dateLabel}
                    {isPending && isToday && " (Pending)"}
                  </span>
                  {isPending ? (
                    <span className="flex items-center gap-1.5 text-[13px] text-[var(--color-warning)]">
                      <Clock className="w-4 h-4" />
                      Pending
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[13px] text-[var(--color-success)]">
                      <Check className="w-4 h-4" />
                      Final
                    </span>
                  )}
                </div>

                {isPending && isDailyWinner && (
                  <p className="text-[13px] text-[var(--color-text-tertiary)] mb-4">
                    Points will be awarded at noon{" "}
                    {isYesterday ? "today" : "tomorrow"}
                  </p>
                )}

                {/* Rankings */}
                <div className="space-y-3">
                  {day.rankings.map((entry) => (
                    <RankingRow
                      key={entry.user_id}
                      entry={entry}
                      date={day.date}
                      isPending={isPending}
                      isDailyWinner={isDailyWinner}
                      onReact={handleReaction}
                    />
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}

function RankingRow({
  entry,
  date,
  isPending,
  isDailyWinner,
  onReact,
}: {
  entry: DayRanking;
  date: string;
  isPending: boolean;
  isDailyWinner: boolean;
  onReact: (date: string, targetUserId: number, reactionType: string) => void;
}) {
  const isTopThree = entry.rank <= 3;
  const earnedPoints = isDailyWinner && !isPending && entry.points > 0;
  const showReactions = !isPending && !entry.is_current_user;

  const [pickerOpen, setPickerOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const isTouchDevice = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!showReactions) return;
    if (e.pointerType === "touch") {
      isTouchDevice.current = true;
      longPressTimer.current = setTimeout(() => {
        setPickerOpen((prev) => !prev);
      }, 500);
    }
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleRowClick = () => {
    if (!showReactions || isTouchDevice.current) {
      isTouchDevice.current = false;
      return;
    }
    setPickerOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!pickerOpen) return;
    function handleClick(e: MouseEvent) {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [pickerOpen]);

  const activeReactions = showReactions
    ? Object.entries(entry.reactions).filter(([, count]) => count > 0)
    : [];

  return (
    <div ref={rowRef}>
      <div
        onClick={handleRowClick}
        onPointerDown={handlePointerDown}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        className={showReactions ? "cursor-pointer select-none" : undefined}
      >
        <div className="flex items-center gap-3">
          {/* Rank */}
          <div className="w-8 flex justify-center">
            {isTopThree ? (
              <MedalBadge position={entry.rank as 1 | 2 | 3} size="sm" />
            ) : (
              <span className="text-[14px] font-semibold text-[var(--color-text-tertiary)] tabular-nums">
                {entry.rank}
              </span>
            )}
          </div>

          {/* Name */}
          <span className="flex-1 text-[15px] text-[var(--color-text-primary)] truncate">
            {entry.name}
          </span>

          {/* Steps */}
          <span className="text-[15px] text-[var(--color-text-secondary)] tabular-nums">
            {entry.steps != null
              ? `${entry.steps.toLocaleString()} steps`
              : "—"}
          </span>

          {/* Points (only if finalized and earned) */}
          {earnedPoints && (
            <span className="text-[14px] font-semibold text-[var(--color-accent)] tabular-nums min-w-[60px] text-right">
              +{entry.points} pt{entry.points !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Reaction pills */}
      {activeReactions.length > 0 && (
        <div className="flex items-center gap-1.5 mt-1.5 ml-8 flex-wrap">
          {activeReactions.map(([type, count]) => {
            const isOwn = entry.user_reactions.includes(type);
            return (
              <button
                key={type}
                onClick={() => onReact(date, entry.user_id, type)}
                className={
                  "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[12px] transition-colors " +
                  (isOwn
                    ? "bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30"
                    : "bg-[var(--color-surface-secondary)] border border-transparent")
                }
              >
                <span>{REACTION_EMOJI[type as ReactionType]}</span>
                <span className="tabular-nums text-[var(--color-text-secondary)]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Reaction picker */}
      {pickerOpen && showReactions && (
        <div className="flex gap-1 mt-1.5 ml-8 p-1 bg-[var(--color-surface-secondary)] rounded-xl animate-slide-up">
          {REACTION_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => {
                onReact(date, entry.user_id, type);
                setPickerOpen(false);
              }}
              className="flex-1 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface)] active:scale-95 transition-all text-[20px]"
            >
              {REACTION_EMOJI[type]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
