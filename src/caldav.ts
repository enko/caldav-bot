import { DAVCalendar, DAVObject, createDAVClient } from 'tsdav';
import * as ical from 'ical';

import { CalendarProvider, Event } from './types';
import { DateTime } from 'luxon';
import { createLogger } from './logger';
import { sortBy } from 'lodash';

const logger = createLogger('caldav');

function extractMonikaMetaDataFromCalendarObject(
  calendar: DAVCalendar,
  component: ical.CalendarComponent,
) {
  if (!('start' in component)) {
    return undefined;
  }

  const { summary, start, attach } = component;

  if (typeof summary === 'undefined') {
    return undefined;
  }

  if (typeof start === 'undefined') {
    return undefined;
  }

  if (typeof attach !== 'string') {
    return undefined;
  }

  let calendarName = calendar.displayName;

  if (typeof calendarName !== 'string') {
    calendarName = '';
  }

  return {
    summary: summary.replace('Birthday of ', '').replace('Geburtstag von ', ''),
    date: DateTime.fromJSDate(start),
    link: attach,
    calendarName,
  };
}

function extractNextcloudMetaDataFromCalendarObject(
  calendar: DAVCalendar,
  component: ical.CalendarComponent,
) {
  if (!('start' in component)) {
    return undefined;
  }

  console.dir(component);

  const { summary, start, location } = component;

  if (typeof summary === 'undefined') {
    return undefined;
  }

  if (typeof start === 'undefined') {
    return undefined;
  }

  if (typeof location !== 'string') {
    return undefined;
  }

  let calendarName = calendar.displayName;

  if (typeof calendarName !== 'string') {
    calendarName = '';
  }

  return {
    summary: summary.replace('Birthday of ', '').replace('Geburtstag von ', ''),
    date: DateTime.fromJSDate(start),
    link: location,
    calendarName,
  };
}

function extractMetadataFromCalendarObjects(
  calendar: DAVCalendar,
  calendarObjects: DAVObject[],
) {
  const items: Event[] = [];

  const provider = process.env.CALENDAR_PROVIDER;

  if (typeof provider === 'undefined') {
    throw new Error('Please configure CALENDAR_PROVIDER');
  }

  for (const entry of calendarObjects) {
    const data = entry.data;

    if (typeof data === 'undefined') {
      continue;
    }

    const calendarEntry = ical.parseICS(data);

    for (const keys of Object.keys(calendarEntry)) {
      const value = calendarEntry[keys];

      let item: Event | undefined;

      if (provider === CalendarProvider.Monika) {
        item = extractMonikaMetaDataFromCalendarObject(calendar, value);
      } else if (provider === CalendarProvider.Nextcloud) {
        item = extractNextcloudMetaDataFromCalendarObject(calendar, value);
      } else {
        throw new Error('Unknown Calendar Provider');
      }

      if (typeof item === 'undefined') {
        continue;
      }

      items.push(item);
    }
  }

  return sortBy(items, (item) =>
    item.date.set({ year: DateTime.now().year }).toISODate(),
  );
}

function getConfiguredeCalendars() {
  const data = process.env.CALDAV_CALENDAR;

  if (typeof data === 'undefined') {
    throw new Error('Please configure CALDAV_CALENDAR');
  }

  return data.split('|');
}

export async function getEventsFromCalendar(durationInDays: number) {
  const client = await createDAVClient({
    serverUrl: process.env.CALDAV_BASE_URL,
    credentials: {
      username: process.env.CALDAV_USER_NAME,
      password: process.env.CALDAV_USER_PASSWORD,
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  });

  const configuredCalendars = getConfiguredeCalendars();

  const allCalendars = await client.fetchCalendars();

  logger.info(
    { calendars: allCalendars.map((item) => item.displayName) },
    'Discovered calendars',
  );

  const calendars = allCalendars.filter((item) => {
    const displayName = item.displayName;

    if (typeof displayName === 'string') {
      return configuredCalendars.includes(displayName);
    }

    return false;
  });

  if (typeof calendars === 'undefined') {
    throw new Error('Could not find Calendar');
  }

  const filter = {
    timeRange: {
      start: DateTime.now()
        .toUTC()
        .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
        .toISO(),
      end: DateTime.now().toUTC().plus({ days: durationInDays }).toISO(),
    },
  };

  logger.info(filter, 'Fetching calendar items');

  const results: Event[] = [];

  for (const calendar of calendars) {
    const calendarObjects = await client.fetchCalendarObjects({
      calendar,
      ...filter,
    });

    logger.info({ calendarObjects }, 'Recieved calendar obects');

    const objects = extractMetadataFromCalendarObjects(
      calendar,
      calendarObjects,
    );
    for (const item of objects) {
      results.push(item);
    }
  }

  return results;
}
