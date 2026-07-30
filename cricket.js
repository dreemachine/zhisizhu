// 🦗 cricket speech board — real cricket recordings, cut and "cartoonified"
// per phrase rather than used as raw ambient clips (a plain isolated chirp
// doesn't read as an emotion on its own). Only "sad" has had that treatment
// so far — "chirp" and "chirp-2" are uncartoonified real placeholders
// (WIP — more land/get an actual phrase-treatment as dree cuts more raw
// source clips: rising for question, sharp upward snap for surprise, etc).
(function () {
  const sampleLoader = createSampleLoader('samples/cricket');

  const pads = [
    { id: 'plain-chirp', key: 'z', label: 'chirp', sampleKey: 'plain-chirp' },
    { id: 'sad', key: 'x', label: 'sad crick :(', sampleKey: 'sad' },
    { id: 'chirp-2', key: 'c', label: 'crick?', sampleKey: 'chirp-2' },
  ];

  createPadInstrument({
    id: 'cricket',
    cardEl: document.getElementById('card-cricket'),
    pads,
    sampleLoader,
    broadcast: true,
  });
})();
