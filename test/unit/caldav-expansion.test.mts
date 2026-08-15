import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ical from 'node-ical';
import type { VEvent } from 'node-ical';
import { DateTime, Settings } from 'luxon';
import { NextcloudCalendarProvider } from '../../src/calendar-providers/nextcloud.mjs';
import type { TimeWindow } from '../../src/types.mjs';
import type { DAVCalendar } from 'tsdav';

const calendar = {
  displayName: 'Team',
  url: 'https://dav.test/team',
} as unknown as DAVCalendar;

function loadEvent(fixture: string): VEvent {
  const path = fileURLToPath(
    new URL(`../fixtures/${fixture}`, import.meta.url),
  );
  const parsed = ical.sync.parseICS(readFileSync(path, 'utf8'));

  for (const component of Object.values(parsed)) {
    // Overrides are attached to the master under `recurrences`, so the only
    // top-level VEVENT is the series master.
    if (component?.type === 'VEVENT') {
      return component;
    }
  }

  throw new Error(`fixture ${fixture} has no VEVENT`);
}

/** The window fetchEvents builds: local midnight through end of day + N. */
function digestWindow(durationInDays: number): TimeWindow {
  const from = DateTime.now().startOf('day');

  return { from, to: from.plus({ days: durationInDays }).endOf('day') };
}

function extract(fixture: string) {
  const provider = new NextcloudCalendarProvider(14);

  return provider
    .extractEvents(calendar, loadEvent(fixture), digestWindow(14))
    .map((event) => ({
      at: event.date.toFormat('yyyy-MM-dd HH:mm'),
      link: event.link,
    }));
}

describe('recurrence expansion', () => {
  let originalNow: () => number;
  let originalZone: Settings['defaultZone'];

  beforeEach(() => {
    originalNow = Settings.now;
    originalZone = Settings.defaultZone;
    // The fixtures use DTSTART;TZID=Europe/Berlin, so pin the rendering zone
    // too; otherwise the asserted wall-clock times depend on the host.
    Settings.defaultZone = 'Europe/Berlin';
    Settings.now = () => new Date('2026-03-02T08:00:00Z').valueOf();
  });

  afterEach(() => {
    Settings.now = originalNow;
    Settings.defaultZone = originalZone;
  });

  it('yields every occurrence inside the window', () => {
    expect(extract('recurring-weekly.ics')).toEqual([
      { at: '2026-03-02 10:00', link: 'https://meet.example.com/standup' },
      { at: '2026-03-09 10:00', link: 'https://meet.example.com/standup' },
      { at: '2026-03-16 10:00', link: 'https://meet.example.com/standup' },
    ]);
  });

  it('reports a moved occurrence at its new date and time', () => {
    const events = extract('recurrence-override.ics');

    // Issue #5: the RECURRENCE-ID override moves 03-09 10:00 to 03-11 14:00.
    expect(events).toEqual([
      { at: '2026-03-02 10:00', link: 'https://meet.example.com/standup' },
      {
        at: '2026-03-11 14:00',
        link: 'https://meet.example.com/standup-moved',
      },
      { at: '2026-03-16 10:00', link: 'https://meet.example.com/standup' },
    ]);
    expect(events.map((event) => event.at)).not.toContain('2026-03-09 10:00');
  });

  it('drops a cancelled occurrence but keeps the rest of the series', () => {
    expect(extract('recurrence-cancelled.ics')).toEqual([
      { at: '2026-03-02 10:00', link: 'https://meet.example.com/standup' },
      { at: '2026-03-16 10:00', link: 'https://meet.example.com/standup' },
    ]);
  });

  it('honours EXDATE exclusions', () => {
    expect(extract('recurrence-exdate.ics')).toEqual([
      { at: '2026-03-02 10:00', link: 'https://meet.example.com/standup' },
      { at: '2026-03-16 10:00', link: 'https://meet.example.com/standup' },
    ]);
  });
});
