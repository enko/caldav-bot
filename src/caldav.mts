import { createDAVClient } from 'tsdav';
import ical from 'node-ical';

import type { CalendarProvider, Event, TimeWindow } from './types.mjs';
import { DateTime } from 'luxon';
import { createLogger } from './logger.mjs';
import type { Config } from './config.mjs';

const logger = createLogger('caldav');

export async function fetchEvents(config: Config, provider: CalendarProvider) {
  const client = await createDAVClient({
    serverUrl: config.CALDAV_BASE_URL,
    credentials: {
      username: config.CALDAV_USER_NAME,
      password: config.CALDAV_USER_PASSWORD,
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  });

  const allCalendars = await client.fetchCalendars();
  // tsdav types displayName as string | Record<string, unknown> | undefined.
  const names = allCalendars
    .map((item) => item.displayName)
    .filter((name): name is string => typeof name === 'string');
  logger.debug({ calendars: names }, 'Discovered calendars');

  const calendars = allCalendars.filter(
    (item) =>
      typeof item.displayName === 'string' &&
      config.CALDAV_CALENDARS.includes(item.displayName),
  );

  if (calendars.length === 0) {
    throw new Error(
      `None of the configured calendars (${config.CALDAV_CALENDARS.join(', ')}) ` +
        `exist on the server. Available: ${names.join(', ')}`,
    );
  }

  const start = DateTime.now().startOf('day');
  const window: TimeWindow = {
    from: start,
    to: start.plus({ days: config.CALENDAR_DURATION }).endOf('day'),
  };

  const filter = {
    timeRange: {
      start: window.from.toUTC().toISO(),
      end: window.to.toUTC().toISO(),
    },
  };
  logger.info(filter, 'Fetching calendar items');

  const results: Event[] = [];
  for (const calendar of calendars) {
    const objects = await client.fetchCalendarObjects({ calendar, ...filter });
    logger.debug({ count: objects.length }, 'Received calendar objects');

    for (const entry of objects) {
      if (typeof entry.data !== 'string') continue;

      for (const component of Object.values(ical.sync.parseICS(entry.data))) {
        if (component?.type !== 'VEVENT') continue;

        results.push(...provider.extractEvents(calendar, component, window));
      }
    }
  }

  return results;
}
