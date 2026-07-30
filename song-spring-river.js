// 春江曲 "Spring Comes to Xiang River" — first ~18s, transcribed (onset +
// pitch-tracking, then cleaned up by hand) and arranged across the
// quartet. Every note plays at its real transcribed pitch, no
// transposition anywhere — instruments were picked per note by whichever
// one can actually reach that pitch:
//   - yueqin: the low recurring anchor phrase (register ~C3-F#3) plus one
//     note (C#5) that falls below even erhu's floor
//   - erhu + dizi split the high melodic line (hocketing/trading it back
//     and forth, not one voice carrying it straight through) — dizi only
//     takes notes that are both natural AND within its real A5-G7 range;
//     everything else (accidentals, or below dizi's floor) goes to erhu,
//     which has full chromatic coverage up there. Two of erhu's notes
//     happen to land exactly on E5 — those use the real vibrato-e5
//     sample (via the erhu-fx board) instead of the plain fretted note.
//   - bangu: a soft hit marking each low-phrase's start, and the gong
//     right at the melody's climactic entry into the high sustain.
// Kept at the recording's actual tempo — this is the "hear what it's
// supposed to sound like" reference, not the (separate, self-paced)
// tutorial mode.
(function () {
  function note(time, duration, play) {
    return { time, duration, play };
  }

  function buildNotes() {
    const yueqin = instrumentAPIs.yueqin;
    const erhu = instrumentAPIs.erhu;
    const erhuFx = instrumentAPIs['erhu-fx'];
    const dizi = instrumentAPIs.dizi;
    const bangu = instrumentAPIs.bangu;
    if (!yueqin || !erhu || !erhuFx || !dizi || !bangu) return null;

    const yqLow = (fret, shift) => () => yueqin.playNote('low', fret, shift);
    const yqHigh = (fret, shift) => () => yueqin.playNote('high', fret, shift);
    const erhuNote = (fret) => () => erhu.playNote('main', fret);
    const erhuVibratoE5 = () => erhuFx.playPad('vibrato-e5');
    const diziPad = (padId) => () => dizi.playPad(padId);
    const banguPad = (padId) => () => bangu.playPad(padId);

    return [
      note(0.20, null, yqLow(5, -1)), // C3
      note(0.20, null, banguPad('templeblock-1')),
      note(0.49, null, yqLow(2, 0)), // A3
      note(1.85, null, yqLow(2, 0)), // A3
      note(1.85, null, banguPad('templeblock-1')),
      note(2.38, null, yqLow(11, -1)), // F#3
      note(2.94, 0.55, erhuVibratoE5), // E5 (vibrato)
      note(3.48, 0.33, erhuNote(3)), // F5
      note(3.81, 0.27, yqHigh(11, 0)), // C#5
      note(4.63, null, yqLow(5, -1)), // C3
      note(4.63, null, banguPad('templeblock-1')),
      note(5.22, 0.52, yqHigh(11, 0)), // C#5
      note(5.75, null, yqLow(11, -1)), // F#3
      note(6.84, null, yqLow(6, -1)), // C#3
      note(6.84, null, banguPad('templeblock-1')),
      note(7.13, null, yqLow(5, -1)), // C3
      note(7.42, 0.59, yqHigh(11, 0)), // C#5
      note(8.01, null, yqLow(11, -1)), // F#3
      note(8.56, 0.68, yqHigh(11, 0)), // C#5, holds through to the climax
      note(9.25, null, banguPad('gong')), // climax entry
      note(9.25, 0.23, erhuNote(13)), // D#6
      note(9.49, 1.59, erhuNote(11)), // C#6, long sustain
      note(11.08, 0.56, diziPad('E6')),
      note(11.64, 0.27, diziPad('D6')),
      note(11.91, 1.45, erhuNote(11)), // C#6, long sustain again
      note(13.36, null, banguPad('templeblock-1')),
      note(13.36, 0.56, diziPad('B5')),
      note(13.92, 0.50, diziPad('A5')),
      note(14.42, 0.36, erhuNote(8)), // A#5
      note(14.78, 0.24, diziPad('B5')),
      note(15.02, 0.63, erhuNote(11)), // C#6
      note(15.65, 0.63, erhuNote(4)), // F#5
      note(16.28, 0.82, erhuVibratoE5), // E5 (vibrato)
      note(17.19, 0.13, erhuNote(3)), // F5
    ];
  }

  let activeSong = null;

  function playSpringRiver() {
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

  function stopSpringRiver() {
    activeSong?.stop();
    activeSong = null;
    setButtonState(false);
  }

  function setButtonState(playing) {
    const btn = document.getElementById('ensemble-song-toggle');
    if (btn) btn.textContent = playing ? '■ stop' : '▶ Spring Comes to Xiang River (quartet)';
  }

  document.getElementById('ensemble-song-toggle')?.addEventListener('click', () => {
    if (activeSong) stopSpringRiver();
    else playSpringRiver();
  });
})();
