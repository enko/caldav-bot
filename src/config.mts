import { type } from 'arktype';
import { CALENDAR_PROVIDERS, MESSENGERS } from './types.mjs';

// Destructuring an `as const` tuple keeps exact literal types, so the
// discriminant literals have a single source of truth. Tuple indices within a
// known length are unaffected by `noUncheckedIndexedAccess`.
const [TELEGRAM, MATRIX] = MESSENGERS;

/** `" A |B| "` -> `["A", "B"]`. Rejects a list that trims away to nothing. */
const CalendarNames = type('string')
  .pipe((raw) =>
    raw
      .split('|')
      .map((name) => name.trim())
      .filter((name) => name !== ''),
  )
  .to('string[] > 0');

/** `"14"` -> `14`. */
const CalendarDuration = type('string.integer.parse').to('number.integer > 0');

/** The seven keys both messengers need. */
const SharedConfig = type({
  CHANNEL_ID: 'string > 0',
  CALDAV_BASE_URL: 'string.url',
  CALDAV_USER_NAME: 'string > 0',
  CALDAV_USER_PASSWORD: 'string > 0',
  CALDAV_CALENDAR_PROVIDER: type.enumerated(...CALENDAR_PROVIDERS),
  CALDAV_CALENDARS: CalendarNames,
  // The default is an *input* value (a string): arktype types defaults against
  // `inferIn` and pipes them through the morph once, at construction. Passing
  // the number 14 is a compile error.
  CALENDAR_DURATION: CalendarDuration.default('14'),
});

// arktype auto-discriminates on the MESSENGER literal, and `.infer` distributes
// over the branches, so `config.MESSENGER === 'telegram'` narrows in TypeScript.
// `'...'` must be the first key. `'+': 'delete'` keeps arktype's default
// tolerance for undeclared keys (PATH, HOME, ...) while stripping them from the
// result, so the returned object is exactly the declared shape rather than a
// clone of the whole environment.
const ConfigSchema = type({
  '...': SharedConfig,
  '+': 'delete',
  MESSENGER: type.unit(TELEGRAM),
  TELEGRAM_BOT_TOKEN: 'string > 0',
}).or({
  '...': SharedConfig,
  '+': 'delete',
  MESSENGER: type.unit(MATRIX),
  MATRIX_HOME_SERVER_URL: 'string.url',
  MATRIX_USER_ID: type('/^@/').describe("a Matrix user ID starting with '@'"),
  MATRIX_USER_PASSWORD: 'string > 0',
  MATRIX_SETTINGS_FILE: 'string > 0',
  MATRIX_CRYPTO_DIRECTORY: 'string > 0',
});

export type Config = typeof ConfigSchema.infer;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // A discriminated union compiles to a `switch` on MESSENGER, so a bad
  // discriminant collapses the whole result into one error at that path and
  // hides every other problem. Check it first so the message names the real
  // mistake instead of blaming the six keys the wrong branch wanted.
  const messenger = type.enumerated(...MESSENGERS)(env.MESSENGER);

  if (messenger instanceof type.errors) {
    throw new Error(`MESSENGER must be one of: ${MESSENGERS.join(', ')}`);
  }

  const result = ConfigSchema(env);

  if (result instanceof type.errors) {
    throw new Error(`Invalid configuration:\n${result.summary}`);
  }

  return result;
}
