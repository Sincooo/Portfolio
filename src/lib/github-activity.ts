export type ActivityDay = { date: string; count: number; level: number };

/** Every metric refers to the same complete calendar, never an all-time claim. */
export function getActivityStats(days: ActivityDay[]) {
  let total = 0;
  let activeDays = 0;
  let streak = 0;
  let longestStreak = 0;
  let previousDate: number | undefined;
  for (const day of days) {
    const time = Date.parse(`${day.date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Number.isFinite(time)
      || new Date(time).toISOString().slice(0, 10) !== day.date
      || !Number.isSafeInteger(day.count) || day.count < 0
      || !Number.isInteger(day.level) || day.level < 0 || day.level > 4
      || (previousDate !== undefined && time - previousDate !== 86400000)) {
      throw new Error('Invalid or incomplete contribution calendar');
    }
    previousDate = time;
    total += day.count;
    if (day.count > 0) { activeDays++; streak++; }
    else streak = 0;
    longestStreak = Math.max(longestStreak, streak);
  }
  return { total, activeDays, longestStreak, activePercent: days.length ? Number((activeDays / days.length * 100).toFixed(1)) : 0 };
}

export const formatStatistic = (value: number, decimals = 0) => new Intl.NumberFormat('en-US', {
  minimumFractionDigits: decimals, maximumFractionDigits: decimals,
}).format(value);
