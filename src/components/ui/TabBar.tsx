import { NavLink, useLocation } from "react-router";
import { Home, Trophy, Target, User } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface TabItem {
  path: string;
  label: string;
  icon: ReactNode;
}

const tabs: TabItem[] = [
  { path: "/", label: "Today", icon: <Home className="w-6 h-6" /> },
  {
    path: "/challenges",
    label: "Challenges",
    icon: <Trophy className="w-6 h-6" />,
  },
  { path: "/goals", label: "Goals", icon: <Target className="w-6 h-6" /> },
  { path: "/profile", label: "Profile", icon: <User className="w-6 h-6" /> },
];

export function TabBar() {
  const location = useLocation();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "bg-[var(--color-surface)]/80 backdrop-blur-xl",
        "border-t border-[var(--color-border)]",
        "safe-bottom",
      )}
    >
      <div className="flex items-center justify-around h-[49px] max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive =
            location.pathname === tab.path ||
            (tab.path !== "/" && location.pathname.startsWith(tab.path));

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              viewTransition
              className={cn(
                "flex flex-col items-center justify-center",
                "flex-1 h-full pt-1",
                "transition-colors duration-200",
                isActive
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-text-tertiary)]",
              )}
            >
              <span
                className={cn(
                  "transition-transform duration-200",
                  isActive && "scale-110",
                )}
              >
                {tab.icon}
              </span>
              <span className="text-[10px] font-medium mt-0.5">
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

// Floating Action Button for logging steps
interface FABProps {
  onClick: () => void;
  icon?: ReactNode;
  label?: string;
}

export function FloatingActionButton({ onClick, icon, label }: FABProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-[calc(49px+env(safe-area-inset-bottom,0px)+16px)] right-4",
        "z-30",
        "flex items-center gap-2",
        "h-14 px-5",
        "bg-[var(--color-accent)] text-white",
        "rounded-full",
        "shadow-lg shadow-[var(--color-accent)]/30",
        "hover:shadow-xl hover:shadow-[var(--color-accent)]/40",
        "transition-all duration-200",
        "press-effect",
        "font-semibold",
      )}
    >
      {icon || (
        <svg
          className="w-6 h-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
      )}
      {label && <span>{label}</span>}
    </button>
  );
}

export default TabBar;
