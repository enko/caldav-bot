import type { DAVCalendar } from 'tsdav';
import type { VEvent } from 'node-ical';
import { isValidDate } from '../types.mts';
import type { CalendarProvider, Event } from '../types.mts';
import { DateTime } from 'luxon';

export class MonicaCalendarProvider implements CalendarProvider {
  private readonly durationInDays: number;

  public constructor(durationInDays: number) {
    this.durationInDays = durationInDays;
  }

  /**
   * Birthdays are not expanded into the digest window: their DTSTART carries the
   * birth *year*, which the age arithmetic in formatMetadataToMarkdown needs.
   * Hence no `window` parameter - the server-side time range already selected
   * the components we are handed.
   */
  public extractEvents(calendar: DAVCalendar, component: VEvent): Event[] {
    const { summary, start, attach } = component;

    // summary is ParameterValue: a plain string, or {val, params} when the ICS
    // property carries parameters such as LANGUAGE.
    if (typeof summary !== 'string') {
      return [];
    }

    if (typeof start === 'undefined') {
      return [];
    }

    if (typeof attach !== 'string') {
      return [];
    }

    const date = DateTime.fromJSDate(start);

    if (!isValidDate(date)) {
      return [];
    }

    // tsdav types displayName as string | Record<string, unknown> | undefined.
    const calendarName =
      typeof calendar.displayName === 'string' ? calendar.displayName : '';

    return [
      {
        summary: summary
          .replace('Birthday of ', '')
          .replace('Geburtstag von ', ''),
        date,
        link: attach,
        calendarName,
      },
    ];
  }

  public formatMetadataToMarkdown(events: Event[]) {
    if (events.length === 0) {
      return `Keine Geburtstage in Monica in den nächsten ${this.durationInDays} Tagen!`;
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
      const age = item.date.set({ year }).diff(item.date, 'years').years;

      const days = Math.ceil(
        item.date.set({ year }).diff(DateTime.now(), 'days').days,
      );

      const name = item.summary;

      return `📅 ${name} wird ${age} in ${days} Tagen ([Monica](${item.link}))`;
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
