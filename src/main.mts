import { createLogger } from './logger.mjs';
import type { CalendarProvider, Messenger } from './types.mjs';
import { fetchEvents } from './caldav.mjs';
import { MonicaCalendarProvider } from './calendar-providers/monica.mjs';
import { NextcloudCalendarProvider } from './calendar-providers/nextcloud.mjs';
import { loadConfig } from './config.mjs';
import type { Config } from './config.mjs';
import { TelegramMessenger } from './messenger/telegram.mjs';
import { MatrixMessenger } from './messenger/matrix.mjs';

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
