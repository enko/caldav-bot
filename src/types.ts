import { DateTime } from 'luxon';

export type Event = {
  summary: string;
  date: DateTime;
  link: string;
  calendarName: string;
};

export enum CalendarProvider {
  Nextcloud = 'nextcloud',
  Monika = 'monika',
}
