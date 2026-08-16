---
status: accepted
date: 2026-08-16
---

# Render the digest in a configured timezone

## Context and Problem Statement

The bot had no notion of a display timezone. Every wall-clock value came out of
`DateTime.fromJSDate(instance.start)` (`nextcloud.mts:47`, `monica.mts:37`),
which takes luxon's default zone, which is the process zone. Nothing in the
repository ever set it.

In the published container that zone is UTC: the `Dockerfile` sets only
`NODE_ENV`, and `node:24.19.0-bookworm-slim` carries no `/etc/localtime`.
Measured against the built image, an event whose ICS says
`DTSTART;TZID=Europe/Berlin:...T100000` renders as **09:00**, and
`-e TZ=Europe/Berlin` turns the same event into **10:00**.

The mismatch is not limited to the printed `HH:mm`. The same default zone
decides the collection window (`DateTime.now().startOf('day')`, `caldav.mts:42`),
the date headings the entries are grouped under (`toISODate()`,
`nextcloud.mts:66`) and Monica's age arithmetic (`date.set({ year })`,
`monica.mts:64-78`). Under UTC an appointment at 00:30 Berlin time is filed
under the previous day — the digest is not merely shifted, it is grouped wrong.

So the zone was already a load-bearing input. It just was not part of the
configuration contract, and therefore not validated, not documented and not
visible in `.env.example`.

## Considered Options

- Optional `CALENDAR_TIMEZONE`, falling back to the process zone
- Document `TZ` and write no code
- Mandatory `CALENDAR_TIMEZONE`, no fallback
- Thread an explicit zone through the providers instead of a global

## Decision Outcome

Chosen option: **optional `CALENDAR_TIMEZONE`**, validated in the arktype schema
against `IANAZone.isValidZone` and applied once in `main.mts` as
`Settings.defaultZone`, immediately after `loadConfig()` and before anything
reads a clock.

`TZ` alone was rejected as the only answer because it is invisible to the
config: a typo in `TZ` is not an error anywhere, and the schema — which exists
precisely so a bad environment fails at startup with a named key — would have
nothing to say about the one variable that decides what every line of the digest
reads. Making the key mandatory was rejected because it breaks every existing
deployment for a value most of them already supply through `TZ` or the host.

The global rather than a threaded parameter: luxon's default zone governs
`DateTime.now()`, `fromJSDate` and `toFormat` at once. Threading a zone would
mean three call sites in two providers plus the window builder, each of which
can be forgotten independently — and a forgotten one produces a digest whose
headings and times disagree. One assignment in the composition root cannot
disagree with itself. The test suite already treats `Settings` as the lever for
this (`test/README.md`, "Freezing Time and Zone").

Validation is not decoration. Verified: luxon does **not** fall back for an
unknown zone name. `Settings.defaultZone = 'Europe/Berln'` yields an invalid
zone, every `DateTime` built under it is invalid, `toFormat('HH:mm')` returns
the string `Invalid DateTime` and `toISODate()` returns `null` — which is also
the grouping key. A single typo therefore produces a delivered digest of
`Invalid DateTime` lines, at the daily hour, with no error. The schema turns
that into a startup failure naming `CALENDAR_TIMEZONE`.

### Consequences

- Good, because the zone the digest is rendered in is now declared, validated
  and documented, instead of being an emergent property of the host.
- Good, because one setting fixes the times, the headings and the window
  together; they cannot drift apart.
- Good, because a misspelled zone stops the run at startup rather than sending a
  mangled digest.
- Neutral: two mechanisms now reach the same outcome, `CALENDAR_TIMEZONE` and
  `TZ`. That is the price of not breaking existing deployments. `TZ` also
  affects libc and anything else in the container, so it stays useful;
  `CALENDAR_TIMEZONE` wins where both are set, because it is applied after
  startup.
- Bad, because a deployment that sets neither still renders in UTC and is told
  nothing about it. The default could not be changed to a fixed zone without
  silently moving every existing digest, so the honest fix is documentation:
  the README says what unset means, and `.env.example` carries the key.
- Bad, because `Settings.defaultZone` is global mutable state. It is assigned
  exactly once, in `main.mts`, before any consumer runs; tests that depend on a
  zone set and restore it themselves. Anything that later reads a clock during
  module initialization would escape it.

## More Information

`engines`-level alternatives were not considered: Node's own `--tz` flag and
`TZ` both set the process zone, which is the fallback this key exists to
override, not a substitute for it.
