import { InputHTMLAttributes, forwardRef, ReactNode, useId } from "react";
import { cn } from "../../lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      className,
      id: providedId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;

    return (
      <div className={cn("space-y-1.5", className)}>
        {label && (
          <label
            htmlFor={id}
            className="block text-[13px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wide"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            className={cn(
              "w-full h-12 px-4 text-[15px]",
              !!leftIcon && "pl-11",
              !!rightIcon && "pr-11",
              "bg-[var(--color-surface-secondary)]",
              "text-[var(--color-text-primary)]",
              "placeholder:text-[var(--color-text-tertiary)]",
              "rounded-[var(--radius-md)]",
              "border-2 border-transparent",
              "transition-all duration-200",
              "focus:outline-none focus:border-[var(--color-accent)] focus:bg-[var(--color-surface)]",
              "focus:shadow-[inset_0_0_0_1px_var(--color-accent)]",
              error && "border-[var(--color-danger)]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p className="text-[13px] text-[var(--color-danger)] flex items-center gap-1">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}

        {hint && !error && (
          <p className="text-[13px] text-[var(--color-text-tertiary)]">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

// Select Component with similar styling
interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id: providedId, ...props }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;

    return (
      <div className={cn("space-y-1.5", className)}>
        {label && (
          <label
            htmlFor={id}
            className="block text-[13px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wide"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={id}
            className={cn(
              "w-full h-12 px-4 pr-10 text-[15px]",
              "bg-[var(--color-surface-secondary)]",
              "text-[var(--color-text-primary)]",
              "rounded-[var(--radius-md)]",
              "border-2 border-transparent",
              "transition-all duration-200",
              "focus:outline-none focus:border-[var(--color-accent)] focus:bg-[var(--color-surface)]",
              "appearance-none cursor-pointer",
              error && "border-[var(--color-danger)]"
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-tertiary)]">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {error && (
          <p className="text-[13px] text-[var(--color-danger)]">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Input;
