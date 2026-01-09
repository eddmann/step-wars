import { useEffect } from "react";
import { PageContainer } from "../components/layout/AppShell";
import { Card, RingProgress, Badge, ChevronRight, Trophy, Flame, TransitionLink } from "../components/ui";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchGoals } from "../store/slices/goalsSlice";
import { fetchChallenges } from "../store/slices/challengesSlice";
import { getGreeting, formatNumber } from "../lib/utils";

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { goals, todaySteps, dailyProgress } = useAppSelector((state) => state.goals);
  const { challenges } = useAppSelector((state) => state.challenges);

  useEffect(() => {
    dispatch(fetchGoals());
    dispatch(fetchChallenges());
  }, [dispatch]);

  const activeChallenges = challenges.filter(
    (c) => c.status === "active" || c.status === "pending"
  );
  const firstName = user?.name.split(" ")[0] || "there";

  return (
    <PageContainer className="animate-fade-in">
      {/* Greeting */}
      <div className="mb-6">
        <p className="text-[var(--color-text-secondary)] text-[14px]">
          {getGreeting()}
        </p>
        <h1 className="text-[28px] font-bold text-[var(--color-text-primary)]">
          {firstName}
        </h1>
      </div>

      {/* Main Activity Ring */}
      <Card className="mb-6 animate-slide-up stagger-1">
        <div className="flex flex-col items-center py-4">
          <RingProgress
            value={todaySteps}
            max={goals?.daily_target || 10000}
            size="xl"
            color="green"
            label="steps today"
          />

          <div className="flex items-center justify-center gap-6 mt-6 w-full">
            <div className="text-center">
              <p className="text-[24px] font-bold tabular-nums text-[var(--color-text-primary)]">
                {formatNumber(goals?.daily_target || 10000)}
              </p>
              <p className="text-[12px] text-[var(--color-text-tertiary)]">
                Daily Goal
              </p>
            </div>

            <div className="w-px h-10 bg-[var(--color-border)]" />

            <div className="text-center">
              <p className="text-[24px] font-bold tabular-nums text-[var(--color-text-primary)]">
                {dailyProgress}%
              </p>
              <p className="text-[12px] text-[var(--color-text-tertiary)]">
                Complete
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Streak Card */}
      {goals && goals.current_streak > 0 && (
        <Card className="mb-6 animate-slide-up stagger-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--color-warning)]/15 flex items-center justify-center">
              <Flame className="w-6 h-6 text-[var(--color-warning)]" />
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                {goals.current_streak} day streak!
              </p>
              <p className="text-[13px] text-[var(--color-text-secondary)]">
                Keep it going!
              </p>
            </div>
            {goals.longest_streak > goals.current_streak && (
              <Badge variant="gold">
                Best: {goals.longest_streak}
              </Badge>
            )}
          </div>
        </Card>
      )}

      {/* Active Challenges */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[17px] font-semibold text-[var(--color-text-primary)]">
          Active Challenges
        </h2>
        <TransitionLink
          to="/challenges"
          className="text-[14px] font-medium text-[var(--color-accent)] flex items-center gap-0.5"
        >
          See All
          <ChevronRight className="w-4 h-4" />
        </TransitionLink>
      </div>

      {activeChallenges.length > 0 ? (
        <div className="space-y-3">
          {activeChallenges.slice(0, 3).map((challenge, idx) => (
            <TransitionLink
              key={challenge.id}
              to={`/challenges/${challenge.id}`}
              className="block animate-slide-up"
              style={{ animationDelay: `${(idx + 3) * 50}ms` }}
            >
              <Card className="press-effect hover:shadow-[var(--shadow-md)] transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[var(--color-accent)]/12 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-[var(--color-accent)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-[var(--color-text-primary)] truncate">
                      {challenge.title}
                    </p>
                    <p className="text-[13px] text-[var(--color-text-secondary)]">
                      {challenge.participant_count} participants
                    </p>
                  </div>
                  <Badge variant={challenge.status === "active" ? "success" : "default"}>
                    {challenge.status === "active" ? "Active" : "Pending"}
                  </Badge>
                  <ChevronRight className="w-5 h-5 text-[var(--color-text-tertiary)]" />
                </div>
              </Card>
            </TransitionLink>
          ))}
        </div>
      ) : (
        <Card className="animate-slide-up stagger-3">
          <div className="py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-6 h-6 text-[var(--color-text-tertiary)]" />
            </div>
            <p className="text-[var(--color-text-secondary)]">
              No active challenges
            </p>
            <TransitionLink
              to="/challenges"
              className="inline-block mt-3 text-[14px] font-medium text-[var(--color-accent)]"
            >
              Start a challenge
            </TransitionLink>
          </div>
        </Card>
      )}
    </PageContainer>
  );
}
