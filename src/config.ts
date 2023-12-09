import { Service } from '@freshgum/typedi';
import { CalendarProviderType, MessengerType } from './types.mjs';

class TelegramConfig {
  public botName: string;

  public botToken: string;

  public constructor() {
    const botName = process.env.TELEGRAM_BOT_NAME;

    if (typeof botName !== 'string') {
      throw new Error('TELEGRAM_BOT_NAME is not set');
    }

    this.botName = botName;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (typeof botToken !== 'string') {
      throw new Error('TELEGRAM_BOT_TOKEN is not set');
    }

    this.botToken = botToken;
  }
}

class MatrixConfig {
  public homeServerUrl: string;

  public userId: string;

  public userPassword: string;

  public cryptoPassword: string;

  public securityKey: string;

  public constructor() {
    const homeServerUrl = process.env.MATRIX_HOME_SERVER_URL;

    if (typeof homeServerUrl !== 'string') {
      throw new Error('MATRIX_HOME_SERVER_URL is not set');
    }

    this.homeServerUrl = homeServerUrl;

    const userId = process.env.MATRIX_USER_ID;

    if (typeof userId !== 'string') {
      throw new Error('MATRIX_USER_ID is not set');
    }

    this.userId = userId;

    const userPassword = process.env.MATRIX_USER_PASSWORD;

    if (typeof userPassword !== 'string') {
      throw new Error('MATRIX_USER_PASSWORD is not set');
    }

    this.userPassword = userPassword;

    const cryptoPassword = process.env.MATRIX_CRYPTO_PASSWORD;

    if (typeof cryptoPassword !== 'string') {
      throw new Error('MATRIX_CRYPTO_PASSWORD is not set');
    }

    this.cryptoPassword = cryptoPassword;

    const securityKey = process.env.MATRIX_SECURITY_KEY;

    if (typeof securityKey !== 'string') {
      throw new Error('MATRIX_SECURITY_KEY is not set');
    }

    this.securityKey = securityKey;
  }
}

class CalDavConfig {
  public baseUrl: string;

  public calendars: string[];

  public userName: string;

  public userPassword: string;

  public calendarDuration: number;

  public calendarProvider: CalendarProviderType;

  public constructor() {
    const baseUrl = process.env.CALDAV_BASE_URL;

    if (typeof baseUrl !== 'string') {
      throw new Error('CALDAV_BASE_URL is not set');
    }

    this.baseUrl = baseUrl;

    const calendars = process.env.CALDAV_CALENDARS;

    if (typeof calendars !== 'string') {
      throw new Error('CALDAV_CALENDARS is not set');
    }

    this.calendars = calendars.split('|');

    const userName = process.env.CALDAV_USER_NAME;

    if (typeof userName !== 'string') {
      throw new Error('CALDAV_USER_NAME is not set');
    }

    this.userName = userName;

    const userPassword = process.env.CALDAV_USER_PASSWORD;

    if (typeof userPassword !== 'string') {
      throw new Error('CALDAV_USER_PASSWORD is not set');
    }

    this.userPassword = userPassword;

    const calendarProvider = process.env.CALDAV_CALENDAR_PROVIDER;

    if (typeof calendarProvider !== 'string') {
      throw new Error('CALDAV_CALENDAR_PROVIDER is not set');
    }

    if (
      Object.values(CalendarProviderType).includes(
        calendarProvider as CalendarProviderType,
      ) === false
    ) {
      throw new Error(`Unknown calendar provider: ${calendarProvider}`);
    }

    this.calendarProvider = calendarProvider as CalendarProviderType;

    const calendarDuration = process.env.CALENDAR_DURATION;

    if (typeof calendarDuration !== 'string') {
      throw new Error('CALENDAR_DURATION is not set');
    }

    const duration = Number.parseInt(calendarDuration);

    if (Number.isNaN(duration)) {
      throw new Error('CALENDAR_DURATION is not a number');
    }

    this.calendarDuration = duration;
  }
}

@Service([])
export class Config {
  public telegram: TelegramConfig;

  public matrix: MatrixConfig;

  public caldav: CalDavConfig;

  public messenger: MessengerType;

  public channelId: string;

  constructor() {
    this.caldav = new CalDavConfig();

    const channelId = process.env.CHANNEL_ID;

    if (typeof channelId !== 'string') {
      throw new Error('CHANNEL_ID is not set');
    }

    this.channelId = channelId;

    const messenger = process.env.MESSENGER;

    if (typeof messenger !== 'string') {
      throw new Error('MESSENGER is not set');
    }

    if (
      Object.values(MessengerType).includes(messenger as MessengerType) ===
      false
    ) {
      throw new Error(`Unknown messenger: ${messenger}`);
    }

    this.messenger = messenger as MessengerType;

    if (this.messenger === MessengerType.Telegram) {
      this.telegram = new TelegramConfig();
    } else if (this.messenger === MessengerType.Matrix) {
      this.matrix = new MatrixConfig();
    }
  }
}
