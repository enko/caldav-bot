---
status: accepted
date: 2026-08-15
---

# Expand recurring events over the digest window with node-ical

## Context and Problem Statement

ICS parsing sat on `ical@0.8.0` (published 2020, built against Node 8) plus
`rrule`, which was imported by `src/` and the tests but never declared — so the
code ran against the rrule nested inside `ical` while typechecking against a
different hoisted version. On top of that, the recurrence handling was wrong in
four ways: a `RECURRENCE-ID` override that moved an occurrence was never shown at
its new time ([issue #5](https://github.com/enko/caldav-bot/issues/5)), `EXDATE`
was ignored, a cancelled next occurrence dropped the whole series, and the
override lookup compared a UTC date key against a local one. The parser also
discarded the timezone it had just parsed, which a `FixedOffsetZone` hack in the
Nextcloud provider was compensating for.

## Considered Options

- `node-ical` and its `expandRecurringEvent()` over the digest window
- Stay on `ical` + `rrule` and hand-roll override, EXDATE and timezone handling
- `ical.js` (already an undeclared, unused dependency of this project)

## Decision Outcome

Chosen option: "`node-ical`", because it is the maintained fork of the same
`peterbraden/ical.js` lineage — same `parseICS` output shape, bundled types, and
an `expandRecurringEvent(event, {from, to, includeOverrides, excludeExdates})`
that resolves overrides, filters EXDATE and expands in DTSTART's own timezone.
Hand-rolling that on top of an abandoned parser would have reimplemented a
library inside a provider.

The library swap and the semantics change were deliberately kept as separate
commits (`b434b07`, `81456d1`) so the behaviour change can be reverted on its own.

_This ADR was backfilled from git history (`b434b07`, `81456d1`)._

### Consequences

- Good, because moved occurrences appear at their real date and time, EXDATE is
  honoured for the first time, and a single cancelled occurrence no longer
  removes the whole series.
- Good, because the `FixedOffsetZone` hack and the entire hand-rolled
  `recurrences` lookup are gone.
- Good, because runtime and typecheck now use one version of one library.
- **Behaviour change:** a recurring event is now listed **once per occurrence
  inside `CALENDAR_DURATION`**, not once per series. This is unavoidable if
  overrides are to be placed at their real times, and is the intended reading of
  a "next N days" digest — but it makes the digest longer for busy calendars.
- Bad, because Monica cannot use the same path: birthday DTSTARTs carry the birth
  _year_, which the age arithmetic needs, and expansion would rewrite it to the
  current year. `MonicaCalendarProvider` therefore reads `component.start`
  directly and ignores the window.

## More Information

If the digest turns out too noisy, collapse to the earliest instance per
`component.uid` after extraction — that keeps the issue #5 fix while restoring one
entry per series. Do not go back to `rrule.after()`; that reintroduces all four
defects above.
