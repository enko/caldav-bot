# caldav bot

## Summary

This is a bot that will post a daily notification from various caldav sources to
various messenger platforms.

CaDav Sources supported:

* [Monica](https://github.com/monicahq/monica)
* [NextCloud](https://nextcloud.com/)

These Messenger are supported:

* Telegram
* Matrix/Element

## Setting up

Everything is setup through environment variables. You can either use a `.env` file or set the variables yourself, either works fine.

### caldav

| **Name**                   | **Description**                                                    |
|----------------------------|--------------------------------------------------------------------|
| `CALENDAR_DURATION`        | The amount of days to look into the future and collect events from |
| `CALDAV_CALENDAR_PROVIDER` | Can be either `nextcloud` or `monica`                              |
| `CALDAV_BASE_URL`          | The base url of your caldav service                                |
| `CALDAV_CALENDARS`         | Pipe seperated name of your calendars                              |
| `CALDAV_USER_NAME`         | The user name of your caldav source                                |
| `CALDAV_USER_PASSWORD`     | The pasword of your caldav source                                  |

### messenger

| **Name**    | **Description**                      |
|-------------|--------------------------------------|
| `MESSENGER` | Can be either `matrix` or `telegram` |

#### telegram

| **NAME**             | **Description**                                              |
|----------------------|--------------------------------------------------------------|
| `TELEGRAM_BOT_NAME`  | The name of your bot as you registered it with the botfather |
| `TELEGRAM_BOT_TOKEN` | Your access token of your bot                                |

#### matrix

| **Name**                  | **Description**                                                     |
|---------------------------|---------------------------------------------------------------------|
| `MATRIX_HOME_SERVER_URL`  | The base url of your homeserver                                     |
| `MATRIX_USER_ID`          | Username of your bot                                                |
| `MATRIX_USER_PASSWORD`    | Password of your bot                                                |
| `MATRIX_CRYPTO_DIRECTORY` | A path to a directory where all the crypto related stuff is saved   |
| `MATRIX_SETTINGS_FILE`    | A path to a JSON file where the bot SDK will store all its settings |

## Origin

Initialy I created this to have a daily reminder who of my contacts in Monica
has a birthday. I'm very horrible at looking in my callendar and this gives me
the visibility and allows me to send nice postcards!
