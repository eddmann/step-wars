export function getStartOfWeek(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const todayDate = new Date(year, month - 1, day);

  const dayOfWeek = todayDate.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = new Date(todayDate);
  startOfWeek.setDate(startOfWeek.getDate() - daysFromMonday);
  return startOfWeek.toISOString().split("T")[0];
}
