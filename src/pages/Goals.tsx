import { useEffect, useState } from "react";
import { PageContainer, PageHeader } from "../components/layout/AppShell";
import {
  Card,
  CardHeader,
  DoubleRing,
  Button,
  Input,
  Modal,
  Badge,
  Flame,
  Target,
} from "../components/ui";
import { useAppDispatch, useAppSelector } from "../store";
import {
  fetchGoals,
  updateGoals,
  pauseGoals,
  resumeGoals,
} from "../store/slices/goalsSlice";
import { useToast } from "../components/ui/Toast";
import { formatNumber } from "../lib/utils";

export default function Goals() {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const {
    goals,
    todaySteps,
    weeklySteps,
    dailyProgress,
    weeklyProgress,
    isSubmitting,
  } = useAppSelector((state) => state.goals);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [dailyTarget, setDailyTarget] = useState("");
  const [weeklyTarget, setWeeklyTarget] = useState("");

  useEffect(() => {
    dispatch(fetchGoals());
  }, [dispatch]);

  useEffect(() => {
    if (goals) {
      setDailyTarget(goals.daily_target.toString());
      setWeeklyTarget(goals.weekly_target.toString());
    }
  }, [goals]);

  const handleSaveGoals = async () => {
    const daily = parseInt(dailyTarget, 10);
    const weekly = parseInt(weeklyTarget, 10);

    if (isNaN(daily) || isNaN(weekly)) {
      showToast("error", "Please enter valid numbers");
      return;
    }

    await dispatch(updateGoals({ dailyTarget: daily, weeklyTarget: weekly }));
    setIsEditOpen(false);
    showToast("success", "Goals updated!");
  };

  const handleTogglePause = async () => {
    if (goals?.is_paused) {
      await dispatch(resumeGoals());
      showToast("success", "Goals resumed!");
    } else {
      await dispatch(pauseGoals());
      showToast("info", "Goals paused");
    }
  };

  return (
    <PageContainer className="animate-fade-in">
      <PageHeader
        title="Goals"
        subtitle="Track your daily and weekly progress"
        action={
          <Button variant="ghost" size="sm" onClick={() => setIsEditOpen(true)}>
            Edit
          </Button>
        }
      />

      {/* Main Progress Rings */}
      <Card className="mb-6 animate-slide-up stagger-1">
        <div className="flex flex-col items-center py-6">
          <DoubleRing
            outer={{
              value: todaySteps,
              max: goals?.daily_target || 10000,
              color: "green",
            }}
            inner={{
              value: weeklySteps,
              max: goals?.weekly_target || 70000,
              color: "blue",
            }}
            size="xl"
          >
            <div className="text-center">
              <p className="text-[28px] font-bold tabular-nums text-[var(--color-text-primary)]">
                {formatNumber(todaySteps)}
              </p>
              <p className="text-[12px] text-[var(--color-text-tertiary)]">
                steps today
              </p>
            </div>
          </DoubleRing>

          {/* Legend */}
          <div className="flex items-center justify-center gap-8 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--color-success)]" />
              <div>
                <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
                  Daily
                </p>
                <p className="text-[12px] text-[var(--color-text-tertiary)]">
                  {dailyProgress}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--color-accent)]" />
              <div>
                <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
                  Weekly
                </p>
                <p className="text-[12px] text-[var(--color-text-tertiary)]">
                  {weeklyProgress}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="animate-slide-up stagger-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-success)]/15 flex items-center justify-center">
              <Target className="w-5 h-5 text-[var(--color-success)]" />
            </div>
            <div>
              <p className="text-[17px] font-bold tabular-nums text-[var(--color-text-primary)]">
                {formatNumber(goals?.daily_target || 10000)}
              </p>
              <p className="text-[12px] text-[var(--color-text-tertiary)]">
                Daily Goal
              </p>
            </div>
          </div>
        </Card>

        <Card className="animate-slide-up stagger-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/15 flex items-center justify-center">
              <Target className="w-5 h-5 text-[var(--color-accent)]" />
            </div>
            <div>
              <p className="text-[17px] font-bold tabular-nums text-[var(--color-text-primary)]">
                {formatNumber(goals?.weekly_target || 70000)}
              </p>
              <p className="text-[12px] text-[var(--color-text-tertiary)]">
                Weekly Goal
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Streak Card */}
      <Card className="mb-6 animate-slide-up stagger-4">
        <CardHeader
          title="Streak"
          subtitle="Consecutive days meeting your goal"
        />
        <div className="flex items-center gap-4 mt-4">
          <div className="w-14 h-14 rounded-full bg-[var(--color-warning)]/15 flex items-center justify-center">
            <Flame className="w-7 h-7 text-[var(--color-warning)]" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-[28px] font-bold tabular-nums text-[var(--color-text-primary)]">
                {goals?.current_streak || 0}
              </span>
              <span className="text-[var(--color-text-secondary)]">days</span>
            </div>
            <p className="text-[14px] text-[var(--color-text-tertiary)]">
              Longest: {goals?.longest_streak || 0} days
            </p>
          </div>
          {goals?.is_paused && <Badge variant="warning">Paused</Badge>}
        </div>
      </Card>

      {/* Pause/Resume Button */}
      <Button
        variant="secondary"
        fullWidth
        onClick={handleTogglePause}
        className="animate-slide-up stagger-5"
      >
        {goals?.is_paused ? "Resume Goals" : "Pause Goals"}
      </Button>

      {/* Edit Goals Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Goals"
      >
        <div className="space-y-4">
          <Input
            label="Daily Step Goal"
            type="number"
            value={dailyTarget}
            onChange={(e) => setDailyTarget(e.target.value)}
            min={1000}
            max={100000}
            hint="Recommended: 10,000 steps"
          />

          <Input
            label="Weekly Step Goal"
            type="number"
            value={weeklyTarget}
            onChange={(e) => setWeeklyTarget(e.target.value)}
            min={7000}
            max={700000}
            hint="Recommended: 70,000 steps"
          />

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              onClick={handleSaveGoals}
              isLoading={isSubmitting}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
