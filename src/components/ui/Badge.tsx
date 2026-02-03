import { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "gold";
type BadgeSize = "sm" | "md";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]",
  success: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
  warning: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
  danger: "bg-[var(--color-danger)]/15 text-[var(--color-danger)]",
  info: "bg-[var(--color-accent)]/15 text-[var(--color-accent)]",
  gold: "bg-[var(--color-gold)]/20 text-amber-600",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-[12px]",
};

export function Badge({
  variant = "default",
  size = "sm",
  icon,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        "font-medium rounded-full",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

// Status Dot for simple status indicators
interface StatusDotProps {
  status: "active" | "pending" | "completed" | "offline";
  pulse?: boolean;
}

const statusColors = {
  active: "bg-[var(--color-success)]",
  pending: "bg-[var(--color-warning)]",
  completed: "bg-[var(--color-accent)]",
  offline: "bg-[var(--color-text-tertiary)]",
};

export function StatusDot({ status, pulse = false }: StatusDotProps) {
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      {pulse && status === "active" && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
            statusColors[status],
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex rounded-full h-2.5 w-2.5",
          statusColors[status],
        )}
      />
    </span>
  );
}

// Medal Badge for podium positions
interface MedalBadgeProps {
  position: 1 | 2 | 3;
  size?: "sm" | "md" | "lg";
}

const medalStyles = {
  1: {
    bg: "bg-gradient-to-br from-yellow-400 to-amber-500",
    text: "text-amber-900",
  },
  2: {
    bg: "bg-gradient-to-br from-gray-300 to-gray-400",
    text: "text-gray-700",
  },
  3: {
    bg: "bg-gradient-to-br from-orange-400 to-orange-600",
    text: "text-orange-900",
  },
};

const medalSizes = {
  sm: "w-5 h-5 text-[10px]",
  md: "w-7 h-7 text-[12px]",
  lg: "w-9 h-9 text-[14px]",
};

export function MedalBadge({ position, size = "md" }: MedalBadgeProps) {
  const style = medalStyles[position];

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        "rounded-full font-bold shadow-sm",
        style.bg,
        style.text,
        medalSizes[size],
      )}
    >
      {position}
    </span>
  );
}

// Badge icon wrapper for achievement badges
interface BadgeIconProps {
  type: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function BadgeIcon({ type, size = "md", className }: BadgeIconProps) {
  const sizeClass = {
    sm: "w-4 h-4 text-[12px]",
    md: "w-5 h-5 text-[14px]",
    lg: "w-6 h-6 text-[16px]",
  };

  const iconMap: Record<string, string> = {
    daily_winner: "☀️",
    challenge_winner: "🏆",
    streak_7: "🔥",
    streak_14: "🔥",
    streak_30: "🌟",
    streak_60: "💎",
    streak_100: "👑",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        sizeClass[size],
        className,
      )}
    >
      {iconMap[type] || "🏅"}
    </span>
  );
}

export default Badge;
