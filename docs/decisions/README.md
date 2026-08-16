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
| [0008](0008-publish-the-image-to-ghcr.md)           | Publish the container image to GHCR on release                             | accepted |
| [0009](0009-test-with-vitest.md)                    | Run the unit tests with Vitest                                             | accepted |
| [0010](0010-alias-the-abandoned-request-package.md) | Alias the abandoned `request` package to the maintained fork               | accepted |
| [0011](0011-renovate-one-weekly-pull-request.md)    | Keep dependencies current with one weekly Renovate pull request            | accepted |

0001–0006 and 0009 were backfilled from the modernization series, so the code
already reflected them when they were written; 0007, 0008, 0010 and 0011 were
written together with the changes they describe.
