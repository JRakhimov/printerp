export const DEFAULT_TIME_ZONE = 'Asia/Tashkent';

/**
 * Business time zone used for reports and notifications.
 */
export function getAppTimeZone(): string {
  return process.env.TIMEZONE || process.env.TZ || DEFAULT_TIME_ZONE;
}

function getZonedDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes) => {
    return Number(parts.find((part) => part.type === type)?.value);
  };

  return {
    year: getPart('year'),
    month: getPart('month') - 1,
    day: getPart('day'),
    hour: getPart('hour'),
    minute: getPart('minute'),
    second: getPart('second'),
  };
}

/**
 * Year and zero-based month of `date` as seen in the time zone.
 */
export function getZonedYearMonth(date: Date, timeZone: string): { year: number; month: number } {
  const { year, month } = getZonedDateParts(date, timeZone);

  return { year, month };
}

/**
 * Instant of local midnight on the 1st day of the month in the time zone.
 * `month` is zero-based and may be out of range (e.g. -1 or 12), like in Date.UTC.
 */
export function getZonedMonthStart(year: number, month: number, timeZone: string): Date {
  const utcMidnight = new Date(Date.UTC(year, month, 1));
  const local = getZonedDateParts(utcMidnight, timeZone);

  const localAsUtc = Date.UTC(local.year, local.month, local.day, local.hour, local.minute, local.second);
  const offsetMs = localAsUtc - utcMidnight.getTime();

  return new Date(utcMidnight.getTime() - offsetMs);
}

/**
 * "YYYY-MM" label for a zero-based month that may be out of range.
 */
export function formatYearMonth(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);
}
