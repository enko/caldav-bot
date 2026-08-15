import 'dotenv/config';
import { createLogger } from './logger.mjs';
import { CalendarProvider, Messenger } from './types.mjs';
import { fetchEvents } from './caldav.mjs';
import { MonicaCalendarProvider } from './calendar-providers/monica.mjs';
import { NextcloudCalendarProvider } from './calendar-providers/nextcloud.mjs';
import { Config, loadConfig } from './config.mjs';
import { TelegramMessenger } from './messenger/telegram.mjs';
import { MatrixMessenger } from './messenger/matrix.mjs';

const logger = createLogger('main');

function createCalendarProvider(config: Config): CalendarProvider {
  switch (config.caldav.calendarProvider) {
    case 'monica':
      return new MonicaCalendarProvider(config.caldav.calendarDuration);
    case 'nextcloud':
      return new NextcloudCalendarProvider(config.caldav.calendarDuration);
  }
}

function createMessenger(config: Config): Messenger {
  switch (config.messenger) {
    case 'telegram':
      return new TelegramMessenger(config.telegram.botToken);
    case 'matrix':
      return new MatrixMessenger({
        homeServerUrl: config.matrix.homeServerUrl,
        userId: config.matrix.userId,
        userPassword: config.matrix.userPassword,
        settingsFile: config.matrix.settingsFile,
        cryptoDirectory: config.matrix.cryptoDirectory,
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

  const results = await messenger.sendMessage(config.channelId, markdown);

  logger.info({ results }, 'Sent a message');

  process.exit(0);
}

void main();
