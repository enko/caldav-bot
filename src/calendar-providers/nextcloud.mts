import ical from 'node-ical';
import type { VEvent } from 'node-ical';
import type { DAVCalendar } from 'tsdav';
import { isValidDate } from '../types.mjs';
import type { CalendarProvider, Event, TimeWindow } from '../types.mjs';
import { DateTime } from 'luxon';

export class NextcloudCalendarProvider implements CalendarProvider {
  public constructor(private readonly durationInDays: number) {}

  public extractEvents(
    calendar: DAVCalendar,
    component: VEvent,
    window: TimeWindow,
  ): Event[] {
    // tsdav types displayName as string | Record<string, unknown> | undefined.
    const calendarName =
      typeof calendar.displayName === 'string' ? calendar.displayName : '';
    const events: Event[] = [];

    const instances = ical.expandRecurringEvent(component, {
      from: window.from.toJSDate(),
      to: window.to.toJSDate(),
      includeOverrides: true,
      excludeExdates: true,
    });

    for (const instance of instances) {
      // For an override instance this is the override's VEVENT, so status and
      // location come from the moved occurrence, not the series master.
      const source = instance.event;
      if (source.status === 'CANCELLED') continue;

      // summary/location are ParameterValue (`string | {val, params}`) whenever
      // the ICS property carries parameters such as LANGUAGE. The expansion
      // substitutes '' for a missing SUMMARY, which is not a digest entry.
      const summary = instance.summary;
      if (typeof summary !== 'string' || summary.length === 0) continue;

      const location = source.location;
      if (typeof location !== 'string') continue;

      const date = DateTime.fromJSDate(instance.start);
      if (!isValidDate(date)) continue;

      events.push({ summary, date, link: location, calendarName });
    }

    return events;
  }

  public formatMetadataToMarkdown(events: Event[]) {
    if (events.length === 0) {
      return `Keine Termine in den nächsten ${this.durationInDays} Tagen gefunden.`;
    }

    // Object.groupBy keeps insertion order for non-index keys, so sorting first
    // orders both the date headings and the entries under them.
    const sorted = events.toSorted(
      (a, b) => a.date.toMillis() - b.date.toMillis(),
    );
    const grouped = Object.groupBy(sorted, (item) => item.date.toISODate());

    const formatItem = (item: Event) => {
      const name = item.summary;
      const calendar = item.calendarName;

      const isLink = item.link.startsWith('http');

      if (isLink) {
        return `📅 ${item.date.toFormat('HH:mm')} ${name} ([Treffpunkt](${item.link})) (${calendar})  `;
      } else {
        return `📅 ${item.date.toFormat('HH:mm')} ${name} (${calendar})  `;
      }
    };

    let output = `🥳 Die nächsten ${this.durationInDays} Tage 🥳`;

    output += '\n\n';

    // Object.groupBy returns Partial<Record<K, V[]>>, hence the ?? [].
    for (const [date, group] of Object.entries(grouped)) {
      output += `**${date}**  \n`;

      for (const event of group ?? []) {
        output += formatItem(event);
        output += '\n';
      }
    }

    return output;
  }
}
