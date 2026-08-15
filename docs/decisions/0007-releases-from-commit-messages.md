---
status: accepted
date: 2026-08-15
---

# Derive versions and the changelog from commit messages

## Context and Problem Statement

The repository had no tags, no `CHANGELOG.md` and no release process at all, while
`package.json` sat at a hand-set `0.1.0` that nothing kept current. That was
tolerable when the bot was deployed by pulling `main` into a checkout, but the
modernization series changed the environment contract in ways an operator has to
act on — a rejected provider spelling, a crypto store that needs wiping — and
there was no artefact that announced them. At the same time the history had just
acquired 22 commits that all follow Conventional Commits. What should turn that
history into versions and release notes?

## Considered Options

- `semantic-release`
- `release-please`
- A hand-maintained `CHANGELOG.md` in Keep a Changelog format
- Nothing: keep pulling `main`

## Decision Outcome

Chosen option: "`semantic-release`", because the commit convention is already
being followed, so the version and the notes can be derived from data that exists
rather than from a second file somebody has to remember to update. A hand-written
changelog is exactly the kind of documentation that drifts — this repository's
docs had drifted in six places before this series — and `release-please`'s
release-PR workflow buys review over a changelog nobody else reviews here.

Configuration decisions worth recording:

- The package is `private: true` and is never published to npm.
  `@semantic-release/npm` is kept only to write the version into `package.json`,
  which it does while skipping the publish step.
- The `conventionalcommits` preset is used rather than the default angular one, so
  that `build:` commits — dependency and toolchain changes an operator deploys —
  appear in the notes instead of being dropped.
- `refactor:` and `docs:` explicitly trigger no release; `build(deps):` triggers a
  patch, because a dependency bump that changes runtime behaviour is not invisible
  to whoever runs the image.
- The release job runs only after the check matrix passes on both Node versions.

_This ADR documents a change made together with it (working tree, uncommitted at
the time of writing)._

### Consequences

- Good, because the version, the tag, the GitHub release and `CHANGELOG.md` all
  come from one source, and a release cannot silently skip the changelog.
- Good, because the commit convention now has teeth: a mislabeled type produces a
  wrong or missing changelog entry, which is visible.
- **`CHANGELOG.md` is generated — never edit it by hand.** Corrections belong in
  commit messages, or in a `Release-As`-style override, not in the file.
- Bad, because `conventional-changelog-conventionalcommits` must stay pinned to
  its 8.x line: 10.x targets `@conventional-changelog/template` while
  `release-notes-generator` 14 uses `conventional-changelog-writer` 8, and the
  mismatch produces release notes containing nothing but a version heading —
  with no error. This was found by running the generator against this
  repository's own history, and it will recur on a careless bump.
- Bad, because the first release will be `1.0.0` regardless of the analyzed
  commit types, which is semantic-release's behaviour when no previous tag exists.
  For a series that breaks the environment contract that is arguably correct, but
  it is not a choice this repository made.
- Neutral: the 22 existing commits carry no `BREAKING CHANGE:` footers, so the
  first release notes will not mark the config breaks as breaking. The README's
  "Upgrading an existing installation" section carries them instead. Future
  breaking changes should use the footer.

## More Information

Verified locally before wiring the job: run against `7b86f82..HEAD` the analyzer
returns `minor` (and `patch` for a synthetic `build(deps):` commit, `null` for a
`refactor:`-only release), and the generator produces populated **Features**,
**Bug Fixes** and **Build & Dependencies** sections. A full
`semantic-release --dry-run` cannot run before the branch is pushed:
`isBranchUpToDate()` compares the local `HEAD` to the remote head SHA exactly, so
it reports the branch as "behind" whenever commits are unpushed.
