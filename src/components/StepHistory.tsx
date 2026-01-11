import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchStepHistory } from "../store/slices/stepsSlice";
import { Card, Footprints, Calendar, Edit2 } from "./ui";
import { formatNumber, formatDate, canEditDate } from "../lib/utils";

interface StepHistoryProps {
  limit?: number;
  onEditEntry?: (date: string, currentSteps: number) => void;
}

export function StepHistory({ limit = 14, onEditEntry }: StepHistoryProps) {
  const dispatch = useAppDispatch();
  const { entries, isLoading } = useAppSelector((state) => state.steps);

  useEffect(() => {
    dispatch(fetchStepHistory());
  }, [dispatch]);

  const displayEntries = limit > 0 ? entries.slice(0, limit) : entries;

  if (isLoading) {
    return (
      <Card>
        <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-4">
          Step History
        </h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)]" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-[var(--color-surface-secondary)] rounded mb-2" />
                <div className="h-3 w-16 bg-[var(--color-surface-secondary)] rounded" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-4">
          Step History
        </h3>
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center">
            <Footprints className="w-6 h-6 text-[var(--color-text-tertiary)]" />
          </div>
          <p className="text-[14px] text-[var(--color-text-secondary)]">
            No steps logged yet
          </p>
          <p className="text-[12px] text-[var(--color-text-tertiary)] mt-1">
            Start logging your daily steps to see your history here
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-4">
        Step History
      </h3>
      <div className="space-y-2">
        {displayEntries.map((entry) => {
          const isEditable = canEditDate(entry.date);
          return (
            <div
              key={entry.id}
              className="flex items-center gap-3 p-3 -mx-3 rounded-[var(--radius-md)] hover:bg-[var(--color-surface-secondary)] transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--color-success)]/15 flex items-center justify-center flex-shrink-0">
                <Footprints className="w-5 h-5 text-[var(--color-success)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                  {formatNumber(entry.step_count)} steps
                </p>
                <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-tertiary)]">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(entry.date)}</span>
                  {entry.source !== "manual" && (
                    <span className="px-1.5 py-0.5 rounded bg-[var(--color-surface-secondary)] text-[10px] uppercase">
                      {entry.source}
                    </span>
                  )}
                </div>
              </div>
              {isEditable && onEditEntry && (
                <button
                  onClick={() => onEditEntry(entry.date, entry.step_count)}
                  className="p-2 rounded-full hover:bg-[var(--color-surface-secondary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-colors"
                  aria-label="Edit entry"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {limit > 0 && entries.length > limit && (
        <p className="text-[12px] text-[var(--color-text-tertiary)] text-center mt-4 pt-3 border-t border-[var(--color-border)]">
          Showing {limit} of {entries.length} entries
        </p>
      )}
    </Card>
  );
}

export default StepHistory;
