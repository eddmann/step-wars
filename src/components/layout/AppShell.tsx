import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router";
import { TabBar } from "../ui/TabBar";
import { Spinner } from "../ui/Icons";
import { useTransitionNavigate } from "../ui/TransitionLink";
import { useAppSelector, useAppDispatch } from "../../store";
import { fetchCurrentUser } from "../../store/slices/authSlice";
import { cn } from "../../lib/utils";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-background)]">
      <main className="flex-1 pt-[env(safe-area-inset-top,0px)] pb-[calc(49px+env(safe-area-inset-bottom,0px))]">
        {children}
      </main>
      <TabBar />
    </div>
  );
}

// Page container with standard padding and max-width
interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("max-w-lg mx-auto px-4 py-6 page-content", className)}>
      {children}
    </div>
  );
}

// Page header component
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  backButton?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  action,
  backButton,
  className,
}: PageHeaderProps) {
  const transitionNavigate = useTransitionNavigate();

  return (
    <header className={cn("mb-6", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {backButton && (
            <button
              onClick={() => transitionNavigate(-1)}
              className={cn(
                "-ml-2 p-2",
                "text-[var(--color-accent)]",
                "hover:bg-[var(--color-surface-secondary)]",
                "rounded-[var(--radius-md)]",
                "transition-colors duration-200",
                "press-effect",
              )}
            >
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-[24px] font-bold text-[var(--color-text-primary)]">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
    </header>
  );
}

// Loading page placeholder
export function LoadingPage() {
  return (
    <div
      className="min-h-dvh flex items-center justify-center"
      data-testid="loading-spinner"
    >
      <Spinner size="lg" className="text-[var(--color-accent)]" />
    </div>
  );
}

// Auth guard wrapper
interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, token } = useAppSelector(
    (state) => state.auth,
  );

  useEffect(() => {
    if (token && !isAuthenticated && !isLoading) {
      dispatch(fetchCurrentUser());
    }
  }, [token, isAuthenticated, isLoading, dispatch]);

  useEffect(() => {
    if (!token && !isLoading) {
      navigate("/login");
    }
  }, [token, isLoading, navigate]);

  if (isLoading || (token && !isAuthenticated)) {
    return <LoadingPage />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

// Empty state component
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="w-16 h-16 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center mb-4 text-[var(--color-text-tertiary)]">
          {icon}
        </div>
      )}
      <h3 className="text-[17px] font-semibold text-[var(--color-text-primary)]">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-[14px] text-[var(--color-text-secondary)] max-w-xs">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default AppShell;
