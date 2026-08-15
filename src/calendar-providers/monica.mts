import { DAVCalendar } from 'tsdav';
import { VEvent } from 'node-ical';
import { CalendarProvider, Event } from '../types.mjs';
import { DateTime } from 'luxon';

export class MonicaCalendarProvider implements CalendarProvider {
  public constructor(private readonly durationInDays: number) {}

  public async extractEvents(calendar: DAVCalendar, component: VEvent) {
    const { summary, start, attach } = component;

    // summary is ParameterValue: a plain string, or {val, params} when the ICS
    // property carries parameters such as LANGUAGE.
    if (typeof summary !== 'string') {
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

    const year = DateTime.now().year;
    const key = (event: Event) => event.date.set({ year }).toISODate();

    // Object.groupBy keeps insertion order for non-index keys, so sorting first
    // orders both the date headings and the entries under them.
    const grouped = Object.groupBy(
      events.toSorted((a, b) => key(a).localeCompare(key(b))),
      key,
    );

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

    // Object.groupBy returns Partial<Record<K, V[]>>, hence the ?? [].
    for (const [date, group] of Object.entries(grouped)) {
      output += `*${date}*\n`;

      for (const event of group ?? []) {
        output += formatItem(event);
        output += '\n';
      }
    }

    return output;
  }
}
