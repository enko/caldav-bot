---
status: accepted
date: 2026-08-15
---

# Wire dependencies by hand instead of using a DI container

## Context and Problem Statement

The project used `@freshgum/typedi` to construct five classes, each of whose
constructors took the same single argument (`Config`). The container was also the
only reason the project needed decorators, and its token pattern caused a silent
bug: `Symbol('CalendarProvider').toString()` was used both as a container token
and compared against a provider _name_, so the birthday sort behind that
comparison had never run. The package itself is dormant — still 0.x, last real
release 2024-05-09. Is a container earning its place here?

## Considered Options

- Hand-wire the two provider and two messenger implementations in `main.mts`
- Keep `@freshgum/typedi`
- Replace it with another container (tsyringe, InversifyJS)

## Decision Outcome

Chosen option: "Hand-wire", because the container solved no problem this codebase
has. There are two implementations per interface, both selected once at startup
from a config value; an exhaustive `switch` over a string-literal union expresses
that directly and lets the compiler check completeness. Classes now take the
scalars they use (`durationInDays`, `botToken`, an options object) rather than
the whole `Config`, which removed the need for the container's central registry
altogether.

_This ADR was backfilled from git history (`7e6149d`)._

### Consequences

- Good, because the `Symbol.toString()`-as-token pattern that disabled the
  Monica sort cannot recur — `caldav.mts` no longer knows provider types at all.
- Good, because dropping the decorators removed the last non-erasable syntax
  blocker on the path to running the sources without a loader (see
  [ADR-0005](0005-node-24-typescript-6-no-loader.md)).
- Good, because the provider tests construct `new MonicaCalendarProvider(30)`
  instead of faking a whole `Config` object.
- Bad, because adding a third provider or messenger now means editing the
  `switch` in `main.mts` rather than only annotating a class. The compiler
  reports the missing branch, so the cost is one edit, not a runtime surprise.
