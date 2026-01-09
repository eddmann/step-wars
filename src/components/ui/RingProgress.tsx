import { ReactNode, useEffect, useState } from "react";
import { cn } from "../../lib/utils";

type RingColor = "green" | "blue" | "orange" | "gold" | "purple";
type RingSize = "sm" | "md" | "lg" | "xl";

interface RingProgressProps {
  value: number;
  max: number;
  size?: RingSize;
  color?: RingColor;
  strokeWidth?: number;
  showValue?: boolean;
  animated?: boolean;
  children?: ReactNode;
  label?: string;
  className?: string;
}

const colorGradients: Record<RingColor, { start: string; end: string; glow: string }> = {
  green: {
    start: "#34C759",
    end: "#30D158",
    glow: "rgba(52, 199, 89, 0.4)",
  },
  blue: {
    start: "#007AFF",
    end: "#5AC8FA",
    glow: "rgba(0, 122, 255, 0.4)",
  },
  orange: {
    start: "#FF9500",
    end: "#FF3B30",
    glow: "rgba(255, 149, 0, 0.4)",
  },
  gold: {
    start: "#FFD60A",
    end: "#FF9F0A",
    glow: "rgba(255, 214, 10, 0.4)",
  },
  purple: {
    start: "#AF52DE",
    end: "#5856D6",
    glow: "rgba(175, 82, 222, 0.4)",
  },
};

const sizeConfig: Record<RingSize, { diameter: number; stroke: number; fontSize: string }> = {
  sm: { diameter: 60, stroke: 6, fontSize: "text-[14px]" },
  md: { diameter: 100, stroke: 8, fontSize: "text-[20px]" },
  lg: { diameter: 160, stroke: 12, fontSize: "text-[32px]" },
  xl: { diameter: 220, stroke: 16, fontSize: "text-[48px]" },
};

export function RingProgress({
  value,
  max,
  size = "md",
  color = "green",
  strokeWidth,
  showValue = true,
  animated = true,
  children,
  label,
  className,
}: RingProgressProps) {
  const [displayValue, setDisplayValue] = useState(animated ? 0 : value);
  const config = sizeConfig[size];
  const colors = colorGradients[color];

  const stroke = strokeWidth ?? config.stroke;
  const radius = (config.diameter - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(100, Math.max(0, (displayValue / max) * 100));
  const offset = circumference - (percentage / 100) * circumference;

  useEffect(() => {
    if (!animated) {
      setDisplayValue(value);
      return;
    }

    const duration = 1200;
    const startTime = performance.now();
    const startValue = displayValue;

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(2, -10 * progress);
      const current = startValue + (value - startValue) * easeOut;
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [value, animated]);

  const gradientId = `ring-gradient-${color}-${Math.random().toString(36).slice(2)}`;

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <svg
        width={config.diameter}
        height={config.diameter}
        className="transform -rotate-90"
        style={{
          filter: percentage > 0 ? `drop-shadow(0 0 8px ${colors.glow})` : undefined,
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.start} />
            <stop offset="100%" stopColor={colors.end} />
          </linearGradient>
        </defs>

        {/* Background track */}
        <circle
          cx={config.diameter / 2}
          cy={config.diameter / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-[var(--color-border)]"
        />

        {/* Progress arc */}
        <circle
          cx={config.diameter / 2}
          cy={config.diameter / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: animated ? "none" : "stroke-dashoffset 0.5s ease-out",
          }}
        />

        {/* Glow effect at the end cap when near/over 100% */}
        {percentage >= 95 && (
          <circle
            cx={config.diameter / 2}
            cy={stroke / 2 + (config.diameter - stroke) / 2 - radius}
            r={stroke / 2 + 2}
            fill={colors.start}
            className="animate-pulse"
            style={{
              transformOrigin: `${config.diameter / 2}px ${config.diameter / 2}px`,
              transform: `rotate(${(percentage / 100) * 360}deg)`,
            }}
          />
        )}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children ? (
          children
        ) : showValue ? (
          <>
            <span
              className={cn(
                "font-bold tabular-nums text-[var(--color-text-primary)]",
                config.fontSize
              )}
            >
              {Math.round(displayValue).toLocaleString()}
            </span>
            {label && (
              <span className="text-[var(--color-text-tertiary)] text-[12px] mt-0.5">
                {label}
              </span>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

// Double Ring variant for showing two metrics (daily + weekly)
interface DoubleRingProps {
  outer: { value: number; max: number; color?: RingColor };
  inner: { value: number; max: number; color?: RingColor };
  size?: "md" | "lg" | "xl";
  children?: ReactNode;
  className?: string;
}

export function DoubleRing({
  outer,
  inner,
  size = "lg",
  children,
  className,
}: DoubleRingProps) {
  const config = sizeConfig[size];
  const gap = 4;
  const outerStroke = config.stroke;
  const innerStroke = config.stroke - 2;

  const outerRadius = (config.diameter - outerStroke) / 2;
  const innerRadius = outerRadius - outerStroke / 2 - gap - innerStroke / 2;

  const outerCircumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;

  const outerPercentage = Math.min(100, (outer.value / outer.max) * 100);
  const innerPercentage = Math.min(100, (inner.value / inner.max) * 100);

  const outerOffset = outerCircumference - (outerPercentage / 100) * outerCircumference;
  const innerOffset = innerCircumference - (innerPercentage / 100) * innerCircumference;

  const outerColors = colorGradients[outer.color || "green"];
  const innerColors = colorGradients[inner.color || "blue"];

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={config.diameter}
        height={config.diameter}
        className="transform -rotate-90"
      >
        <defs>
          <linearGradient id="outer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={outerColors.start} />
            <stop offset="100%" stopColor={outerColors.end} />
          </linearGradient>
          <linearGradient id="inner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={innerColors.start} />
            <stop offset="100%" stopColor={innerColors.end} />
          </linearGradient>
        </defs>

        {/* Outer track */}
        <circle
          cx={config.diameter / 2}
          cy={config.diameter / 2}
          r={outerRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth={outerStroke}
          className="text-[var(--color-border)]"
        />

        {/* Outer progress */}
        <circle
          cx={config.diameter / 2}
          cy={config.diameter / 2}
          r={outerRadius}
          fill="none"
          stroke="url(#outer-gradient)"
          strokeWidth={outerStroke}
          strokeLinecap="round"
          strokeDasharray={outerCircumference}
          strokeDashoffset={outerOffset}
          className="animate-ring-fill"
          style={{
            "--ring-circumference": outerCircumference,
            "--ring-offset": outerOffset,
          } as React.CSSProperties}
        />

        {/* Inner track */}
        <circle
          cx={config.diameter / 2}
          cy={config.diameter / 2}
          r={innerRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth={innerStroke}
          className="text-[var(--color-border)]"
        />

        {/* Inner progress */}
        <circle
          cx={config.diameter / 2}
          cy={config.diameter / 2}
          r={innerRadius}
          fill="none"
          stroke="url(#inner-gradient)"
          strokeWidth={innerStroke}
          strokeLinecap="round"
          strokeDasharray={innerCircumference}
          strokeDashoffset={innerOffset}
          className="animate-ring-fill stagger-2"
          style={{
            "--ring-circumference": innerCircumference,
            "--ring-offset": innerOffset,
          } as React.CSSProperties}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export default RingProgress;
