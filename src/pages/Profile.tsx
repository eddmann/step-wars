import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { PageContainer, PageHeader } from "../components/layout/AppShell";
import {
  Card,
  CardGroup,
  CardRow,
  Button,
  Input,
  Modal,
  Avatar,
  Badge,
  BadgeIcon,
  ChevronRight,
  Settings,
  LogOut,
  Edit2,
  Trophy,
  Flame,
  TrendingUp,
  Sun,
  Moon,
  Monitor,
} from "../components/ui";
import { useAppDispatch, useAppSelector } from "../store";
import { logout } from "../store/slices/authSlice";
import { fetchProfile, updateProfile } from "../store/slices/profileSlice";
import { useToast } from "../components/ui/Toast";
import { useTheme } from "../components/ThemeProvider";
import { formatNumber, formatDate, getBadgeName, cn } from "../lib/utils";

type ThemeOption = "light" | "dark" | "system";

const themeOptions: { value: ThemeOption; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Auto", icon: Monitor },
];

export default function Profile() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();
  const { user: authUser } = useAppSelector((state) => state.auth);
  const { user, stats, badges, isSubmitting } = useAppSelector(
    (state) => state.profile
  );

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate("/login");
  };

  const handleSaveProfile = async () => {
    if (!name.trim() || !email.trim()) {
      showToast("error", "Name and email are required");
      return;
    }

    const result = await dispatch(updateProfile({ name: name.trim(), email: email.trim() }));
    if (updateProfile.fulfilled.match(result)) {
      setIsEditOpen(false);
      showToast("success", "Profile updated!");
    }
  };

  const displayUser = user || authUser;

  return (
    <PageContainer className="animate-fade-in">
      <PageHeader
        title="Profile"
        action={
          <Button variant="ghost" size="sm" onClick={() => setIsEditOpen(true)}>
            <Edit2 className="w-5 h-5" />
          </Button>
        }
      />

      {/* Profile Header */}
      <Card className="mb-6 animate-slide-up stagger-1">
        <div className="flex items-center gap-4">
          <Avatar name={displayUser?.name || "User"} size="xl" />
          <div className="flex-1 min-w-0">
            <h2 className="text-[20px] font-bold text-[var(--color-text-primary)] truncate">
              {displayUser?.name}
            </h2>
            <p className="text-[14px] text-[var(--color-text-secondary)] truncate">
              {displayUser?.email}
            </p>
            {displayUser?.created_at && (
              <p className="text-[12px] text-[var(--color-text-tertiary)] mt-1">
                Member since {formatDate(displayUser.created_at)}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="animate-slide-up stagger-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-success)]/15 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[var(--color-success)]" />
            </div>
            <div>
              <p className="text-[17px] font-bold tabular-nums text-[var(--color-text-primary)]">
                {formatNumber(stats?.total_steps || 0)}
              </p>
              <p className="text-[12px] text-[var(--color-text-tertiary)]">
                Total Steps
              </p>
            </div>
          </div>
        </Card>

        <Card className="animate-slide-up stagger-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/15 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[var(--color-accent)]" />
            </div>
            <div>
              <p className="text-[17px] font-bold tabular-nums text-[var(--color-text-primary)]">
                {stats?.challenges_joined || 0}
              </p>
              <p className="text-[12px] text-[var(--color-text-tertiary)]">
                Challenges
              </p>
            </div>
          </div>
        </Card>

        <Card className="animate-slide-up stagger-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-gold)]/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[17px] font-bold tabular-nums text-[var(--color-text-primary)]">
                {stats?.challenges_won || 0}
              </p>
              <p className="text-[12px] text-[var(--color-text-tertiary)]">
                Wins
              </p>
            </div>
          </div>
        </Card>

        <Card className="animate-slide-up stagger-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-purple)]/15 flex items-center justify-center">
              <Flame className="w-5 h-5 text-[var(--color-purple)]" />
            </div>
            <div>
              <p className="text-[17px] font-bold tabular-nums text-[var(--color-text-primary)]">
                {stats?.badges_earned || 0}
              </p>
              <p className="text-[12px] text-[var(--color-text-tertiary)]">
                Badges
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <Card className="mb-6 animate-slide-up" style={{ animationDelay: "180ms" }}>
          <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-4">
            Badges
          </h3>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <Badge
                key={badge.id}
                variant="gold"
                icon={<BadgeIcon type={badge.badge_type} size="sm" />}
              >
                {getBadgeName(badge.badge_type)}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Theme Selector */}
      <Card className="mb-6 animate-slide-up" style={{ animationDelay: "210ms" }}>
        <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-3">
          Appearance
        </h3>
        <div className="flex gap-2 p-1 bg-[var(--color-surface-secondary)] rounded-[var(--radius-md)]">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isActive = theme === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-[var(--radius-sm)]",
                  "text-[14px] font-medium",
                  "transition-all duration-200",
                  isActive
                    ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Settings */}
      <CardGroup className="mb-6 animate-slide-up" style={{ animationDelay: "240ms" }}>
        <CardRow onClick={() => setIsEditOpen(true)}>
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-[var(--color-text-tertiary)]" />
            <span className="text-[var(--color-text-primary)]">
              Edit Profile
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-[var(--color-text-tertiary)]" />
        </CardRow>
      </CardGroup>

      {/* Logout */}
      <Button
        variant="danger"
        fullWidth
        onClick={handleLogout}
        className="animate-slide-up"
        style={{ animationDelay: "270ms" }}
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </Button>

      {/* Edit Profile Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Profile">
        <div className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button fullWidth onClick={handleSaveProfile} isLoading={isSubmitting}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
