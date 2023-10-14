import 'dotenv/config';
import { createLogger } from './logger';
import { DateTime } from 'luxon';
import { groupBy } from 'lodash';

import { Telegraf } from 'telegraf';
import { Event } from './types';
import { getEventsFromCalendar } from './caldav';

const logger = createLogger('main');

function formatMetadataToMarkdown(events: Event[]) {
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

  let output = '🥳 Die nächsten 7 Tage 🥳';

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

async function main() {
  logger.info('Welcome to the caldav telegram bot 👋');

  const events = await getEventsFromCalendar();

  logger.info({ events }, 'Recieved events');

  const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

  await bot.telegram.sendMessage(
    process.env.TELEGRAM_CHANNEL_ID,
    formatMetadataToMarkdown(events),
    {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    },
  );
}

void main();
