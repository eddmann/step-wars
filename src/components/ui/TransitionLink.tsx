import { Link, LinkProps, useNavigate } from "react-router";
import { forwardRef, useCallback, MouseEvent } from "react";
import { flushSync } from "react-dom";

/**
 * TransitionLink - A Link component with View Transitions support
 * Uses the browser's View Transitions API for smooth page transitions
 */
export const TransitionLink = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ onClick, ...props }, ref) => {
    const handleClick = useCallback(
      (e: MouseEvent<HTMLAnchorElement>) => {
        // Check if View Transitions API is supported
        if ("startViewTransition" in document) {
          // Remove any existing direction class
          document.documentElement.classList.remove("navigating-back");
        }
        onClick?.(e);
      },
      [onClick],
    );

    return <Link ref={ref} viewTransition onClick={handleClick} {...props} />;
  },
);

TransitionLink.displayName = "TransitionLink";

/**
 * Hook for programmatic navigation with View Transitions
 */
export function useTransitionNavigate() {
  const navigate = useNavigate();

  const transitionNavigate = useCallback(
    (to: string | number, options?: { replace?: boolean }) => {
      // Add class for back navigation animation direction
      if (typeof to === "number" && to < 0) {
        document.documentElement.classList.add("navigating-back");
      } else {
        document.documentElement.classList.remove("navigating-back");
      }

      // Check if View Transitions API is supported
      const startViewTransition = (
        document as Document & {
          startViewTransition?: (callback: () => void) => void;
        }
      ).startViewTransition;

      if (typeof startViewTransition === "function") {
        startViewTransition.call(document, () => {
          flushSync(() => {
            if (typeof to === "number") {
              navigate(to);
            } else {
              navigate(to, options);
            }
          });
        });
      } else {
        // Fallback for browsers without View Transitions
        if (typeof to === "number") {
          navigate(to);
        } else {
          navigate(to, options);
        }
      }
    },
    [navigate],
  );

  return transitionNavigate;
}

export default TransitionLink;
