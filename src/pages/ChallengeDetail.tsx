import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { PageContainer, PageHeader, LoadingPage } from "../components/layout/AppShell";
import {
  Card,
  CardHeader,
  Button,
  Input,
  Modal,
  Badge,
  Podium,
  LeaderboardRow,
  Calendar,
  Users,
  Copy,
  Share2,
} from "../components/ui";
import { useAppDispatch, useAppSelector } from "../store";
import {
  fetchChallenge,
  fetchLeaderboard,
  fetchEntries,
  submitSteps,
} from "../store/slices/challengesSlice";
import { useToast } from "../components/ui/Toast";
import { formatDate, getToday, getYesterday, canEditDate, copyToClipboard } from "../lib/utils";

export default function ChallengeDetail() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { currentChallenge, leaderboard, entries, isLoading, isSubmitting } = useAppSelector(
    (state) => state.challenges
  );

  const [isLogOpen, setIsLogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [stepCount, setStepCount] = useState("");

  const challengeId = parseInt(id!, 10);

  useEffect(() => {
    if (challengeId) {
      dispatch(fetchChallenge(challengeId));
      dispatch(fetchLeaderboard(challengeId));
      dispatch(fetchEntries(challengeId));
    }
  }, [challengeId, dispatch]);

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

    const result = await dispatch(
      submitSteps({ challengeId, date: selectedDate, stepCount: steps })
    );

    if (submitSteps.fulfilled.match(result)) {
      setIsLogOpen(false);
      setStepCount("");
      showToast("success", "Steps logged!");
      dispatch(fetchLeaderboard(challengeId));
    }
  };

  const handleCopyInviteCode = async () => {
    if (currentChallenge?.invite_code) {
      const success = await copyToClipboard(currentChallenge.invite_code);
      if (success) {
        showToast("success", "Invite code copied!");
      }
    }
  };

  const handleShare = async () => {
    if (currentChallenge && navigator.share) {
      try {
        await navigator.share({
          title: currentChallenge.title,
          text: `Join my Step Wars challenge! Use code: ${currentChallenge.invite_code}`,
        });
      } catch {
        handleCopyInviteCode();
      }
    } else {
      handleCopyInviteCode();
    }
  };

  if (isLoading || !currentChallenge) {
    return <LoadingPage />;
  }

  const top3 = leaderboard.slice(0, 3);
  const currentUserEntry = entries.find((e) => e.date === getToday());

  return (
    <PageContainer className="animate-fade-in">
      <PageHeader
        title={currentChallenge.title}
        subtitle={currentChallenge.description || undefined}
        backButton
        action={
          <Button variant="ghost" size="sm" onClick={handleShare}>
            <Share2 className="w-5 h-5" />
          </Button>
        }
      />

      {/* Challenge Info */}
      <Card className="mb-6 animate-slide-up stagger-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant={currentChallenge.status === "active" ? "success" : "default"}>
              {currentChallenge.status}
            </Badge>
            <Badge variant="info">
              {currentChallenge.mode === "daily_winner" ? "Daily Winner" : "Cumulative"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-6 mt-4 text-[14px] text-[var(--color-text-secondary)]">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {formatDate(currentChallenge.start_date)} - {formatDate(currentChallenge.end_date)}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            {currentChallenge.participant_count} participants
          </span>
        </div>

        {/* Invite Code */}
        <div className="mt-4 p-3 bg-[var(--color-surface-secondary)] rounded-[var(--radius-md)]">
          <p className="text-[12px] text-[var(--color-text-tertiary)] mb-1">
            Invite Code
          </p>
          <div className="flex items-center justify-between">
            <span className="text-[17px] font-mono font-bold tracking-widest text-[var(--color-text-primary)]">
              {currentChallenge.invite_code}
            </span>
            <Button variant="ghost" size="sm" onClick={handleCopyInviteCode}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Podium */}
      {leaderboard.length >= 3 && (
        <Card className="mb-6 animate-slide-up stagger-2">
          <Podium
            first={
              top3[0]
                ? {
                    name: top3[0].name,
                    value: top3[0].total_steps,
                    isCurrentUser: top3[0].is_current_user,
                  }
                : undefined
            }
            second={
              top3[1]
                ? {
                    name: top3[1].name,
                    value: top3[1].total_steps,
                    isCurrentUser: top3[1].is_current_user,
                  }
                : undefined
            }
            third={
              top3[2]
                ? {
                    name: top3[2].name,
                    value: top3[2].total_steps,
                    isCurrentUser: top3[2].is_current_user,
                  }
                : undefined
            }
          />
        </Card>
      )}

      {/* Full Leaderboard */}
      <Card className="mb-6 animate-slide-up stagger-3" padding="none">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <CardHeader
            title="Leaderboard"
            subtitle={
              currentChallenge.mode === "daily_winner" ? "Points awarded daily" : "Total steps"
            }
          />
        </div>

        {leaderboard.length > 0 ? (
          <div className="divide-y divide-[var(--color-border)]">
            {leaderboard.map((entry) => (
              <LeaderboardRow
                key={entry.user_id}
                rank={entry.rank}
                name={entry.name}
                value={
                  currentChallenge.mode === "daily_winner"
                    ? entry.total_points
                    : entry.total_steps
                }
                valueLabel={currentChallenge.mode === "daily_winner" ? "points" : "steps"}
                isCurrentUser={entry.is_current_user}
                todayValue={entry.today_steps}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-[var(--color-text-tertiary)]">
            No entries yet. Be the first to log your steps!
          </div>
        )}
      </Card>

      {/* Log Steps Button */}
      {currentChallenge.status === "active" && (
        <Button
          fullWidth
          onClick={() => setIsLogOpen(true)}
          className="animate-slide-up stagger-4"
        >
          Log Steps
        </Button>
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

          {currentUserEntry && selectedDate === getToday() && (
            <p className="text-[14px] text-[var(--color-text-secondary)]">
              Current entry: {currentUserEntry.step_count.toLocaleString()} steps
            </p>
          )}

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
