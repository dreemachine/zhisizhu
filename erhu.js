// 二胡 erhu — a proper chromatic fretted instrument now (like yueqin),
// built on a CC0 sample pack (sfzinstruments/aliexpress-erhu) covering a
// full chromatic run D4-A5 in the "sustain" articulation (labeled D5-A6 by
// the pack itself, but direct pitch measurement — pYIN, confirmed across
// 10 of the 20 frets — showed every fret sounds exactly one octave below
// that; a real erhu's open strings are physically fixed at D4/A4, and a
// second, independent sample pack of just the open-string note landed on
// the same true D4 despite calling it something else again, so this
// wasn't a one-off mislabeling, both sources were just wrong about the
// octave number) — this is the "deeper sample pack" that was the reason
// erhu stayed a fixed-note pad board earlier: no pitch-shifting anywhere,
// every fret is a real recorded note. Sustain pairs naturally with
// hold/release: hold a fret to sustain the bow stroke, release to stop,
// same as dizi.
//
// The original 8-note Berklee "accented" pads plus FX/pizzicato pattern/
// tremolo/trill stay on the card as a secondary bonus board (click/tap-
// only — the main grid already claims most sensible keys), tucked under a
// <details> disclosure so the fretted grid is the primary thing you see
// and play. Glissando, harmonic, and the extra single-note pizzicatos were
// trimmed out (dree's call — didn't need them).
//
// Vibrato is NOT in that collapsed board — it's promoted to its own
// always-visible third row, since it's the articulation most worth
// surfacing rather than burying. (A second CC0 Freesound pack added 4 real
// low notes here too, D3/G3/C4/E4 by their filenames — but those turned
// out to be the exact same true pitches as 4 existing main-grid frets
// once the octave mislabeling above was sorted out, so they were swapped
// into those frets directly instead of staying as separate redundant
// pads here.)
(function () {
  const sampleLoader = createSampleLoader('samples/erhu');

  createFrettedInstrument({
    id: 'erhu',
    cardEl: document.getElementById('card-erhu'),
    rows: [
      {
        id: 'main',
        label: 'strings',
        base: 62, // D4 — was 74 (D5), but every fret sounds exactly one octave
        // below its label per direct pitch measurement (pYIN, confirmed
        // across 10 of the 20 frets, all off by exactly -12 semitones,
        // relative intervals between frets were always correct). This was
        // a mislabeling bug from when the grid was first built, not a
        // per-sample issue — the real range has been D4-A5 all along.
        keys: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k'],
        wrapAfter: 10, // display only — 20 frets in one row was too cramped; sample keys/fret numbering unchanged
      },
    ],
    fretCount: 20,
    tonicMidi: 62,
    sampleLoader,
    broadcast: true,
  });

  // Second, lower row (D3-Db4) — real vibrato-take recordings from a fresh
  // MIDI sweep (2026-08-03), extending below the main grid's D4 floor.
  // Separate registration rather than folded into 'main' because fretCount
  // is shared across all rows in one createFrettedInstrument call; a
  // second call keeps this row's real 12-note length independent of main's
  // 20. manualWiring since 'main' already owns this card's keyboard focus —
  // click/tap only, same pattern as the FX/expressive pad boards below.
  const erhuLow = createFrettedInstrument({
    id: 'erhu-low',
    cardEl: document.getElementById('card-erhu'),
    rows: [
      {
        id: 'low',
        label: 'low strings',
        base: 50, // D3
        keys: ['', '', '', '', '', '', '', '', '', '', '', ''],
        wrapAfter: 6,
      },
    ],
    fretCount: 12,
    tonicMidi: 62,
    sampleLoader,
    broadcast: true,
    manualWiring: true,
  });
  erhuLow.render();

  const fxPads = [
    { id: 'D4', key: '1', label: 'D4 (accented)', sampleKey: 'D4' },
    { id: 'F4', key: '2', label: 'F4 (accented)', sampleKey: 'F4' },
    { id: 'Ab4', key: '3', label: 'Ab4 (accented)', sampleKey: 'Ab4' },
    { id: 'A4', key: '4', label: 'A4 (accented)', sampleKey: 'A4' },
    { id: 'C5', key: '5', label: 'C5 (accented)', sampleKey: 'C5' },
    { id: 'Eb5', key: '6', label: 'Eb5 (accented)', sampleKey: 'Eb5' },
    { id: 'Gb5', key: '7', label: 'Gb5 (accented)', sampleKey: 'Gb5' },
    { id: 'A5', key: '8', label: 'A5 (accented)', sampleKey: 'A5' },
    { break: true },
    { id: 'horse-noise', key: '9', label: 'Horse (A)', sampleKey: 'horse-noise' },
    { id: 'bird-noise', key: '0', label: 'Bird', sampleKey: 'bird-noise' },
    { id: 'water-drop', key: 'z', label: 'Water drop', sampleKey: 'water-drop' },
    { id: 'double-stab', key: 'x', label: 'Double stab', sampleKey: 'double-stab' },
    { id: 'horse-noise-d', key: 'c', label: 'Horse (D)', sampleKey: 'horse-noise-d' },
    { id: 'horse-running', key: 'v', label: 'Horse running', sampleKey: 'horse-running' },
    { id: 'pizzicato-pattern', key: '', label: 'Pizz. pattern', sampleKey: 'pizzicato-pattern' },
    { break: true },
    { id: 'tremolo-accelerated', key: '', label: 'Tremolo accel.', sampleKey: 'tremolo-accelerated' },
    { id: 'tremolo-endofnote', key: '', label: 'Tremolo end', sampleKey: 'tremolo-endofnote' },
    { id: 'tremolo-fp', key: '', label: 'Tremolo fp', sampleKey: 'tremolo-fp' },
    { id: 'tremolo-sustained', key: '', label: 'Tremolo sust.', sampleKey: 'tremolo-sustained' },
    { id: 'trill-endofphrase-b4', key: '', label: 'Trill end B4', sampleKey: 'trill-endofphrase-b4' },
    { id: 'trill-endofphrase-e4', key: '', label: 'Trill end E4', sampleKey: 'trill-endofphrase-e4' },
    { id: 'trill-mongolian-b4', key: '', label: 'Trill Mongolian B4', sampleKey: 'trill-mongolian-b4' },
    { id: 'trill-mongolian-e4', key: '', label: 'Trill Mongolian E4', sampleKey: 'trill-mongolian-e4' },
    { id: 'trill-regular-b4', key: '', label: 'Trill B4', sampleKey: 'trill-regular-b4' },
    { id: 'trill-regular-e4', key: '', label: 'Trill E4', sampleKey: 'trill-regular-e4' },
  ];

  // Secondary board — click/tap-only (manualWiring skips keyboard/focus
  // registration, which the main fretted grid above already owns for this
  // card), its own relay id so broadcasting doesn't collide with 'erhu'.
  createPadInstrument({
    id: 'erhu-fx',
    cardEl: document.getElementById('card-erhu'),
    pads: fxPads,
    sampleLoader,
    broadcast: true,
    manualWiring: true,
    containerSelector: '.fx-pads',
  });

  const expressivePads = [
    { id: 'vibrato-a4', key: 'q', label: 'Vibrato A4', sampleKey: 'vibrato-a4' },
    { id: 'vibrato-e5', key: 'w', label: 'Vibrato E5', sampleKey: 'vibrato-e5' },
    { id: 'vibrato-plain', key: 'e', label: 'Vibrato (plain)', sampleKey: 'vibrato-plain' },
    { id: 'vibrato-delayed-a4', key: 'r', label: 'Vibrato delayed A4', sampleKey: 'vibrato-delayed-a4' },
    { id: 'vibrato-delayed-e5', key: 't', label: 'Vibrato delayed E5', sampleKey: 'vibrato-delayed-e5' },
    { id: 'vibrato-intensive-a4', key: 'y', label: 'Vibrato intense A4', sampleKey: 'vibrato-intensive-a4' },
    { id: 'vibrato-intensive-e5', key: 'u', label: 'Vibrato intense E5', sampleKey: 'vibrato-intensive-e5' },
    { id: 'vibrato-pressurized-a4', key: 'i', label: 'Vibrato pressed A4', sampleKey: 'vibrato-pressurized-a4' },
    { id: 'vibrato-pressurized-e5', key: 'o', label: 'Vibrato pressed E5', sampleKey: 'vibrato-pressurized-e5' },
  ];

  // Promoted, always-visible (not in the collapsed <details>) — same
  // manualWiring click/tap-only treatment as the FX board, own relay id.
  createPadInstrument({
    id: 'erhu-expressive',
    cardEl: document.getElementById('card-erhu'),
    pads: expressivePads,
    sampleLoader,
    broadcast: true,
    manualWiring: true,
    containerSelector: '.expressive-pads',
  });
})();
