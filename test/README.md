# Test Suite

This directory contains the test suite for the CalDAV Telegram Bot v2 project.

## Structure

```
test/
├── unit/                              # Unit tests
│   ├── monica-provider.test.mts      # Monica calendar provider tests
│   ├── nextcloud-provider.test.mts   # Nextcloud calendar provider tests
│   └── caldav.test.mts               # CalDAV utility function tests
└── fixtures/                          # Test data fixtures (future)
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
- `NextcloudCalendarProvider` - Event formatting and extraction logic

### Partial Coverage (~10%)

- `caldav.mts` - Only `getNextDateFromRRule()` tested
- `config.mts` - Not tested (configuration loading)

### Not Tested

- `main.mts` - Application entry point
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

#### `nextcloud-provider.test.mts` (16 tests)

Tests for Nextcloud calendar event provider:

- Event metadata extraction from ICS components
- Recurring event handling with RRule
- Cancelled event detection
- Markdown formatting with location links
- Time formatting (HH:mm)

#### `caldav.test.mts` (12 tests)

Tests for CalDAV utility functions:

- `getNextDateFromRRule()` - RRule date calculation
- Daily, weekly, monthly, yearly recurrences
- Birthday recurrence patterns
- Edge cases (expired rules, count limits)
- Timezone handling

## Writing New Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { YourClass } from '../../src/your-module.mjs';

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

#### Mocking TypeDI Container

```typescript
const mockConfig = {
  caldav: { calendarDuration: 30 },
};
const provider = new MonicaCalendarProvider(mockConfig as any);
```

#### Mocking Modules

```typescript
vi.mock('../../src/caldav.mjs', () => ({
  getNextDateFromRRule: vi.fn(() => DateTime.now().plus({ days: 5 })),
}));
```

#### Freezing Time

```typescript
import { Settings } from 'luxon';

beforeEach(() => {
  Settings.now = () => new Date('2024-01-15T10:00:00Z').valueOf();
});

afterEach(() => {
  Settings.now = () => Date.now();
});
```

## Future Test Additions

### Priority Areas

1. Integration tests for `extractMetadataFromCalendarObjects()`
2. End-to-end tests with mocked CalDAV server
3. Messenger formatting tests (Telegram MarkdownV2 escaping)
4. Configuration validation tests

### Lower Priority

- Snapshot tests for markdown output
- Performance benchmarks for large calendars
- Error handling and logging tests

## CI/CD Integration

To add tests to your CI pipeline:

```yaml
# Example GitHub Actions
- name: Run tests
  run: npm test

- name: Generate coverage
  run: npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Troubleshooting

### Tests fail with ESM errors

Ensure `"type": "module"` is set in `package.json` and all imports use `.mjs` extensions.

### DateTime tests fail inconsistently

Make sure to freeze time in tests using Luxon's `Settings.now` to avoid timezone issues.

### Coverage not generated

Check that `@vitest/coverage-v8` is installed and `vitest.config.mts` is properly configured.

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vitest API Reference](https://vitest.dev/api/)
- [Luxon Testing Guide](https://moment.github.io/luxon/#/testing)
