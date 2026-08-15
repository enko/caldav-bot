import 'dotenv/config';
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

  logger.info({ events }, 'Recieved events');

  const markdown = provider.formatMetadataToMarkdown(events);

  const results = await messenger.sendMessage(config.CHANNEL_ID, markdown);

  logger.info({ results }, 'Sent a message');

  process.exit(0);
}

void main();
