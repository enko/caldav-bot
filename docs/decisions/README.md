# Architecture decision records

[MADR](https://adr.github.io/madr/) format. One file per decision, numbered in
order, never rewritten once accepted — a decision that no longer holds gets a
successor and a `superseded by` status on the old one.

| ADR                                                 | Decision                                                                   | Status   |
| --------------------------------------------------- | -------------------------------------------------------------------------- | -------- |
| [0001](0001-wire-dependencies-by-hand.md)           | Wire dependencies by hand instead of using a DI container                  | accepted |
| [0002](0002-expand-recurrences-with-node-ical.md)   | Expand recurring events over the digest window with node-ical              | accepted |
| [0003](0003-validate-configuration-with-arktype.md) | Validate the environment with an arktype schema                            | accepted |
| [0004](0004-one-matrix-device-via-cached-token.md)  | Keep one Matrix device by caching the access token                         | accepted |
| [0005](0005-node-24-typescript-6-no-loader.md)      | Require Node 24 LTS and TypeScript 6, and run the sources without a loader | accepted |
| [0006](0006-ndjson-logs-and-natural-exit.md)        | Write NDJSON to stdout through a synchronous destination                   | accepted |
| [0007](0007-releases-from-commit-messages.md)       | Derive versions and the changelog from commit messages                     | accepted |

0001–0006 were backfilled on 2026-08-15 from the modernization series, so the code
already reflected them when they were written; 0007 was written together with the
change it describes.
