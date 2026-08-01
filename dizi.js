// 笛子 dizi — real recorded notes (hypnotriod sample pack): 14 natural-pitch
// notes spanning A5-G7 (diatonic, no sharps — matches the pack as recorded).
// Modeled as a pad instrument like erhu, for the same reason: these are
// fixed real pitches, not a continuous fretted range. Full-length real
// notes (7-10s each, vibrato kicking in late) — createPadInstrument now
// supports hold/release, so holding the key sustains the natural note and
// releasing cuts it cleanly, instead of pre-trimming every note short.
//
// Vibrato toggle: each pad's sampleKey is { default, vibrato } — flip the
// button and every pad switches to a faster-vibrato take of the same note
// instead. The vibrato set is complete in the manifest; these takes are
// dree's own cuts/blends of the source recordings. A missing future variant
// still follows the loader's normal null-on-missing behavior.
(function () {
  const sampleLoader = createSampleLoader('samples/dizi');

  const notes = ['A5', 'B5', 'C6', 'D6', 'E6', 'F6', 'G6', 'A6', 'B6', 'C7', 'D7', 'E7', 'F7', 'G7'];
  const keys = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', 'a', 's'];

  const pads = notes.map((note, i) => ({
    id: note,
    key: keys[i],
    label: note,
    sampleKey: { default: note, vibrato: `${note}-vibrato` },
  }));
  // force exactly 2 even rows of 7 (matches the "always 2 rows, filled"
  // layout preference) rather than leaving the row count to however many
  // 80px pads happen to fit at whatever width the card renders at.
  pads.splice(7, 0, { break: true });

  const dizi = createPadInstrument({
    id: 'dizi',
    cardEl: document.getElementById('card-dizi'),
    pads,
    sampleLoader,
    broadcast: true,
  });

  const toggleBtn = document.querySelector('#card-dizi .vibrato-toggle');
  toggleBtn?.addEventListener('click', () => {
    const on = dizi.getVariant() === 'default';
    dizi.setVariant(on ? 'vibrato' : 'default');
    toggleBtn.classList.toggle('active', on);
    toggleBtn.textContent = `vibrato: ${on ? 'on' : 'off'}`;
  });
})();
