import { FollowUpStatus } from '../config/prisma.js';

export const APP_TIMEZONE = 'Asia/Kolkata';
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // 5 hours 30 minutes in milliseconds

/**
 * Calculates start and end of calendar day in Asia/Kolkata (IST) timezone converted to UTC Date objects.
 */
export function getISTDayBoundaries(referenceDate: Date = new Date()): {
  startOfToday: Date;
  endOfToday: Date;
} {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.format(referenceDate).split('-');
  const year = parseInt(parts[0]!, 10);
  const month = parseInt(parts[1]!, 10);
  const day = parseInt(parts[2]!, 10);

  const startOfToday = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - IST_OFFSET_MS);
  const endOfToday = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - IST_OFFSET_MS);

  return { startOfToday, endOfToday };
}

/**
 * Classifies a follow-up task based on its status and due date relative to Asia/Kolkata calendar day.
 */
export function classifyFollowUp(
  dueAt: Date,
  status: FollowUpStatus,
  referenceDate: Date = new Date()
): 'completed' | 'cancelled' | 'today' | 'upcoming' | 'overdue' {
  if (status === FollowUpStatus.COMPLETED) {
    return 'completed';
  }

  if (status === FollowUpStatus.CANCELLED) {
    return 'cancelled';
  }

  const { startOfToday, endOfToday } = getISTDayBoundaries(referenceDate);
  const dueTime = dueAt.getTime();

  if (dueTime < startOfToday.getTime()) {
    return 'overdue';
  }

  if (dueTime >= startOfToday.getTime() && dueTime <= endOfToday.getTime()) {
    return 'today';
  }

  return 'upcoming';
}
