import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { PageContainer, PageHeader, LoadingPage } from "../components/layout/AppShell";
import { Card, MedalBadge, Clock, Check } from "../components/ui";
import * as api from "../lib/api";
import type { DaySummary } from "../types";

function formatDayDate(dateStr: string): { label: string; isToday: boolean; isYesterday: boolean } {
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
            No results yet. The challenge hasn't started or no steps have been logged.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {days.map((day, index) => {
            const { label: dateLabel, isToday } = formatDayDate(day.date);
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
                    Points will be awarded at noon tomorrow
                  </p>
                )}

                {/* Rankings */}
                <div className="space-y-3">
                  {day.rankings.map((entry) => {
                    const isTopThree = entry.rank <= 3;
                    const earnedPoints = isDailyWinner && !isPending && entry.points > 0;

                    return (
                      <div
                        key={entry.user_id}
                        className="flex items-center gap-3"
                      >
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
                          {entry.steps.toLocaleString()} steps
                        </span>

                        {/* Points (only if finalized and earned) */}
                        {earnedPoints && (
                          <span className="text-[14px] font-semibold text-[var(--color-accent)] tabular-nums min-w-[60px] text-right">
                            +{entry.points} pt{entry.points !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
