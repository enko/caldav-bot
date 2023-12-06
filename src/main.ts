import 'dotenv/config';
import { createLogger } from './logger';
import { DateTime } from 'luxon';
import { groupBy } from 'lodash';

import { Telegraf } from 'telegraf';
import { CalendarProvider, Event } from './types';
import { getEventsFromCalendar } from './caldav';

const logger = createLogger('main');

function sanitizeTelegramMarkdown(value: string) {
  return value.replace('(', '\\(').replace(')', '\\)').replace('-', '\\-');
}

function formatMonikaMetadataToMarkdown(
  events: Event[],
  durationInDays: number,
) {
  if (events.length === 0) {
    return 'Keine Geburtstage in Monika in den nächsten 7 Tagen!';
  }

  const groupdEvents = groupBy(events, (item) =>
    item.date.set({ year: DateTime.now().year }).toISODate(),
  );
  console.dir(groupdEvents);

  const formatItem = (item: Event) => {
    const age = item.date
      .set({ year: DateTime.now().year })
      .diff(item.date, 'years').years;

    const days = Math.ceil(
      item.date.set({ year: DateTime.now().year }).diff(DateTime.now(), 'days')
        .days,
    );

    const name = item.summary.replace('(', '\\(').replace(')', '\\)');

    return `📅 ${name} wird ${age} in ${days} Tagen \\([Monika](${item.link})\\)`;
  };

  let output = `🥳 Die nächsten ${durationInDays} Tage 🥳`;

  output += '\n\n';

  for (const date of Object.keys(groupdEvents)) {
    output += `*${date.replace(/-/g, '\\-')}*\n`;

    for (const event of groupdEvents[date]) {
      output += formatItem(event);
      output += '\n';
    }
  }

  return output;
}

function formatNextcloudMetadataToMarkdown(
  events: Event[],
  durationInDays: number,
) {
  if (events.length === 0) {
    return `Keine Termine in den nächsten ${durationInDays} Tagen gefunden.`;
  }

  const groupdEvents = groupBy(events, (item) =>
    item.date.set({ year: DateTime.now().year }).toISODate(),
  );

  const formatItem = (item: Event) => {
    const name = sanitizeTelegramMarkdown(item.summary);
    const calendar = sanitizeTelegramMarkdown(item.calendarName);

    if (item.link.length > 0) {
      return `📅 ${name} \\([Ort](${item.link})\\) \\(${calendar}\\)`;
    } else {
      return `📅 ${name} \\(${calendar}\\)`;
    }
  };

  let output = `🥳 Die nächsten ${durationInDays} Tage 🥳`;

  output += '\n\n';

  for (const date of Object.keys(groupdEvents)) {
    output += `*${date.replace(/-/g, '\\-')}*\n`;

    for (const event of groupdEvents[date]) {
      output += formatItem(event);
      output += '\n';
    }
  }

  return output;
}

function formatMetadataToMarkdown(events: Event[], durationInDays: number) {
  const provider = process.env.CALENDAR_PROVIDER;

  if (typeof provider === 'undefined') {
    throw new Error('Please configure CALENDAR_PROVIDER');
  }

  if (provider === CalendarProvider.Monika) {
    return formatMonikaMetadataToMarkdown(events, durationInDays);
  } else if (provider === CalendarProvider.Nextcloud) {
    return formatNextcloudMetadataToMarkdown(events, durationInDays);
  } else {
    throw new Error('Unknown Calendar Provider');
  }
}

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

async function main() {
  logger.info('Welcome to the caldav telegram bot 👋');

  const calendarDuration = getCalendarDuration();

  const events = await getEventsFromCalendar(calendarDuration);

  logger.info({ events }, 'Recieved events');

  const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

  const results = await bot.telegram.sendMessage(
    process.env.TELEGRAM_CHANNEL_ID,
    formatMetadataToMarkdown(events, calendarDuration),
    {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    },
  );

  logger.info({ results }, 'Sent a message');
}

void main();
