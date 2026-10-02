import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getActivityStats, formatStatistic } from '../src/lib/github-activity.ts';

const calendar = (counts, start = '2024-02-27') => counts.map((count, index) => ({
  date: new Date(Date.parse(`${start}T00:00:00Z`) + index * 86400000).toISOString().slice(0, 10),
  count, level: count ? 1 : 0,
}));
test('counts contributions, active days and consecutive streaks across a leap day', () => {
  assert.deepEqual(getActivityStats(calendar([1, 4, 2, 0, 1, 0])), { total: 8, activeDays: 4, longestStreak: 3, activePercent: 66.7 });
});
test('quiet calendars and empty calendars never invent a streak or percentage', () => {
  const zero = { total: 0, activeDays: 0, longestStreak: 0, activePercent: 0 };
  assert.deepEqual(getActivityStats(calendar([0, 0, 0])), zero);
  assert.deepEqual(getActivityStats([]), zero);
});
test('missing, duplicate or invalid days and invalid counts are rejected', () => {
  const days = calendar([1, 2, 3]);
  assert.throws(() => getActivityStats([days[0], days[2]]));
  assert.throws(() => getActivityStats([days[0], days[0]]));
  assert.throws(() => getActivityStats([{ date: '2025-02-29', count: 1, level: 1 }]));
  assert.throws(() => getActivityStats([{ ...days[0], count: -1 }]));
  assert.throws(() => getActivityStats([{ ...days[0], count: 1.5 }]));
});
test('numeric formatting preserves commas and the exact percentage precision', () => {
  assert.equal(formatStatistic(12345), '12,345');
  assert.equal(formatStatistic(1.9, 1), '1.9');
  assert.equal(formatStatistic(0, 1), '0.0');
});
test('the saved calendar belongs to Sincooo and is complete and consecutive', async () => {
  const data = JSON.parse(await readFile(new URL('../src/data/github.json', import.meta.url), 'utf8'));
  assert.equal(data.user, 'Sincooo');
  assert.ok(data.days.length >= 350 && data.days.length <= 371);
  assert.doesNotThrow(() => getActivityStats(data.days));
});
