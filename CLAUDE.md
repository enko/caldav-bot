# CalDAV Telegram Bot v2

## Project Overview

This is a TypeScript-based notification bot that fetches upcoming events and birthdays from CalDAV calendars and posts them as daily notifications to messaging platforms.

## Architecture

### Core Components

```
src/
├── main.mts                      # Entry point, wiring, error handling
├── config.mts                    # Environment-based configuration
├── types.mts                     # Type definitions and interfaces
├── caldav.mts                    # CalDAV client and event fetching logic
├── logger.mts                    # Logging setup (Pino)
├── calendar-providers/           # Calendar-specific implementations
│   ├── monica.mts               # Monica CRM birthday provider
│   └── nextcloud.mts            # NextCloud calendar provider
└── messenger/                    # Messaging platform implementations
    ├── telegram.mts             # Telegram messenger
    └── matrix.mts               # Matrix/Element messenger
```

`docs/decisions/` holds the architecture decision records (MADR). Read the
relevant one before reversing a design choice — the reasoning for hand-wiring,
`node-ical`, `arktype`, the Matrix session handling, the toolchain floor and the
logging setup is written down there rather than re-derived from the diff.

**Planned, but not now: `.mts` → `.ts`.** The extension is intended to go away in
the long run, in favour of plain `.ts`. Nothing technical blocks it — `package.json`
already sets `"type": "module"`, so `.ts` files are ESM under Node's type
stripping, and `rewriteRelativeImportExtensions` rewrites `./x.ts` to `./x.js` on
emit exactly as it does today for `.mts` (see ADR-0005 for why the extension is
explicit in the first place). The touch points are the `include` glob in
`tsconfig.json`, the `main` field and `start` script in `package.json`, `CMD` in
the `Dockerfile`, the `files` globs in `eslint.config.mjs`, the coverage `exclude`
in `vitest.config.mts`, the relative specifiers in `src/`, and the `.mjs`
specifiers the tests import. Do not start this migration unprompted; it is a
deliberate someday, not a pending task.

### Design Patterns

**Hand-wired dependencies**: `main.mts` constructs the provider and messenger in
exhaustive `switch` statements over the config unions. There is no DI container;
each class takes the scalars it uses rather than the whole `Config`.

**Strategy Pattern**:

- `CalendarProvider` interface allows swapping between Monica/NextCloud
- `Messenger` interface allows swapping between Telegram/Matrix

### Key Features

1. **CalDAV Integration**
   - Supports Monica CRM and NextCloud
   - Fetches events within a configurable window
   - Expands recurring events over that window with `node-ical`, honouring
     `RECURRENCE-ID` overrides and `EXDATE` - NextCloud only; Monica keeps each
     birthday at its `DTSTART`, whose year the age arithmetic needs
   - Filters by calendar names

2. **Messenger Support**
   - Telegram: Uses Telegraf library, MarkdownV2 formatting with special character escaping
   - Matrix: Uses matrix-bot-sdk with E2E encryption support; logs in once and
     reuses the cached access token so the device stays stable

3. **Markdown Processing**
   - Uses `unified` + `remark` for markdown transformation
   - Platform-specific sanitization (Telegram requires escaping special chars)

4. **Type Safety**
   - `strict`, plus `noUncheckedIndexedAccess` and `verbatimModuleSyntax`
   - Runtime validation of the environment with `arktype`, inferred back into the
     `Config` type so the two cannot drift
   - `Event.date` is a `DateTime<true>`, proven valid at extraction time

## Configuration

Environment variables control all behavior:

### CalDAV Settings

- `CALDAV_BASE_URL` - CalDAV server URL
- `CALDAV_CALENDARS` - Pipe-separated calendar names
- `CALDAV_USER_NAME` / `CALDAV_USER_PASSWORD` - Authentication
- `CALDAV_CALENDAR_PROVIDER` - `nextcloud` or `monica`
- `CALENDAR_DURATION` - Days to look ahead, defaults to 14

### Messenger Settings

- `MESSENGER` - `telegram` or `matrix`
- `CHANNEL_ID` - Target channel/room ID

### Telegram-specific

- `TELEGRAM_BOT_TOKEN` - Bot API token

### Matrix-specific

- `MATRIX_HOME_SERVER_URL` - Homeserver URL
- `MATRIX_USER_ID` / `MATRIX_USER_PASSWORD` - Bot credentials; the password is
  only used for the first login, after which the access token is cached in
  `MATRIX_SETTINGS_FILE` to keep the device stable
- `MATRIX_SETTINGS_FILE` - SDK settings storage path, created if missing
- `MATRIX_CRYPTO_DIRECTORY` - E2E crypto storage path, created if missing

### Logging

- `LOG_LEVEL` - defaults to `info`; event payloads are logged at `debug`

## Execution Flow

1. **Initialization** (`main.mts`)
   - Environment is loaded by Node itself (`--env-file-if-exists`)
   - `loadConfig()` validates it and returns a discriminated union
   - Provider and messenger are constructed in exhaustive switches

2. **Fetch Events** (`caldav.mts`)
   - Connect to CalDAV server with basic auth
   - Filter the discovered calendars by the configured names
   - Query the window from local midnight to end of day + `CALENDAR_DURATION`
   - Parse each object and let the provider extract zero or more events

3. **Format Message**
   - Provider sorts, groups and renders its own events to markdown
   - Monica: groups by birthday date, calculates age
   - NextCloud: groups by event date, includes time and location

4. **Send Notification**
   - Messenger sanitizes markdown for the platform
   - Sends the formatted message to the configured channel
   - Returns; the process exits on its own, or with code 1 after a fatal error

## Technologies Used

- **Runtime**: Node.js >= 24.11, < 27 with ES Modules, run directly via type
  stripping (no loader; `erasableSyntaxOnly` keeps the sources runnable)
- **Language**: TypeScript 6.0, `strict`, es2024 target
- **CalDAV**: `tsdav` library
- **Calendar Parsing**: `node-ical` for ICS parsing and recurrence expansion
- **Config validation**: `arktype` schema, one discriminated union per messenger
- **Messaging**: `telegraf` (Telegram), `matrix-bot-sdk` (Matrix)
- **Markdown**: `unified` + `remark` + `rehype` ecosystem
- **Date/Time**: `luxon` for timezone-aware date handling
- **Logging**: `pino` (NDJSON on stdout; `pino-pretty` only on a TTY)
- **Tests**: `vitest` (`test/unit/`, v8 coverage; see `test/README.md`)
- **Lint/format**: ESLint flat config with type-aware rules, Prettier standalone
- **Releases**: `semantic-release` (conventionalcommits preset), package `private`

## Deployment

Dockerfile uses a three-stage build:

1. Builder stage: installs all dependencies, compiles TypeScript
2. Deps stage: resolves production dependencies only
3. Runner stage: `node_modules` + `dist` + `package.json`, runs as uid 1000

CI (`.github/workflows/ci.yml`) runs typecheck, lint, format:check and tests on
Node 24 and 26, then releases from `main` with `semantic-release`. The version,
the tag and `CHANGELOG.md` come from the commit messages — the changelog is
generated, so never edit it by hand. A release also publishes
`ghcr.io/enko/caldav-bot` for `linux/amd64` and `linux/arm64`, tagged `X.Y.Z`,
`X.Y`, `X` and `latest`.

## Use Case

Originally created to get daily birthday notifications from Monica CRM contacts, allowing the author to send timely postcards to friends and family.
