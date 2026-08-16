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
| `CALENDAR_TIMEZONE`        | IANA zone the digest is rendered in, e.g. `Europe/Berlin`. Optional, see below       |
| `CALDAV_CALENDAR_PROVIDER` | Either `nextcloud` or `monica`                                                       |
| `CALDAV_BASE_URL`          | The base url of your caldav service                                                  |
| `CALDAV_CALENDARS`         | Pipe separated names of your calendars, e.g. `Personal\|Work`. Whitespace is trimmed |
| `CALDAV_USER_NAME`         | The user name of your caldav source                                                  |
| `CALDAV_USER_PASSWORD`     | The password of your caldav source                                                   |

With `CALDAV_CALENDAR_PROVIDER=nextcloud`, a recurring event is listed once per
occurrence that falls inside `CALENDAR_DURATION`. Moved occurrences
(`RECURRENCE-ID`) appear at their new time, and cancelled ones and `EXDATE`
exclusions are left out. `monica` does not expand recurrences: a birthday is
listed once, at the `DTSTART` the server returned, because that date carries the
birth year the age is calculated from.

Times are printed in the zone the process runs in, which in the container is
UTC because the base image sets none — a 10:00 Berlin appointment then reads
09:00, and one just after midnight lands under the previous day's heading.
`CALENDAR_TIMEZONE` pins that: it sets luxon's default zone, so the printed
times, the date headings and the day window the events are collected for all
use it (ADR-0013). Left unset, the process zone stays in charge, so
`TZ=Europe/Berlin` in the environment does the same job. A misspelled zone is
rejected at startup, because luxon does not fall back for one — it invalidates
every date, and the digest would read `Invalid DateTime` on every line.

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

Node >= 24.11 and < 27 is required, as declared in `engines`. The version this
is developed and released against is pinned in `mise.toml`; with
[mise](https://mise.jdx.dev) installed, `mise install` once per clone gets it.
Entering the directory installs nothing by itself.

```sh
mise install                    # node 24.19.0, per mise.toml
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

# Matrix additionally needs its state to survive between runs. Create the
# settings file first - Docker would otherwise create a directory in its place,
# and the SDK fails with EISDIR:
touch settings.json
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

## Dependencies

Every direct dependency in `package.json` is an exact version, every `uses:` ref
in CI is a commit SHA with the release tag in a trailing comment, and the
container base image in `Dockerfile` carries its `@sha256:` digest alongside the
tag. Nothing floats, so a build is reproducible from the tree.

[Renovate](https://docs.renovatebot.com/) (`renovate.json5`) keeps that current:
one pull request every Monday morning bundles every minor, patch and digest
update across npm, the Dockerfile, `mise.toml` and the Actions, and refreshes the
lockfile so transitive packages cannot age inside their parents' ranges, which is
how 1.0.0 accumulated 26 advisories. Majors arrive as their own pull requests. Because the
grouped pull request lands as `build(deps)`, merging it cuts a patch release even
in a week that only moved dev tooling — see ADR-0011 for why that is the accepted
trade.

Two things are held back on purpose and encoded as Renovate ceilings: TypeScript
stays below 6.1 while `typescript-eslint` declares
`peerDependencies.typescript ">=4.8.4 <6.1.0"`, and
`conventional-changelog-conventionalcommits` stays on the 8.x line (ADR-0007).

`npm audit` is not zero and cannot be. `matrix-bot-sdk`'s abandoned `request`
dependency is aliased to the maintained `@cypress/request` fork through the
`overrides` block (ADR-0010); what remains is `undici`, `brace-expansion`,
`ip-address` and `tar` vendored **inside** `npm` itself, reached through
`semantic-release`. Every parent is already at its latest version and npm reports
them as unfixable; they run only in CI. **Never run `npm audit fix --force`** —
the remediation it proposes is a downgrade to `semantic-release@24.2.9`, which
would break releases.

## Origin

Initialy I created this to have a daily reminder who of my contacts in Monica
has a birthday. I'm very horrible at looking in my callendar and this gives me
the visibility and allows me to send nice postcards!
