import { DAVCalendar } from 'tsdav';
import * as ical from 'ical';
import { CalendarProvider, Event } from '../types';
import { DateTime } from 'luxon';
import { groupBy } from 'lodash';

export class MonicaCalendarProvider implements CalendarProvider {
  public async extractmetaDataFromCalendarObject(
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

  public formatMetadataToMarkdown(events: Event[], durationInDays: number) {
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
        item.date
          .set({ year: DateTime.now().year })
          .diff(DateTime.now(), 'days').days,
      );

      const name = item.summary;

      return `📅 ${name} wird ${age} in ${days} Tagen ([Monika](${item.link}))`;
    };

    let output = `🥳 Die nächsten ${durationInDays} Tage 🥳`;

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
