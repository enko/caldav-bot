import 'dotenv/config';
import { createLogger } from './logger.mjs';
import {
  CalendarProvider,
  CalendarProviderSymbol,
  CalendarProviderType,
  Messenger,
  MessengerType,
  MessageSymbol,
} from './types.mjs';
import { getEventsFromCalendar } from './caldav.mjs';
import { MonicaCalendarProvider } from './calendar-providers/monica.mjs';
import { Container } from 'typedi';
import { NextcloudCalendarProvider } from './calendar-providers/nextcloud.mjs';
import { TelegramMessenger } from './messenger/telegram.mjs';

const logger = createLogger('main');

function getCalendarDuration() {
  const value = process.env.CALENDAR_DURATION;

  if (typeof value !== 'string') {
    throw new Error('Please configure CALENDAR_DURATION');
  }

  const calendarDuration = Number.parseInt(value);

  if (Number.isNaN(calendarDuration)) {
    throw new Error('Please set a number for CALENDAR_DURATION');
  }

  return calendarDuration;
}

function configureCalendarProvider() {
  const provider = process.env.CALENDAR_PROVIDER;

  if (typeof provider === 'undefined') {
    throw new Error('Please configure CALENDAR_PROVIDER');
  }

  if (provider === CalendarProviderType.Monika) {
    const provider = new MonicaCalendarProvider();
    Container.set(CalendarProviderSymbol.toString(), provider);
  } else if (provider === CalendarProviderType.Nextcloud) {
    const provider = new NextcloudCalendarProvider();
    Container.set(CalendarProviderSymbol.toString(), provider);
  } else {
    throw new Error('Unknown Calendar Provider');
  }
}

function configureMessenger() {
  const messenger = process.env.MESSENGER;

  if (typeof messenger === 'undefined') {
    throw new Error('Please configure MESSENGER');
  }

  if (messenger === MessengerType.Telegram) {
    const provider = new TelegramMessenger();
    Container.set(MessageSymbol.toString(), provider);
  } else {
    throw new Error('Unknown Calendar Provider');
  }
}

async function main() {
  logger.info('Welcome to the caldav telegram bot 👋');

  configureCalendarProvider();
  configureMessenger();

  const calendarDuration = getCalendarDuration();

  const events = await getEventsFromCalendar(calendarDuration);

  logger.info({ events }, 'Recieved events');

  const markdown = Container.get<CalendarProvider>(
    CalendarProviderSymbol.toString(),
  ).formatMetadataToMarkdown(events, calendarDuration);

  const results = await Container.get<Messenger>(
    MessageSymbol.toString(),
  ).sendMessage('', markdown);

  logger.info({ results }, 'Sent a message');
}

void main();
