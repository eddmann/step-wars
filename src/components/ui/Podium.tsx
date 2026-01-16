import { cn } from "../../lib/utils";
import { Avatar } from "./Avatar";
import { MedalBadge } from "./Badge";

interface PodiumUser {
  name: string;
  value: number;
  valueLabel?: string;
  src?: string;
  isCurrentUser?: boolean;
}

interface PodiumProps {
  first?: PodiumUser;
  second?: PodiumUser;
  third?: PodiumUser;
  valueFormatter?: (value: number) => string;
  className?: string;
}

const defaultFormatter = (value: number) => value.toLocaleString();

export function Podium({
  first,
  second,
  third,
  valueFormatter = defaultFormatter,
  className,
}: PodiumProps) {
  return (
    <div className={cn("flex items-end justify-center gap-2", className)}>
      {/* Second Place */}
      <PodiumPosition
        position={2}
        user={second}
        valueFormatter={valueFormatter}
        height="h-20"
      />

      {/* First Place */}
      <PodiumPosition
        position={1}
        user={first}
        valueFormatter={valueFormatter}
        height="h-28"
      />

      {/* Third Place */}
      <PodiumPosition
        position={3}
        user={third}
        valueFormatter={valueFormatter}
        height="h-16"
      />
    </div>
  );
}

interface PodiumPositionProps {
  position: 1 | 2 | 3;
  user?: PodiumUser;
  valueFormatter: (value: number) => string;
  height: string;
}

const podiumColors = {
  1: "from-yellow-400 to-amber-500",
  2: "from-gray-300 to-gray-400",
  3: "from-orange-400 to-orange-600",
};

function PodiumPosition({
  position,
  user,
  valueFormatter,
  height,
}: PodiumPositionProps) {
  if (!user) {
    return (
      <div className="flex flex-col items-center w-24">
        <div className="w-12 h-12 rounded-full bg-[var(--color-surface-secondary)]" />
        <div
          className={cn(
            "w-full mt-3 rounded-t-xl bg-[var(--color-surface-secondary)]",
            height
          )}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-24 animate-slide-up">
      {/* Avatar with medal */}
      <div className="relative">
        <Avatar
          name={user.name}
          src={user.src}
          size="lg"
          className={cn(
            user.isCurrentUser && "ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-background)]"
          )}
        />
        <div className="absolute -bottom-1 -right-1">
          <MedalBadge position={position} size="sm" />
        </div>
      </div>

      {/* Name */}
      <p
        className={cn(
          "mt-2 text-[13px] font-semibold truncate max-w-full text-center",
          user.isCurrentUser
            ? "text-[var(--color-accent)]"
            : "text-[var(--color-text-primary)]"
        )}
      >
        {user.isCurrentUser ? "You" : user.name.split(" ")[0]}
      </p>

      {/* Value */}
      <p className="text-[11px] text-[var(--color-text-secondary)] tabular-nums">
        {valueFormatter(user.value)} {user.valueLabel || "steps"}
      </p>

      {/* Podium block */}
      <div
        className={cn(
          "w-full mt-2 rounded-t-xl",
          "bg-gradient-to-b flex items-center justify-center",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]",
          podiumColors[position],
          height
        )}
        style={{
          animationDelay: position === 1 ? "0ms" : position === 2 ? "100ms" : "200ms",
        }}
      >
        <span className="text-[24px] font-bold text-white/90 drop-shadow-sm">
          {position}
        </span>
      </div>
    </div>
  );
}

// Compact leaderboard row for full list
interface LeaderboardRowProps {
  rank: number;
  name: string;
  value: number;
  valueLabel?: string;
  src?: string;
  isCurrentUser?: boolean;
  lastFinalizedSteps?: number; // Steps from the last finalized day
  lastFinalizedLabel?: string; // e.g., "Yesterday" or "Mon, Jan 13"
  onClick?: () => void;
}

export function LeaderboardRow({
  rank,
  name,
  value,
  valueLabel = "steps",
  src,
  isCurrentUser,
  lastFinalizedSteps,
  lastFinalizedLabel,
  onClick,
}: LeaderboardRowProps) {
  const isTopThree = rank <= 3;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3",
        onClick && "cursor-pointer press-effect hover:bg-[var(--color-surface-secondary)]",
        isCurrentUser && "bg-[var(--color-accent)]/8"
      )}
    >
      {/* Rank */}
      <div className="w-8 flex justify-center">
        {isTopThree ? (
          <MedalBadge position={rank as 1 | 2 | 3} size="sm" />
        ) : (
          <span className="text-[13px] font-semibold text-[var(--color-text-tertiary)] tabular-nums">
            {rank}
          </span>
        )}
      </div>

      {/* Avatar */}
      <Avatar name={name} src={src} size="sm" />

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-[15px] font-medium truncate",
            isCurrentUser
              ? "text-[var(--color-accent)]"
              : "text-[var(--color-text-primary)]"
          )}
        >
          {isCurrentUser ? "You" : name}
        </p>
        {/* Show last finalized day's steps */}
        {lastFinalizedSteps != null && lastFinalizedLabel && (
          <p className="text-[12px] text-[var(--color-text-tertiary)]">
            {lastFinalizedLabel}: {lastFinalizedSteps.toLocaleString()}
          </p>
        )}
      </div>

      {/* Value */}
      <div className="text-right">
        <p className="text-[15px] font-semibold tabular-nums text-[var(--color-text-primary)]">
          {value.toLocaleString()}
        </p>
        <p className="text-[11px] text-[var(--color-text-tertiary)]">
          {valueLabel}
        </p>
      </div>
    </div>
  );
}

export default Podium;
