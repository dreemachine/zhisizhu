// 春江曲 "Spring Comes to Xiang River" — first ~18s, transcribed (onset +
// pitch-tracking, then cleaned up by hand) and arranged across the
// quartet. Originally every note was set to its real transcribed pitch
// with no transposition — instruments were picked per note by whichever
// one could actually reach that pitch:
//   - yueqin: the low recurring anchor phrase (register ~C3-F#3) plus one
//     note (C#5) that falls below even erhu's floor
//   - erhu + dizi split the high melodic line (hocketing/trading it back
//     and forth, not one voice carrying it straight through) — dizi only
//     takes notes that are both natural AND within its real A5-G7 range;
//     everything else (accidentals, or below dizi's floor) went to erhu.
//     Two of erhu's notes happen to land exactly on E5 — those use the
//     real vibrato-e5 sample (via the erhu expressive board) instead of the
//     plain fretted note, and that pitch is unaffected by the note below.
//   - bangu: a soft hit marking each low-phrase's start, and the gong
//     right at the melody's climactic entry into the high sustain.
//
// 2026-08-02 revamp, using capability that didn't exist/wasn't wired when
// this was first transcribed:
//   - erhu-expressive's E5 vibrato is no longer one fixed take reused
//     three times. Each of the three occurrences is now a different real
//     vibrato flavor from the board, chosen by structural role rather than
//     arbitrarily: the first entrance stays the plain vibrato-e5 (establishes
//     the motif cleanly), the second occurrence (leading into the closing
//     stretch) uses vibrato-intensive-e5 for more weight, and the final
//     held note uses vibrato-delayed-e5 — vibrato blooming in partway
//     through a long sustain reads as more considered than an instant
//     wobble on the very last note of the piece.
//   - dizi now has a complete vibrato take for every note (didn't exist
//     when this was first written — vibrato toggling used to just play
//     nothing). Applied the same rule already established for the yueqin's
//     own song: notes long enough to actually let vibrato register (>=0.7s)
//     get the vibrato variant, quick passing notes stay plain so they
//     don't blur.
//   - bangu gets one added voice at the climax: naobo-crash layered under
//     the existing gong hit, not replacing it — a real climax entry
//     usually isn't one instrument alone. Every other bangu hit (the
//     recurring templeblock-1 phrase-start motif, the ending gong) is left
//     exactly as transcribed/decided before; those are established motifs,
//     not just unused capability waiting to be added.
//
// Follow-up, same day: dree heard the trading section (erhu/dizi strictly
// alternating, never sounding together) and asked for more overlap between
// them — actual shared notes, not just closer handoffs. Checked what's
// physically possible first rather than guessing: erhu's real range tops
// out at A5 (see erhu.js), dizi's real range starts at A5, so true same-
// pitch unison only exists at that one boundary note; below it, dizi has
// no sample at all, above it, erhu can't reach. (NOTE: every erhuNote(fret)
// call ABOVE this point in the file is commented with its *original
// transcription* label, one octave higher than what it actually sounds
// today — see the fixed-mislabeling note above. The three additions below
// are new, not part of that transcription, so they're commented with the
// real current sounding pitch instead, computed directly from erhu's
// base=62/fret formula, not carried over from any old label.)
//
// Three additions (new simultaneous notes layered onto existing dizi
// notes, no existing timestamp/pitch touched):
//   - erhuNote(14) is a real, current E5 — added under dizi's E6 entrance
//     at 11.08 for a genuine octave unison (same pitch class, same moment).
//   - erhuNote(19) is a real, current A5 — added under dizi's A5 (vibrato)
//     at 13.92 for exact same-note-same-octave unison, the closest literal
//     reading of "play the same note together" the two instruments'
//     verified ranges actually allow.
//   - erhuNote(19) (A5) again, added under the ending's dizi A5 (vibrato)
//     alongside the existing erhu-expressive E5 vibrato pad — thickens the
//     final convergence with a real unison, not just a consonant interval.
//
// erhu's grid turned out to be mislabeled by a full octave (see erhu.js —
// real range is D4-A5, not D5-A6), fixed after this arrangement was
// written. The erhuNote(fret) calls below were deliberately left
// unchanged rather than shifted +12 to compensate: every erhu note in
// this piece now sounds one octave lower than the original transcription
// (a few of the intended pitches — D#6/C#6/A#5 — aren't reachable at all
// on erhu's real, verified range), but every interval *between* erhu
// notes is still exactly as transcribed, so the melodic shape is intact,
// just voiced an octave down. Consistent with "this is our rendition, not
// an exact replica."
//
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
    const erhuExpressive = instrumentAPIs['erhu-expressive'];
    const dizi = instrumentAPIs.dizi;
    const bangu = instrumentAPIs.bangu;
    if (!yueqin || !erhu || !erhuExpressive || !dizi || !bangu) return null;

    const yqLow = (fret, shift) => () => yueqin.playNote('low', fret, shift);
    const yqHigh = (fret, shift) => () => yueqin.playNote('high', fret, shift);
    const erhuNote = (fret) => () => erhu.playNote('main', fret);
    const erhuVibratoE5 = () => erhuExpressive.playPad('vibrato-e5');
    const erhuVibratoIntensiveE5 = () => erhuExpressive.playPad('vibrato-intensive-e5');
    const erhuVibratoDelayedE5 = () => erhuExpressive.playPad('vibrato-delayed-e5');
    const diziPad = (padId) => () => dizi.playPad(padId);
    const diziPadVibrato = (padId) => () => dizi.playPad(padId, { variant: 'vibrato' });
    const banguPad = (padId) => () => bangu.playPad(padId);

    return [
      note(0.20, null, yqLow(5, -1)), // C3
      note(0.20, null, banguPad('templeblock-1')),
      note(0.49, null, yqLow(2, 0)), // A3
      note(1.85, null, yqLow(2, 0)), // A3
      note(1.85, null, banguPad('templeblock-1')),
      note(2.38, null, yqLow(11, -1)), // F#3
      note(2.94, 0.75, erhuVibratoE5), // E5 (vibrato)
      note(3.48, 0.5, erhuNote(3)), // F5
      note(3.81, 0.45, yqHigh(11, 0)), // C#5
      note(4.63, null, yqLow(5, -1)), // C3
      note(4.63, null, banguPad('templeblock-1')),
      note(5.22, 0.7, yqHigh(11, 0)), // C#5
      note(5.75, null, yqLow(11, -1)), // F#3
      note(6.84, null, yqLow(6, -1)), // C#3
      note(6.84, null, banguPad('templeblock-1')),
      note(7.13, null, yqLow(5, -1)), // C3
      note(7.42, 0.75, yqHigh(11, 0)), // C#5
      note(8.01, null, yqLow(11, -1)), // F#3
      note(8.56, 0.85, yqHigh(11, 0)), // C#5, holds through to the climax
      note(9.25, null, banguPad('gong')), // climax entry
      note(9.25, null, banguPad('naobo-crash')), // layered under the gong for a fuller arrival
      note(9.25, 0.35, erhuNote(13)), // D#6
      note(9.49, 1.59, erhuNote(11)), // C#6, long sustain
      // Yueqin was completely silent from here to the end before (8.56s to
      // 13.36s+) — exactly the stretch where erhu and dizi trade the melody
      // back and forth, which is why the handoff read as dissonant rather
      // than woven together: no harmonic anchor underneath it. A steady
      // low pedal (alternating C#3/F#3, both already part of the real
      // transcription so they're confirmed-compatible, not a guess) fills
      // that gap and gives the trading a stable floor to sit on.
      note(8.9, null, yqLow(6, -1)), // C#3 (pedal)
      note(10.2, null, yqLow(11, -1)), // F#3 (pedal)
      note(11.08, 0.75, diziPadVibrato('E6')), // long enough to let vibrato register
      note(11.08, 0.6, erhuNote(14)), // real E5 — octave unison under dizi's E6
      note(11.5, null, yqLow(6, -1)), // C#3 (pedal)
      note(11.64, 0.45, diziPad('D6')), // short passing note, stays plain
      note(11.91, 1.45, erhuNote(11)), // C#6, long sustain again
      note(12.8, null, yqLow(11, -1)), // F#3 (pedal)
      note(13.36, null, banguPad('templeblock-1')),
      note(13.36, 0.75, diziPadVibrato('B5')),
      note(13.92, 0.7, diziPadVibrato('A5')),
      note(13.92, 0.6, erhuNote(19)), // real A5 — true unison with dizi's A5
      note(14.1, null, yqLow(6, -1)), // C#3 (pedal)
      note(14.42, 0.55, erhuNote(8)), // A#5
      note(14.78, 0.4, diziPad('B5')), // short passing note, stays plain
      note(15.02, 0.8, erhuNote(11)), // C#6
      note(15.4, null, yqLow(11, -1)), // F#3 (pedal)
      note(15.65, 0.8, erhuNote(4)), // F#5
      note(16.28, 1.0, erhuVibratoIntensiveE5), // E5 (vibrato, more weight leading into the close)
      note(16.7, null, yqLow(6, -1)), // C#3 (pedal)
      note(17.19, 0.5, erhuNote(3)), // F5
      // Ending gesture — the whole quartet converges on one held moment
      // instead of just stopping: erhu reprises the vibrato-e5 motif from
      // earlier (a callback, not a new pitch), dizi answers with its own
      // vibrato take on A5 (also already used earlier in the piece), the
      // yueqin pedal grounds it, and the gong closes it out.
      note(17.75, 2.0, erhuVibratoDelayedE5), // vibrato blooms in partway through the final held note
      note(17.8, 1.8, diziPadVibrato('A5')),
      note(17.8, 1.6, erhuNote(19)), // real A5 — true unison doubling the ending's dizi A5
      note(17.75, null, yqLow(11, -1)), // F#3
      note(17.75, null, banguPad('gong')),
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
