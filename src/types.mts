import { DateTime } from 'luxon';
import { DAVCalendar } from 'tsdav';
import * as ical from 'ical';

export type Event = {
  summary: string;
  date: DateTime;
  link: string;
  calendarName: string;
};

export const CALENDAR_PROVIDERS = ['monica', 'nextcloud'] as const;
export type CalendarProviderType = (typeof CALENDAR_PROVIDERS)[number];

export const MESSENGERS = ['telegram', 'matrix'] as const;
export type MessengerType = (typeof MESSENGERS)[number];

export interface CalendarProvider {
  extractEvents(
    calendar: DAVCalendar,
    component: ical.CalendarComponent,
  ): Promise<Event | undefined>;

  formatMetadataToMarkdown(events: Event[]): string;
}

export interface Messenger {
  sendMessage(channel: string, message: string): Promise<unknown>;
}
