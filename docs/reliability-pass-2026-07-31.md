# Reliability and maintainability pass - 2026-07-31

## Goals

This pass addressed concrete cross-file drift and live-performance reliability without changing the project's framework-free architecture or retuning any instrument.

## Functional corrections

### Quartet erhu vibrato

The arrangement requested `vibrato-e5` from `erhu-fx`, but that pad had moved to `erhu-expressive`. All three arranged E5 vibrato passages could therefore return no voice. The arrangement now resolves the registered expressive board, and the validator checks that relationship.

### Yueqin relay lifecycle

The custom yueqin input path previously bypassed the generic release behavior. Quick local releases, tremolo starts/stops, automatic tremolo cutoffs, and sustained song notes now emit matching relay events. Incoming tremolo events use the real continuous re-excitation synthesis rather than an ordinary quick pluck.

### Async remote release race

For sample-backed instruments, a remote release could arrive while the note's sample was still fetching/decoding. The old promise callback would then register a voice after the release and let it ring. Remote handlers now track intended held state; late voices are immediately stopped when their release already arrived.

### Looper scope

The UI now distinguishes local and shared loops. Local behavior preserves the previous browser-only behavior. Shared mode captures live remote events and broadcasts playback. Replayed events carry `loopPlayback` and are excluded from recording, preventing feedback and exponential event growth.

### Relay reconnection

Socket callbacks are tied to a connection generation. Late close/error events from a replaced socket can no longer overwrite the current connection status. Presence is cleared when switching or closing connections.

### Relay input bounds

The server accepts only valid JSON text envelopes and caps frames at 64 KiB. It remains intentionally stateless and ephemeral.
Connection-level protocol errors are isolated to the offending peer so an oversized frame cannot terminate the relay process.

## Responsiveness and interaction

- Sample manifests still load immediately; after the first audio-unlocking gesture, decoded buffers warm in the background.
- Frets and pads expose button semantics, accessible labels, tab focus, Enter/Space activation, and visible keyboard focus.
- Pointer capture keeps a held control active when the pointer drifts outside its visual boundary; release/cancel still terminates the note.
- Yueqin now reuses the shared fret renderer, removing duplicated DOM/input construction.

## Validation and documentation

- Added `scripts/validate-project.js` for JavaScript syntax, HTML asset references, sample manifests, and arrangement references.
- Added root project documentation and a detailed maintenance/protocol guide.
- Added `AGENTS.md` with repository roles, musical constraints, licensing boundaries, verification requirements, and documentation expectations.
- Rewrote relay documentation to describe the current multi-instrument protocol rather than the historical single-yueqin `app.js` implementation.

## Deliberately unchanged

- No instrument was retuned.
- No samples were normalized, renamed, pitch-shifted, or replaced.
- Yueqin synthesis constants and plate models were not altered.
- Saved loops remain in-memory only.
- The relay still has no accounts, persistence, room database, or audio streaming.
