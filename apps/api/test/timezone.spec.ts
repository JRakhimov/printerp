import {
  formatYearMonth,
  getZonedMonthStart,
  getZonedYearMonth,
} from '../src/common/utils/timezone';

describe('timezone utils', () => {
  it('should return local midnight of the 1st day as a UTC instant', () => {
    const start = getZonedMonthStart(2026, 9, 'Asia/Tashkent');

    expect(start.toISOString()).toBe('2026-09-30T19:00:00.000Z');
  });

  it('should normalize out-of-range months like Date.UTC', () => {
    expect(getZonedMonthStart(2026, -1, 'Asia/Tashkent').toISOString()).toBe('2025-11-30T19:00:00.000Z');
    expect(getZonedMonthStart(2026, 12, 'Asia/Tashkent').toISOString()).toBe('2026-12-31T19:00:00.000Z');
    expect(formatYearMonth(2026, -1)).toBe('2025-12');
  });

  it('should respect daylight saving time', () => {
    expect(getZonedMonthStart(2026, 0, 'Europe/Berlin').toISOString()).toBe('2025-12-31T23:00:00.000Z');
    expect(getZonedMonthStart(2026, 6, 'Europe/Berlin').toISOString()).toBe('2026-06-30T22:00:00.000Z');
  });

  it('should read the month as seen in the time zone', () => {
    // 1 October 01:00 in Tashkent, still September in UTC
    const date = new Date('2026-09-30T20:00:00.000Z');

    expect(getZonedYearMonth(date, 'Asia/Tashkent')).toEqual({ year: 2026, month: 9 });
    expect(getZonedYearMonth(date, 'UTC')).toEqual({ year: 2026, month: 8 });
  });
});
