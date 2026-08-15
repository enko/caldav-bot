import { describe, it, expect } from 'vitest';
import { loadConfig } from '../../src/config.mjs';

/** A complete, valid Telegram environment. */
const telegramEnv = {
  CHANNEL_ID: '-100123',
  CALDAV_BASE_URL: 'https://cloud.example.com/remote.php/dav',
  CALDAV_USER_NAME: 'bot',
  CALDAV_USER_PASSWORD: 'secret',
  CALDAV_CALENDAR_PROVIDER: 'nextcloud',
  CALDAV_CALENDARS: ' A |B| |C ',
  MESSENGER: 'telegram',
  TELEGRAM_BOT_TOKEN: 'token',
};

describe('loadConfig', () => {
  it('parses a complete Telegram environment', () => {
    const config = loadConfig({ ...telegramEnv });

    expect(config.MESSENGER).toBe('telegram');
    // Pipe-separated, trimmed, blank entries dropped.
    expect(config.CALDAV_CALENDARS).toEqual(['A', 'B', 'C']);
    // Defaulted and converted to a number, not left as the string '14'.
    expect(config.CALENDAR_DURATION).toBe(14);
  });

  it('parses CALENDAR_DURATION into a number', () => {
    const config = loadConfig({ ...telegramEnv, CALENDAR_DURATION: '30' });

    expect(config.CALENDAR_DURATION).toBe(30);
  });

  it('reports every invalid key in one throw', () => {
    const env: Record<string, string> = { ...telegramEnv };
    delete env.CALDAV_USER_PASSWORD;
    delete env.TELEGRAM_BOT_TOKEN;

    // The whole point of schema validation over a chain of `if` throws: the old
    // code named CALDAV_USER_PASSWORD and stopped.
    expect(() => loadConfig(env)).toThrowError(
      'Invalid configuration:\n' +
        'CALDAV_USER_PASSWORD must be a string (was missing)\n' +
        'TELEGRAM_BOT_TOKEN must be a string (was missing)',
    );
  });

  it('rejects an unknown MESSENGER by name', () => {
    // Checked before the union so the message blames MESSENGER rather than the
    // six keys the wrongly chosen branch wanted.
    expect(() =>
      loadConfig({ ...telegramEnv, MESSENGER: 'signal' }),
    ).toThrowError('MESSENGER must be one of: telegram, matrix');
  });

  it('rejects a calendar list that trims away to nothing', () => {
    expect(() =>
      loadConfig({ ...telegramEnv, CALDAV_CALENDARS: ' | | ' }),
    ).toThrowError('CALDAV_CALENDARS must be non-empty');
  });

  it('accepts the documented provider spelling and rejects the old one', () => {
    expect(
      loadConfig({ ...telegramEnv, CALDAV_CALENDAR_PROVIDER: 'monica' })
        .CALDAV_CALENDAR_PROVIDER,
    ).toBe('monica');

    expect(() =>
      loadConfig({ ...telegramEnv, CALDAV_CALENDAR_PROVIDER: 'monika' }),
    ).toThrowError(
      'CALDAV_CALENDAR_PROVIDER must be "monica" or "nextcloud" (was "monika")',
    );
  });

  it('requires a Matrix user id to start with @', () => {
    expect(() =>
      loadConfig({
        ...telegramEnv,
        MESSENGER: 'matrix',
        MATRIX_HOME_SERVER_URL: 'https://matrix.example.com',
        MATRIX_USER_ID: 'caldav-bot:example.com',
        MATRIX_USER_PASSWORD: 'password',
        MATRIX_SETTINGS_FILE: './settings.json',
        MATRIX_CRYPTO_DIRECTORY: './crypto',
      }),
    ).toThrowError(
      "MATRIX_USER_ID must be a Matrix user ID starting with '@' " +
        '(was "caldav-bot:example.com")',
    );
  });

  it('strips undeclared environment variables from the result', () => {
    const config = loadConfig({
      ...telegramEnv,
      PATH: '/usr/bin',
      HOME: '/root',
      LANG: 'C',
    });

    expect(Object.keys(config)).not.toContain('PATH');
    expect(Object.keys(config)).not.toContain('HOME');
    expect(Object.keys(config)).not.toContain('LANG');
  });
});
