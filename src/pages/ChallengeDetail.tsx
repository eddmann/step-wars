import { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { PageContainer, PageHeader, LoadingPage } from "../components/layout/AppShell";
import {
  Card,
  CardHeader,
  CardGroup,
  CardRow,
  Button,
  Badge,
  Podium,
  LeaderboardRow,
  Calendar,
  Users,
  Copy,
  Share2,
  ChevronRight,
  TransitionLink,
} from "../components/ui";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchChallenge, fetchLeaderboard } from "../store/slices/challengesSlice";
import { useToast } from "../components/ui/Toast";
import { formatDate, copyToClipboard } from "../lib/utils";

// Format a date as "Yesterday" or "Mon, Jan 13"
function formatLastFinalizedLabel(dateStr: string | null): string {
  if (!dateStr) return "";

  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  if (dateOnly.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function ChallengeDetail() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { currentChallenge, leaderboard, lastFinalizedDate, isLoading } = useAppSelector(
    (state) => state.challenges
  );

  const challengeId = parseInt(id!, 10);

  // Memoize the date label to avoid recalculating on every render
  const lastFinalizedLabel = useMemo(
    () => formatLastFinalizedLabel(lastFinalizedDate),
    [lastFinalizedDate]
  );

  useEffect(() => {
    if (challengeId) {
      dispatch(fetchChallenge(challengeId));
      dispatch(fetchLeaderboard(challengeId));
    }
  }, [challengeId, dispatch]);

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
            <Badge variant={currentChallenge.status === "active" ? "success" : currentChallenge.status === "pending" ? "warning" : "default"}>
              {currentChallenge.status === "active" ? "Active" : currentChallenge.status === "pending" ? "Upcoming" : "Completed"}
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
                lastFinalizedSteps={entry.last_finalized_steps}
                lastFinalizedLabel={lastFinalizedLabel}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-[var(--color-text-tertiary)]">
            No entries yet. Log your steps from the Dashboard!
          </div>
        )}
      </Card>

      {/* Daily Breakdown Link */}
      <CardGroup className="mb-6 animate-slide-up stagger-4">
        <CardRow onClick={() => navigate(`/challenges/${challengeId}/daily-breakdown`)}>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-[var(--color-text-tertiary)]" />
            <span className="text-[var(--color-text-primary)]">
              View Daily Breakdown
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-[var(--color-text-tertiary)]" />
        </CardRow>
      </CardGroup>

      {/* Link to Dashboard for logging steps */}
      {currentChallenge.status === "active" && (
        <TransitionLink to="/" className="block animate-slide-up stagger-5">
          <Button fullWidth variant="secondary">
            Log Steps from Dashboard
          </Button>
        </TransitionLink>
      )}
    </PageContainer>
  );
}
