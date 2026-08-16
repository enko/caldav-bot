import { Settings } from 'luxon';

import { createLogger } from './logger.mts';
import type { CalendarProvider, Messenger } from './types.mts';
import { fetchEvents } from './caldav.mts';
import { MonicaCalendarProvider } from './calendar-providers/monica.mts';
import { NextcloudCalendarProvider } from './calendar-providers/nextcloud.mts';
import { loadConfig } from './config.mts';
import type { Config } from './config.mts';
import { TelegramMessenger } from './messenger/telegram.mts';
import { MatrixMessenger } from './messenger/matrix.mts';

const logger = createLogger('main');

function createCalendarProvider(config: Config): CalendarProvider {
  switch (config.CALDAV_CALENDAR_PROVIDER) {
    case 'monica':
      return new MonicaCalendarProvider(config.CALENDAR_DURATION);
    case 'nextcloud':
      return new NextcloudCalendarProvider(config.CALENDAR_DURATION);
  }
}

function createMessenger(config: Config): Messenger {
  // The config type is a union discriminated on MESSENGER, so each branch has
  // exactly the keys that messenger needs and nothing else.
  switch (config.MESSENGER) {
    case 'telegram':
      return new TelegramMessenger(config.TELEGRAM_BOT_TOKEN);
    case 'matrix':
      return new MatrixMessenger({
        homeServerUrl: config.MATRIX_HOME_SERVER_URL,
        userId: config.MATRIX_USER_ID,
        userPassword: config.MATRIX_USER_PASSWORD,
        settingsFile: config.MATRIX_SETTINGS_FILE,
        cryptoDirectory: config.MATRIX_CRYPTO_DIRECTORY,
      });
  }
}

async function main() {
  logger.info('Welcome to the caldav telegram bot 👋');

  const config = loadConfig();

  // One global instead of threading a zone through every call: luxon's default
  // zone governs DateTime.now(), fromJSDate and toFormat alike, so the day
  // window, the date headings and the printed times cannot disagree. Left unset
  // the process zone stays in charge - TZ, or whatever the host is, which in a
  // container without TZ is UTC.
  if (config.CALENDAR_TIMEZONE) {
    Settings.defaultZone = config.CALENDAR_TIMEZONE;
  }

  const provider = createCalendarProvider(config);
  const messenger = createMessenger(config);

  const events = await fetchEvents(config, provider);

  logger.info({ count: events.length }, 'Collected events');
  logger.debug({ events }, 'Collected events');

  const markdown = provider.formatMetadataToMarkdown(events);

  await messenger.sendMessage(config.CHANNEL_ID, markdown);

  logger.info('Sent digest');
}

try {
  await main();
} catch (error) {
  logger.error({ err: error }, 'Fatal error, digest not sent');
  // Not process.exit(): let the event loop drain so nothing in flight is cut
  // off. Safe now that the Matrix client no longer holds a /sync long-poll
  // open and the log destination is synchronous.
  process.exitCode = 1;
}
