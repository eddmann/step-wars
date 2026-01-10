import { useEffect, useState, useRef } from "react";
import { PageContainer } from "../components/layout/AppShell";
import {
  Card,
  RingProgress,
  Badge,
  ChevronRight,
  Trophy,
  Flame,
  TransitionLink,
  Button,
  Modal,
  Input,
} from "../components/ui";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchGoals, submitSteps, markNotificationsAsRead } from "../store/slices/goalsSlice";
import { fetchChallenges } from "../store/slices/challengesSlice";
import { getGreeting, formatNumber, getToday, getYesterday, canEditDate, formatDate } from "../lib/utils";
import { useToast } from "../components/ui/Toast";

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { user } = useAppSelector((state) => state.auth);
  const { goals, todaySteps, dailyProgress, isSubmitting, notifications } = useAppSelector((state) => state.goals);
  const { challenges } = useAppSelector((state) => state.challenges);

  const [isLogOpen, setIsLogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [stepCount, setStepCount] = useState("");

  // Track which notifications we've shown to avoid duplicates
  const shownNotifications = useRef<Set<number>>(new Set());

  useEffect(() => {
    dispatch(fetchGoals());
    dispatch(fetchChallenges());
  }, [dispatch]);

  // Show toast notifications for pending notifications
  useEffect(() => {
    if (notifications.length > 0) {
      const unshownNotifications = notifications.filter(
        (n) => !shownNotifications.current.has(n.id)
      );

      if (unshownNotifications.length > 0) {
        // Mark as shown
        const ids = unshownNotifications.map((n) => n.id);
        ids.forEach((id) => shownNotifications.current.add(id));

        // Show each toast with a slight delay between them
        unshownNotifications.forEach((notification, index) => {
          setTimeout(() => {
            showToast("success", `${notification.title} ${notification.message}`);
          }, index * 500);
        });

        // Mark as read in the backend
        dispatch(markNotificationsAsRead(ids));
      }
    }
  }, [notifications, dispatch, showToast]);

  // Pre-fill step count when opening modal
  useEffect(() => {
    if (isLogOpen && selectedDate === getToday()) {
      setStepCount(todaySteps > 0 ? todaySteps.toString() : "");
    }
  }, [isLogOpen, selectedDate, todaySteps]);

  const handleSubmitSteps = async () => {
    const steps = parseInt(stepCount, 10);
    if (isNaN(steps) || steps < 0) {
      showToast("error", "Please enter a valid step count");
      return;
    }

    if (!canEditDate(selectedDate)) {
      showToast("error", "Cannot edit steps for this date");
      return;
    }

    const result = await dispatch(submitSteps({ date: selectedDate, stepCount: steps }));

    if (submitSteps.fulfilled.match(result)) {
      setIsLogOpen(false);
      setStepCount("");
      showToast("success", "Steps logged!");
    } else {
      showToast("error", result.payload as string || "Failed to log steps");
    }
  };

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
      <Card className="mb-4 animate-slide-up stagger-1">
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

      {/* Log Steps Button */}
      <Button
        fullWidth
        onClick={() => setIsLogOpen(true)}
        className="mb-6 animate-slide-up stagger-2"
      >
        Log Today's Steps
      </Button>

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

      {/* Log Steps Modal */}
      <Modal isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} title="Log Steps">
        <div className="space-y-4">
          {/* Quick Date Buttons */}
          <div>
            <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
              Date
            </label>
            <div className="flex gap-2">
              <Button
                variant={selectedDate === getToday() ? "primary" : "secondary"}
                size="sm"
                onClick={() => setSelectedDate(getToday())}
              >
                Today
              </Button>
              {canEditDate(getYesterday()) && (
                <Button
                  variant={selectedDate === getYesterday() ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setSelectedDate(getYesterday())}
                >
                  Yesterday
                </Button>
              )}
            </div>
            <p className="text-[12px] text-[var(--color-text-tertiary)] mt-1">
              {formatDate(selectedDate)}
            </p>
          </div>

          <Input
            label="Step Count"
            type="number"
            placeholder="10000"
            value={stepCount}
            onChange={(e) => setStepCount(e.target.value)}
            min={0}
            max={100000}
          />

          <p className="text-[13px] text-[var(--color-text-tertiary)]">
            Your steps will count toward all active challenges.
          </p>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setIsLogOpen(false)}>
              Cancel
            </Button>
            <Button fullWidth onClick={handleSubmitSteps} isLoading={isSubmitting}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
