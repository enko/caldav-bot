import { describe, it, expect, beforeEach } from 'vitest';
import { MonicaCalendarProvider } from '../../src/calendar-providers/monica.mjs';
import { DateTime } from 'luxon';
import type { Event } from '../../src/types.mjs';
import type { DAVCalendar } from 'tsdav';
import type { VEvent } from 'node-ical';

describe('MonicaCalendarProvider', () => {
  let provider: MonicaCalendarProvider;

  beforeEach(() => {
    provider = new MonicaCalendarProvider(30);
  });

  describe('formatMetadataToMarkdown', () => {
    it('should return no birthdays message for empty array', () => {
      const result = provider.formatMetadataToMarkdown([]);
      expect(result).toContain('Keine Geburtstage');
      expect(result).toContain('30 Tagen');
    });

    it('should format single birthday correctly', () => {
      const futureDate = DateTime.now().plus({ days: 5 });
      const birthYear = 1990;
      const birthDate = DateTime.fromObject({
        year: birthYear,
        month: futureDate.month,
        day: futureDate.day,
      });

      const events: Event[] = [
        {
          summary: 'John Doe',
          date: birthDate,
          link: 'https://monica.test/contact/1',
          calendarName: 'Birthdays',
        },
      ];

      const result = provider.formatMetadataToMarkdown(events);

      expect(result).toContain('John Doe');
      expect(result).toContain('in 5 Tagen');
      expect(result).toMatch(/wird \d+ in 5 Tagen/);
      expect(result).toContain('[Monica](https://monica.test/contact/1)');
    });

    it('should calculate age correctly', () => {
      const currentYear = DateTime.now().year;
      const futureDate = DateTime.now().plus({ days: 10 });
      const birthYear = 1985;
      const expectedAge = currentYear - birthYear;

      const birthDate = DateTime.fromObject({
        year: birthYear,
        month: futureDate.month,
        day: futureDate.day,
      });

      const events: Event[] = [
        {
          summary: 'Jane Smith',
          date: birthDate,
          link: 'https://monica.test/contact/2',
          calendarName: 'Birthdays',
        },
      ];

      const result = provider.formatMetadataToMarkdown(events);

      expect(result).toContain(`wird ${expectedAge}`);
    });

    it('should group birthdays by date', () => {
      const date1 = DateTime.now().plus({ days: 5 });
      const date2 = DateTime.now().plus({ days: 10 });

      const events: Event[] = [
        {
          summary: 'Person A',
          date: DateTime.fromObject({
            year: 1990,
            month: date1.month,
            day: date1.day,
          }),
          link: 'https://monica.test/contact/1',
          calendarName: 'Birthdays',
        },
        {
          summary: 'Person B',
          date: DateTime.fromObject({
            year: 1985,
            month: date1.month,
            day: date1.day,
          }),
          link: 'https://monica.test/contact/2',
          calendarName: 'Birthdays',
        },
        {
          summary: 'Person C',
          date: DateTime.fromObject({
            year: 1995,
            month: date2.month,
            day: date2.day,
          }),
          link: 'https://monica.test/contact/3',
          calendarName: 'Birthdays',
        },
      ];

      const result = provider.formatMetadataToMarkdown(events);

      expect(result).toContain('Person A');
      expect(result).toContain('Person B');
      expect(result).toContain('Person C');

      // Should have two date headers (grouped by ISO date)
      const dateHeaders = result.match(/\*\d{4}-\d{2}-\d{2}\*/g);
      expect(dateHeaders).toHaveLength(2);
    });

    it('should handle birthdays today (0 days)', () => {
      const today = DateTime.now();
      const birthDate = DateTime.fromObject({
        year: 1990,
        month: today.month,
        day: today.day,
      });

      const events: Event[] = [
        {
          summary: 'Birthday Today',
          date: birthDate,
          link: 'https://monica.test/contact/1',
          calendarName: 'Birthdays',
        },
      ];

      const result = provider.formatMetadataToMarkdown(events);

      expect(result).toContain('in 0 Tagen');
    });

    it('should include header with duration', () => {
      const events: Event[] = [
        {
          summary: 'John Doe',
          date: DateTime.fromObject({
            year: 1990,
            month: DateTime.now().plus({ days: 1 }).month,
            day: DateTime.now().plus({ days: 1 }).day,
          }),
          link: 'https://monica.test/contact/1',
          calendarName: 'Birthdays',
        },
      ];

      const result = provider.formatMetadataToMarkdown(events);

      expect(result).toContain('🥳 Die nächsten 30 Tage 🥳');
    });
  });

  describe('extractEvents', () => {
    let mockCalendar: DAVCalendar;

    beforeEach(() => {
      mockCalendar = {
        displayName: 'Test Calendar',
        url: 'https://test.com/calendar',
      } as DAVCalendar;
    });

    const birthday = (overrides: Record<string, unknown>) =>
      ({
        type: 'VEVENT',
        start: new Date('1990-05-15'),
        summary: 'Birthday of John Doe',
        attach: 'https://monica.test/contact/1',
        ...overrides,
      }) as unknown as VEvent;

    it('should extract birthday data correctly', () => {
      const [event, ...rest] = provider.extractEvents(
        mockCalendar,
        birthday({}),
      );

      expect(rest).toHaveLength(0);
      expect(event?.summary).toBe('John Doe');
      expect(event?.date.year).toBe(1990);
      expect(event?.date.month).toBe(5);
      expect(event?.date.day).toBe(15);
      expect(event?.link).toBe('https://monica.test/contact/1');
      expect(event?.calendarName).toBe('Test Calendar');
    });

    it('should remove "Birthday of " prefix from summary', () => {
      const [event] = provider.extractEvents(
        mockCalendar,
        birthday({ summary: 'Birthday of Jane Smith' }),
      );

      expect(event?.summary).toBe('Jane Smith');
    });

    it('should remove "Geburtstag von " prefix from summary', () => {
      const [event] = provider.extractEvents(
        mockCalendar,
        birthday({ summary: 'Geburtstag von Max Mustermann' }),
      );

      expect(event?.summary).toBe('Max Mustermann');
    });

    it('should return nothing if component has no start date', () => {
      expect(
        provider.extractEvents(mockCalendar, birthday({ start: undefined })),
      ).toEqual([]);
    });

    it('should return nothing if component has no summary', () => {
      expect(
        provider.extractEvents(mockCalendar, birthday({ summary: undefined })),
      ).toEqual([]);
    });

    it('should return nothing if attach is not a string', () => {
      expect(
        provider.extractEvents(mockCalendar, birthday({ attach: undefined })),
      ).toEqual([]);
    });

    it('should handle calendar without displayName', () => {
      const calendarWithoutName = {
        url: 'https://test.com/calendar',
      } as DAVCalendar;

      const [event] = provider.extractEvents(calendarWithoutName, birthday({}));

      expect(event?.calendarName).toBe('');
    });
  });
});
