# Test Suite

This directory contains the test suite for the CalDAV Telegram Bot v2 project.

## Structure

```
test/
├── unit/                              # Unit tests
│   ├── caldav-expansion.test.mts     # Fixture-driven recurrence expansion
│   ├── config.test.mts               # Environment schema validation
│   ├── monica-provider.test.mts      # Monica calendar provider tests
│   └── nextcloud-provider.test.mts   # Nextcloud calendar provider tests
└── fixtures/                          # Real ICS files used by the expansion tests
    ├── recurring-weekly.ics
    ├── recurrence-override.ics
    ├── recurrence-cancelled.ics
    └── recurrence-exdate.ics
```

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with interactive UI
npm run test:ui
```

## Test Framework

The project uses [Vitest](https://vitest.dev/) for testing:

- Native ESM support
- TypeScript support out of the box
- Fast execution with watch mode
- Built-in code coverage via v8
- Jest-compatible API

## Current Test Coverage

### High Coverage (>95%)

- `MonicaCalendarProvider` - Birthday formatting and extraction logic
- `NextcloudCalendarProvider` - Event formatting, extraction and recurrence
  expansion
- `config.mts` - Schema validation, conversion and error messages

### Not Tested

- `main.mts` - Application entry point
- `caldav.mts` - Needs a CalDAV server; the parse-and-expand half it delegates
  to is covered by `caldav-expansion.test.mts`
- `messenger/` - Telegram and Matrix integrations
- `logger.mts` - Simple logging setup

## Test Categories

### Unit Tests

#### `monica-provider.test.mts` (13 tests)

Tests for Monica CRM birthday calendar provider:

- Birthday metadata extraction from ICS components
- Markdown formatting with age calculation
- Date grouping and sorting
- German text prefixes removal
- Edge cases (missing fields, invalid data)

#### `nextcloud-provider.test.mts` (14 tests)

Tests for Nextcloud calendar event provider:

- Event extraction from hand-built VEVENT components
- Window filtering, cancelled event detection
- Markdown formatting with location links
- Time formatting (HH:mm)

#### `caldav-expansion.test.mts` (4 tests)

Drives the ICS files in `fixtures/` through `node-ical`'s parser and the
Nextcloud provider, so parsing and recurrence expansion are exercised together:

- Every occurrence of a weekly series inside the window
- A `RECURRENCE-ID` override reported at its new date and time (issue #5)
- A cancelled occurrence dropped without losing the series
- `EXDATE` exclusions honoured

#### `config.test.mts` (8 tests)

Tests for the arktype configuration schema:

- A complete environment parses, with conversion and defaulting
- Every invalid key is reported in a single error
- Unknown `MESSENGER`, empty calendar list, bad provider spelling, malformed
  Matrix user id
- Undeclared environment variables are stripped from the result

## Writing New Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { YourClass } from '../../src/your-module.mts';

describe('YourClass', () => {
  let instance: YourClass;

  beforeEach(() => {
    // Setup before each test
    instance = new YourClass();
  });

  describe('yourMethod', () => {
    it('should handle normal case', () => {
      const result = instance.yourMethod('input');
      expect(result).toBe('expected output');
    });

    it('should handle edge case', () => {
      const result = instance.yourMethod(null);
      expect(result).toBeUndefined();
    });
  });
});
```

### Mocking Dependencies

Providers and messengers take the scalars they use, so most tests need no
mocking at all:

```typescript
const provider = new MonicaCalendarProvider(30);
```

#### Mocking Modules

```typescript
vi.mock('../../src/config.mts', () => ({
  loadConfig: vi.fn(() => ({ MESSENGER: 'telegram' })),
}));
```

#### Freezing Time and Zone

Pin the zone as well whenever an assertion mentions a wall-clock time, or the
test depends on the host:

```typescript
import { Settings } from 'luxon';

let originalNow: () => number;
let originalZone: Settings['defaultZone'];

beforeEach(() => {
  originalNow = Settings.now;
  originalZone = Settings.defaultZone;
  Settings.defaultZone = 'Europe/Berlin';
  Settings.now = () => new Date('2026-03-02T08:00:00Z').valueOf();
});

afterEach(() => {
  Settings.now = originalNow;
  Settings.defaultZone = originalZone;
});
```

## Future Test Additions

### Priority Areas

1. `fetchEvents()` against a mocked CalDAV server
2. Messenger formatting tests (Telegram MarkdownV2 escaping)
3. All-day and multi-day event handling

### Lower Priority

- Snapshot tests for markdown output
- Performance benchmarks for large calendars
- Error handling and logging tests

## CI

`.github/workflows/ci.yml` runs `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm test` on Node 24 and 26 for every push to main
and every pull request. Node itself comes from `mise.toml` through
`jdx/mise-action`, with the matrix overriding the pin via `MISE_NODE_VERSION`;
locally, `mise install` gets you the same pinned version (ADR-0012).

## Troubleshooting

### Tests fail with ESM errors

Ensure `"type": "module"` is set in `package.json`. Sources import each other
with explicit `.mts` extensions.

### DateTime tests fail inconsistently

Freeze both `Settings.now` and `Settings.defaultZone`; a test asserting a
wall-clock time passes locally and fails on CI, which runs in UTC.

### Coverage not generated

Check that `@vitest/coverage-v8` is installed and `vitest.config.mts` is properly configured.

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vitest API Reference](https://vitest.dev/api/)
- [Luxon Testing Guide](https://moment.github.io/luxon/#/testing)
