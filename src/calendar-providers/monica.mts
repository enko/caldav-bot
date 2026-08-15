import { DAVCalendar } from 'tsdav';
import * as ical from 'ical';
import { CalendarProvider, Event } from '../types.mjs';
import { DateTime } from 'luxon';
import lodash from 'lodash';

export class MonicaCalendarProvider implements CalendarProvider {
  public constructor(private readonly durationInDays: number) {}

  public async extractEvents(
    calendar: DAVCalendar,
    component: ical.CalendarComponent,
  ) {
    if (!('start' in component)) {
      return undefined;
    }

    const { summary, start, attach } = component;

    if (typeof summary === 'undefined') {
      return undefined;
    }

    if (typeof start === 'undefined') {
      return undefined;
    }

    if (typeof attach !== 'string') {
      return undefined;
    }

    let calendarName = calendar.displayName;

    if (typeof calendarName !== 'string') {
      calendarName = '';
    }

    return {
      summary: summary
        .replace('Birthday of ', '')
        .replace('Geburtstag von ', ''),
      date: DateTime.fromJSDate(start),
      link: attach,
      calendarName,
    };
  }

  public formatMetadataToMarkdown(events: Event[]) {
    if (events.length === 0) {
      return `Keine Geburtstage in Monika in den nächsten ${this.durationInDays} Tagen!`;
    }

    const key = (item: Event) =>
      item.date.set({ year: DateTime.now().year }).toISODate();

    const groupdEvents = lodash.groupBy(lodash.sortBy(events, key), key);

    const formatItem = (item: Event) => {
      const age = item.date
        .set({ year: DateTime.now().year })
        .diff(item.date, 'years').years;

      const days = Math.ceil(
        item.date
          .set({ year: DateTime.now().year })
          .diff(DateTime.now(), 'days').days,
      );

      const name = item.summary;

      return `📅 ${name} wird ${age} in ${days} Tagen ([Monika](${item.link}))`;
    };

    let output = `🥳 Die nächsten ${this.durationInDays} Tage 🥳`;

    output += '\n\n';

    for (const date of Object.keys(groupdEvents)) {
      output += `*${date}*\n`;

      for (const event of groupdEvents[date]) {
        output += formatItem(event);
        output += '\n';
      }
    }

    return output;
  }
}
