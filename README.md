# 織丝竹 (Zhisizhu)

A browser-based Chinese instrumental ensemble for local and live collaborative performance. Players can use the keyboard, pointer, or touch to perform yueqin, erhu, dizi, Chinese percussion, and a small expressive cricket board. Connected browsers exchange compact musical events over WebSocket; they do not stream audio.

The deployed site is configured for `zhisizhu.dreemachine.com` through `CNAME`.

## Instruments

- **Yueqin:** Karplus-Strong plucked-string synthesis with modeled internal metal-plate resonance, octave control, tremolo, songs, and self-paced tutorials.
- **Erhu:** A chromatic D4-A5 grid of real sustained samples, a second D3-Db4 row (click/tap only) extending the range down, plus expressive vibrato and an optional FX/articulation board.
- **Dizi:** Natural notes from A5-G7 with normal and vibrato recordings.
- **Hide, wood, and metal:** Dagu, bangu, temple blocks, naobo, gong, snare (holdable roll), and rattle drum samples.
- **Cricket:** A character-oriented expressive sample board — real cricket recordings plus a tuned 8-note chirp row with occasional random substitutions.

Click an instrument card to give its physical keyboard mapping focus. Frets and pads also support pointer/touch and keyboard focus with Enter or Space.

## Run locally

The client must be served over HTTP because it fetches sample manifests and audio files. Opening `index.html` directly with `file://` is not supported.

From the repository root, use any static server, for example:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000/`.

No client build or package installation is required.

## Live relay

The optional relay is a small Node/WebSocket service intended to run only during a playing session:

```powershell
cd relay
npm install
npm start
```

It listens on `ws://localhost:8765`. See [`relay/README.md`](relay/README.md) for tunneling, current protocol behavior, and operational limitations.

## Looper

The looper records musical events rather than compressed audio, preserving exact instrument playback and timing.

- **Local scope:** Records this browser and replays only in this browser.
- **Shared scope:** Records both local and incoming live events. Playback is also transmitted to connected relay peers.

Loop playback is tagged so it cannot recursively record itself during overdubbing. Saved loops remain in memory for the lifetime of the tab. Audio download records one clean loop cycle from the shared master bus.

## Mix

Every instrument's volume slider defaults to 1/4 up. A shared, generated (not recorded) reverb glues the synthesized yueqin and the several unrelated sample libraries into one perceived room — its send level is the "room" slider, independent of per-instrument volume. Cricket is excluded from the shared reverb (short dry hits read as mushy with room glue on them).

## Project structure

```text
index.html                 Page structure and script loading
style.css                  Responsive visual system and instrument palettes
core.js                    Audio graph, relay, factories, looper, sequencer
yueqin.js                  Yueqin synthesis, songs, tutorial, tremolo
erhu.js                    Erhu grid and articulation boards
dizi.js                    Dizi note and vibrato mappings
bangu.js                   Chinese percussion mappings
cricket.js                 Cricket expression board
song-spring-river.js       Multi-instrument quartet arrangement (pYIN-verified)
song-mo-li-hua.js          Quartet arrangement, opening hook (melody unverified — see docs/maintenance.md)
looper.js                  Looper controls and status UI
volume-controls.js         Per-instrument volume controls
samples/                   Deployable sample assets and manifests
relay/                     Ephemeral WebSocket fan-out server
scripts/validate-project.js Dependency-free integrity checks
docs/                      Architecture and maintenance records
```

The related folders have different roles:

- `Z:\yueqin` is the historical single-instrument predecessor.
- `Z:\yue-qin-project` is the source/research archive. It includes raw recordings, licenses, dated tone experiments, sheet music, and production references; it is not the deployed application.

## Validation

Run the dependency-free validator before committing:

```powershell
node scripts\validate-project.js
```

It checks:

- JavaScript syntax.
- Local assets referenced by `index.html`.
- JSON validity and file existence for every sample manifest entry.
- Quartet references to valid instrument pads and fret ranges.

Browser and two-client relay checks are still required for behavior that depends on Web Audio, pointer input, timing, or WebSockets. The full checklist and event protocol live in [`docs/maintenance.md`](docs/maintenance.md).

## Design and maintenance philosophy

This project deliberately favors direct, inspectable browser code. The audio comments are part of the engineering record: many constants encode listening comparisons, pitch measurements, performance constraints, and discarded approaches. Refactoring should consolidate duplicated mechanics without flattening those musical decisions.

When adding a sample, preserve its provenance and verify redistribution rights. In particular, archived Mini ErHu material is not permitted for redistribution or sample-library creation.
