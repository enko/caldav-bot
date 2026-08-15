---
status: accepted
date: 2026-08-15
---

# Require Node 24 LTS and TypeScript 6, and run the sources without a loader

## Context and Problem Statement

The toolchain floor had expired. Node 20 reached end of life on 2026-04-30 and
`@types/node` was pinned to 20.11.5; `tsconfig.json` used `moduleResolution:
"node"`, which is a deprecation error in TypeScript 6 and a hard error in 7, and
declared `lib: ["es2017"]` against `target: ES2022`. There was no `strict`, while
the project's own architecture notes claimed "full TypeScript with strict typing".
Running the sources required `tsx`. Which compiler and runtime should the project
stand on, and does it still need a TypeScript loader?

## Considered Options

- TypeScript 6.0.3
- TypeScript 7.0.2
- Stay on TypeScript 5.3 and only fix `moduleResolution`

## Decision Outcome

Chosen option: "TypeScript 6.0.3", because `typescript-eslint@8.67.0` declares a
peer range of `typescript >=4.8.4 <6.1.0`. TypeScript 7 would therefore have cost
a two-compiler npm-alias setup to keep type-aware linting, for no benefit on a
nine-file project — its build-speed gains are irrelevant at this size.

`strict` is on together with `noUncheckedIndexedAccess`, `noImplicitOverride`,
`noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `isolatedModules`
and `erasableSyntaxOnly`. The last one is what makes `tsx` unnecessary: with no
decorators (see [ADR-0001](0001-wire-dependencies-by-hand.md)), no enums and no
parameter properties left, Node runs the `.mts` sources by stripping types.
Relative imports are written as `./x.mts` — Node resolves the specifier as
written and does not map `.mjs` onto a `.mts` file — and
`rewriteRelativeImportExtensions` turns them back into `.mjs` on emit, so
`node src/main.mts` and `node dist/main.mjs` behave identically.

_This ADR was backfilled from git history (`fc0f939`, `40561f8`, `7d7bb8c`)._

### Consequences

- Good, because `strict` surfaced three real defects rather than style issues: the
  config type that lied about its shape, a `MatrixClient` field that was undefined
  until an async method had run, and a `join()` over values tsdav types as
  `string | Record<string, unknown> | undefined`.
- Good, because one fewer devDependency and no loader in the start path.
- Good, because `rootDir: "./src"` is set explicitly — TypeScript 6 defaults it to
  `./`, which would emit `dist/src/main.mjs` and break the container's
  `node dist/main.mjs`.
- Bad, because `engines` now declares `>=24.11.0 <27` while the deployment host is
  pinned to Node 22.23.2 by its own tooling. Verified in `node:22.23.2`: `npm ci`
  succeeds (only an `EBADENGINE` warning) and both entry points run — but that is
  outside the declared range and the pin should be raised.
- Neutral: type-aware ESLint rules are enabled in the same commit as `strict`,
  because typescript-eslint refuses to run several of them without
  `strictNullChecks`.

## More Information

Revisit TypeScript 7 when typescript-eslint ships a release whose peer range
includes it. `arktype` is already verified working on 7.0.2 and does not constrain
this choice.
