# Architecture and maintenance notes

## Runtime architecture

All instruments share one lazily created `AudioContext`. Instrument output passes through a per-instrument gain and then a shared dynamics compressor/master gain. Recorded samples and synthesized voices expose the same small stop-handle interface, allowing the input, relay, looper, and sequencer paths to treat them uniformly.

Instrument modules register two surfaces with `core.js`:

1. A public instrument API used by arrangements and page-level features.
2. A relay handler used to replay incoming events without broadcasting them again.

Only one card owns physical-keyboard focus at a time. Pointer/touch activation remains independent of card focus. Frets and pads are also focusable controls; Enter and Space press and release the focused control.

A card can host more than one `createFrettedInstrument`/`createPadInstrument` registration (erhu's card has four: the main grid, the low row, the FX board, and the expressive/vibrato row). `fretCount` and `keys` are shared across every row within one `createFrettedInstrument` call, so a row with a genuinely different real length (e.g. erhu-low's 12 frets vs. main's 20) needs its own separate registration, not a second row in the same call. Every registration after the first on a shared card sets `manualWiring: true` (click/tap only, no keyboard focus) and must call its own `render()` since manualWiring skips the automatic one.

Every instrument gain node defaults to 0.25 (matches each volume slider's default position, 1/4 up) and also feeds a shared reverb send unless its id is in `NO_REVERB_INSTRUMENTS` (currently just `cricket` — short dry hits read as mushy with room glue on them). The reverb itself is a generated exponential-decay-noise impulse through a `ConvolverNode`, not a recorded IR file, with a lowpass on the return to tame the raw-noise brightness. Its send level is user-controllable via the "room" slider (`#reverb-slider`), independent of the per-instrument volume sliders.

### Pad instrument primitives

Beyond the base press/hold/release/oneShot behavior, individual pads in a `createPadInstrument` config can opt into three generic, reusable behaviors (all implemented once in `core.js`, not per-instrument):

- **`roll: true`** — retriggers the sample on a fixed interval (`rollIntervalMs`, default 70ms) for as long as the pad is held, instead of ringing one hit. Used by bangu's snare (a single sample can't be "drilled" by clicking fast enough by hand). Each tick is its own broadcast pad event, so remote listeners hear the same roll.
- **`holdFollowUp: 'other-pad-id'`** — if still held after a delay (`holdFollowUpDelayMs`, default 180ms), plays a second pad once. Fires once, not repeatedly, unlike `roll`. Built for a cricket experiment (auto-following a chirp with a slowed-down second one) that didn't work out in practice — dree wanted one cohesive extended clip instead, which the plain hold/release mechanism already provides given a longer source sample. Left in `core.js` as a working, reusable primitive since it cost nothing to keep.
- **`randomAlt: { sampleKey: 'alt-key', chance: 0.3 }`** — on each play, has a chance of substituting a different sample instead of the pad's usual one. Rolled independently by every client, including remote listeners receiving the event via `playRemote` — an ensemble is not guaranteed to hear the same substitution at the same moment, since syncing the roll itself over the relay wasn't judged worth the protocol complexity for a flavor touch. Used by cricket's tuned-chirp row, where each of the 8 notes has its own pitch-matched alternate (not one shared flat-pitched alternate) so the substitution still lands on the right scale degree.

`render()` skips pads with `hidden: true` — no button, but still addressable by id (e.g. as a `holdFollowUp` target).

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

Two arrangement files exist: `song-spring-river.js` (pYIN/onset-verified transcription) and `song-mo-li-hua.js` (opening hook only, melody drafted from memory of the standard tune — not verified against a recording or score, flagged in-file). `scripts/validate-project.js`'s arrangement checks run against both.

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
