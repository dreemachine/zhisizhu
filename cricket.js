// 🦗 cricket speech board — real cricket recordings, cut and "cartoonified"
// per phrase rather than used as raw ambient clips (a plain isolated chirp
// doesn't read as an emotion on its own). Only "sad" has had that treatment
// so far — "chirp" is an uncartoonified real placeholder. crick-4 through
// crick-14 were segmented/added 2026-08-06 and labeled by dree after
// listening.
(function () {
  const sampleLoader = createSampleLoader('samples/cricket');

  // Two rows, evenly split (7/6) — the two newest chirps moved up next to
  // the original two per dree's request, rest follow in the order recorded.
  const pads = [
    { id: 'plain-chirp', key: 'z', label: 'chirp', sampleKey: 'plain-chirp' },
    { id: 'double-chirp', key: 'c', label: 'double chirp', sampleKey: 'double-chirp' },
    { id: 'sad', key: 'x', label: 'sad crick :(', sampleKey: 'sad' },
    { id: 'crick-13', key: 'k', label: 'chirpity chirp', sampleKey: 'crick-13' },
    { id: 'crick-14', key: 'l', label: 'long chirp', sampleKey: 'crick-14' },
    { id: 'crick-4', key: 'v', label: 'hey!', sampleKey: 'crick-4' },
    { id: 'crick-5', key: 'b', label: 'why?', sampleKey: 'crick-5' },
    { id: 'crick-6', key: 'n', label: 'oh no', sampleKey: 'crick-6' },
    { break: true },
    { id: 'crick-7', key: 'm', label: 'uh oh', sampleKey: 'crick-7' },
    { id: 'crick-8', key: ',', label: 'shrieking', sampleKey: 'crick-8' },
    { id: 'crick-9', key: '.', label: 'writing', sampleKey: 'crick-9' },
    { id: 'crick-10', key: '/', label: 'onwards, soldiers!', sampleKey: 'crick-10' },
    { id: 'crick-11', key: ';', label: 'hmm?', sampleKey: 'crick-11' },
    { id: 'crick-12', key: "'", label: 'omg', sampleKey: 'crick-12' },
    { break: true },
    // Third row: the same plain chirp, pitch-shifted to 7 different notes
    // (re-mi-fa-sol-la-ti-do', an ascending major-scale run) via a simple
    // playback-rate change (asetrate/aresample) — real rendered files, not
    // a live pitch-shift, so they cost nothing extra at play time.
    // Testing on chirp-pitch-1 only for now: sample itself is a real
    // pitch-preserving time-stretch (~3.4x longer than the plain chirp,
    // atempo not asetrate, so it doesn't drop in pitch), same "cartoonified,
    // one cohesive clip" idea as sad crick — not two separate hits like the
    // earlier holdFollowUp attempt. Pad isn't oneShot, so the existing
    // hold/release behavior (same as naobo-soft/rattle) does the rest: hold
    // to let it play out, release early to cut it short.
    { id: 'chirp-pitch-1', key: '1', label: 'chirp (re)', sampleKey: 'chirp-pitch-1-extended' },
    { id: 'chirp-pitch-2', key: '2', label: 'chirp (mi)', sampleKey: 'chirp-pitch-2' },
    { id: 'chirp-pitch-3', key: '3', label: 'chirp (fa)', sampleKey: 'chirp-pitch-3' },
    { id: 'chirp-pitch-4', key: '4', label: 'chirp (sol)', sampleKey: 'chirp-pitch-4' },
    { id: 'chirp-pitch-5', key: '5', label: 'chirp (la)', sampleKey: 'chirp-pitch-5' },
    { id: 'chirp-pitch-6', key: '6', label: 'chirp (ti)', sampleKey: 'chirp-pitch-6' },
    { id: 'chirp-pitch-7', key: '7', label: "chirp (do')", sampleKey: 'chirp-pitch-7' },
  ];

  createPadInstrument({
    id: 'cricket',
    cardEl: document.getElementById('card-cricket'),
    pads,
    sampleLoader,
    broadcast: true,
  });
})();
