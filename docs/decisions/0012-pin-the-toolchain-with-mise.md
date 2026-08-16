---
status: accepted
date: 2026-08-16
---

# Pin the dev toolchain with mise instead of .nvmrc

## Context and Problem Statement

The declared Node version and the running one had drifted apart, silently.
`.nvmrc` said `24.19.0`; `node -v` in the repository root said `v26.5.0`. The
cause is that the development machine runs [mise](https://mise.jdx.dev) with a
global `~/.tool-versions` pinning `node 26.5.0`, and mise does not read `.nvmrc`
unless `idiomatic_version_file_enable_tools` names `node` — by default it is
empty, and mise emits no warning about the file it is ignoring.

That left `.nvmrc` with no consumer at all on this machine: neither `nvm` nor
`fnm` is installed. It was a file the repository asserted a version in and
nothing enforced. The version that actually ran was whatever the shell happened
to have active, which is how a Node-26-only call could pass locally and fail on
the 24.x leg in CI — the same class of failure `@types/node <25` exists to
prevent in ADR-0011.

CI had the mirror problem: `actions/setup-node` was configured from the workflow
file, so the matrix and the release job named their versions independently of
`.nvmrc`. Nothing tied the version the release is built on to the version the
repository declares.

## Considered Options

- mise with a committed `mise.toml` as the single source of the dev Node version
- Keep `.nvmrc` as the source and enable `idiomatic_version_file_enable_tools = ["node"]`
- Keep `.nvmrc` and rely on nvm/fnm as before
- No version manager at all — `engines` and CI only

## Decision Outcome

Chosen option: "mise with a committed `mise.toml`". The file holds `[tools]` with
an exact `node = "24.19.0"`, and `.nvmrc` is deleted. One file, read by the tool
that is actually installed, in the directory it applies to.

Keeping `.nvmrc` as the source lost on a verified cost. Teaching mise to read it
requires `idiomatic_version_file_enable_tools` in configuration, and any
`[settings]` block promotes a project config out of mise's "safe" set: every
fresh clone then gets a trust prompt, and every non-TTY consumer — IDE
extensions, scripts, hooks — gets a hard error instead. Worse, Renovate's safe
mode discards project `[settings]` entirely, so the one setting making the file
work would be invisible to the bot keeping it current. Relying on nvm/fnm lost
because neither is installed; that is how the drift happened. No version manager
at all leaves the situation as measured.

The pin stays `[tools]`-only for that reason, and `mise.local.toml` — gitignored
— is the documented place for personal overrides, so nobody has to edit the
committed pin to test against another runtime.

npm is deliberately not pinned. Node 24.19.0 ships npm 11.17.0, which is exactly
`package.json`'s `packageManager`, so the node pin already delivers the declared
npm. `engines` is untouched and keeps its different shape on purpose: exact
`24.19.0` is what development and the release run on, the range `>=24.11.0 <27`
is the compatibility contract for consumers and the published image.

### CI half of the decision

`jdx/mise-action` replaces `actions/setup-node` in the `check` and `release`
jobs; the `image` and `image-check` jobs build containers and need no Node
runtime, so they are untouched.

The `check` matrix drives `MISE_NODE_VERSION` with major-only values (`24`,
`26`), which is the documented override for `mise.toml` and the only one that
works here: the action's `tool_versions:` input ranks below a committed
`mise.toml` and cannot outrank it, and `mise_toml:` would overwrite the committed
file. Major-only keeps full versions out of the matrix, where Renovate does not
manage them and they would go stale beside the pin. The `release` job sets no
override, so releases are built on exactly what `mise.toml` says.

`actions/cache` on `~/.npm` replaces the `cache: npm` that left with
`setup-node`; `mise-action`'s own cache covers mise's tool installs, not npm's.
Renovate's `mise` manager takes over from `nvm` and keeps the pin current inside
the same weekly grouped pull request, under the same `node <25` ceiling, because
`dockerfile` and `mise` both expose `packageName: 'node'`.

### Consequences

- Good, because there is now one source for the dev Node version, and it is read
  by the tool that is installed. The declared version and the running version
  cannot drift apart without someone editing the file.
- Good, because the release leg is built on the pinned version rather than on a
  number typed separately into the workflow, while the matrix still exercises
  both ends of `engines`.
- Good, because npm follows from node instead of being a second thing to keep in
  sync: 24.19.0 ships 11.17.0, which is what `packageManager` declares.
- Neutral: nvm and fnm users lose the file they read. That is the accepted cost
  of having one source instead of two — mise reads `.tool-versions` and
  `mise.toml`, and installing mise is the documented path.
- Bad, because entering the directory installs nothing and, on a machine with no
  other node, does not even warn. The first thing after a clone is an explicit
  `mise install`, which is why the README now says so.
- Bad, because a system `node` earlier on `PATH` masks mise's not-found
  auto-install: the pin only binds once mise is activated in the shell, or when
  commands are run through `mise x --`. A bare `node -v` in an unactivated shell
  reporting something else is expected, not a failure.
- Bad, and the constraint to remember: `mise.toml` must stay `[tools]` with plain
  version strings. Adding `[settings]` or `[env]` makes it untrusted, and the
  trust prompt lands on every fresh clone and every non-interactive consumer.

## More Information

`[env] _.file = ".env"` was considered for loading configuration and rejected on
what it actually does: it exports every variable into every interactive shell in
the directory and, through `mise-action`'s default `env: true`, into `GITHUB_ENV`
for all subsequent CI steps — `redact` does not prevent that. This repository's
`.env` holds live credentials, and `npm start` already loads it with
`node --env-file-if-exists=.env`, i.e. inside the app process only.

No `[tasks]` block either: `npm run <script>` stays the only task vocabulary that
`README.md`, `CLAUDE.md` and `test/README.md` document, and a second spelling
would drift from it. No `mise.lock`, because Renovate cannot maintain one on the
hosted app — lockfile maintenance for mise is an unsafe execution requiring a
self-hosted `allowedUnsafeExecutions` — so it would be a file nothing keeps
current.

If a `check` leg ever fails to resolve `MISE_NODE_VERSION: 24`, the documented
escape is the explicit prefix scope, `prefix:24`. If Renovate stops proposing
node updates, check that the file is at the repository root and named exactly
`mise.toml`; do not reach for `enabledManagers`, which disables every manager not
listed.
