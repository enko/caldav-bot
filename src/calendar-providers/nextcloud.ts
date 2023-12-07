import { CalendarComponent } from 'ical';
import { DAVCalendar } from 'tsdav';
import { CalendarProvider, Event } from '../types';
import { DateTime } from 'luxon';
import { groupBy } from 'lodash';

export class NextcloudCalendarProvider implements CalendarProvider {
  public async extractmetaDataFromCalendarObject(
    calendar: DAVCalendar,
    component: CalendarComponent,
  ) {
    if (!('start' in component)) {
      return undefined;
    }

    console.dir(component);

    const { summary, start, location } = component;

    if (typeof summary === 'undefined') {
      return undefined;
    }

    if (typeof start === 'undefined') {
      return undefined;
    }

    if (typeof location !== 'string') {
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
      link: location,
      calendarName,
    };
  }
  public formatMetadataToMarkdown(events: Event[], durationInDays: number) {
    if (events.length === 0) {
      return `Keine Termine in den nächsten ${durationInDays} Tagen gefunden.`;
    }

    const groupdEvents = groupBy(events, (item) =>
      item.date.set({ year: DateTime.now().year }).toISODate(),
    );

    const formatItem = (item: Event) => {
      const name = item.summary;
      const calendar = item.calendarName;

      if (item.link.length > 0) {
        return `📅 ${name} ([Ort](${item.link})) (${calendar})`;
      } else {
        return `📅 ${name} (${calendar})`;
      }
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
