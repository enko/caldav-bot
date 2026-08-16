---
status: accepted
date: 2026-08-16
---

# Keep dependencies current with one weekly Renovate pull request

## Context and Problem Statement

The drift ADR-0010 had to clean up was invisible by construction. Every direct
dependency is an exact pin, so `npm outdated` — which reports only direct
dependencies — showed one actionable row while twelve advisory roots sat in the
lockfile at versions their parents' ranges already allowed to move. Nothing in the
repository ever refreshed transitive packages, and nothing ever will unless a
scheduled job does it.

Two surfaces also still floated. All 13 `uses:` refs in `.github/workflows/ci.yml`
pointed at major tags (`actions/checkout@v7`), which the action owner can move to
any commit, and `Dockerfile`'s `ARG NODE_IMAGE` named the tag
`node:24.19.0-bookworm-slim`, which Docker Hub rebuilds regularly. Both mean a
green build is not reproducible from the tree alone.

The constraint on any automation is ADR-0007: `semantic-release` derives releases
from commit subjects, where `build(deps)` cuts a patch and `chore`/`ci` cut
nothing. A dependency bot therefore does not just open pull requests — its commit
messages decide what gets released. And the requirement from the author was one
pull request per week, not a stream of them.

## Considered Options

- Renovate, one group for every minor, patch and digest update
- Renovate with its default per-package grouping
- Dependabot
- Refresh the lockfile by hand when someone remembers

## Decision Outcome

Chosen option: "Renovate with one group", configured in `renovate.json5`, because
it is the only option that addresses the actual failure: `lockFileMaintenance`
refreshes transitive packages inside their parents' ranges, which is exactly where
this drift accumulated and exactly what Dependabot does not do. Everything else
follows from that:

- `lockFileMaintenance: { enabled: true }`, weekly — the point of the file.
- One `packageRules` entry groups every `minor`, `patch` and `digest` update
  across every manager (npm, `dockerfile`, `mise`, `github-actions`) into a single
  branch named `all minor and patch`, scheduled `before 6am on monday` in
  `Europe/Berlin`. Majors stay ungrouped, one pull request each.
- `rangeStrategy: 'pin'` keeps `package.json` exact, which it already is, and pins
  any range that ever appears.
- `helpers:pinGitHubActionDigests` keeps the SHA pins below pinned, bumping the
  SHA and its trailing version comment together rather than reverting them to
  tags.
- Per-surface `semanticCommitType`s — `build(deps)` for runtime, `chore(deps)` for
  dev, `ci(deps)` for actions — so majors release what ADR-0007 says they should.
- Four `allowedVersions` ceilings, each carrying its reason in `description`:
  `typescript` `<6.1.0` (typescript-eslint's peer range),
  `conventional-changelog-conventionalcommits` `<9` (ADR-0007), `@types/node`
  `<25` and the container/`mise` `node` `<25`.

Alongside it, both floating surfaces are pinned to immutable identifiers with the
human-readable version kept in a trailing comment: all 13 action refs become
40-character commit SHAs resolved from their current release tags, and
`ARG NODE_IMAGE` gains the `@sha256:` digest of the multi-arch OCI index for the
tag, so the arm64 leg still resolves per-platform. ADR-0012 has since replaced
`.nvmrc` with `mise.toml`, whose plain version `24.19.0` the `mise` manager keeps
current under the same `<25` ceiling.

Dependabot loses on the central point: it has no lockfile-maintenance equivalent,
so the exact drift that caused ADR-0010 would keep accumulating unseen. Renovate's
default grouping loses on the requirement — it opens a pull request per package,
which for 35 direct dependencies plus a lockfile refresh is precisely the noise
the single group exists to avoid. Refreshing by hand is what produced the 26
advisories.

`@types/node` is held at `<25` deliberately, and it is not conservatism: `engines`
declares `node >=24.11.0 <27` and CI runs both 24.x and 26.x, so typings that
describe the newer runtime would let a Node-26-only API typecheck clean and fail
on the 24.x leg at runtime instead of at build time. The typings must describe the
oldest supported runtime.

### Consequences

- Good, because the failure mode behind ADR-0010 now has an owner. Transitive
  packages are refreshed weekly whether or not anyone thinks to look, and
  `vulnerabilityAlerts` opens an out-of-band pull request labelled `security` when
  something lands mid-week.
- Good, because the tree now says exactly what CI runs: a SHA cannot be moved
  under the repository, and a rebuilt base image cannot silently change what the
  container is built from.
- Neutral: `renovate.json5` needs the Renovate GitHub App installed on
  `enko/caldav-bot` (<https://github.com/apps/renovate>) and its onboarding pull
  request merged. Until then the file is inert — it configures a bot that is not
  running.
- Bad, and accepted rather than fixed: because the grouped branch carries a single
  commit message and `build(deps)` is the honest type when the group contains
  runtime packages, a week whose group happens to hold only dev updates still cuts
  a patch release. That release rebuilds an identical image, which is harmless.
  Splitting the group by surface would avoid it and would break the one-pull-request
  requirement, so the group stays. If the releases prove too noisy the one knob to
  turn is the group's `semanticCommitType`, from `build` to `chore`: dependency
  updates then ship with the next `feat:`/`fix:` instead of releasing on their own.
- Bad, because a mistyped action SHA cannot be caught locally — it surfaces on the
  next push as `Unable to resolve action … unable to find version`. The first run
  after a manual re-pin has to be watched.
- Bad, because the tag and the digest on `ARG NODE_IMAGE` can drift apart by hand.
  Docker honours the digest and ignores the tag, so a file where they disagree
  lies about what it builds. Re-resolve both together with
  `docker buildx imagetools inspect node:24.19.<patch>-bookworm-slim`.

## More Information

If Renovate does not open pull requests for the base image, its `dockerfile`
manager has failed to resolve `FROM ${NODE_IMAGE}` back to the `ARG` default; add
`# renovate: datasource=docker depName=node versioning=node` immediately above the
`ARG` line. If it proposes rewriting the `overrides` block from ADR-0010, bumping
`@cypress/request` within `^4` is welcome, but an attempt to unpin or "restore"
`request` is disabled with `{ matchDepTypes: ['overrides'], enabled: false }`.
