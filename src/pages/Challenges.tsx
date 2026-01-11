import { useEffect, useState } from "react";
import { PageContainer, PageHeader, EmptyState } from "../components/layout/AppShell";
import {
  Card,
  Button,
  Badge,
  Input,
  Modal,
  FloatingActionButton,
  Trophy,
  ChevronRight,
  Users,
  Calendar,
  Plus,
  TransitionLink,
  TrendingUp,
  Award,
  RefreshCw,
} from "../components/ui";
import { useAppDispatch, useAppSelector } from "../store";
import {
  fetchChallenges,
  createChallenge,
  joinChallenge,
} from "../store/slices/challengesSlice";
import { useToast } from "../components/ui/Toast";
import { formatDate, cn } from "../lib/utils";
import type { CreateChallengeForm } from "../types";

export default function Challenges() {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { challenges, isLoading, isSubmitting, error } = useAppSelector(
    (state) => state.challenges
  );

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [formData, setFormData] = useState<CreateChallengeForm>({
    title: "",
    description: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    mode: "cumulative",
    is_recurring: false,
    recurring_interval: null,
  });

  useEffect(() => {
    dispatch(fetchChallenges());
  }, [dispatch]);

  const handleCreateChallenge = async () => {
    if (!formData.title || !formData.start_date || !formData.end_date) {
      showToast("error", "Please fill in all required fields");
      return;
    }

    const result = await dispatch(createChallenge(formData));
    if (createChallenge.fulfilled.match(result)) {
      setIsCreateOpen(false);
      setFormData({
        title: "",
        description: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
        mode: "cumulative",
        is_recurring: false,
        recurring_interval: null,
      });
      showToast("success", "Challenge created!");
    } else {
      showToast("error", error || "Failed to create challenge");
    }
  };

  const handleJoinChallenge = async () => {
    if (!inviteCode.trim()) {
      showToast("error", "Please enter an invite code");
      return;
    }

    const result = await dispatch(joinChallenge(inviteCode.trim().toUpperCase()));
    if (joinChallenge.fulfilled.match(result)) {
      setIsJoinOpen(false);
      setInviteCode("");
      showToast("success", "Joined challenge!");
    } else {
      showToast("error", error || "Invalid invite code");
    }
  };

  const activeChallenges = challenges.filter((c) => c.status === "active");
  const pendingChallenges = challenges.filter((c) => c.status === "pending");
  const completedChallenges = challenges.filter((c) => c.status === "completed");

  return (
    <PageContainer className="animate-fade-in">
      <PageHeader
        title="Challenges"
        subtitle="Compete with friends"
        action={
          <Button variant="secondary" size="sm" onClick={() => setIsJoinOpen(true)}>
            Join
          </Button>
        }
      />

      {challenges.length === 0 && !isLoading ? (
        <EmptyState
          icon={<Trophy className="w-8 h-8" />}
          title="No challenges yet"
          description="Create a challenge and invite your friends to compete!"
          action={
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-5 h-5" />
              Create Challenge
            </Button>
          }
        />
      ) : (
        <>
          {/* Active Challenges */}
          {activeChallenges.length > 0 && (
            <section className="mb-6">
              <h2 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">
                Active
              </h2>
              <div className="space-y-3">
                {activeChallenges.map((challenge, idx) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    delay={idx * 50}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Pending Challenges */}
          {pendingChallenges.length > 0 && (
            <section className="mb-6">
              <h2 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">
                Upcoming
              </h2>
              <div className="space-y-3">
                {pendingChallenges.map((challenge, idx) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    delay={(activeChallenges.length + idx) * 50}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Completed Challenges */}
          {completedChallenges.length > 0 && (
            <section className="mb-6">
              <h2 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">
                Completed
              </h2>
              <div className="space-y-3">
                {completedChallenges.map((challenge, idx) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    delay={(activeChallenges.length + pendingChallenges.length + idx) * 50}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* FAB for creating challenge */}
      {challenges.length > 0 && (
        <FloatingActionButton
          onClick={() => setIsCreateOpen(true)}
          icon={<Plus className="w-6 h-6" />}
        />
      )}

      {/* Create Challenge Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Challenge"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Challenge Name"
            placeholder="Weekend Warriors"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <Input
            label="Description (optional)"
            placeholder="Let's see who can get the most steps!"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            />
            <Input
              label="End Date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
          </div>

          {/* Competition Mode Selector */}
          <div>
            <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
              Competition Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, mode: "cumulative" })}
                className={cn(
                  "p-4 rounded-[var(--radius-md)] text-left transition-all duration-200",
                  "border-2",
                  formData.mode === "cumulative"
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                    : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] hover:border-[var(--color-text-tertiary)]"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center mb-2",
                  formData.mode === "cumulative"
                    ? "bg-[var(--color-accent)]/20"
                    : "bg-[var(--color-surface)]"
                )}>
                  <TrendingUp className={cn(
                    "w-5 h-5",
                    formData.mode === "cumulative"
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-text-tertiary)]"
                  )} />
                </div>
                <p className={cn(
                  "text-[15px] font-semibold mb-1",
                  formData.mode === "cumulative"
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-text-primary)]"
                )}>
                  Cumulative
                </p>
                <p className="text-[12px] text-[var(--color-text-secondary)] leading-tight">
                  Most total steps at the end wins
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, mode: "daily_winner" })}
                className={cn(
                  "p-4 rounded-[var(--radius-md)] text-left transition-all duration-200",
                  "border-2",
                  formData.mode === "daily_winner"
                    ? "border-[var(--color-warning)] bg-[var(--color-warning)]/10"
                    : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] hover:border-[var(--color-text-tertiary)]"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center mb-2",
                  formData.mode === "daily_winner"
                    ? "bg-[var(--color-warning)]/20"
                    : "bg-[var(--color-surface)]"
                )}>
                  <Award className={cn(
                    "w-5 h-5",
                    formData.mode === "daily_winner"
                      ? "text-[var(--color-warning)]"
                      : "text-[var(--color-text-tertiary)]"
                  )} />
                </div>
                <p className={cn(
                  "text-[15px] font-semibold mb-1",
                  formData.mode === "daily_winner"
                    ? "text-[var(--color-warning)]"
                    : "text-[var(--color-text-primary)]"
                )}>
                  Daily Winner
                </p>
                <p className="text-[12px] text-[var(--color-text-secondary)] leading-tight">
                  Win each day to earn points
                </p>
              </button>
            </div>
          </div>

          {/* Recurring Challenge Toggle */}
          <div>
            <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
              Repeat Challenge
            </label>
            <button
              type="button"
              onClick={() => setFormData({
                ...formData,
                is_recurring: !formData.is_recurring,
                recurring_interval: !formData.is_recurring ? "weekly" : null
              })}
              className={cn(
                "w-full p-4 rounded-[var(--radius-md)] text-left transition-all duration-200",
                "border-2 flex items-center gap-3",
                formData.is_recurring
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                  : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] hover:border-[var(--color-text-tertiary)]"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                formData.is_recurring
                  ? "bg-[var(--color-accent)]/20"
                  : "bg-[var(--color-surface)]"
              )}>
                <RefreshCw className={cn(
                  "w-5 h-5",
                  formData.is_recurring
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-text-tertiary)]"
                )} />
              </div>
              <div className="flex-1">
                <p className={cn(
                  "text-[15px] font-semibold",
                  formData.is_recurring
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-text-primary)]"
                )}>
                  {formData.is_recurring ? "Recurring" : "One-time"}
                </p>
                <p className="text-[12px] text-[var(--color-text-secondary)] leading-tight">
                  {formData.is_recurring
                    ? "Auto-creates next challenge when this one ends"
                    : "Challenge ends after the end date"}
                </p>
              </div>
            </button>

            {/* Interval Selector (shown when recurring is enabled) */}
            {formData.is_recurring && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, recurring_interval: "weekly" })}
                  className={cn(
                    "p-3 rounded-[var(--radius-md)] text-center transition-all duration-200",
                    "border-2",
                    formData.recurring_interval === "weekly"
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                      : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] hover:border-[var(--color-text-tertiary)]"
                  )}
                >
                  <p className={cn(
                    "text-[14px] font-semibold",
                    formData.recurring_interval === "weekly"
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-text-primary)]"
                  )}>
                    Weekly
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, recurring_interval: "monthly" })}
                  className={cn(
                    "p-3 rounded-[var(--radius-md)] text-center transition-all duration-200",
                    "border-2",
                    formData.recurring_interval === "monthly"
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                      : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] hover:border-[var(--color-text-tertiary)]"
                  )}
                >
                  <p className={cn(
                    "text-[14px] font-semibold",
                    formData.recurring_interval === "monthly"
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-text-primary)]"
                  )}>
                    Monthly
                  </p>
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button fullWidth onClick={handleCreateChallenge} isLoading={isSubmitting}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Join Challenge Modal */}
      <Modal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        title="Join Challenge"
      >
        <div className="space-y-4">
          <Input
            label="Invite Code"
            placeholder="ABC123"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="uppercase"
          />

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setIsJoinOpen(false)}>
              Cancel
            </Button>
            <Button fullWidth onClick={handleJoinChallenge} isLoading={isSubmitting}>
              Join
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}

interface ChallengeCardProps {
  challenge: {
    id: number;
    title: string;
    description: string | null;
    start_date: string;
    end_date: string;
    mode: string;
    status: string;
    participant_count: number;
    is_recurring?: boolean;
  };
  delay?: number;
}

function ChallengeCard({ challenge, delay = 0 }: ChallengeCardProps) {
  const statusVariant = {
    active: "success" as const,
    pending: "warning" as const,
    completed: "default" as const,
  };

  const statusLabel = {
    active: "Active",
    pending: "Upcoming",
    completed: "Completed",
  };

  return (
    <TransitionLink
      to={`/challenges/${challenge.id}`}
      className="block animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Card className="press-effect hover:shadow-[var(--shadow-md)] transition-shadow">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              challenge.status === "active" && "bg-[var(--color-success)]/15",
              challenge.status === "pending" && "bg-[var(--color-warning)]/15",
              challenge.status === "completed" && "bg-[var(--color-surface-secondary)]"
            )}
          >
            <Trophy
              className={cn(
                "w-6 h-6",
                challenge.status === "active" && "text-[var(--color-success)]",
                challenge.status === "pending" && "text-[var(--color-warning)]",
                challenge.status === "completed" && "text-[var(--color-text-tertiary)]"
              )}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-[var(--color-text-primary)] truncate">
                {challenge.title}
              </p>
              <Badge variant={statusVariant[challenge.status as keyof typeof statusVariant]}>
                {statusLabel[challenge.status as keyof typeof statusLabel]}
              </Badge>
            </div>

            <div className="flex items-center gap-3 mt-1 text-[13px] text-[var(--color-text-secondary)]">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {challenge.participant_count}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(challenge.end_date)}
              </span>
              {challenge.is_recurring && (
                <span className="flex items-center gap-1 text-[var(--color-accent)]">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Recurring
                </span>
              )}
            </div>
          </div>

          <ChevronRight className="w-5 h-5 text-[var(--color-text-tertiary)]" />
        </div>
      </Card>
    </TransitionLink>
  );
}
