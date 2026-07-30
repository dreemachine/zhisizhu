// 板鼓-ish "bangu" card — a small classic Chinese percussion kit: dagu
// (bass drum) strokes, a snare, 5 pitched temple blocks, real bangu
// clapper-drum hits, naobo (clashing cymbals), a gong, and a rattle drum.
// Gong/naobo/rattle are long natural decays (or, for the rattle, a
// continuous shake roll) rather than short one-shots — hold/release
// (added to createPadInstrument) lets you choke them early or let them
// ring out fully.
(function () {
  const sampleLoader = createSampleLoader('samples/bangu');

  // Ordered for the physical layout dree asked for: rattle top-left, bangu
  // (sharp) to its left of the plain bangu hit, temple blocks unchanged,
  // dagu strokes and rimshot moved down to the bottom row.
  const pads = [
    { id: 'rattle', key: 't', label: 'Rattle', sampleKey: 'rattle' },
    { id: 'snare', key: '4', label: 'Snare', sampleKey: 'snare' },
    { id: 'bangu-clap-sharp', key: 'q', label: 'Bangu (sharp)', sampleKey: 'bangu-clap-sharp' },
    { id: 'bangu-clap', key: '0', label: 'Bangu', sampleKey: 'bangu-clap' },
    { id: 'templeblock-1', key: '5', label: 'Block 1', sampleKey: 'templeblock-1' },
    { id: 'templeblock-2', key: '6', label: 'Block 2', sampleKey: 'templeblock-2' },
    { id: 'templeblock-3', key: '7', label: 'Block 3', sampleKey: 'templeblock-3' },
    { id: 'templeblock-4', key: '8', label: 'Block 4', sampleKey: 'templeblock-4' },
    { id: 'templeblock-5', key: '9', label: 'Block 5', sampleKey: 'templeblock-5' },
    { break: true },
    { id: 'dagu-center', key: '1', label: 'Dagu', sampleKey: 'dagu-center', oneShot: true },
    { id: 'dagu-edge', key: '2', label: 'Dagu edge', sampleKey: 'dagu-edge', oneShot: true },
    { id: 'dagu-rimshot', key: '3', label: 'Rimshot', sampleKey: 'dagu-rimshot' },
    { id: 'naobo-crash', key: 'w', label: 'Naobo crash', sampleKey: 'naobo-crash' },
    { id: 'naobo-soft', key: 'e', label: 'Naobo soft', sampleKey: 'naobo-soft' },
    { id: 'gong', key: 'r', label: 'Gong', sampleKey: 'gong' },
  ];

  createPadInstrument({
    id: 'bangu',
    cardEl: document.getElementById('card-bangu'),
    pads,
    sampleLoader,
    broadcast: true,
  });
})();
