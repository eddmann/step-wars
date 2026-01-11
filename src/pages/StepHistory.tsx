import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { PageContainer, PageHeader } from "../components/layout/AppShell";
import { Card, Button, Input, Modal, Footprints, Calendar, Edit2, ChevronLeft } from "../components/ui";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchStepHistory } from "../store/slices/stepsSlice";
import { submitSteps } from "../store/slices/goalsSlice";
import { useToast } from "../components/ui/Toast";
import { formatNumber, formatDate, canEditDate } from "../lib/utils";

export default function StepHistory() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { entries, isLoading } = useAppSelector((state) => state.steps);
  const { isSubmitting } = useAppSelector((state) => state.goals);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editStepCount, setEditStepCount] = useState("");

  useEffect(() => {
    dispatch(fetchStepHistory());
  }, [dispatch]);

  const handleEditEntry = (date: string, currentSteps: number) => {
    setEditDate(date);
    setEditStepCount(currentSteps.toString());
    setIsEditOpen(true);
  };

  const handleSaveSteps = async () => {
    const steps = parseInt(editStepCount, 10);
    if (isNaN(steps) || steps < 0) {
      showToast("error", "Please enter a valid step count");
      return;
    }

    const result = await dispatch(submitSteps({ date: editDate, stepCount: steps }));
    if (submitSteps.fulfilled.match(result)) {
      setIsEditOpen(false);
      showToast("success", "Steps updated!");
      dispatch(fetchStepHistory());
    }
  };

  return (
    <PageContainer className="animate-fade-in">
      <PageHeader
        title="Step History"
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
        }
      />

      {isLoading ? (
        <Card>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
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
      ) : entries.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center">
              <Footprints className="w-8 h-8 text-[var(--color-text-tertiary)]" />
            </div>
            <h3 className="text-[17px] font-semibold text-[var(--color-text-primary)] mb-2">
              No steps logged yet
            </h3>
            <p className="text-[14px] text-[var(--color-text-secondary)]">
              Start logging your daily steps from the Dashboard
            </p>
            <Button className="mt-4" onClick={() => navigate("/")}>
              Go to Dashboard
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="space-y-1">
            {entries.map((entry, index) => {
              const isEditable = canEditDate(entry.date);
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 -mx-3 rounded-[var(--radius-md)] hover:bg-[var(--color-surface-secondary)] transition-colors animate-slide-up"
                  style={{ animationDelay: `${index * 30}ms` }}
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
                      {isEditable && (
                        <span className="px-1.5 py-0.5 rounded bg-[var(--color-accent)]/15 text-[var(--color-accent)] text-[10px]">
                          Editable
                        </span>
                      )}
                    </div>
                  </div>
                  {isEditable && (
                    <button
                      onClick={() => handleEditEntry(entry.date, entry.step_count)}
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

          <p className="text-[12px] text-[var(--color-text-tertiary)] text-center mt-4 pt-4 border-t border-[var(--color-border)]">
            {entries.length} total entries
          </p>
        </Card>
      )}

      {/* Edit Steps Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Steps">
        <div className="space-y-4">
          <p className="text-[14px] text-[var(--color-text-secondary)]">
            Update steps for {formatDate(editDate)}
          </p>

          <Input
            label="Step Count"
            type="number"
            value={editStepCount}
            onChange={(e) => setEditStepCount(e.target.value)}
            placeholder="Enter step count"
            min={0}
          />

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button fullWidth onClick={handleSaveSteps} isLoading={isSubmitting}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
