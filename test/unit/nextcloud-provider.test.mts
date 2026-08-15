import { describe, it, expect, beforeEach } from 'vitest';
import { NextcloudCalendarProvider } from '../../src/calendar-providers/nextcloud.mjs';
import { DateTime } from 'luxon';
import type { Event, TimeWindow, ValidDateTime } from '../../src/types.mjs';
import type { DAVCalendar } from 'tsdav';
import type { VEvent } from 'node-ical';

describe('NextcloudCalendarProvider', () => {
  let provider: NextcloudCalendarProvider;

  beforeEach(() => {
    provider = new NextcloudCalendarProvider(30);
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
      expect(result).toContain(
        '[Treffpunkt](https://meet.example.com/room123)',
      );
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

  describe('extractEvents', () => {
    let mockCalendar: DAVCalendar;

    // A window that contains the components below, built the way fetchEvents
    // builds it. Expansion only reports instances inside the window.
    const window: TimeWindow = {
      from: DateTime.fromISO('2024-01-01T00:00:00') as ValidDateTime,
      to: DateTime.fromISO('2024-01-31T23:59:59.999') as ValidDateTime,
    };

    beforeEach(() => {
      mockCalendar = {
        displayName: 'Test Calendar',
        url: 'https://test.com/calendar',
      } as DAVCalendar;
    });

    it('should extract event data correctly', () => {
      const component = {
        type: 'VEVENT',
        start: new Date('2024-01-15T14:30:00'),
        summary: 'Team Meeting',
        location: 'https://meet.example.com/room123',
        status: 'CONFIRMED',
      } as unknown as VEvent;

      const [event, ...rest] = provider.extractEvents(
        mockCalendar,
        component,
        window,
      );

      expect(rest).toHaveLength(0);
      expect(event?.summary).toBe('Team Meeting');
      expect(event?.date.year).toBe(2024);
      expect(event?.date.month).toBe(1);
      expect(event?.date.day).toBe(15);
      expect(event?.link).toBe('https://meet.example.com/room123');
      expect(event?.calendarName).toBe('Test Calendar');
    });

    it('should return nothing if component has no start date', () => {
      const component = {
        type: 'VEVENT',
        summary: 'Meeting',
        location: 'Office',
      } as unknown as VEvent;

      expect(provider.extractEvents(mockCalendar, component, window)).toEqual(
        [],
      );
    });

    it('should return nothing if component has no summary', () => {
      const component = {
        type: 'VEVENT',
        start: new Date('2024-01-15T14:30:00'),
        location: 'Office',
      } as unknown as VEvent;

      expect(provider.extractEvents(mockCalendar, component, window)).toEqual(
        [],
      );
    });

    it('should return nothing if location is not a string', () => {
      const component = {
        type: 'VEVENT',
        start: new Date('2024-01-15T14:30:00'),
        summary: 'Meeting',
        location: undefined,
      } as unknown as VEvent;

      expect(provider.extractEvents(mockCalendar, component, window)).toEqual(
        [],
      );
    });

    it('should return nothing if status is CANCELLED', () => {
      const component = {
        type: 'VEVENT',
        start: new Date('2024-01-15T14:30:00'),
        summary: 'Meeting',
        location: 'Office',
        status: 'CANCELLED',
      } as unknown as VEvent;

      expect(provider.extractEvents(mockCalendar, component, window)).toEqual(
        [],
      );
    });

    it('should return nothing for an event outside the window', () => {
      const component = {
        type: 'VEVENT',
        start: new Date('2024-06-15T14:30:00'),
        summary: 'Meeting',
        location: 'Office',
      } as unknown as VEvent;

      expect(provider.extractEvents(mockCalendar, component, window)).toEqual(
        [],
      );
    });

    it('should handle calendar without displayName', () => {
      const calendarWithoutName = {
        url: 'https://test.com/calendar',
      } as DAVCalendar;

      const component = {
        type: 'VEVENT',
        start: new Date('2024-01-15T14:30:00'),
        summary: 'Meeting',
        location: 'Office',
      } as unknown as VEvent;

      const [event] = provider.extractEvents(
        calendarWithoutName,
        component,
        window,
      );

      expect(event?.calendarName).toBe('');
    });
  });
});
