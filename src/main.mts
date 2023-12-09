import 'reflect-metadata';
import 'dotenv/config';
import { createLogger } from './logger.mjs';
import {
  CalendarProvider,
  CalendarProviderSymbol,
  CalendarProviderType,
  Messenger,
  MessageSymbol,
  MessengerType,
} from './types.mjs';
import { getEventsFromCalendar } from './caldav.mjs';
import { MonicaCalendarProvider } from './calendar-providers/monica.mjs';
import { Container } from '@freshgum/typedi';
import { NextcloudCalendarProvider } from './calendar-providers/nextcloud.mjs';
import { Config } from './config';
import { TelegramMessenger } from './messenger/telegram.mjs';
import { MatrixMessenger } from './messenger/matrix.mjs';

const logger = createLogger('main');

function configureCalendarProvider() {
  const config = Container.get(Config);

  const provider = config.caldav.calendarProvider;

  if (provider === CalendarProviderType.Monika) {
    const provider = Container.get(MonicaCalendarProvider);
    Container.set({
      type: CalendarProviderSymbol.toString(),
      value: provider,
    });
  } else if (provider === CalendarProviderType.Nextcloud) {
    const provider = Container.get(NextcloudCalendarProvider);
    Container.set({
      type: CalendarProviderSymbol.toString(),
      value: provider,
    });
  } else {
    throw new Error('Unknown Calendar Provider');
  }
}

function configureMessenger() {
  const config = Container.get(Config);

  const messenger = config.messenger;

  if (messenger === MessengerType.Telegram) {
    const provider = Container.get(TelegramMessenger);
    Container.set({
      type: MessageSymbol.toString(),
      value: provider,
    });
  } else if (messenger === MessengerType.Matrix) {
    const provider = Container.get(MatrixMessenger);
    Container.set({
      type: MessageSymbol.toString(),
      value: provider,
    });
  } else {
    throw new Error('Unknown Messenger');
  }
}

async function main() {
  logger.info('Welcome to the caldav telegram bot 👋');

  const config = Container.get<Config>(Config);

  configureCalendarProvider();
  configureMessenger();

  const calendarDuration = config.caldav.calendarDuration;

  const events = await getEventsFromCalendar(calendarDuration);

  logger.info({ events }, 'Recieved events');

  const markdown = Container.get<CalendarProvider>(
    CalendarProviderSymbol.toString(),
  ).formatMetadataToMarkdown(events);

  const messenger = Container.get<Messenger>(MessageSymbol.toString());

  const results = await messenger.sendMessage(config.channelId, markdown);

  logger.info({ results }, 'Sent a message');

  process.exit(0);
}

void main();
