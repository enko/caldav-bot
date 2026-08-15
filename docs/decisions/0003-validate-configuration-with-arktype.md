---
status: accepted
date: 2026-08-15
---

# Validate the environment with an arktype schema

## Context and Problem Statement

Configuration was roughly fifteen hand-written `if (typeof process.env.X !==
'string') throw` blocks. It failed at the _first_ missing variable, so setting the
bot up from an empty `.env` meant one run per missing name. Worse, the resulting
type lied: `telegram` and `matrix` were declared non-optional while only the
branch matching `MESSENGER` was ever assigned, so `config.telegram` under
`MESSENGER=matrix` was `undefined` with no type error. Two `fs.accessSync` probes
additionally required the Matrix settings file and crypto directory to pre-exist,
which broke first runs even though the SDK creates both. How should the
environment contract be expressed so that the runtime check and the type cannot
drift apart?

## Considered Options

- `arktype` schema, with the TypeScript type inferred from it
- `zod`
- Keep hand-rolled checks, but collect errors instead of throwing on the first

## Decision Outcome

Chosen option: "`arktype`". The maintainer is more familiar with arktype than with
zod and prefers working in it — for a nine-file project maintained by one person,
the library the maintainer reads fluently is the one that will still be understood
in a year, and both libraries can express this schema. `zod` was the only serious
alternative and lost on that ground, not on capability.

One schema is now the single source of truth:
`type Config = typeof ConfigSchema.infer`, so the validation and the type cannot
diverge. The schema is a union discriminated on `MESSENGER`, which makes
`config.TELEGRAM_BOT_TOKEN` a `string` in the telegram branch and a compile error
in the matrix branch — the exact defect the old class hierarchy hid. Keys stay
flat `SCREAMING_SNAKE`, mirroring the documented environment contract 1:1 and
needing no mapping layer.

_This ADR was backfilled from git history (`c517c57`)._

### Consequences

- Good, because every invalid or missing key in the selected branch is reported in
  one throw. `MESSENGER` is validated first and separately, so a bad discriminant
  blames itself instead of the six keys the wrong branch wanted.
- Good, because values are converted, not merely checked: `CALDAV_CALENDARS`
  splits and trims, `CALENDAR_DURATION` parses to a positive integer and defaults
  to 14, `CALDAV_BASE_URL` must be a URL.
- Good, because `'+': 'delete'` strips undeclared keys, so the config object is
  the declared shape rather than a clone of the whole environment.
- Bad, because `arktype` plus three transitive packages ship in the production
  image — `loadConfig()` runs in production, so it is a runtime dependency.
- Bad, because the schema requires `strict` at the _type_ level, which is a hard
  coupling to [ADR-0005](0005-node-24-typescript-6-no-loader.md).
- **Breaking for operators:** `CALDAV_CALENDAR_PROVIDER=monika` is rejected; the
  documented `monica` is now the accepted spelling. `TELEGRAM_BOT_NAME` was
  required but read by nothing and is dropped.
