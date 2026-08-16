## [1.1.0](https://github.com/enko/caldav-bot/compare/v1.0.1...v1.1.0) (2026-08-16)

### Features

* render the digest in a configured timezone ([54aca77](https://github.com/enko/caldav-bot/commit/54aca7701a48d104025063adba12da2355b384d1))

## [1.0.1](https://github.com/enko/caldav-bot/compare/v1.0.0...v1.0.1) (2026-08-16)

### Build & Dependencies

* **deps:** alias request to the maintained @cypress/request fork ([4e05799](https://github.com/enko/caldav-bot/commit/4e05799b6d5959a89942261540f6e3821f499351))
* **deps:** refresh the stale transitive dependency tree ([7691480](https://github.com/enko/caldav-bot/commit/7691480d80d91dad82c22e4bd6cef2b2ef7b19a1))
* replace every floating reference with an immutable id ([fb70ae9](https://github.com/enko/caldav-bot/commit/fb70ae90242ef1eb30d10d2f4f573a5b43af5421))

## 1.0.0 (2026-08-16)

### Features

* log message delivery for both messengers ([3dba9ed](https://github.com/enko/caldav-bot/commit/3dba9ed26eeff6eade53d3ea963ed376f0449a15))
* validate configuration with arktype ([c517c57](https://github.com/enko/caldav-bot/commit/c517c57cb2a6cd904442ee7a76203eae71bb3333))

### Bug Fixes

* drop events whose recurrence rule has expired ([86af08a](https://github.com/enko/caldav-bot/commit/86af08ae190f5971b2ab00d4228de75f83b5f333))
* emit machine-readable logs on stdout ([513db4c](https://github.com/enko/caldav-bot/commit/513db4c7b8cd5352f4431fce20bfd81b70c316c7))
* escape exclamation mark ([854c76d](https://github.com/enko/caldav-bot/commit/854c76d67604beeb50c066bc3ff64f92610f9010))
* exit cleanly and report fatal errors ([ffc3386](https://github.com/enko/caldav-bot/commit/ffc3386d4cd264a8eb093279b45cb4db43acbc5d))
* report moved recurrences and honour EXDATE ([81456d1](https://github.com/enko/caldav-bot/commit/81456d1864514c3794076b5910df6420854ec380))
* reuse one Matrix device instead of logging in per run ([d0a3fee](https://github.com/enko/caldav-bot/commit/d0a3fee8b6678a892e9220b234b416875443172f))

### Build & Dependencies

* add a multi-stage production Dockerfile ([5ca28b5](https://github.com/enko/caldav-bot/commit/5ca28b55995ebc3ecd4cb870dbacbc26821b1c93))
* replace dotenv with node --env-file ([348f5c0](https://github.com/enko/caldav-bot/commit/348f5c09811d471432c8c4d3d8fa6358325ec859))
* require Node 24 LTS and upgrade to TypeScript 6 ([fc0f939](https://github.com/enko/caldav-bot/commit/fc0f9392047e5871337f7081c96a5bd29aa3dd87))
* upgrade telegraf and use link_preview_options ([c70c875](https://github.com/enko/caldav-bot/commit/c70c875eeae1c418b6582e19f3b11382abd98841))
