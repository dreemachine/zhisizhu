// --- yue-qin: two courses (paired strings), tuned a fifth apart, modern
// chromatic frets. G3 course and D4 course, verified against reference
// tuning. This file ports the original single-instrument app.js onto the
// shared multi-instrument scaffolding in core.js — the synthesis, song
// data, tremolo, and tutorial-mode logic below are unchanged from before;
// only the plumbing (rendering, keyboard focus, relay registration) now
// goes through createFrettedInstrument instead of being the only
// instrument on the page.
(function () {
  const FRET_COUNT = 12; // open string + 11 frets = one octave

  // --- audio: live-adjustable tone controls (for A/B-ing by ear) ---
  let plateMode = 'harmonic';
  let brightness = 0; // 0-1
  let plateAmount = 1; // multiplier on the metallic layers' amount, 0 = off

  const PLATE_RATIOS = {
    harmonic: [
      [2.02, 3.97, 6.05],
      [2.07, 4.06, 6.18],
      [3.5, 5.2, 7.8],
    ],
    inharmonic: [
      [2.05, 5.15, 9.3],
      [2.15, 5.6, 10.1],
      [3.5, 7.4, 12.6],
    ],
  };

  // Karplus-Strong plucked-string synthesis, computed sample-by-sample into
  // a buffer (not a live Web Audio feedback loop) — see project memory for
  // the full rationale. Unchanged from the original single-instrument app.
  function pluck(freq, { velocity = 1, sustain = false, attack = true, destination = masterBus } = {}) {
    const sampleRate = ctx.sampleRate;
    const period = sampleRate / freq;
    const ringLength = Math.max(2, Math.round(period));
    const duration = sustain ? 20 : 3;
    const length = Math.floor(sampleRate * duration);
    const decay = 0.983;

    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    const smoothWeight = 0.5 * (1 - brightness);
    const ring = new Float32Array(ringLength);
    for (let i = 0; i < ringLength; i++) ring[i] = Math.random() * 2 - 1;
    for (let i = 0; i < ringLength; i++) {
      const before = ring[(i - 1 + ringLength) % ringLength];
      ring[i] = (1 - smoothWeight) * ring[i] + smoothWeight * before;
    }

    const reinjectBaseSamples = Math.round(0.09 * sampleRate);
    let nextReinject = reinjectBaseSamples;

    const plate3Seed = Math.sin(freq * 12.9898) * 43758.5453;
    const plate3Detune = (plate3Seed - Math.floor(plate3Seed) - 0.5) * 0.3; // +-15%

    const plateSet = PLATE_RATIOS[plateMode];
    const metallicLayers = [
      { ratios: plateSet[0], amount: 0.02 * plateAmount, decayTau: 0.33, onsetDelay: 0.012 },
      { ratios: plateSet[1], amount: 0.013 * plateAmount, decayTau: 0.45, onsetDelay: 0.03 },
      {
        ratios: plateSet[2].map((r) => r * (1 + plate3Detune)),
        amount: 0.035 * plateAmount,
        decayTau: 0.5,
        onsetDelay: 0.02,
      },
    ];
    const highReduction = Math.max(0.35, Math.min(1, 196 / freq));
    const lowReduction = Math.max(0.4, Math.min(1, freq / 320));
    const metallicScale = highReduction * lowReduction;
    const mainBoost = Math.max(1, Math.min(1.25, freq / 196));
    for (const layer of metallicLayers) {
      layer.phaseInc = layer.ratios.map((r) => (2 * Math.PI * freq * r) / sampleRate);
      layer.phase = layer.ratios.map(() => 0);
      layer.delaySamples = Math.round(layer.onsetDelay * sampleRate);
      layer.amount *= metallicScale;
    }

    let index = 0;
    let prev = ring[ringLength - 1];
    for (let i = 0; i < length; i++) {
      if (sustain && i >= nextReinject) {
        const strength = 0.25 + Math.random() * 0.25;
        for (let j = 0; j < ringLength; j++) {
          ring[j] = ring[j] * (1 - strength) + (Math.random() * 2 - 1) * strength;
        }
        nextReinject = i + Math.round(reinjectBaseSamples * (0.7 + Math.random() * 0.6));
      }

      const current = ring[index];

      let rattle = 0;
      for (const layer of metallicLayers) {
        if (i < layer.delaySamples) continue;
        let metallic = 0;
        for (let m = 0; m < layer.ratios.length; m++) {
          metallic += Math.sin(layer.phase[m]);
          layer.phase[m] += layer.phaseInc[m];
        }
        const env = Math.exp(-((i - layer.delaySamples) / sampleRate) / layer.decayTau);
        rattle += (metallic / layer.ratios.length) * layer.amount * env;
      }

      data[i] = current * mainBoost + rattle;

      const next = decay * 0.5 * (current + prev);
      prev = current;
      ring[index] = next;
      index = (index + 1) % ringLength;
    }

    if (attack) {
      const fadeSamples = Math.min(Math.round(sampleRate * 0.010), length);
      for (let i = 0; i < fadeSamples; i++) data[i] *= Math.cbrt(i / fadeSamples);
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const humanize = 0.93 + Math.random() * 0.14;

    const output = ctx.createGain();
    output.gain.value = velocity * 0.6 * humanize;

    const bodyResonance = ctx.createBiquadFilter();
    bodyResonance.type = 'peaking';
    bodyResonance.frequency.value = freq * 2;
    bodyResonance.Q.value = 4;
    bodyResonance.gain.value = 4;

    src.connect(bodyResonance);
    bodyResonance.connect(output);
    output.connect(destination);
    src.start();

    return {
      stop(releaseSeconds = 0.15) {
        const now = ctx.currentTime;
        output.gain.cancelScheduledValues(now);
        output.gain.setValueAtTime(output.gain.value, now);
        output.gain.linearRampToValueAtTime(0, now + releaseSeconds);
        src.stop(now + releaseSeconds + 0.05);
      },
    };
  }

  const cardEl = document.getElementById('card-yueqin');

  const yueqin = createFrettedInstrument({
    id: 'yueqin',
    cardEl,
    rows: [
      { id: 'high', label: 'D4 string', base: 62, keys: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'] },
      // D#4/E4 moved off '.'/'/' — '/' triggers slash-commands in Discord/Foundry.
      { id: 'low', label: 'G3 string', base: 55, keys: ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '\\', '.', ';', '\''] },
    ],
    fretCount: FRET_COUNT,
    octaveRange: { min: -1, max: 1, step: 12 },
    tonicMidi: 55,
    synth: pluck,
    manualWiring: true, // this instrument has extra press/release logic (tremolo) the factory default doesn't cover
    broadcast: true,
  });

  const STRINGS = {};
  for (const row of yueqin.rows) STRINGS[row.id] = { base: row.base };
  const OCTAVE_STEP = 12;
  const OCTAVE_MIN = -1;
  const OCTAVE_MAX = 1;

  // --- songs ---
  const STRING_INTERVAL = STRINGS.high.base - STRINGS.low.base; // fifth, in semitones

  function offsetToStringFret(offset) {
    if (offset < FRET_COUNT) return { string: 'low', fret: offset };
    return { string: 'high', fret: offset - STRING_INTERVAL };
  }

  function midiToStringFretOctave(midi) {
    for (const shift of [0, 1, -1, 2, -2]) {
      if (shift < OCTAVE_MIN || shift > OCTAVE_MAX) continue;
      for (const rowId of ['low', 'high']) {
        const fret = midi - STRINGS[rowId].base - shift * OCTAVE_STEP;
        if (fret >= 0 && fret < FRET_COUNT) return { string: rowId, fret, octaveShift: shift };
      }
    }
    return null;
  }

  const MOLIHUA_SEQUENCE = [
    [4, 2], [4, 1], [7, 1], [9, 1], [12, 1], [12, 1], [9, 1],
    [7, 2], [7, 1], [9, 1], [7, 2], [null, 2],
    [7, 2], [7, 2], [7, 2], [4, 1], [7, 1],
    [9, 2], [9, 2], [7, 4],
    [4, 2], [2, 1], [4, 1], [7, 2], [4, 1], [2, 1],
    [0, 2], [0, 1], [2, 1], [0, 4],
    [4, 1], [2, 1], [0, 1], [4, 1], [2, 3], [4, 1],
    [7, 2], [9, 1], [12, 1], [7, 4],
    [2, 2], [4, 1], [7, 1], [2, 1], [4, 1], [0, 1], [9, 1],
    [7, 4], [9, 2], [12, 2],
    [2, 3], [4, 1], [0, 1], [2, 1], [0, 1], [9, 1],
    [7, 4], [null, 4],
  ];

  function buildSong(sequence, eighthSeconds) {
    const notes = [];
    let t = 0;
    for (const [offset, eighths] of sequence) {
      if (offset !== null) {
        const { string, fret } = offsetToStringFret(offset);
        notes.push({ string, fret, octaveShift: 0, sustain: false, time: t });
      }
      t += eighths * eighthSeconds;
    }
    return { notes, duration: t };
  }

  const SCALE_SEQUENCE = [
    [60, 0.00, 0.54, false], [62, 0.54, 0.44, false], [64, 0.98, 0.43, false],
    [65, 1.41, 0.37, false], [67, 1.78, 0.39, false], [69, 2.17, 0.37, false],
    [71, 2.54, 0.38, false], [72, 2.92, 0.37, false], [74, 3.29, 0.38, false],
    [76, 3.67, 0.34, false], [77, 4.01, 0.38, false], [79, 4.39, 0.35, false],
    [81, 4.74, 0.38, false], [83, 5.12, 0.47, false],
  ];

  const TUNE_SEQUENCE = [
    [72, 0.00, 5.45, true, true],
    [77, 5.45, 1.09, true],
    [72, 6.54, 1.03, true],
    [74, 7.57, 0.77, true],
    [76, 8.34, 0.78, true],
    [72, 9.12, 0.58, false],
    [69, 9.70, 1.91, true],
    [72, 11.61, 0.26, false],
    [74, 11.87, 0.80, true],
    [77, 12.67, 0.28, false],
    [72, 12.95, 0.26, false],
    [69, 13.21, 0.27, false],
    [72, 13.48, 0.55, false],
    [77, 14.03, 0.83, true],
    [76, 14.86, 1.99, true],
    [81, 16.85, 1.44, true],
  ];

  const SPRING_RIVER_SEQUENCE = [
    [67, 0.00, 1.0, true],
    [67, 1.00, 0.5, false],
    [72, 1.50, 0.5, false],
    [69, 2.00, 1.0, true],
    [69, 3.00, 1.0, true],
    [69, 4.00, 0.5, false],
    [72, 4.50, 0.5, false],
    [74, 5.00, 1.0, true],
    [67, 6.00, 1.0, true],
    [67, 7.00, 1.0, true],
    [64, 8.00, 1.0, true],
    [67, 9.00, 0.5, false],
    [69, 9.50, 0.5, false],
    [67, 10.00, 1.0, true],
    [67, 11.00, 1.0, true],
    [64, 12.00, 0.5, false],
    [71, 12.50, 0.5, false],
    [72, 13.00, 0.5, false],
    [71, 13.50, 0.5, false],
    [71, 14.00, 4.0, true, true],
  ];

  function buildAbsoluteSong(sequence) {
    const notes = sequence.map(([midi, time, duration, sustain, exact = false]) => {
      const loc = midiToStringFretOctave(midi);
      return { ...loc, time, duration, sustain, exact };
    });
    const duration = Math.max(...notes.map((n) => n.time + n.duration));
    return { notes, duration };
  }

  const SONGS = {
    moliHua: { title: 'Mo Li Hua (茉莉花)', ...buildSong(MOLIHUA_SEQUENCE, 0.25) },
    scale: { title: 'Scale (reference recording)', ...buildAbsoluteSong(SCALE_SEQUENCE) },
    tune: { title: 'Tune (reference recording)', ...buildAbsoluteSong(TUNE_SEQUENCE) },
    springRiver: { title: 'Spring River Melody (春江曲)', ...buildAbsoluteSong(SPRING_RIVER_SEQUENCE) },
  };

  let activeSongTimeouts = [];
  let activeSongSustainVoices = [];
  let activeSongId = null;

  function stopSong() {
    activeSongTimeouts.forEach(clearTimeout);
    activeSongTimeouts = [];
    activeSongSustainVoices.forEach((v) => v.stop());
    activeSongSustainVoices = [];
    activeSongId = null;
    cardEl.querySelectorAll('.song-btn').forEach((b) => b.classList.remove('playing'));
    stopTutorial();
    yueqin.setOctaveShift(0);
  }

  // --- tutorial mode ---
  let tutorialSongId = null;
  let tutorialIndex = 0;

  function clearTutorialHint() {
    cardEl.querySelector('.tutorial-hint-bar')?.classList.remove('visible');
  }

  function showTutorialHint() {
    const song = SONGS[tutorialSongId];
    const note = song.notes[tutorialIndex];
    yueqin.setOctaveShift(note.octaveShift);
    const el = cardEl.querySelector(`[data-row="${note.string}"] .fret[data-fret="${note.fret}"]`);
    const bar = cardEl.querySelector('.tutorial-hint-bar');
    if (!el || !bar) return;
    const fretRect = el.getBoundingClientRect();
    const luteRect = cardEl.querySelector('.lute').getBoundingClientRect();
    bar.style.left = `${fretRect.left - luteRect.left + fretRect.width * 0.15}px`;
    bar.style.width = `${fretRect.width * 0.7}px`;
    bar.style.top = `${fretRect.top - luteRect.top - 8}px`;
    bar.classList.add('visible');
  }

  window.addEventListener('resize', () => {
    if (tutorialSongId) showTutorialHint();
  });

  function startTutorial(id) {
    stopSong();
    tutorialSongId = id;
    tutorialIndex = 0;
    cardEl.querySelector(`.song-btn[data-song="${id}"]`)?.classList.add('playing');
    showTutorialHint();
  }

  function stopTutorial() {
    tutorialSongId = null;
    tutorialIndex = 0;
    clearTutorialHint();
    cardEl.querySelectorAll('.song-btn').forEach((b) => b.classList.remove('playing'));
  }

  function playSong(id) {
    ensureAudio();
    stopSong();
    activeSongId = id;
    const song = SONGS[id];
    cardEl.querySelector(`.song-btn[data-song="${id}"]`)?.classList.add('playing');
    for (const note of song.notes) {
      const startTimeout = setTimeout(() => {
        yueqin.setOctaveShift(note.octaveShift);
        if (note.sustain) {
          yueqin.lightUpFret(note.string, note.fret);
          const midi = yueqin.midiFor(note.string, note.fret, note.octaveShift);
          const voice = pluck(midiToFreq(midi), { sustain: true, destination: getInstrumentGain('yueqin') });
          activeSongSustainVoices.push(voice);
          const capMs = TREMOLO_MAX_MS_MIN + Math.random() * (TREMOLO_MAX_MS_MAX - TREMOLO_MAX_MS_MIN);
          const stopMs = note.exact ? note.duration * 1000 : Math.min(note.duration * 1000, capMs);
          const stopTimeout = setTimeout(() => {
            voice.stop();
            activeSongSustainVoices = activeSongSustainVoices.filter((v) => v !== voice);
          }, stopMs);
          activeSongTimeouts.push(stopTimeout);
        } else {
          yueqin.playNote(note.string, note.fret, note.octaveShift);
        }
      }, note.time * 1000);
      activeSongTimeouts.push(startTimeout);
    }
    const endTimeout = setTimeout(() => {
      if (activeSongId === id) stopSong();
    }, song.duration * 1000 + 500);
    activeSongTimeouts.push(endTimeout);
  }

  function renderSongs() {
    const container = cardEl.querySelector('.songs');
    for (const [songId, song] of Object.entries(SONGS)) {
      const btn = document.createElement('button');
      btn.className = 'song-btn';
      btn.dataset.song = songId;
      btn.textContent = `▶ ${song.title}`;
      btn.addEventListener('click', () => (tutorialMode ? startTutorial(songId) : playSong(songId)));
      container.appendChild(btn);
    }
    const stopBtn = document.createElement('button');
    stopBtn.className = 'song-btn stop-btn';
    stopBtn.textContent = '■ stop';
    stopBtn.addEventListener('click', stopSong);
    container.appendChild(stopBtn);
  }

  cardEl.querySelector('.plate-toggle').addEventListener('click', (e) => {
    plateMode = plateMode === 'harmonic' ? 'inharmonic' : 'harmonic';
    e.target.textContent = `plates: ${plateMode}`;
  });

  cardEl.querySelector('.brightness').addEventListener('input', (e) => {
    brightness = Number(e.target.value) / 100;
  });

  cardEl.querySelector('.plate-amount').addEventListener('input', (e) => {
    plateAmount = Number(e.target.value) / 100;
  });

  cardEl.querySelector('.octave-down').addEventListener('click', () => yueqin.setOctaveShift(yueqin.getOctaveShift() - 1));
  cardEl.querySelector('.octave-up').addEventListener('click', () => yueqin.setOctaveShift(yueqin.getOctaveShift() + 1));

  function toggleTremolo() {
    tremoloArmed = !tremoloArmed;
    const btn = cardEl.querySelector('.tremolo-toggle');
    btn.classList.toggle('active', tremoloArmed);
    btn.textContent = `tremolo: ${tremoloArmed ? 'on' : 'off'}`;
    if (tremoloArmed) {
      for (const noteId of heldKeys) {
        const info = heldNoteInfo[noteId];
        if (info) armTremolo(noteId, info.string, info.fret);
      }
    }
  }

  cardEl.querySelector('.tremolo-toggle').addEventListener('click', toggleTremolo);

  let tutorialMode = false;
  cardEl.querySelector('.tutorial-toggle').addEventListener('click', (e) => {
    tutorialMode = !tutorialMode;
    e.target.classList.toggle('active', tutorialMode);
    e.target.textContent = `tutorial: ${tutorialMode ? 'on' : 'off'}`;
    if (!tutorialMode) stopTutorial();
  });

  const relayUrlInput = document.getElementById('relay-url');
  const relayConnectBtn = document.getElementById('relay-connect');
  const savedRelayUrl = localStorage.getItem(RELAY_URL_KEY);
  if (savedRelayUrl && relayUrlInput) relayUrlInput.value = savedRelayUrl;
  relayConnectBtn?.addEventListener('click', () => connectRelay(relayUrlInput.value.trim()));

  // --- input: press/release with tremolo, overriding the factory default ---
  const TREMOLO_MAX_MS_MIN = 1300;
  const TREMOLO_MAX_MS_MAX = 1500;
  const heldKeys = new Set();
  const heldNoteInfo = {};
  const maxDurationTimers = {};
  const sustainVoices = {};
  const quickVoices = {};
  let tremoloArmed = false;

  function armTremolo(noteId, rowId, fret, { attack = false } = {}) {
    if (sustainVoices[noteId]) return;
    const midi = yueqin.midiFor(rowId, fret);
    const voice = pluck(midiToFreq(midi), { sustain: true, attack, destination: getInstrumentGain('yueqin') });
    sustainVoices[noteId] = voice;
    const maxMs = TREMOLO_MAX_MS_MIN + Math.random() * (TREMOLO_MAX_MS_MAX - TREMOLO_MAX_MS_MIN);
    maxDurationTimers[noteId] = setTimeout(() => {
      if (sustainVoices[noteId] !== voice) return;
      voice.stop();
      delete sustainVoices[noteId];
    }, maxMs);
  }

  function pressNote(noteId, rowId, fret) {
    if (heldKeys.has(noteId)) return;
    heldKeys.add(noteId);
    heldNoteInfo[noteId] = { string: rowId, fret };
    ensureAudio();

    if (tutorialSongId) {
      const expected = SONGS[tutorialSongId].notes[tutorialIndex];
      if (expected && expected.string === rowId && expected.fret === fret) {
        tutorialIndex++;
        if (tutorialIndex >= SONGS[tutorialSongId].notes.length) stopTutorial();
        else showTutorialHint();
      }
    }

    yueqin.setFretLit(rowId, fret, true);

    if (tremoloArmed) {
      armTremolo(noteId, rowId, fret, { attack: true });
      return;
    }

    yueqin.playNote(rowId, fret, undefined, { momentaryLight: false }).then((voice) => {
      if (!voice) return;
      if (heldKeys.has(noteId)) quickVoices[noteId] = voice;
      else voice.stop(0.05);
    });
  }

  function releaseKey(noteId) {
    const info = heldNoteInfo[noteId];
    heldKeys.delete(noteId);
    delete heldNoteInfo[noteId];
    if (info) yueqin.setFretLit(info.string, info.fret, false);
    clearTimeout(maxDurationTimers[noteId]);
    delete maxDurationTimers[noteId];
    if (quickVoices[noteId]) {
      quickVoices[noteId].stop();
      delete quickVoices[noteId];
    }
    if (sustainVoices[noteId]) {
      sustainVoices[noteId].stop();
      delete sustainVoices[noteId];
    }
  }

  function onKeyDown(e) {
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      toggleTremolo();
      return;
    }
    if (e.repeat) return;
    const key = e.key.toLowerCase();
    const mapped = yueqin.KEY_TO_NOTE[key];
    if (!mapped) return;
    e.preventDefault();
    pressNote(key, mapped.string, mapped.fret);
  }

  function onKeyUp(e) {
    const key = e.key.toLowerCase();
    if (yueqin.KEY_TO_NOTE[key]) e.preventDefault();
    releaseKey(key);
  }

  function onBlur() {
    [...heldKeys].forEach(releaseKey);
  }

  // Re-wire the rendered frets' pointer events to go through this file's
  // pressNote/releaseKey (tremolo-aware) instead of the factory's default
  // quick-pluck-only pressNote — re-render now that our own handlers exist.
  function renderWithTremolo() {
    for (const row of yueqin.rows) {
      const container = cardEl.querySelector(`[data-row="${row.id}"]`);
      container.innerHTML = '';
      for (let fret = 0; fret < FRET_COUNT; fret++) {
        const midi = yueqin.midiFor(row.id, fret);
        const div = document.createElement('div');
        div.className = 'fret' + (isPentatonicYueqin(midi) ? ' scale-note' : '');
        div.dataset.fret = String(fret);
        div.innerHTML = `<span class="key">${row.keys[fret]}</span><span class="note">${midiToName(midi)}</span>`;
        const noteId = `ptr:yueqin:${row.id}:${fret}`;
        div.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          pressNote(noteId, row.id, fret);
        });
        div.addEventListener('pointerup', () => releaseKey(noteId));
        div.addEventListener('pointerleave', () => releaseKey(noteId));
        div.addEventListener('pointercancel', () => releaseKey(noteId));
        container.appendChild(div);
      }
    }
  }

  function isPentatonicYueqin(midi) {
    const diff = ((midi % 12) - (55 % 12) + 12) % 12;
    return [0, 2, 4, 7, 9].includes(diff);
  }

  yueqin.setOctaveShift = ((original) => (shift) => {
    original(shift);
    renderWithTremolo();
  })(yueqin.setOctaveShift);

  registerInstrument('yueqin', cardEl, { onKeyDown, onKeyUp, onBlur });

  renderWithTremolo();
  renderSongs();
})();
