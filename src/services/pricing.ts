/**
 * On-demand job-posting pricing meter.
 * Ported from app/pricing.py
 */

import { CostState } from '../types';

export const CURRENCY = '₹';
export const FREE_DAYS = 7;
export const WEEKLY_RATES = [0, 50, 100, 200, 400]; // INR per day for week 1, 2, 3, 4, 5+
export const CAP_DAYS = 30; // auto-close once this many days pass
export const SECONDS_PER_DAY = 86400;

export function rateForDay(dayIndex: number): number {
  if (dayIndex < 0 || dayIndex >= CAP_DAYS) return 0;
  const weekIdx = Math.floor(dayIndex / 7);
  return WEEKLY_RATES[Math.min(weekIdx, WEEKLY_RATES.length - 1)];
}

export function activeDays(billableSeconds: number, activeSince: string, now: Date = new Date()): number {
  let total = Number(billableSeconds || 0);
  if (activeSince) {
    const since = new Date(activeSince).getTime();
    if (!isNaN(since)) {
      const diffSecs = Math.max(0, (now.getTime() - since) / 1000);
      total += diffSecs;
    }
  }
  return total / SECONDS_PER_DAY;
}

export function computeCostState(
  billableSeconds: number,
  activeSince: string,
  now: Date = new Date()
): CostState {
  const days = activeDays(billableSeconds, activeSince, now);
  const completed = Math.min(Math.floor(days), CAP_DAYS);

  let accrued = 0;
  for (let d = 0; d < completed; d++) {
    accrued += rateForDay(d);
  }

  const currentDay = Math.floor(days);
  const dailyRate = rateForDay(currentDay);
  const expired = days >= CAP_DAYS;
  const daysToCap = Math.max(0, CAP_DAYS - days);

  let nextRate: number | null = null;
  let daysToNext: number | null = null;

  if (!expired) {
    const boundary = (Math.floor(currentDay / 7) + 1) * 7;
    if (boundary < CAP_DAYS) {
      nextRate = rateForDay(boundary);
      daysToNext = boundary - days;
    }
  }

  const isFree = dailyRate === 0 && !expired;

  return {
    daysActive: days,
    accrued,
    dailyRate,
    expired,
    daysToCap,
    nextRate,
    daysToNext,
    isFree,
    accruedDisplay: `${CURRENCY}${accrued.toLocaleString('en-IN')}`,
  };
}
