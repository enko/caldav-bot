import { DateTime } from 'luxon';

export type Event = {
  summary: string;
  date: DateTime;
  link: string;
};
