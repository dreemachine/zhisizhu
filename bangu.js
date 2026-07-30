// 板鼓-ish "bangu" card — a small classic Chinese percussion kit: dagu
// (bass drum) strokes, a snare, 5 pitched temple blocks, real bangu
// clapper-drum hits, naobo (clashing cymbals), a gong, and a rattle drum.
// Naobo/rattle are long natural decays (or, for the rattle, a continuous
// shake roll) — hold/release lets you choke them early or let them ring
// out fully. Gong is oneShot instead: a struck gong just keeps ringing on
// its own regardless of how you damp it (unlike a drum head, there's no
// natural "let go to shorten it" the way hold/release implies), same
// reasoning as the dagu strokes above.
(function () {
  const sampleLoader = createSampleLoader('samples/bangu');

  // Ordered for the physical layout dree asked for: rattle top-left, bangu
  // (sharp) to its left of the plain bangu hit, temple blocks unchanged,
  // dagu strokes and rimshot moved down to the bottom row. Positions are
  // unchanged from before — the `caption` entries just add a small label
  // under each instrument group identifying what it actually is (this box
  // holds a lot more than just a "bangu" now).
  const pads = [
    { id: 'rattle', key: 't', label: 'Rattle', sampleKey: 'rattle' },
    { caption: 'rattle drum (pellets on a skin head)' },
    { id: 'snare', key: '4', label: 'Snare', sampleKey: 'snare' },
    { caption: 'snare drum' },
    { id: 'bangu-clap-sharp', key: 'q', label: 'Bangu (sharp)', sampleKey: 'bangu-clap-sharp' },
    { id: 'bangu-clap', key: '0', label: 'Bangu', sampleKey: 'bangu-clap' },
    { caption: 'bangu drum' },
    { id: 'templeblock-1', key: '5', label: 'Block 1', sampleKey: 'templeblock-1' },
    { id: 'templeblock-2', key: '6', label: 'Block 2', sampleKey: 'templeblock-2' },
    { id: 'templeblock-3', key: '7', label: 'Block 3', sampleKey: 'templeblock-3' },
    { id: 'templeblock-4', key: '8', label: 'Block 4', sampleKey: 'templeblock-4' },
    { id: 'templeblock-5', key: '9', label: 'Block 5', sampleKey: 'templeblock-5' },
    { caption: 'wooden temple blocks' },
    { break: true },
    { id: 'dagu-center', key: '1', label: 'Dagu', sampleKey: 'dagu-center', oneShot: true },
    { id: 'dagu-edge', key: '2', label: 'Dagu edge', sampleKey: 'dagu-edge', oneShot: true },
    { id: 'dagu-rimshot', key: '3', label: 'Rimshot', sampleKey: 'dagu-rimshot' },
    { caption: 'dagu drum' },
    { id: 'naobo-crash', key: 'w', label: 'Naobo crash', sampleKey: 'naobo-crash' },
    { id: 'naobo-soft', key: 'e', label: 'Naobo soft', sampleKey: 'naobo-soft' },
    { caption: 'naobo cymbals' },
    { id: 'gong', key: 'r', label: 'Gong', sampleKey: 'gong', oneShot: true },
    { caption: 'gong' },
  ];

  createPadInstrument({
    id: 'bangu',
    cardEl: document.getElementById('card-bangu'),
    pads,
    sampleLoader,
    broadcast: true,
  });
})();
