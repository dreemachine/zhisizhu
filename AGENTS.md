# Zhisizhu project guidance

## Repository role

- This repository is the canonical, deployed multi-instrument application.
- `Z:\yueqin` is the historical single-yueqin predecessor. Treat it as reference material unless the user explicitly asks to edit it.
- `Z:\yue-qin-project` is the research/source archive containing raw recordings, dated experiments, sheet music, licenses, and visual references. Treat it as read-only unless the user explicitly asks otherwise.
- Preserve user changes and unrelated worktree changes. Do not rewrite history or discard files to obtain a clean tree.

## Product principles

- Preserve the framework-free HTML/CSS/JavaScript architecture unless a demonstrated problem justifies a dependency.
- Musical behavior, measured pitch, perceived tone, and live-play reliability take priority over abstract code elegance.
- Preserve detailed audio-design rationale in existing comments. Update comments when behavior changes, but do not erase historical decisions that still explain the implementation.
- Treat hand-authored arrangement timing, voicing, articulation, and octave decisions as intentional.
- Do not silently transpose, normalize, pitch-shift, replace, or rename verified samples.
- Keep saved loops session-only unless the user explicitly requests persistence.

## Audio and licensing

- Maintain provenance for every added sample and confirm that redistribution is allowed before placing it in the deployed repository.
- CC0 assets may be redistributed, but retain provenance notes in project documentation.
- Never redistribute Mini ErHu assets or use them to create a sample-library product; its archived license prohibits both.
- Keep source/reference recordings in the archive rather than copying them into the deployed site unless their license clearly permits distribution.

## Architecture boundaries

- `core.js` owns shared audio, relay routing, sample loading, instrument factories, looper behavior, and ensemble sequencing.
- Instrument files own their mappings, articulations, and samples.
- `song-spring-river.js` owns the quartet arrangement and must reference registered instrument APIs and valid pad/fret IDs.
- `relay/relay-server.js` remains a small ephemeral fan-out service. Avoid adding accounts or persistence without an explicit product decision.
- Keep the relay event protocol documented in `docs/maintenance.md` whenever payload behavior changes.

## Required verification

- Run `node scripts/validate-project.js` after changing JavaScript, HTML asset references, sample manifests, or arrangements.
- For input changes, test pointer, touch-equivalent pointer behavior, Enter/Space activation, physical keyboard press/release, and window blur.
- For relay changes, test two clients in both directions, including sustained note release, yueqin tremolo, reconnect status, and presence.
- For looper changes, test local and shared scope, first-pass recording, overdub, clear, save/load, and audio download.
- For UI changes, inspect both the two-column desktop layout and the single-column layout below 1300px.
- Increment affected `?v=` cache-busting values in `index.html` when deployed CSS or JavaScript changes.

## Documentation expectations

- Keep `README.md` user/developer-facing.
- Keep implementation and protocol details in `docs/maintenance.md`.
- Record substantial cross-cutting maintenance passes in a dated file under `docs/`.
- Prefer links to detailed documentation over duplicating long explanations in this file.
