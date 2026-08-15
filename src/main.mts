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
  switch (config.caldav.calendarProvider) {
    case 'monica':
      return new MonicaCalendarProvider(config.caldav.calendarDuration);
    case 'nextcloud':
      return new NextcloudCalendarProvider(config.caldav.calendarDuration);
  }
}

function createMessenger(config: Config): Messenger {
  switch (config.messenger) {
    case 'telegram': {
      const telegram = config.telegram;

      if (!telegram) {
        throw new Error('MESSENGER=telegram but no Telegram config was loaded');
      }

      return new TelegramMessenger(telegram.botToken);
    }
    case 'matrix': {
      const matrix = config.matrix;

      if (!matrix) {
        throw new Error('MESSENGER=matrix but no Matrix config was loaded');
      }

      return new MatrixMessenger({
        homeServerUrl: matrix.homeServerUrl,
        userId: matrix.userId,
        userPassword: matrix.userPassword,
        settingsFile: matrix.settingsFile,
        cryptoDirectory: matrix.cryptoDirectory,
      });
    }
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
