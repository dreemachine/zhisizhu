# Architecture and maintenance notes

## Runtime architecture

All instruments share one lazily created `AudioContext`. Instrument output passes through a per-instrument gain and then a shared dynamics compressor/master gain. Recorded samples and synthesized voices expose the same small stop-handle interface, allowing the input, relay, looper, and sequencer paths to treat them uniformly.

Instrument modules register two surfaces with `core.js`:

1. A public instrument API used by arrangements and page-level features.
2. A relay handler used to replay incoming events without broadcasting them again.

Only one card owns physical-keyboard focus at a time. Pointer/touch activation remains independent of card focus. Frets and pads are also focusable controls; Enter and Space press and release the focused control.

## Relay event protocol

Every event is JSON text. `core.js` adds `senderId` and either `instrument` or `meta`.

Typical fretted note:

```json
{
  "senderId": "client-id",
  "instrument": "erhu",
  "string": "main",
  "fret": 3,
  "octaveShift": 0
}
```

Fretted release:

```json
{
  "senderId": "client-id",
  "instrument": "erhu",
  "string": "main",
  "fret": 3,
  "released": true
}
```

Pad note and release use `pad` instead of `string`/`fret`. Variant instruments also include the sender's `variant`, ensuring a remote dizi vibrato note does not depend on the receiving browser's local toggle.

Yueqin adds:

```json
{
  "instrument": "yueqin",
  "string": "low",
  "fret": 5,
  "octaveShift": 0,
  "articulation": "tremolo"
}
```

Ordinary yueqin plucks omit `articulation`; tremolo uses the continuous re-excitation synthesis path on every peer. Manual release, blur release, automatic tremolo cutoff, and sustained-song cutoff all send a matching release.

Presence uses `{ "meta": "presence" }` and is excluded from loop capture. Incoming handlers track pending note state as well as active voices so a release received while a sample is still decoding stops that voice as soon as decoding finishes.

The relay server:

- Accepts JSON text only.
- Requires a string `senderId` plus `meta` or `instrument`.
- Rejects malformed/binary messages.
- Caps messages at 64 KiB.
- Keeps no accounts, rooms, musical state, or persistence.

It is still an ephemeral convenience service, not an authenticated public service. Use an unguessable tunnel URL and stop the relay/tunnel after the session.

## Looper semantics

The looper stores `{time, instrument, payload}` events.

### Local scope

- Captures locally generated note and release events.
- Ignores incoming relay events.
- Replays only through local instrument handlers.

### Shared scope

- Captures locally generated events and live incoming events.
- Replays locally and broadcasts playback to relay peers.
- Adds `loopPlayback: true` to replayed payloads.
- Never captures a payload marked `loopPlayback`, preventing recursive growth while overdubbing or when multiple peers have loopers active.

Changing scope affects the current loop immediately. Saved loops remember their scope; older in-memory records without scope load as local.

The first recording pass establishes loop duration. Later passes overdub into that duration. Saves are intentionally tab-lifetime only. Audio export waits for the next cycle boundary and records one cycle through `MediaRecorder`.

## Sample loading

Each instrument begins fetching its manifest at page load. The first user gesture unlocks Web Audio. The requested note starts loading first, then every registered sample loader warms its remaining buffers in the background. Every URL receives a per-page timestamp query to prevent stale audio during active sample iteration.

A missing manifest or sample resolves to `null`; callers may fall back to synthesis. Do not change that failure behavior without adding visible error reporting, because silent optional-sample fallback is currently part of the instrument factory contract.

## Arrangement integrity

`song-spring-river.js` resolves the E5 vibrato articulation through `erhu-expressive`, where the pad is registered. The project validator checks this API choice, all literal dizi/bangu/erhu expressive pad references, and yueqin/erhu fret bounds.

Whenever an articulation moves between boards, update:

1. The owning instrument module.
2. Every arrangement reference.
3. Volume-slider `data-instruments` if registration IDs change.
4. The validator if a new data-construction pattern cannot be discovered statically.

## Verification checklist

### Static

```powershell
node scripts\validate-project.js
git diff --check
```

### Single browser

1. Confirm the page loads without console errors.
2. Trigger the first sample-backed note and verify it sounds promptly.
3. Test physical keys after focusing each card.
4. Test pointer hold/release and dragging outside while held.
5. Tab to a fret/pad and test Enter and Space.
6. Verify window blur releases sustained notes.
7. Play the quartet and confirm all three E5 erhu vibrato passages sound.
8. Record, overdub, save/load, clear, and download a local loop.
9. Check the two-column desktop and one-column narrow layouts.

### Two relay clients

1. Connect both clients and confirm presence in both directions.
2. Test quick and sustained erhu/dizi notes in both directions.
3. Test yueqin quick release, tremolo, automatic tremolo cutoff, and a sustained song note.
4. Reconnect one client and confirm an old socket cannot overwrite the new status.
5. In local loop scope, verify peers do not hear playback and remote notes are not recorded.
6. In shared scope, verify remote live notes are captured and peers hear playback once.
7. Overdub a shared loop and verify event count does not grow from replay alone.

## Cache-busting

GitHub Pages and browsers may retain old static assets. After changing deployed scripts or CSS, increment their corresponding `?v=` values in `index.html`. Sample fetches use an automatic per-page timestamp and do not need manual manifest or audio query-version changes.
