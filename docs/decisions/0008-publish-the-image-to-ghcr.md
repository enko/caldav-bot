---
status: accepted
date: 2026-08-15
---

# Publish the container image to GHCR on release

## Context and Problem Statement

The `Dockerfile` existed and was documented, but nothing ever published its
result: `README.md` showed `docker build -t caldav-bot .` and every host that ran
the bot built its own image from a checkout. The deployment host is aarch64
Debian 12, so the images differ per host in practice and an amd64-only artefact
would be useless there. Now that releases are cut automatically from the commit
messages (ADR-0007), a release should produce a runnable artefact. Where does the
image come from, and what triggers its build?

## Considered Options

- Build and push to GHCR from the release run
- A separate workflow triggered by `release: published` or by the pushed tag
- Docker Hub
- Keep building the image on each host

## Decision Outcome

Chosen option: "Build and push to GHCR from the release run", because the
registry belongs to the same account as the repository and the `GITHUB_TOKEN`
that the release job already has authenticates to it — publishing costs no extra
secret and no second account.

The build runs inside the release workflow rather than in a tag- or
release-triggered one **because a tag or a release created with `GITHUB_TOKEN`
does not start new workflow runs.** A separate workflow keyed on
`on: push: tags: ['v*']` or `on: release: types: [published]` would read as
correct and silently never fire. The version is therefore handed over inside the
same run: `@semantic-release/exec` writes `version=<x.y.z>` to `$GITHUB_OUTPUT`
in its `publishCmd`, the `release` job exposes that as a job output, and the
`image` job is gated on `needs.release.outputs.version != ''`. That gate is a
real release rather than the mere presence of a tag, and the `exec` command is
guarded so that running `npx semantic-release` locally stays a no-op.

The package is **public**. The repository is public and the image contains no
secrets, so a private package would only force a `read:packages` token onto every
host that pulls — the documentation therefore contains no login step. Pull
requests build the image for amd64 without pushing it, so a broken `Dockerfile`
surfaces on the pull request rather than during a release run, when the release
already exists.

_This ADR documents a change made together with it._

### Consequences

- Good, because every release produces an artefact both architectures can run:
  the deployment host pulls instead of compiling, and the image is built from the
  release tag, so the `version` in its `package.json` matches the tag.
- Good, because a `Dockerfile` break is caught by the `image-check` job on the
  pull request, before a release exists to be repaired.
- Bad, because arm64 is cross-built under QEMU emulation, which makes the release
  run noticeably slower than the amd64-only build it replaces.
- Bad, because PRs touching `Dockerfile`, `src/`, `tsconfig.json` or the
  manifests pay roughly two extra minutes of CI. PRs that touch only docs or
  tests skip the build steps and stay green.
- `latest`, `X` and `X.Y` are mutable by design; only the full `X.Y.Z` tag is
  immutable. A deployment should pin `X` or a digest, not `latest`.
- `provenance: false` is set on the push, so the package listing shows the two
  real platforms instead of additional `unknown/unknown` attestation entries.
- Neutral, but a one-time manual step: the first push creates the GHCR package as
  **private** even though the repository is public, so its visibility has to be
  flipped to public by hand once, in the package settings.

## More Information

The `Dockerfile` needed no change to become multi-arch: `node:24.19.0-bookworm-slim`
publishes `linux/amd64` and `linux/arm64`, and
`@matrix-org/matrix-sdk-crypto-nodejs`'s postinstall picks its native binary from
`process.arch`, which under buildx is the _target_ architecture — so it fetches
`matrix-sdk-crypto.linux-arm64-gnu.node` in the arm64 leg. Do not add
`--ignore-scripts` or a platform `ARG` to it.

The `image-check` path filter is a `git diff --name-only` against
`github.event.pull_request.base.sha`, because GitHub Actions has no job-level
`paths:` filter and putting `paths:` on the workflow trigger would gate the
`check` job too. It depends on `fetch-depth: 0` for the base commit to be present
locally; if the build is ever skipped when it should have run, that checkout
option is the thing to check.
