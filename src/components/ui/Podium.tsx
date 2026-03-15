import { useState, useRef, useEffect } from "react";
import { cn } from "../../lib/utils";
import { Avatar } from "./Avatar";
import { MedalBadge } from "./Badge";
import { REACTION_TYPES, REACTION_EMOJI } from "../../../shared/constants";
import type { ReactionType } from "../../../shared/constants";

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
            height,
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
            user.isCurrentUser &&
              "ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-background)]",
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
            : "text-[var(--color-text-primary)]",
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
          height,
        )}
        style={{
          animationDelay:
            position === 1 ? "0ms" : position === 2 ? "100ms" : "200ms",
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
  lastFinalizedSteps?: number | null;
  lastFinalizedLabel?: string;
  challengeStatus?: "pending" | "active" | "completed";
  reactions?: Record<string, number>;
  userReactions?: string[];
  onReact?: (reactionType: string) => void;
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
  challengeStatus,
  reactions,
  userReactions,
  onReact,
  onClick,
}: LeaderboardRowProps) {
  const isTopThree = rank <= 3;
  const [pickerOpen, setPickerOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const showReactions = !isCurrentUser && onReact;
  const isTouchDevice = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!showReactions) return;
    if (e.pointerType === "touch") {
      isTouchDevice.current = true;
      longPressTimer.current = setTimeout(() => {
        setPickerOpen((prev) => !prev);
      }, 500);
    }
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleRowClick = () => {
    if (!showReactions || isTouchDevice.current) {
      isTouchDevice.current = false;
      return;
    }
    setPickerOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!pickerOpen) return;
    function handleClick(e: MouseEvent) {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [pickerOpen]);

  const activeReactions =
    reactions && showReactions
      ? Object.entries(reactions).filter(([, count]) => count > 0)
      : [];

  return (
    <div
      ref={rowRef}
      className={cn("p-3", isCurrentUser && "bg-[var(--color-accent)]/8")}
    >
      <div
        onClick={onClick ?? handleRowClick}
        onPointerDown={handlePointerDown}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        className={cn(
          "flex items-center gap-3 select-none",
          showReactions && "cursor-pointer",
          onClick &&
            "cursor-pointer press-effect hover:bg-[var(--color-surface-secondary)]",
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
                : "text-[var(--color-text-primary)]",
            )}
          >
            {isCurrentUser ? "You" : name}
          </p>
          {lastFinalizedSteps != null && lastFinalizedLabel ? (
            <p className="text-[12px] text-[var(--color-text-tertiary)]">
              {lastFinalizedLabel}: {lastFinalizedSteps.toLocaleString()}
            </p>
          ) : challengeStatus === "active" ? (
            <p className="text-[12px] text-[var(--color-text-tertiary)]">
              Pending
            </p>
          ) : null}
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

      {/* Reaction pills */}
      {activeReactions.length > 0 && (
        <div className="flex items-center gap-1.5 mt-1.5 ml-11 flex-wrap">
          {activeReactions.map(([type, count]) => {
            const isOwn = userReactions?.includes(type);
            return (
              <button
                key={type}
                onClick={() => onReact!(type)}
                className={cn(
                  "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[12px] transition-colors",
                  isOwn
                    ? "bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30"
                    : "bg-[var(--color-surface-secondary)] border border-transparent",
                )}
              >
                <span>{REACTION_EMOJI[type as ReactionType]}</span>
                <span className="tabular-nums text-[var(--color-text-secondary)]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Reaction picker (revealed by long press) */}
      {pickerOpen && showReactions && (
        <div className="flex gap-1 mt-1.5 ml-11 p-1 bg-[var(--color-surface-secondary)] rounded-xl animate-slide-up">
          {REACTION_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => {
                onReact(type);
                setPickerOpen(false);
              }}
              className="flex-1 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface)] active:scale-95 transition-all text-[20px]"
            >
              {REACTION_EMOJI[type]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default Podium;
