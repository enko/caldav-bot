import { DAVCalendar, DAVObject, createDAVClient } from 'tsdav';
import ical from 'ical';
import RRule from 'rrule';

import { CalendarProvider, CalendarProviderSymbol, Event } from './types.mjs';
import { DateTime } from 'luxon';
import { createLogger } from './logger.mjs';
import lodash from 'lodash';
import { Container } from '@freshgum/typedi';
import { Config } from './config';

const logger = createLogger('caldav');

export function getNextDateFromRRule(rrule: RRule) {
  const nextDate = rrule.after(DateTime.now().toJSDate(), true);

  if (typeof nextDate === 'undefined') {
    return undefined;
  }

  return DateTime.fromJSDate(nextDate);
}

async function extractMetadataFromCalendarObjects(
  calendar: DAVCalendar,
  calendarObjects: DAVObject[],
) {
  const items: Event[] = [];

  const provider = Container.get<CalendarProvider>(
    CalendarProviderSymbol.toString(),
  );

  for (const entry of calendarObjects) {
    const data = entry.data;

    if (typeof data === 'undefined') {
      continue;
    }

    const calendarEntry = ical.parseICS(data);

    for (const keys of Object.keys(calendarEntry)) {
      const value = calendarEntry[keys];

      const item = await provider.extractmetaDataFromCalendarObject(
        calendar,
        value,
      );

      if (typeof item === 'undefined') {
        continue;
      }

      items.push(item);
    }
  }

  return lodash.sortBy(items, (item) =>
    item.date.set({ year: DateTime.now().year }).toISODate(),
  );
}

export async function getEventsFromCalendar(durationInDays: number) {
  const config = Container.get<Config>(Config);

  const client = await createDAVClient({
    serverUrl: config.caldav.baseUrl,
    credentials: {
      username: config.caldav.userName,
      password: config.caldav.userPassword,
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  });

  const configuredCalendars = config.caldav.calendars;

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

    const objects = await extractMetadataFromCalendarObjects(
      calendar,
      calendarObjects,
    );

    for (const item of objects) {
      results.push(item);
    }
  }

  return results;
}
