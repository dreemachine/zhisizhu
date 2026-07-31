// Per-instrument volume sliders — generic, no per-instrument code needed.
// Each slider carries which instrument id(s) it controls in
// data-instruments (comma-separated, since erhu is really 3 separate
// registered instruments — main grid, FX board, expressive/vibrato row —
// sharing one card, and one slider should move all three together).
(function () {
  document.querySelectorAll('.volume-slider').forEach((slider) => {
    const ids = slider.dataset.instruments.split(',');
    slider.addEventListener('input', () => {
      ensureAudio();
      const value = Number(slider.value) / 100;
      ids.forEach((id) => setInstrumentVolume(id, value));
    });
  });
})();
