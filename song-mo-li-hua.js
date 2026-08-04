// 茉莉花 "Mo Li Hua" (Jasmine Flower) — the opening hook only (the lyric
// line "好一朵美丽的茉莉花" sung twice, as it actually is in the real song),
// not the full multi-verse piece.
//
// Melody provenance, stated plainly: this is drafted from memory of the
// standard Jiangsu version (the one everyone actually knows — used in
// Puccini's Turandot, the 2008 Olympics, etc.), not pitch-tracked against a
// specific recording or checked against a specific published score this
// session, unlike song-spring-river.js's arrangement. High confidence on
// the melodic shape (it's about as standardized a tune as exists), lower
// confidence than usual for this project on exact note-for-note precision
// — flagged rather than presented as verified. Scoped to just the
// instantly-recognizable opening hook specifically to keep the
// higher-risk part small, same reasoning that kept the guqin arrangements
// in the yueqin project to short excerpts rather than full pieces.
//
// Whole tune is major-pentatonic (do-re-mi-sol-la, gong mode) in do=C —
// chosen deliberately, not arbitrarily: C-pentatonic is {C,D,E,G,A}, all
// natural pitches, so dizi (natural notes only, real physical limitation)
// can double any note of this piece in any octave with no accidental
// conflicts. Erhu (D4-A5) and yueqin (G3-D4/D5-ish) both sit comfortably
// inside the register this melody actually uses.
//
// Arrangement, built with the overlap dree asked for on Spring River
// already in mind (not bolted on after):
//   - erhu carries the tune throughout — chromatic/flexible, and every
//     note here falls inside its real verified range.
//   - dizi doubles the melody's high point and each phrase's held final
//     note an octave (or two) above erhu, AT THE SAME TIME — a real
//     unison-octave overlap, not a hocketed trade.
//   - yueqin's low string holds a sol (G3) pedal under each phrase (the
//     classic pentatonic-folk drone), then breaks from pure pedal duty for
//     one real melodic moment: the final tonic cadence, voiced low on the
//     low string (C4) under erhu's and dizi's own octaves of the same
//     pitch — the whole quartet converges on one C for the ending.
//   - bangu marks each phrase's downbeat with a soft templeblock hit and
//     closes the piece with the gong.
(function () {
  function note(time, duration, play) {
    return { time, duration, play };
  }

  function buildNotes() {
    const yueqin = instrumentAPIs.yueqin;
    const erhu = instrumentAPIs.erhu;
    const dizi = instrumentAPIs.dizi;
    const bangu = instrumentAPIs.bangu;
    if (!yueqin || !erhu || !dizi || !bangu) return null;

    const yqLow = (fret) => () => yueqin.playNote('low', fret, 0);
    const erhuNote = (fret) => () => erhu.playNote('main', fret);
    const diziPad = (padId) => () => dizi.playPad(padId);
    const banguPad = (padId) => () => bangu.playPad(padId);

    return [
      // Phrase 1: 好 一 朵 美 丽 的 茉 莉 花
      note(0.0, null, banguPad('templeblock-1')),
      note(0.0, 2.0, yqLow(0)), // G3 pedal, low string fret 0
      note(0.0, 0.6, erhuNote(5)), // G4 — 好
      note(0.6, 0.3, erhuNote(5)), // G4 — 一
      note(0.9, 0.3, erhuNote(7)), // A4 — 朵
      note(1.2, 0.6, erhuNote(10)), // C5 — 美 (peak)
      note(1.2, 0.5, diziPad('C6')), // octave-up unison echo of the peak
      note(1.8, 0.3, erhuNote(7)), // A4 — 丽
      note(2.1, 0.3, erhuNote(5)), // G4 — 的
      note(2.4, 0.6, erhuNote(2)), // E4 — 茉
      note(3.0, 0.6, erhuNote(5)), // G4 — 莉
      note(3.6, 1.2, erhuNote(5)), // G4, held — 花
      note(3.6, 1.0, diziPad('G6')), // octave-up unison echo of the held note

      // Phrase 2: same lyric line again, cadence resolves to the tonic
      note(5.0, null, banguPad('templeblock-1')),
      note(5.0, 2.0, yqLow(0)), // G3 pedal
      note(5.0, 0.6, erhuNote(5)), // G4
      note(5.6, 0.3, erhuNote(5)), // G4
      note(5.9, 0.3, erhuNote(7)), // A4
      note(6.2, 0.6, erhuNote(10)), // C5 (peak)
      note(6.2, 0.5, diziPad('C6')), // octave-up unison echo
      note(6.8, 0.3, erhuNote(7)), // A4
      note(7.1, 0.3, erhuNote(5)), // G4
      note(7.4, 0.6, erhuNote(2)), // E4
      note(8.0, 0.6, erhuNote(0)), // D4
      // Final cadence — the whole quartet converges on C across three
      // octaves: yueqin low (C4), erhu (C5), dizi (C7).
      note(8.6, 1.2, yqLow(5)), // C4, low string fret 5
      note(8.6, 1.0, erhuNote(10)), // C5
      note(8.6, 1.0, diziPad('C7')), // C7
      note(8.6, null, banguPad('gong')),
    ];
  }

  let activeSong = null;

  function playMoLiHua() {
    const notes = buildNotes();
    if (!notes) return;
    ensureAudio();
    activeSong?.stop();
    setButtonState(true);
    activeSong = playEnsembleSong(notes, {
      onDone: () => {
        activeSong = null;
        setButtonState(false);
      },
    });
  }

  function stopMoLiHua() {
    activeSong?.stop();
    activeSong = null;
    setButtonState(false);
  }

  function setButtonState(playing) {
    const btn = document.getElementById('molihua-song-toggle');
    if (btn) btn.textContent = playing ? '■ stop' : '▶ Mo Li Hua (quartet)';
  }

  document.getElementById('molihua-song-toggle')?.addEventListener('click', () => {
    if (activeSong) stopMoLiHua();
    else playMoLiHua();
  });
})();
