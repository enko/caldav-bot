import { DAVObject, createDAVClient } from 'tsdav';
import * as ical from 'ical';

import { Event } from './types';
import { DateTime } from 'luxon';
import { createLogger } from './logger';
import { sortBy } from 'lodash';

const logger = createLogger('caldav');

function extractMetadataFromCalendarObjects(calendarObjects: DAVObject[]) {
  const items: Event[] = [];

  for (const entry of calendarObjects) {
    const data = entry.data;

    if (typeof data === 'undefined') {
      continue;
    }

    const calendarEntry = ical.parseICS(data);

    for (const keys of Object.keys(calendarEntry)) {
      const value = calendarEntry[keys];

      if (!('start' in value)) {
        continue;
      }

      const { summary, start, attach } = value;

      if (typeof summary === 'undefined') {
        continue;
      }

      if (typeof start === 'undefined') {
        continue;
      }

      if (typeof attach !== 'string') {
        continue;
      }

      items.push({
        summary: summary
          .replace('Birthday of ', '')
          .replace('Geburtstag von ', ''),
        date: DateTime.fromJSDate(start),
        link: attach,
      });
    }
  }

  return sortBy(items, (item) =>
    item.date.set({ year: DateTime.now().year }).toISODate(),
  );
}

export async function getEventsFromCalendar() {
  const client = await createDAVClient({
    serverUrl: process.env.CALDAV_BASE_URL,
    credentials: {
      username: process.env.CALDAV_USER_NAME,
      password: process.env.CALDAV_USER_PASSWORD,
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  });

  const calendars = await client.fetchCalendars();

  logger.info({ calendars }, 'Discovered calendars');

  const calendar = calendars
    .filter((item) => item.displayName === process.env.CALDAV_CALENDAR)
    .pop();

  if (typeof calendar === 'undefined') {
    throw new Error('Could not find Calendar');
  }

  const calendarObjects = await client.fetchCalendarObjects({
    calendar,
    timeRange: {
      start: DateTime.now()
        .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
        .toISO(),
      end: DateTime.now().plus({ days: 7 }).toISO(),
    },
  });

  logger.info({ calendarObjects }, 'Recieved calendar obects');

  return extractMetadataFromCalendarObjects(calendarObjects);
}
