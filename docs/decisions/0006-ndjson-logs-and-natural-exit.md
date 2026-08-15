---
status: accepted
date: 2026-08-15
---

# Write NDJSON to stdout through a synchronous destination

## Context and Problem Statement

The logger hardcoded `level: 'debug'` and always routed through the `pino-pretty`
transport, in containers too. So production logs were ANSI-coloured human text
that nothing downstream could parse, and everything — including a dump of every
event in the digest and the raw ICS of every calendar object — was written at
debug level by a process whose entire job is to post a summary. `pino-pretty` also
runs in a worker thread, and `main.mts` called `process.exit(0)` immediately after
sending, which per pino's own transport documentation loses whatever the transport
had not flushed.

## Considered Options

- One synchronous destination, with `pino-pretty` loaded only when stdout is a TTY
- Keep the worker transport and flush explicitly before exiting
- Two logger configurations selected by `NODE_ENV`

## Decision Outcome

Chosen option: "One synchronous destination", because it removes the failure mode
rather than working around it: with no worker thread there is nothing to flush, so
nothing can be lost regardless of how the process ends. `LOG_LEVEL` selects the
level and defaults to `info`; `pino-pretty` is imported dynamically and only on a
TTY, which also lets it move to devDependencies so `npm ci --omit=dev` images never
resolve it.

That, together with the removal of the Matrix `/sync` long-poll (see
[ADR-0004](0004-one-matrix-device-via-cached-token.md)), is what made
`process.exit(0)` unnecessary: `main.mts` now sets `process.exitCode` on failure
and lets the event loop drain.

_This ADR was backfilled from git history (`513db4c`, `ffc3386`)._

### Consequences

- Good, because piped output is one JSON object per line and a TTY still gets
  readable coloured output.
- Good, because event payloads are at `debug` with only a count at `info`, so a
  default-level log no longer contains the calendar.
- Good, because fatal errors are logged through the same structured logger and set
  exit code 1, which a cron or systemd timer can act on. Previously any rejection
  was an unhandled rejection with an exit code that depended on Node's version.
- Good, because `dotenv` could be dropped for Node's own `--env-file-if-exists`;
  dotenv 17 printed a banner to _stdout_, which would corrupt the NDJSON stream.
- Bad, because synchronous writes block the process. For a one-shot that emits a
  handful of lines this is not a cost worth engineering around.
- Neutral: the TTY branch degrades to NDJSON if `pino-pretty` cannot be resolved,
  so a production image given a TTY (`docker run -t`) still starts. This was found
  by smoke-testing the image, not by reasoning.
