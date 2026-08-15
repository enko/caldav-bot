import { describe, it, expect, beforeEach } from 'vitest';
import { MonicaCalendarProvider } from '../../src/calendar-providers/monica.mjs';
import { DateTime } from 'luxon';
import { Event } from '../../src/types.mjs';
import { DAVCalendar } from 'tsdav';
import * as ical from 'ical';

describe('MonicaCalendarProvider', () => {
  let provider: MonicaCalendarProvider;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      caldav: {
        calendarDuration: 30,
      },
    };
    provider = new MonicaCalendarProvider(mockConfig);
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
      expect(result).toContain('[Monika](https://monica.test/contact/1)');
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

  describe('extractmetaDataFromCalendarObject', () => {
    let mockCalendar: DAVCalendar;

    beforeEach(() => {
      mockCalendar = {
        displayName: 'Test Calendar',
        url: 'https://test.com/calendar',
      } as DAVCalendar;
    });

    it('should extract birthday data correctly', async () => {
      const component: ical.CalendarComponent = {
        type: 'VEVENT',
        start: new Date('1990-05-15'),
        summary: 'Birthday of John Doe',
        attach: 'https://monica.test/contact/1',
      } as ical.CalendarComponent;

      const result = await provider.extractmetaDataFromCalendarObject(
        mockCalendar,
        component,
      );

      expect(result).toBeDefined();
      expect(result?.summary).toBe('John Doe');
      expect(result?.date.year).toBe(1990);
      expect(result?.date.month).toBe(5);
      expect(result?.date.day).toBe(15);
      expect(result?.link).toBe('https://monica.test/contact/1');
      expect(result?.calendarName).toBe('Test Calendar');
    });

    it('should remove "Birthday of " prefix from summary', async () => {
      const component: ical.CalendarComponent = {
        type: 'VEVENT',
        start: new Date('1990-05-15'),
        summary: 'Birthday of Jane Smith',
        attach: 'https://monica.test/contact/2',
      } as ical.CalendarComponent;

      const result = await provider.extractmetaDataFromCalendarObject(
        mockCalendar,
        component,
      );

      expect(result?.summary).toBe('Jane Smith');
    });

    it('should remove "Geburtstag von " prefix from summary', async () => {
      const component: ical.CalendarComponent = {
        type: 'VEVENT',
        start: new Date('1990-05-15'),
        summary: 'Geburtstag von Max Mustermann',
        attach: 'https://monica.test/contact/3',
      } as ical.CalendarComponent;

      const result = await provider.extractmetaDataFromCalendarObject(
        mockCalendar,
        component,
      );

      expect(result?.summary).toBe('Max Mustermann');
    });

    it('should return undefined if component has no start date', async () => {
      const component = {
        type: 'VEVENT',
        summary: 'Birthday of John Doe',
        attach: 'https://monica.test/contact/1',
      } as ical.CalendarComponent;

      const result = await provider.extractmetaDataFromCalendarObject(
        mockCalendar,
        component,
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined if component has no summary', async () => {
      const component: ical.CalendarComponent = {
        type: 'VEVENT',
        start: new Date('1990-05-15'),
        attach: 'https://monica.test/contact/1',
      } as ical.CalendarComponent;

      const result = await provider.extractmetaDataFromCalendarObject(
        mockCalendar,
        component,
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined if attach is not a string', async () => {
      const component: ical.CalendarComponent = {
        type: 'VEVENT',
        start: new Date('1990-05-15'),
        summary: 'Birthday of John Doe',
        attach: undefined,
      } as ical.CalendarComponent;

      const result = await provider.extractmetaDataFromCalendarObject(
        mockCalendar,
        component,
      );

      expect(result).toBeUndefined();
    });

    it('should handle calendar without displayName', async () => {
      const calendarWithoutName = {
        url: 'https://test.com/calendar',
      } as DAVCalendar;

      const component: ical.CalendarComponent = {
        type: 'VEVENT',
        start: new Date('1990-05-15'),
        summary: 'Birthday of John Doe',
        attach: 'https://monica.test/contact/1',
      } as ical.CalendarComponent;

      const result = await provider.extractmetaDataFromCalendarObject(
        calendarWithoutName,
        component,
      );

      expect(result?.calendarName).toBe('');
    });
  });
});
