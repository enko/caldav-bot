import { CalendarComponent } from 'ical';
import { DAVCalendar } from 'tsdav';
import { CalendarProvider, Event } from '../types.mjs';
import { DateTime } from 'luxon';
import lodash from 'lodash';
import { Service } from '@freshgum/typedi';
import { Config } from '../config';

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
