import { DateTime } from 'luxon';
import { DAVCalendar } from 'tsdav';
import * as ical from 'ical';

export type Event = {
  summary: string;
  date: DateTime;
  link: string;
  calendarName: string;
};

export enum CalendarProviderType {
  Nextcloud = 'nextcloud',
  Monika = 'monika',
}

export const CalendarProviderSymbol = Symbol('CalendarProvider');

export interface CalendarProvider {
  extractmetaDataFromCalendarObject(
    calendar: DAVCalendar,
    component: ical.CalendarComponent,
  ): Promise<Event | undefined>;

  formatMetadataToMarkdown(events: Event[]): string;
}

export enum MessengerType {
  Telegram = 'telegram',
  Matrix = 'matrix',
}

export const MessageSymbol = Symbol('Messenger');

export interface Messenger {
  sendMessage(channel: string, message: string): Promise<unknown>;
}
