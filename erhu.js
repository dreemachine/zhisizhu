// 二胡 erhu — a proper chromatic fretted instrument now (like yueqin),
// built on a CC0 sample pack (sfzinstruments/aliexpress-erhu) covering a
// full chromatic run D5-A6 in the "sustain" articulation — this is the
// "deeper sample pack" that was the reason erhu stayed a fixed-note pad
// board earlier: no pitch-shifting anywhere, every fret is a real
// recorded note. Sustain pairs naturally with hold/release: hold a fret
// to sustain the bow stroke, release to stop, same as dizi.
//
// The original 8-note Berklee "accented" pads plus FX/pizzicato pattern/
// tremolo/trill/vibrato from earlier stay on the card as a secondary bonus
// board (click/tap-only — the main grid already claims most sensible
// keys), tucked under a <details> disclosure so the fretted grid is the
// primary thing you see and play. Glissando, harmonic, and the extra
// single-note pizzicatos were trimmed out (dree's call — didn't need them).
(function () {
  const sampleLoader = createSampleLoader('samples/erhu');

  createFrettedInstrument({
    id: 'erhu',
    cardEl: document.getElementById('card-erhu'),
    rows: [
      {
        id: 'main',
        label: 'strings',
        base: 74, // D5
        keys: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k'],
        wrapAfter: 10, // display only — 20 frets in one row was too cramped; sample keys/fret numbering unchanged
      },
    ],
    fretCount: 20,
    tonicMidi: 74,
    sampleLoader,
    broadcast: true,
  });

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
    { id: 'vibrato-a4', key: '', label: 'Vibrato A4', sampleKey: 'vibrato-a4' },
    { id: 'vibrato-e5', key: '', label: 'Vibrato E5', sampleKey: 'vibrato-e5' },
    { id: 'vibrato-plain', key: '', label: 'Vibrato (plain)', sampleKey: 'vibrato-plain' },
    { id: 'vibrato-delayed-a4', key: '', label: 'Vibrato delayed A4', sampleKey: 'vibrato-delayed-a4' },
    { id: 'vibrato-delayed-e5', key: '', label: 'Vibrato delayed E5', sampleKey: 'vibrato-delayed-e5' },
    { id: 'vibrato-intensive-a4', key: '', label: 'Vibrato intense A4', sampleKey: 'vibrato-intensive-a4' },
    { id: 'vibrato-intensive-e5', key: '', label: 'Vibrato intense E5', sampleKey: 'vibrato-intensive-e5' },
    { id: 'vibrato-pressurized-a4', key: '', label: 'Vibrato pressed A4', sampleKey: 'vibrato-pressurized-a4' },
    { id: 'vibrato-pressurized-e5', key: '', label: 'Vibrato pressed E5', sampleKey: 'vibrato-pressurized-e5' },
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
  });
})();
