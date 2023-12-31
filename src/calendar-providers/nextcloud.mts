import { CalendarComponent } from 'ical';
import { DAVCalendar } from 'tsdav';
import { CalendarProvider, Event } from '../types.mjs';
import { DateTime, FixedOffsetZone } from 'luxon';
import lodash from 'lodash';
import { Service } from '@freshgum/typedi';
import { Config } from '../config';
import { getNextDateFromRRule } from '../caldav.mjs';

@Service([Config])
export class NextcloudCalendarProvider implements CalendarProvider {
  public constructor(private config: Config) {}

  public async extractmetaDataFromCalendarObject(
    calendar: DAVCalendar,
    component: CalendarComponent,
  ) {
    if (!('start' in component)) {
      return undefined;
    }

    const { summary, start, location, rrule, recurrences, status } = component;

    if (typeof summary === 'undefined') {
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
      const offset = FixedOffsetZone.instance(date.offset);
      date = getNextDateFromRRule(rrule).setZone(offset);

      if (typeof recurrences !== 'undefined') {
        for (const recurrence of Object.keys(recurrences)) {
          if (
            recurrence === date.toISODate() &&
            recurrences[recurrence].status === 'CANCELLED'
          ) {
            return;
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
      return `Keine Termine in den nächsten ${this.config.caldav.calendarDuration} Tagen gefunden.`;
    }

    const groupdEvents = lodash.groupBy(events, (item) =>
      item.date.toISODate(),
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

    let output = `🥳 Die nächsten ${this.config.caldav.calendarDuration} Tage 🥳`;

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
