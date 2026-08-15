---
status: accepted
date: 2026-08-15
---

# Keep one Matrix device by caching the access token

## Context and Problem Statement

`MatrixMessenger.sendMessage()` performed a full `MatrixAuth.passwordLogin()` on
every invocation, so the bot account accumulated one device per digest. At the
same time `CryptoClient.prepare()` prefers the device id cached in the crypto
store, so from the second run onwards the `OlmMachine` signed as a device the
access token no longer belonged to. The failure was masked by a second problem:
`matrix-bot-sdk@0.7.0` pins a 2022-era crypto binding that serialises
`"device_keys": null`, which Synapse rejects since 1.152.0 — so the Matrix path
had been dead since that homeserver upgrade. How does a one-shot process send one
encrypted message without minting a device each time?

## Considered Options

- Persist the access token in the existing `SimpleFsStorageProvider` and log in
  only when it is absent
- Take a long-lived token from the environment (`MATRIX_ACCESS_TOKEN`) and drop
  password login entirely
- Keep logging in per run and reconcile the device id with the crypto store

## Decision Outcome

Chosen option: "Persist the access token in the settings file", because the
storage provider the client already requires has a key-value store, so this needs
no new configuration key and no operator action beyond the one-time migration. The
password stays in the config for the _first_ login only. Keeping the token stable
keeps the device — and therefore the Megolm state in `MATRIX_CRYPTO_DIRECTORY` —
stable, which is what the crypto store assumed all along.

Two changes ride along because they are the same failure:
`matrix-bot-sdk` moves to 0.8.0 (crypto binding 0.4.0, which omits `device_keys`
instead of nulling it), and `client.start()` is replaced by
`client.crypto.prepare([room])` — the pattern upstream's own encryption example
uses for sending before start.

_This ADR was backfilled from git history (`d0a3fee`)._

### Consequences

- Good, because the account stops growing a device per run and the crypto identity
  matches the token.
- Good, because dropping `client.start()` removes a 40 second `/sync` long-poll
  whose socket kept the event loop alive — the sole reason `main.mts` needed
  `process.exit(0)` (see
  [ADR-0006](0006-ndjson-logs-and-natural-exit.md)).
- Good, because `@matrix-org/olm` and `global.Olm` are gone (libolm was deprecated
  in July 2024 and the SDK no longer referenced it), and with them `.npmrc` — the
  build no longer reaches a third-party registry.
- **Requires a one-time migration:** stores written by 0.7.0 use the Sled backend,
  which the 0.4.0 bindings cannot open. `MATRIX_CRYPTO_DIRECTORY` must be emptied
  once, and room members will see one new device.
- Bad, because `MATRIX_SETTINGS_FILE` now contains a credential, and it is coupled
  to the crypto directory: deleting the settings file alone causes a fresh login
  against a crypto store that still pins the old device id, which the homeserver
  rejects. Delete both or neither.
- Neutral: `RustSdkCryptoStoreType.Sqlite` is passed as a literal `0`, because the
  bindings declare `StoreType` as a `const enum`, which `verbatimModuleSyntax`
  forbids importing as a value. Verified against the installed bindings.

## More Information

The two failure modes, the wire-level capture and the sandbox verification are
documented in `caldav-bot-bug-report.md` in the deployment repository. Stale
devices already on the account have to be logged out separately; nothing in this
repository can do that.
