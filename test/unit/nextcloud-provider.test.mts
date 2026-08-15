import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextcloudCalendarProvider } from '../../src/calendar-providers/nextcloud.mjs';
import { DateTime } from 'luxon';
import { Event } from '../../src/types.mjs';
import { DAVCalendar } from 'tsdav';
import * as ical from 'ical';
import RRule from 'rrule';

// Mock the caldav module
vi.mock('../../src/caldav.mjs', () => ({
  getNextDateFromRRule: vi.fn((rrule: RRule) => {
    // Simple mock: return 5 days from now
    return DateTime.now().plus({ days: 5 });
  }),
}));

describe('NextcloudCalendarProvider', () => {
  let provider: NextcloudCalendarProvider;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      caldav: {
        calendarDuration: 30,
      },
    };
    provider = new NextcloudCalendarProvider(mockConfig);
  });

  describe('formatMetadataToMarkdown', () => {
    it('should return no events message for empty array', () => {
      const result = provider.formatMetadataToMarkdown([]);
      expect(result).toContain('Keine Termine');
      expect(result).toContain('30 Tagen');
    });

    it('should format single event correctly with link', () => {
      const events: Event[] = [
        {
          summary: 'Team Meeting',
          date: DateTime.fromISO('2024-01-15T14:30:00'),
          link: 'https://meet.example.com/room123',
          calendarName: 'Work',
        },
      ];

      const result = provider.formatMetadataToMarkdown(events);

      expect(result).toContain('Team Meeting');
      expect(result).toContain('14:30');
      expect(result).toContain('[Treffpunkt](https://meet.example.com/room123)');
      expect(result).toContain('(Work)');
    });

    it('should format event without http link', () => {
      const events: Event[] = [
        {
          summary: 'Team Meeting',
          date: DateTime.fromISO('2024-01-15T14:30:00'),
          link: 'Conference Room A',
          calendarName: 'Work',
        },
      ];

      const result = provider.formatMetadataToMarkdown(events);

      expect(result).toContain('Team Meeting');
      expect(result).toContain('14:30');
      expect(result).not.toContain('[Treffpunkt]');
      expect(result).toContain('(Work)');
    });

    it('should group events by date', () => {
      const events: Event[] = [
        {
          summary: 'Morning Meeting',
          date: DateTime.fromISO('2024-01-15T09:00:00'),
          link: 'https://meet.example.com/room1',
          calendarName: 'Work',
        },
        {
          summary: 'Lunch',
          date: DateTime.fromISO('2024-01-15T12:00:00'),
          link: 'Restaurant',
          calendarName: 'Personal',
        },
        {
          summary: 'Doctor Appointment',
          date: DateTime.fromISO('2024-01-16T10:00:00'),
          link: 'https://maps.google.com/doctor',
          calendarName: 'Personal',
        },
      ];

      const result = provider.formatMetadataToMarkdown(events);

      expect(result).toContain('Morning Meeting');
      expect(result).toContain('Lunch');
      expect(result).toContain('Doctor Appointment');

      // Should have two date headers
      const dateHeaders = result.match(/\*\*\d{4}-\d{2}-\d{2}\*\*/g);
      expect(dateHeaders).toHaveLength(2);
    });

    it('should format time in HH:mm format', () => {
      const events: Event[] = [
        {
          summary: 'Early Meeting',
          date: DateTime.fromISO('2024-01-15T08:05:00'),
          link: 'https://meet.example.com/room1',
          calendarName: 'Work',
        },
      ];

      const result = provider.formatMetadataToMarkdown(events);

      expect(result).toContain('08:05');
    });

    it('should include header with duration', () => {
      const events: Event[] = [
        {
          summary: 'Meeting',
          date: DateTime.fromISO('2024-01-15T14:30:00'),
          link: 'https://meet.example.com/room1',
          calendarName: 'Work',
        },
      ];

      const result = provider.formatMetadataToMarkdown(events);

      expect(result).toContain('🥳 Die nächsten 30 Tage 🥳');
    });

    it('should handle multiple events on same date', () => {
      const events: Event[] = [
        {
          summary: 'Event 1',
          date: DateTime.fromISO('2024-01-15T09:00:00'),
          link: 'https://example.com/1',
          calendarName: 'Cal1',
        },
        {
          summary: 'Event 2',
          date: DateTime.fromISO('2024-01-15T10:00:00'),
          link: 'https://example.com/2',
          calendarName: 'Cal2',
        },
        {
          summary: 'Event 3',
          date: DateTime.fromISO('2024-01-15T11:00:00'),
          link: 'https://example.com/3',
          calendarName: 'Cal3',
        },
      ];

      const result = provider.formatMetadataToMarkdown(events);

      expect(result).toContain('Event 1');
      expect(result).toContain('Event 2');
      expect(result).toContain('Event 3');
      expect(result).toContain('09:00');
      expect(result).toContain('10:00');
      expect(result).toContain('11:00');
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

    it('should extract event data correctly', async () => {
      const component: ical.CalendarComponent = {
        type: 'VEVENT',
        start: new Date('2024-01-15T14:30:00'),
        summary: 'Team Meeting',
        location: 'https://meet.example.com/room123',
        status: 'CONFIRMED',
      } as ical.CalendarComponent;

      const result = await provider.extractmetaDataFromCalendarObject(
        mockCalendar,
        component,
      );

      expect(result).toBeDefined();
      expect(result?.summary).toBe('Team Meeting');
      expect(result?.date.year).toBe(2024);
      expect(result?.date.month).toBe(1);
      expect(result?.date.day).toBe(15);
      expect(result?.link).toBe('https://meet.example.com/room123');
      expect(result?.calendarName).toBe('Test Calendar');
    });

    it('should return undefined if component has no start date', async () => {
      const component = {
        type: 'VEVENT',
        summary: 'Meeting',
        location: 'Office',
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
        start: new Date('2024-01-15T14:30:00'),
        location: 'Office',
      } as ical.CalendarComponent;

      const result = await provider.extractmetaDataFromCalendarObject(
        mockCalendar,
        component,
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined if location is not a string', async () => {
      const component: ical.CalendarComponent = {
        type: 'VEVENT',
        start: new Date('2024-01-15T14:30:00'),
        summary: 'Meeting',
        location: undefined,
      } as ical.CalendarComponent;

      const result = await provider.extractmetaDataFromCalendarObject(
        mockCalendar,
        component,
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined if status is CANCELLED', async () => {
      const component: ical.CalendarComponent = {
        type: 'VEVENT',
        start: new Date('2024-01-15T14:30:00'),
        summary: 'Meeting',
        location: 'Office',
        status: 'CANCELLED',
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
        start: new Date('2024-01-15T14:30:00'),
        summary: 'Meeting',
        location: 'Office',
      } as ical.CalendarComponent;

      const result = await provider.extractmetaDataFromCalendarObject(
        calendarWithoutName,
        component,
      );

      expect(result?.calendarName).toBe('');
    });

    it('should handle recurring event with rrule', async () => {
      const rrule = new RRule({
        freq: RRule.WEEKLY,
        byweekday: [RRule.MO],
        dtstart: new Date('2024-01-01T09:00:00'),
      });

      const component: ical.CalendarComponent = {
        type: 'VEVENT',
        start: new Date('2024-01-01T09:00:00'),
        summary: 'Weekly Meeting',
        location: 'Office',
        rrule: rrule,
      } as ical.CalendarComponent;

      const result = await provider.extractmetaDataFromCalendarObject(
        mockCalendar,
        component,
      );

      expect(result).toBeDefined();
      expect(result?.summary).toBe('Weekly Meeting');
      // The date should be calculated by getNextDateFromRRule (mocked to return 5 days from now)
      expect(result?.date.isValid).toBe(true);
    });

    it('should skip recurring event if next occurrence is cancelled', async () => {
      const rrule = new RRule({
        freq: RRule.WEEKLY,
        byweekday: [RRule.MO],
        dtstart: new Date('2024-01-01T09:00:00'),
      });

      // Mock next occurrence date
      const nextDate = DateTime.now().plus({ days: 5 });

      const component: ical.CalendarComponent = {
        type: 'VEVENT',
        start: new Date('2024-01-01T09:00:00'),
        summary: 'Weekly Meeting',
        location: 'Office',
        rrule: rrule,
        recurrences: {
          [nextDate.toISODate()!]: {
            status: 'CANCELLED',
          } as ical.CalendarComponent,
        },
      } as ical.CalendarComponent;

      const result = await provider.extractmetaDataFromCalendarObject(
        mockCalendar,
        component,
      );

      expect(result).toBeUndefined();
    });

    it('should not skip recurring event if different occurrence is cancelled', async () => {
      const rrule = new RRule({
        freq: RRule.WEEKLY,
        byweekday: [RRule.MO],
        dtstart: new Date('2024-01-01T09:00:00'),
      });

      const component: ical.CalendarComponent = {
        type: 'VEVENT',
        start: new Date('2024-01-01T09:00:00'),
        summary: 'Weekly Meeting',
        location: 'Office',
        rrule: rrule,
        recurrences: {
          '2024-02-01': {
            status: 'CANCELLED',
          } as ical.CalendarComponent,
        },
      } as ical.CalendarComponent;

      const result = await provider.extractmetaDataFromCalendarObject(
        mockCalendar,
        component,
      );

      expect(result).toBeDefined();
      expect(result?.summary).toBe('Weekly Meeting');
    });
  });
});
