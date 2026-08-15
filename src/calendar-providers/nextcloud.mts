import { VEvent } from 'node-ical';
import { DAVCalendar } from 'tsdav';
import { CalendarProvider, Event } from '../types.mjs';
import { DateTime, FixedOffsetZone } from 'luxon';
import lodash from 'lodash';
import { getNextDateFromRRule } from '../caldav.mjs';

export class NextcloudCalendarProvider implements CalendarProvider {
  public constructor(private readonly durationInDays: number) {}

  public async extractEvents(calendar: DAVCalendar, component: VEvent) {
    const { summary, start, location, rrule, recurrences, status } = component;

    // summary and location are ParameterValue: a plain string, or {val, params}
    // when the ICS property carries parameters such as LANGUAGE.
    if (typeof summary !== 'string') {
      return undefined;
    }

    if (typeof start === 'undefined') {
      return undefined;
    }

    if (typeof location !== 'string') {
      return undefined;
    }

    if (status === 'CANCELLED') {
      return undefined;
    }

    let calendarName = calendar.displayName;

    if (typeof calendarName !== 'string') {
      calendarName = '';
    }

    let date = DateTime.fromJSDate(start);

    if (typeof rrule !== 'undefined') {
      const next = getNextDateFromRRule(rrule);

      if (!next) {
        return undefined;
      }

      const offset = FixedOffsetZone.instance(date.offset);
      date = next.setZone(offset);

      if (typeof recurrences !== 'undefined') {
        for (const recurrence of Object.keys(recurrences)) {
          if (
            recurrence === date.toISODate() &&
            recurrences[recurrence].status === 'CANCELLED'
          ) {
            return undefined;
          }
        }
      }
    }

    return {
      summary,
      date,
      link: location,
      calendarName,
    };
  }

  public formatMetadataToMarkdown(events: Event[]) {
    if (events.length === 0) {
      return `Keine Termine in den nächsten ${this.durationInDays} Tagen gefunden.`;
    }

    const groupdEvents = lodash.groupBy(
      lodash.sortBy(events, (item) => item.date.toISODate()),
      (item) => item.date.toISODate(),
    );

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

    for (const date of Object.keys(groupdEvents)) {
      output += `**${date}**  \n`;

      for (const event of groupdEvents[date]) {
        output += formatItem(event);
        output += '\n';
      }
    }

    return output;
  }
}
