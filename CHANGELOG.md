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
