---
status: accepted
date: 2026-08-15
---

# Run the unit tests with Vitest

## Context and Problem Statement

The two calendar providers carried the project's whole formatting and date
logic — birthday age arithmetic, recurrence handling, markdown grouping — without
a single test, so every change to the digest output was verified by hand against
a live calendar. That is the code most worth testing and the code least pleasant
to test by hand, because a wrong answer looks plausible.

The constraint on the choice is the runtime decided in ADR-0005: the sources are
ESM `.mts` files that Node executes directly by stripping types, with no loader
and no build step in the development loop. A runner that needs its own transform
pipeline would mean the tests exercise a different artefact than production does,
and a second toolchain to keep in sync. Which runner?

## Considered Options

- Vitest
- Jest with a TypeScript transform (`ts-jest` or Babel)
- `node:test`, built into Node 24
- No tests, keep verifying against a live calendar

## Decision Outcome

Chosen option: "Vitest", because it loads the ESM `.mts` sources directly, so the
tests import exactly the files Node runs and there is no build step to keep in
sync — the reason recorded in the implementing commit. Jest loses on precisely
that point: it needs a transform, which reintroduces the build step this project
removed. It also ships the v8 coverage reporter that `test/README.md` quotes.

`node:test` was **not** evaluated. The author picked Vitest out of familiarity and
judges that the built-in runner would probably have served just as well — worth
recording plainly, because the rest of this series does prefer built-ins (tsx in
ADR-0005, dotenv in ADR-0006) and a future reader would otherwise assume that
preference was weighed here and lost. It was not weighed; nothing about the suite
argues against revisiting it.

_This ADR is backfilled: the suite already existed when it was written, so the
decision it records was made in commit `1fa7d21` rather than here._

### Consequences

- Good, because the logic that was previously checked by hand now has 39 cases
  across four files, and the parts that matter are genuinely covered:
  `config.mts` at 100% of statements, branches and functions, both providers at
  roughly 97% (verified with `npm run test:coverage`).
- Good, because nothing in the suite depends on a Vitest-only API — the tests use
  `expect` matchers and no `vi.*` at all — so the runner remains replaceable by
  rewriting assertions rather than redesigning the suite — which is what makes
  the unevaluated `node:test` option above cheap to revisit.
- Neutral: three devDependencies (`vitest`, `@vitest/coverage-v8`, `@vitest/ui`)
  pinned to the same version, which have to move together.
- Neutral: the tests import `../../src/x.mjs` while `src/` imports `./x.mts`,
  because the test files sit outside the tsconfig `include` that enables the
  rewriting. Both spellings resolve to the same module under Vitest, including
  as a `vi.mock` target, so the inconsistency is cosmetic.
- Bad, because `vitest.config.mts` configures coverage with exclusions only and
  no `include`: the report covers just the modules a test actually loaded, so
  `main.mts`, `caldav.mts`, `logger.mts` and `messenger/` are missing from it
  entirely instead of showing up as 0%. The untested surface is therefore
  invisible in the numbers and has to be tracked by hand — `test/README.md` keeps
  the list.

## More Information

`test/README.md` documents the suite itself: what each file covers, the fixtures,
and the recipes for adding a test — including pinning the time _zone_ as well as
the clock, because an assertion on a wall-clock time otherwise passes locally and
fails in CI, which runs in UTC.
