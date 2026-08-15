import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getNextDateFromRRule } from '../../src/caldav.mjs';
import RRule from 'rrule';
import { Settings } from 'luxon';

describe('getNextDateFromRRule', () => {
  let originalNow: () => number;

  beforeEach(() => {
    // Save original implementation
    originalNow = Settings.now;
    // Freeze time to a known date: January 15, 2024, 10:00 AM
    Settings.now = () => new Date('2024-01-15T10:00:00Z').valueOf();
  });

  afterEach(() => {
    // Restore original implementation
    Settings.now = originalNow;
  });

  it('should return next date for daily recurrence', () => {
    const rrule = new RRule({
      freq: RRule.DAILY,
      dtstart: new Date('2024-01-01T09:00:00Z'),
    });

    const result = getNextDateFromRRule(rrule);

    expect(result).toBeDefined();
    // RRule.after() with inc=true returns the next occurrence after now, which is Jan 16
    expect(result?.toISODate()).toBe('2024-01-16');
  });

  it('should return next date for weekly recurrence', () => {
    const rrule = new RRule({
      freq: RRule.WEEKLY,
      byweekday: [RRule.MO], // Every Monday
      dtstart: new Date('2024-01-01T09:00:00Z'),
    });

    const result = getNextDateFromRRule(rrule);

    expect(result).toBeDefined();
    // Next Monday from Jan 15, 2024 (which is a Monday) is Jan 22
    expect(result?.toISODate()).toBe('2024-01-22');
  });

  it('should return next date for monthly recurrence', () => {
    const rrule = new RRule({
      freq: RRule.MONTHLY,
      bymonthday: 20, // 20th of each month
      dtstart: new Date('2024-01-01T09:00:00Z'),
    });

    const result = getNextDateFromRRule(rrule);

    expect(result).toBeDefined();
    // Next occurrence should be January 20, 2024
    expect(result?.toISODate()).toBe('2024-01-20');
  });

  it('should return next date for yearly recurrence (birthdays)', () => {
    const rrule = new RRule({
      freq: RRule.YEARLY,
      bymonth: 5, // May
      bymonthday: 15, // 15th
      dtstart: new Date('1990-05-15T00:00:00Z'),
    });

    const result = getNextDateFromRRule(rrule);

    expect(result).toBeDefined();
    // Next occurrence should be May 15, 2024
    expect(result?.toISODate()).toBe('2024-05-15');
  });

  it('should include current date if it matches (inclusive)', () => {
    const rrule = new RRule({
      freq: RRule.DAILY,
      dtstart: new Date('2024-01-15T10:00:00Z'), // Exactly now
    });

    const result = getNextDateFromRRule(rrule);

    expect(result).toBeDefined();
    // Should return current date since after() is called with inc=true
    expect(result?.toISODate()).toBe('2024-01-15');
  });

  it('should handle recurrence with count limit', () => {
    const rrule = new RRule({
      freq: RRule.DAILY,
      count: 20, // More than 15 days to ensure we get a result
      dtstart: new Date('2024-01-01T09:00:00Z'),
    });

    const result = getNextDateFromRRule(rrule);

    expect(result).toBeDefined();
    // Should return next valid date within count limit
    expect(result?.toISODate()).toBe('2024-01-16');
  });

  it('should return invalid DateTime when rrule has ended', () => {
    const rrule = new RRule({
      freq: RRule.DAILY,
      until: new Date('2024-01-10T23:59:59Z'), // Ended before "now"
      dtstart: new Date('2024-01-01T09:00:00Z'),
    });

    const result = getNextDateFromRRule(rrule);

    // When rrule.after() returns null, DateTime.fromJSDate(null) creates an invalid DateTime
    expect(result).toBeDefined();
    expect(result?.isValid).toBe(false);
  });

  it('should return invalid DateTime when count limit is exceeded', () => {
    const rrule = new RRule({
      freq: RRule.DAILY,
      count: 3, // Only 3 occurrences: Jan 1, 2, 3
      dtstart: new Date('2024-01-01T09:00:00Z'),
    });

    const result = getNextDateFromRRule(rrule);

    // When rrule.after() returns null, DateTime.fromJSDate(null) creates an invalid DateTime
    expect(result).toBeDefined();
    expect(result?.isValid).toBe(false);
  });

  it('should handle complex recurrence rule (every other week)', () => {
    const rrule = new RRule({
      freq: RRule.WEEKLY,
      interval: 2, // Every 2 weeks
      byweekday: [RRule.WE], // On Wednesdays
      dtstart: new Date('2024-01-03T09:00:00Z'), // First Wednesday in Jan 2024
    });

    const result = getNextDateFromRRule(rrule);

    expect(result).toBeDefined();
    // From Jan 15 (Monday), next occurrence should be Jan 17 (Wednesday)
    expect(result?.toISODate()).toBe('2024-01-17');
  });

  it('should handle birthday that already occurred this year', () => {
    const rrule = new RRule({
      freq: RRule.YEARLY,
      bymonth: 1, // January
      bymonthday: 5, // 5th
      dtstart: new Date('1990-01-05T00:00:00Z'),
    });

    const result = getNextDateFromRRule(rrule);

    expect(result).toBeDefined();
    // Jan 5 already passed, so next should be Jan 5, 2025
    expect(result?.toISODate()).toBe('2025-01-05');
  });

  it('should preserve time information from rrule', () => {
    const rrule = new RRule({
      freq: RRule.DAILY,
      dtstart: new Date('2024-01-15T14:30:00Z'),
    });

    const result = getNextDateFromRRule(rrule);

    expect(result).toBeDefined();
    // The hour might differ based on timezone, but time should be preserved
    expect(result?.minute).toBe(30);
    // Check that we got a time component (not just a date)
    expect(result?.hour).toBeGreaterThanOrEqual(0);
    expect(result?.hour).toBeLessThan(24);
  });

  it('should handle timezone-aware dates', () => {
    const rrule = new RRule({
      freq: RRule.WEEKLY,
      byweekday: [RRule.FR],
      dtstart: new Date('2024-01-12T15:00:00+01:00'), // Friday with timezone
    });

    const result = getNextDateFromRRule(rrule);

    expect(result).toBeDefined();
    // Next Friday from Jan 15 should be Jan 19
    expect(result?.toISODate()).toBe('2024-01-19');
  });
});
