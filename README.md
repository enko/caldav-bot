# caldav bot

## Summary

This is a bot that will post a daily notification from various caldav sources to
various messenger platforms.

CaDav Sources supported:

- [Monica](https://github.com/monicahq/monica)
- [NextCloud](https://nextcloud.com/)

These Messenger are supported:

- Telegram
- Matrix/Element

## Setting up

Everything is setup through environment variables. You can either use a `.env` file or set the variables yourself, either works fine.

### caldav

| **Name**                   | **Description**                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------ |
| `CALENDAR_DURATION`        | Days to look ahead and collect events from. Optional, defaults to `14`               |
| `CALDAV_CALENDAR_PROVIDER` | Either `nextcloud` or `monica`                                                       |
| `CALDAV_BASE_URL`          | The base url of your caldav service                                                  |
| `CALDAV_CALENDARS`         | Pipe separated names of your calendars, e.g. `Personal\|Work`. Whitespace is trimmed |
| `CALDAV_USER_NAME`         | The user name of your caldav source                                                  |
| `CALDAV_USER_PASSWORD`     | The password of your caldav source                                                   |

A recurring event is listed once per occurrence that falls inside
`CALENDAR_DURATION`. Moved occurrences (`RECURRENCE-ID`) appear at their new
time, and cancelled ones and `EXDATE` exclusions are left out.

### messenger

| **Name**     | **Description**                                                                   |
| ------------ | --------------------------------------------------------------------------------- |
| `MESSENGER`  | Either `matrix` or `telegram`                                                     |
| `CHANNEL_ID` | Target channel or room. Telegram: numeric chat id. Matrix: room id `!room:server` |

#### telegram

| **NAME**             | **Description**               |
| -------------------- | ----------------------------- |
| `TELEGRAM_BOT_TOKEN` | Your access token of your bot |

#### matrix

| **Name**                  | **Description**                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `MATRIX_HOME_SERVER_URL`  | The base url of your homeserver                                                            |
| `MATRIX_USER_ID`          | Full user id of your bot, e.g. `@caldav-bot:example.com`                                   |
| `MATRIX_USER_PASSWORD`    | Password of your bot. Only used for the first login; the access token is cached afterwards |
| `MATRIX_CRYPTO_DIRECTORY` | Directory for end-to-end encryption state. Created if missing                              |
| `MATRIX_SETTINGS_FILE`    | JSON file the bot SDK stores its settings and access token in. Created if missing          |

Relative `MATRIX_*` paths resolve against the working directory.

`MATRIX_SETTINGS_FILE` holds the access token after the first login, so treat it
like a password — it is in `.gitignore` for that reason. It is also coupled to
`MATRIX_CRYPTO_DIRECTORY`: deleting the settings file alone triggers a fresh login
against a crypto store that still pins the previous device, which the homeserver
rejects. Delete both or neither.

### logging

| **Name**    | **Description**                                                              |
| ----------- | ---------------------------------------------------------------------------- |
| `LOG_LEVEL` | `trace`…`fatal`. Optional, defaults to `info`. Event payloads are at `debug` |

Logs are newline-delimited JSON on stdout, or human-readable when stdout is a
terminal.

## Upgrading an existing installation

Three things changed in the environment contract:

- `CALDAV_CALENDAR_PROVIDER=monika` is no longer accepted - the documented
  spelling `monica` is. The old misspelling was the only value that used to
  work; startup now fails with a message naming both valid values.
- `TELEGRAM_BOT_NAME` is ignored and can be deleted. It was required but read
  by nothing.
- Matrix only: delete the contents of `MATRIX_CRYPTO_DIRECTORY` once before the
  first run. Stores written by earlier versions use a backend the current
  crypto bindings cannot open. Room members will see the bot as one new device;
  from then on the device stays stable instead of being replaced every run.

## Running

The bot is a one-shot: it posts one digest and exits. Run it from cron, a
systemd timer or a scheduled container.

Node 24 or newer is required; `.nvmrc` pins the version this is developed
against.

```sh
npm ci
npm start                       # reads .env if present
node --env-file=.env src/main.mts

npm run build && node dist/main.mjs
```

A non-zero exit code means the digest was not sent, and the reason is in the
last log line.

### Docker

Released images are published to the GitHub Container Registry. The package is
public, so pulling needs no login:

```sh
docker pull ghcr.io/enko/caldav-bot:1
docker run --rm --init --env-file .env ghcr.io/enko/caldav-bot:1

# Matrix additionally needs its state to survive between runs:
docker run --rm --init --env-file .env \
  -v "$PWD/crypto:/app/crypto" \
  -v "$PWD/settings.json:/app/settings.json" \
  ghcr.io/enko/caldav-bot:1
```

Tags: `1.4.2` is immutable, `1.4` and `1` follow the latest patch/minor of that
line, `latest` follows every release. Pin `1` for a deployment that should get
fixes, or the full version when you want to decide upgrades yourself. Images are
built for `linux/amd64` and `linux/arm64`.

To build from a checkout instead — for development, or to run an unreleased
commit:

```sh
docker build -t caldav-bot .
docker run --rm --init --env-file .env caldav-bot
```

The container runs as uid 1000, so anything bind-mounted for
`MATRIX_CRYPTO_DIRECTORY` and `MATRIX_SETTINGS_FILE` must be writable by that
uid. `--init` is only there so Ctrl-C stops the container immediately.

## Releases

Versions, tags, the GitHub release and `CHANGELOG.md` are produced by
[semantic-release](https://semantic-release.gitbook.io/) from the commit messages
when CI passes on `main`, so:

- Commit subjects follow [Conventional Commits](https://www.conventionalcommits.org/).
  `feat:` gives a minor, `fix:` and `build(deps):` a patch, `refactor:` and
  `docs:` no release. Put `BREAKING CHANGE:` in the body when the environment
  contract changes.
- **`CHANGELOG.md` is generated — do not edit it by hand.** Fix a wrong entry by
  fixing the commit message it came from.
- The bot is not published to npm; the package is `private`.
- Each release also builds and pushes `ghcr.io/enko/caldav-bot` for
  `linux/amd64` and `linux/arm64`. The image is built from the release tag, so
  the `version` in its `package.json` matches the tag.

## Origin

Initialy I created this to have a daily reminder who of my contacts in Monica
has a birthday. I'm very horrible at looking in my callendar and this gives me
the visibility and allows me to send nice postcards!
