import { EDIT_DEADLINE_HOUR } from "../../shared/constants";

export function getLastFinalizedDate(editCutoffDate: string): string {
  const d = new Date(editCutoffDate + "T00:00:00");
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getEditCutoffDate(
  date: string,
  hour: number,
  _timezone: string,
): string {
  void _timezone;
  if (hour < EDIT_DEADLINE_HOUR) {
    return getPreviousDate(date);
  }
  return date;
}

function getPreviousDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
