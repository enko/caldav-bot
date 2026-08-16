---
status: accepted
date: 2026-08-16
---

# Alias the abandoned `request` package to the maintained fork

## Context and Problem Statement

`npm audit` reported 26 advisories against the tree released as 1.0.0, two of them
critical. Twelve of the roots were not the fault of any declared version: every
direct dependency in `package.json` is an exact pin, so `npm outdated` sees only
those 35 entries and reported a single actionable row — while the lockfile aged
underneath it. `express` sat at 4.18.2 and `mdast-util-to-hast`, which renders the
Matrix `formatted_body`, at 13.0.2, both several patches behind what their own
parents' ranges already allowed. `npm update` moves all of that inside the
declared ranges and clears twelve roots at once; that part needed no decision.

What did need one is the remaining critical pair, and both come from the same
place. `matrix-bot-sdk@0.8.0` depends on `request@2.88.2`, which is abandoned:
GHSA-p8p7-x288-28g6 (SSRF) records `first_patched_version: null`, and
`request`'s own `form-data ~2.3.2` admits nothing newer than the vulnerable
2.3.3. Nothing upstream will fix this — 0.8.0 is the newest matrix-bot-sdk
(`npm view matrix-bot-sdk dist-tags`, `time.modified` 2026-01-16) and `request`
has not shipped since 2020.

This subtree is on the live path, not dormant: `matrix-bot-sdk/lib/request.js:5`
is `const origRequestFn = require('request')`, and both `lib/http.js:67` and
`lib/MatrixClient.js:1447` call `getRequestFn()(params, cb)`, so every homeserver
call — login, `/keys/*`, `/sendToDevice`, send — goes through it.

## Considered Options

- Alias `request` to `@cypress/request` with an npm `overrides` entry
- Override the individual vulnerable versions under `request@2.88.2`
  (`form-data`, `qs`, `lodash`, `sanitize-html`, `morgan`, `express`)
- Replace `matrix-bot-sdk` with another Matrix client
- Accept both criticals and document their reachability

## Decision Outcome

Chosen option: "Alias `request` to `@cypress/request`", because the advisory
itself names that fork as the remediation, and one line removes both criticals
plus `uuid@3.4.0` from the tree instead of patching around them:

```json
  "overrides": {
    "request": "npm:@cypress/request@^4.0.1",
    "tough-cookie": "^5.1.2"
  },
```

`@cypress/request@4.0.1` declares `form-data ~4.0.4`, `tough-cookie ^5.0.0`,
`qs ^6.15.2` and `http-signature ~1.4.0`, and carries no `uuid`, no
`har-validator` and no `oauth-sign` at all. The second entry exists because the
alias does not reach `request-promise@4.2.6`, which pins `tough-cookie ^2.3.3`
independently; `^5.1.2` matches the fork's own range, so exactly one copy
resolves for both.

The fork was chosen on a read of its source against the two things
matrix-bot-sdk actually uses — the callback form `getRequestFn()(params, cb)`
with `uri`/`method`/`qs`/`headers`/`body`/`timeout`/`encoding`, and
`useQuerystring: true` (`lib/http.js:47`), which its `lib/querystring.js` still
honours by binding Node's builtin `querystring`. Reading is not running, so it was
then executed against a mock homeserver answering only
`POST /_matrix/client/v3/login`: `MatrixAuth.passwordLogin` produced that request
with `content-type: application/json` and body `type: m.login.password`,
`identifier: {"type":"m.id.user",…}`, and threaded the returned `access_token`
back into the client. That is the proof this decision rests on.

Per-version overrides were the fallback, not the choice: they leave `request`
itself and `uuid@3.4.0` in place, so both criticals would have survived as
documented-but-open findings. Swapping out matrix-bot-sdk was never proportionate
to a transitive HTTP client, and accepting reachable criticals on the path that
carries the bot's credentials is not a position worth defending when a one-line
alias exists.

### Two overrides deliberately not added

- **No `uuid` override.** Every patched `uuid` major is ESM with an `exports` map
  exposing only `.` and `./package.json`, so `request/lib/auth.js:4`'s
  `require('uuid/v4')` raises `ERR_PACKAGE_PATH_NOT_EXPORTED`, and
  `request.js:24` requires `./lib/auth` at module load — turning
  `import 'matrix-bot-sdk'` into a hard crash. The alias removes `uuid` from the
  tree instead, so no override is needed.
- **No `express: ^5`.** `Appservice.begin()` registers `this.app.all('*', …)`
  (`matrix-bot-sdk/lib/appservice/Appservice.js:157`), which Express 5 rejects.
  The lockfile refresh lands the patched 4.22.2; it stays there.

### Consequences

- Good, because both criticals are gone and the advisory count is 26 → 7, with
  **no critical and no high outside packages vendored inside npm itself**.
- Good, because the runtime behaviour that could plausibly have moved was checked
  rather than assumed: the `unified` → `remark-rehype` → `rehype-stringify`
  pipeline in `src/messenger/matrix.mts:80-84` produces byte-identical HTML
  before and after the refresh, the 39 unit tests pass from a clean `npm ci`, and
  the image still builds and reaches the same configuration error on both
  messengers.
- Neutral: `npm ls` may mark the aliased entry `invalid`, because the fork
  violates `request`'s declared `form-data ~2.3.2`. That is what the override is
  for.
- Neutral: `request-promise` and `request-promise-core` stay in the lockfile.
  matrix-bot-sdk declares them but never requires them — the only
  `require('request` under `matrix-bot-sdk/lib` is `lib/request.js:5` — so they
  are lockfile noise, not running code, and chasing them with more overrides
  would add entries that protect nothing.
- Bad, because the override pins this project to a fork of a package its
  dependency did not choose. If matrix-bot-sdk ever moves off `request`, the
  `overrides` block has to be removed by hand; nothing fails loudly to remind
  anyone.
- Bad, and unfixable here: seven advisories remain, all of them dev-only. `undici`,
  `brace-expansion`, `ip-address` and `tar` are bundled **inside** `npm@11.19.0`,
  which arrives through `semantic-release@25.0.9` →
  `@semantic-release/npm@13.1.5` → `npm`. `npm audit fix` says so in as many
  words — _"is a bundled dependency of npm@11.19.0 … It cannot be fixed
  automatically"_ — every parent is already at its latest version, and the
  remediation npm proposes under `--force` is `semantic-release@24.2.9`, a
  **downgrade** that would break the release pipeline. **Never run
  `npm audit fix --force` in this repository.** These packages execute only in CI,
  against this repository's own inputs; the only real fix is an npm release.

## More Information

TypeScript stays on 6.0.3 and `conventional-changelog-conventionalcommits` on
8.0.0 for reasons that have nothing to do with this decision:
`typescript-eslint@8.67.0` declares `peerDependencies.typescript ">=4.8.4 <6.1.0"`,
and ADR-0007 records that the 10.x changelog preset renders release notes
containing nothing but a version heading. Both ceilings, and the reasons for them,
are encoded in the Renovate config from ADR-0011 so neither reappears as a pull
request until someone lifts them deliberately.
