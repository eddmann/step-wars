import { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  src?: string;
  size?: AvatarSize;
  showRing?: boolean;
}

const sizeStyles: Record<AvatarSize, { container: string; text: string }> = {
  xs: { container: "w-6 h-6", text: "text-[10px]" },
  sm: { container: "w-8 h-8", text: "text-[11px]" },
  md: { container: "w-10 h-10", text: "text-[13px]" },
  lg: { container: "w-14 h-14", text: "text-[17px]" },
  xl: { container: "w-20 h-20", text: "text-[24px]" },
};

// Generate a consistent color based on name
const avatarColors = [
  "#34c759", // green
  "#007aff", // blue
  "#ff9500", // orange
  "#af52de", // purple
  "#ff2d55", // pink
  "#5ac8fa", // teal
  "#ff3b30", // red
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({
  name,
  src,
  size = "md",
  showRing = false,
  className,
  ...props
}: AvatarProps) {
  const styles = sizeStyles[size];
  const bgColor = getAvatarColor(name);
  const initials = getInitials(name);

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        "rounded-full overflow-hidden flex-shrink-0",
        styles.container,
        showRing &&
          "ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-background)]",
        className,
      )}
      style={!src ? { backgroundColor: bgColor } : undefined}
      {...props}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className={cn("font-semibold text-white", styles.text)}>
          {initials}
        </span>
      )}
    </div>
  );
}

// Avatar Group for showing multiple avatars stacked
interface AvatarGroupProps {
  users: { name: string; src?: string }[];
  max?: number;
  size?: AvatarSize;
}

export function AvatarGroup({ users, max = 4, size = "sm" }: AvatarGroupProps) {
  const displayed = users.slice(0, max);
  const remaining = users.length - max;
  const styles = sizeStyles[size];

  return (
    <div className="flex items-center -space-x-2">
      {displayed.map((user, idx) => (
        <Avatar
          key={idx}
          name={user.name}
          src={user.src}
          size={size}
          className="ring-2 ring-[var(--color-surface)]"
        />
      ))}

      {remaining > 0 && (
        <div
          className={cn(
            "inline-flex items-center justify-center",
            "rounded-full",
            "bg-[var(--color-surface-secondary)]",
            "text-[var(--color-text-secondary)]",
            "ring-2 ring-[var(--color-surface)]",
            "font-medium",
            styles.container,
            styles.text,
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

export default Avatar;
