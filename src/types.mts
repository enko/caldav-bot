import type { DateTime } from 'luxon';
import type { VEvent } from 'node-ical';
import type { DAVCalendar } from 'tsdav';

/** A DateTime proven valid, so `toISODate()` and friends never return null. */
export type ValidDateTime = DateTime<true>;

export function isValidDate(date: DateTime): date is ValidDateTime {
  return date.isValid;
}

export type Event = {
  summary: string;
  date: ValidDateTime;
  link: string;
  calendarName: string;
};

/** Inclusive window the digest covers. */
export type TimeWindow = { from: ValidDateTime; to: ValidDateTime };

export const CALENDAR_PROVIDERS = ['monica', 'nextcloud'] as const;
export type CalendarProviderType = (typeof CALENDAR_PROVIDERS)[number];

export const MESSENGERS = ['telegram', 'matrix'] as const;
export type MessengerType = (typeof MESSENGERS)[number];

export interface CalendarProvider {
  /** Zero or more digest entries for one parsed VEVENT. */
  extractEvents(
    calendar: DAVCalendar,
    component: VEvent,
    window: TimeWindow,
  ): Event[];

  /** Sorts and renders; each provider owns its own ordering. */
  formatMetadataToMarkdown(events: Event[]): string;
}

export interface Messenger {
  sendMessage(channel: string, message: string): Promise<unknown>;
}
