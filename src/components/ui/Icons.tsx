import {
  Home,
  Trophy,
  Target,
  User,
  Plus,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Copy,
  Share2,
  Calendar,
  Clock,
  Flame,
  Award,
  Medal,
  Star,
  TrendingUp,
  Users,
  Settings,
  LogOut,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Filter,
  MoreHorizontal,
  MoreVertical,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
  Sun,
  Moon,
  Monitor,
  Footprints,
  Bell,
  type LucideIcon,
} from "lucide-react";

// Re-export all icons for easy access
export {
  Home,
  Trophy,
  Target,
  User,
  Plus,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Copy,
  Share2,
  Calendar,
  Clock,
  Flame,
  Award,
  Medal,
  Star,
  TrendingUp,
  Users,
  Settings,
  LogOut,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Filter,
  MoreHorizontal,
  MoreVertical,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
  Sun,
  Moon,
  Monitor,
  Footprints,
  Bell,
};

// Icon wrapper component with consistent sizing
interface IconProps {
  icon: LucideIcon;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  xs: "w-3.5 h-3.5",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-8 h-8",
};

export function Icon({
  icon: IconComponent,
  size = "md",
  className = "",
}: IconProps) {
  return <IconComponent className={`${sizeMap[size]} ${className}`} />;
}

// Animated loading spinner
export function Spinner({
  size = "md",
  className = "",
}: Omit<IconProps, "icon">) {
  return <Loader2 className={`${sizeMap[size]} animate-spin ${className}`} />;
}

// Custom Step icon (shoe/footprint)
export function StepIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2.66 5.5-4 5.5H5" />
      <path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2.66 5.5 4 5.5h1" />
      <path d="M4 20l2.38 0c2.12 0 3.12-1.03 5.62-1 2.72.03 6 1.49 6 4.5 0 1.87-1.8 2.5-3.5 2.5-3.11 0-5.5-2.66-5.5-4V21" />
    </svg>
  );
}

// Badge icons for achievements
interface BadgeIconProps {
  type: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function BadgeIcon({
  type,
  size = "md",
  className = "",
}: BadgeIconProps) {
  const sizeClass = sizeMap[size];

  switch (type) {
    case "daily_winner":
      return <Sun className={`${sizeClass} ${className}`} />;
    case "challenge_winner":
      return <Trophy className={`${sizeClass} ${className}`} />;
    case "streak_7":
    case "streak_14":
    case "streak_30":
    case "streak_60":
    case "streak_100":
      return <Flame className={`${sizeClass} ${className}`} />;
    default:
      return <Award className={`${sizeClass} ${className}`} />;
  }
}

export default Icon;
