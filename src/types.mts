import { DateTime } from 'luxon';
import { DAVCalendar } from 'tsdav';
import { VEvent } from 'node-ical';

export type Event = {
  summary: string;
  date: DateTime;
  link: string;
  calendarName: string;
};

/** Inclusive window the digest covers. */
export type TimeWindow = { from: DateTime; to: DateTime };

export const CALENDAR_PROVIDERS = ['monica', 'nextcloud'] as const;
export type CalendarProviderType = (typeof CALENDAR_PROVIDERS)[number];

export const MESSENGERS = ['telegram', 'matrix'] as const;
export type MessengerType = (typeof MESSENGERS)[number];

export interface CalendarProvider {
  extractEvents(
    calendar: DAVCalendar,
    component: VEvent,
  ): Promise<Event | undefined>;

  formatMetadataToMarkdown(events: Event[]): string;
}

export interface Messenger {
  sendMessage(channel: string, message: string): Promise<unknown>;
}
