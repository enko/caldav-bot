# CalDAV Telegram Bot v2

## Project Overview

This is a TypeScript-based notification bot that fetches upcoming events and birthdays from CalDAV calendars and posts them as daily notifications to messaging platforms.

## Architecture

### Core Components

```
src/
├── main.mts                      # Entry point, DI configuration
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

### Design Patterns

**Dependency Injection**: Uses `@freshgum/typedi` for IoC container

- Providers and messengers are registered at runtime based on configuration
- Services are decorated with `@Service()` for automatic resolution

**Strategy Pattern**:

- `CalendarProvider` interface allows swapping between Monica/NextCloud
- `Messenger` interface allows swapping between Telegram/Matrix

**Factory Pattern**:

- `configureCalendarProvider()` and `configureMessenger()` dynamically instantiate implementations

### Key Features

1. **CalDAV Integration**
   - Supports Monica CRM and NextCloud
   - Fetches events within configurable time window
   - Handles recurring events via RRule
   - Filters by calendar names

2. **Messenger Support**
   - Telegram: Uses Telegraf library, MarkdownV2 formatting with special character escaping
   - Matrix: Uses matrix-bot-sdk with E2E encryption support

3. **Markdown Processing**
   - Uses `unified` + `remark` for markdown transformation
   - Platform-specific sanitization (Telegram requires escaping special chars)

4. **Type Safety**
   - Full TypeScript with strict typing
   - Custom types for events, calendar components
   - Enum-based configuration validation

## Configuration

Environment variables control all behavior:

### CalDAV Settings

- `CALDAV_BASE_URL` - CalDAV server URL
- `CALDAV_CALENDARS` - Pipe-separated calendar names
- `CALDAV_USER_NAME` / `CALDAV_USER_PASSWORD` - Authentication
- `CALDAV_CALENDAR_PROVIDER` - `nextcloud` or `monica`
- `CALENDAR_DURATION` - Days to look ahead

### Messenger Settings

- `MESSENGER` - `telegram` or `matrix`
- `CHANNEL_ID` - Target channel/room ID

### Telegram-specific

- `TELEGRAM_BOT_NAME` - Bot name from BotFather
- `TELEGRAM_BOT_TOKEN` - Bot API token

### Matrix-specific

- `MATRIX_HOME_SERVER_URL` - Homeserver URL
- `MATRIX_USER_ID` / `MATRIX_USER_PASSWORD` - Bot credentials
- `MATRIX_SETTINGS_FILE` - SDK settings storage path
- `MATRIX_CRYPTO_DIRECTORY` - E2E crypto storage path

## Execution Flow

1. **Initialization** (`main.mts`)
   - Load environment variables via `dotenv`
   - Initialize logger
   - Configure DI container with selected provider and messenger

2. **Fetch Events** (`caldav.mts`)
   - Connect to CalDAV server with basic auth
   - Fetch all configured calendars
   - Filter events by time range
   - Extract metadata using provider-specific logic
   - Sort events by date

3. **Format Message**
   - Provider formats events to markdown
   - Monica: Groups by birthday date, calculates age
   - NextCloud: Groups by event date, includes time and location

4. **Send Notification**
   - Messenger sanitizes markdown for platform
   - Sends formatted message to configured channel
   - Exits process

## Technologies Used

- **Runtime**: Node.js 20+ with ES Modules
- **Language**: TypeScript 5.3 (ES2022 target)
- **CalDAV**: `tsdav` library
- **Calendar Parsing**: `ical` for ICS parsing, `rrule` for recurrence
- **Messaging**: `telegraf` (Telegram), `matrix-bot-sdk` (Matrix)
- **Markdown**: `unified` + `remark` + `rehype` ecosystem
- **DI**: `@freshgum/typedi`
- **Date/Time**: `luxon` for timezone-aware date handling
- **Logging**: `pino` + `pino-pretty`

## Deployment

Dockerfile uses multi-stage build:

1. Builder stage: Installs all deps, compiles TypeScript
2. Runner stage: Production deps only, runs compiled JS

## Use Case

Originally created to get daily birthday notifications from Monica CRM contacts, allowing the author to send timely postcards to friends and family.
