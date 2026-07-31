// --- shared audio ---
// One AudioContext/master bus for every instrument on the page (not one
// per instrument) — they all need to mix into the same output, and a
// shared compressor keeps the whole ensemble from clipping when several
// people are playing different instruments live at once via the relay.
let ctx = null;
let masterBus = null;

function ensureAudio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.5;

    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);
    masterBus = compressor;
  }
  if (ctx.state === 'suspended') ctx.resume();
}

document.body.addEventListener('click', ensureAudio, { once: true });

// --- keyboard focus manager ---
// Four+ instruments can't all have live keyboard mappings at once without
// colliding (yueqin alone already uses almost the whole keyboard). Instead,
// clicking a card focuses it, and only the focused instrument's keydown/
// keyup handlers fire — every instrument can keep a full, independent key
// layout since only one is ever "listening" at a time. Mouse/touch on any
// card always works regardless of focus (that's wired per-instrument via
// pointer events on the frets/pads themselves, untouched by this).
const instruments = {}; // id -> { cardEl, onKeyDown(e), onKeyUp(e), onBlur() }
let focusedId = null;

// Every instrument returned by createFrettedInstrument/createPadInstrument
// registers itself here too — a page-level feature (the ensemble sequencer
// below) needs to reach across all 4 instruments' actual playNote/playPad
// functions, but each instrument's object otherwise lives trapped inside
// its own file's IIFE with no other way out.
const instrumentAPIs = {};

function registerInstrument(id, cardEl, handlers) {
  instruments[id] = { cardEl, ...handlers };
  cardEl.classList.add('instrument-card');
  cardEl.addEventListener('pointerdown', () => setFocus(id));
}

function setFocus(id) {
  if (focusedId === id) return;
  if (focusedId) instruments[focusedId]?.cardEl.classList.remove('focused');
  focusedId = id;
  instruments[id]?.cardEl.classList.add('focused');
}

window.addEventListener('keydown', (e) => {
  if (!focusedId) return;
  instruments[focusedId]?.onKeyDown?.(e);
});

window.addEventListener('keyup', (e) => {
  if (!focusedId) return;
  instruments[focusedId]?.onKeyUp?.(e);
});

// If the window loses focus while a key is held (e.g. alt-tabbing to
// Foundry/Discord mid-session), the browser never fires keyup for it.
// Every instrument gets a chance to force-release whatever it's holding.
window.addEventListener('blur', () => {
  for (const id in instruments) instruments[id]?.onBlur?.();
});

// --- relay (generalized across all instruments) ---
// Broadcasts a tiny JSON event over a WebSocket relay whenever any
// instrument on the page is played, so everyone else with the page open
// (playing a different instrument, or just listening) hears it too — no
// audio streaming, just re-triggering the same synthesis/sample locally on
// every connected client. Payload shape is instrument-specific; core.js
// only adds {senderId, instrument} and routes incoming messages to
// whichever instrument registered a handler for that id.
const CLIENT_ID = Math.random().toString(36).slice(2);
const RELAY_URL_KEY = 'ensembleRelayUrl';
let relaySocket = null;
const relayHandlers = {}; // instrumentId -> function(payload)

function registerRelayHandler(instrumentId, handler) {
  relayHandlers[instrumentId] = handler;
}

function relayStatus(text) {
  const el = document.getElementById('relay-status');
  if (el) el.textContent = `relay: ${text}`;
}

function connectRelay(url) {
  if (!url) return;
  if (relaySocket) relaySocket.close();
  relayStatus('connecting…');
  relaySocket = new WebSocket(url);
  relaySocket.addEventListener('open', () => relayStatus('connected'));
  relaySocket.addEventListener('close', () => relayStatus('disconnected'));
  relaySocket.addEventListener('error', () => relayStatus('error'));
  relaySocket.addEventListener('message', (e) => {
    let msg;
    try {
      msg = JSON.parse(e.data);
    } catch {
      return;
    }
    if (msg.senderId === CLIENT_ID) return;
    ensureAudio();
    relayHandlers[msg.instrument]?.(msg);
  });
  localStorage.setItem(RELAY_URL_KEY, url);
}

function sendRelay(instrument, payload) {
  if (relaySocket && relaySocket.readyState === WebSocket.OPEN) {
    relaySocket.send(JSON.stringify({ senderId: CLIENT_ID, instrument, ...payload }));
  }
  // The looper taps every outgoing note event here regardless of whether a
  // relay connection exists — sendRelay already fires for every note any
  // instrument plays (that's its whole job), so this is the one place that
  // sees the whole ensemble's activity without each instrument needing to
  // know the looper exists.
  looperTap?.(instrument, payload);
}

let looperTap = null;
function setLooperTap(fn) {
  looperTap = fn;
}

// --- ensemble looper ---
// Records the *event stream* (which instrument, which note, press/release)
// rather than raw audio — everything on this page already works by
// dispatching discrete note events (the same ones the relay sends), so a
// looper here just replays that stream on a timer instead of capturing a
// waveform. That means perfectly precise loop timing (no re-encoding, no
// quality loss) and it reuses the exact same playback path a remote peer's
// notes already take (relayHandlers), so no per-instrument code is needed
// to make looping work.
//
// Whole-ensemble, one shared loop, first pass sets the length (classic
// loop-pedal behavior) — later passes overdub into the same cycle rather
// than starting a new one.
function createLooper() {
  let state = 'idle'; // idle | recording | overdubbing | playing
  let events = []; // { time, instrument, payload } — time is seconds into the loop cycle
  let loopDuration = 0;
  let recordStartTime = 0; // performance.now() at the start of the current record/overdub pass
  let loopStartTime = 0; // performance.now() at the start of the currently-playing cycle
  let cycleTimers = [];

  function onNoteEvent(instrument, payload) {
    if (state !== 'recording' && state !== 'overdubbing') return;
    const elapsed = (performance.now() - recordStartTime) / 1000;
    const time = loopDuration > 0 ? elapsed % loopDuration : elapsed;
    events.push({ time, instrument, payload: { ...payload } });
  }
  setLooperTap(onNoteEvent);

  function scheduleCycle() {
    cycleTimers.forEach(clearTimeout);
    cycleTimers = [];
    if (loopDuration <= 0) return;
    loopStartTime = performance.now();
    for (const ev of events) {
      cycleTimers.push(
        setTimeout(() => {
          relayHandlers[ev.instrument]?.({ senderId: 'looper', ...ev.payload });
        }, ev.time * 1000)
      );
    }
    cycleTimers.push(setTimeout(scheduleCycle, loopDuration * 1000));
  }

  function startRecording() {
    ensureAudio();
    if (state === 'playing') {
      state = 'overdubbing';
      recordStartTime = loopStartTime;
    } else if (state === 'idle') {
      events = [];
      loopDuration = 0;
      recordStartTime = performance.now();
      state = 'recording';
    }
  }

  function stopRecording() {
    if (state === 'recording') {
      loopDuration = (performance.now() - recordStartTime) / 1000;
      state = 'playing';
      scheduleCycle();
    } else if (state === 'overdubbing') {
      state = 'playing';
    }
  }

  function stop() {
    state = 'idle';
    cycleTimers.forEach(clearTimeout);
    cycleTimers = [];
  }

  function clear() {
    events = [];
    loopDuration = 0;
    stop();
  }

  // Saved loops live only in this array (in-memory, tab-lifetime only —
  // "clears on refresh" was explicit) rather than localStorage, since dree
  // asked for temporary/session-only saves, not persistent ones.
  const savedLoops = [];

  function saveCurrentLoop() {
    if (loopDuration <= 0) return -1;
    savedLoops.push({
      events: events.map((e) => ({ ...e })),
      loopDuration,
      savedAt: new Date(),
    });
    return savedLoops.length - 1;
  }

  function loadSavedLoop(index) {
    const saved = savedLoops[index];
    if (!saved) return;
    events = saved.events.map((e) => ({ ...e }));
    loopDuration = saved.loopDuration;
    state = 'playing';
    scheduleCycle();
  }

  function deleteSavedLoop(index) {
    savedLoops.splice(index, 1);
  }

  // Real audio export (not just the event data) via MediaRecorder on a
  // MediaStreamDestination fed from the same masterBus everything already
  // plays through — waits for the top of the next cycle first so the
  // captured file is exactly one clean loop repetition, not a mid-cycle
  // cut. Returns a Blob (webm/opus, whatever the browser's MediaRecorder
  // defaults to) the caller turns into a download link.
  async function recordCurrentLoopAsAudio() {
    if (loopDuration <= 0 || !ctx || !masterBus) return null;
    const elapsed = ((performance.now() - loopStartTime) / 1000) % loopDuration;
    const waitMs = Math.max(0, (loopDuration - elapsed) * 1000);
    await new Promise((resolve) => setTimeout(resolve, waitMs));

    const dest = ctx.createMediaStreamDestination();
    masterBus.connect(dest);
    const recorder = new MediaRecorder(dest.stream);
    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    const stopped = new Promise((resolve) => {
      recorder.onstop = resolve;
    });
    recorder.start();
    await new Promise((resolve) => setTimeout(resolve, loopDuration * 1000));
    recorder.stop();
    await stopped;
    masterBus.disconnect(dest);
    return new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
  }

  return {
    startRecording,
    stopRecording,
    stop,
    clear,
    saveCurrentLoop,
    loadSavedLoop,
    deleteSavedLoop,
    getSavedLoops: () => savedLoops,
    recordCurrentLoopAsAudio,
    getState: () => state,
    getLoopDuration: () => loopDuration,
    getEventCount: () => events.length,
  };
}

// --- shared music-theory helpers ---
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function midiToName(midi) {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
}

// --- sample loading (shared pattern) ---
// Every sample-backed instrument uses the same shape: fetch a manifest.json
// (id -> filename), lazily decode each file on first use, cache the decoded
// buffer. Falls back to null (caller decides what to do — usually a
// placeholder synth) if the manifest or a given file doesn't exist.
//
// Sample mp3s were getting served stale from the browser's HTTP cache after
// being swapped in place on disk (no cache-busting, unlike the JS/CSS
// `?v=` query params) — during active sample iteration that's a real
// problem, so every fetch here is cache-busted with one per-page-load
// timestamp (shared across all instruments' loaders, computed once).
const SAMPLE_CACHE_BUST = Date.now();

function createSampleLoader(baseUrl) {
  let manifest = null;
  const cache = {};
  const ready = fetch(`${baseUrl}/manifest.json?t=${SAMPLE_CACHE_BUST}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((m) => {
      manifest = m;
    })
    .catch(() => {
      manifest = null;
    });

  function getBuffer(key) {
    if (key in cache) return cache[key];
    const path = manifest?.[key];
    if (!path) {
      cache[key] = null;
      return null;
    }
    const promise = fetch(`${baseUrl}/${path}?t=${SAMPLE_CACHE_BUST}`)
      .then((r) => r.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .catch(() => null);
    cache[key] = promise;
    return promise;
  }

  return { ready, getBuffer };
}

// --- per-instrument volume ---
// Every instrument gets its own GainNode sitting between its own output and
// the shared masterBus, so each can be balanced independently instead of
// everything summing at a single fixed level. Created lazily per id (ctx
// only exists after the first user gesture triggers ensureAudio, so this
// can't be set up until an instrument actually plays something).
const instrumentGains = {};

function getInstrumentGain(id) {
  if (!instrumentGains[id]) {
    const gain = ctx.createGain();
    gain.gain.value = 1;
    gain.connect(masterBus);
    instrumentGains[id] = gain;
  }
  return instrumentGains[id];
}

function setInstrumentVolume(id, value) {
  getInstrumentGain(id).gain.value = value;
}

// Plays a decoded AudioBuffer, with the same stop-handle shape every synth
// voice returns (releaseSeconds fade-out), so sample playback and
// synthesized playback are interchangeable to callers. playbackRate !== 1
// pitch-shifts (used where a single recorded note needs to cover nearby
// semitones). destination defaults to masterBus directly for any caller
// that doesn't care about per-instrument volume (there shouldn't be any
// left, but this keeps old call shapes working).
function playBuffer(buffer, { velocity = 1, playbackRate = 1, destination = masterBus } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = playbackRate;
  const output = ctx.createGain();
  output.gain.value = velocity;
  src.connect(output);
  output.connect(destination);
  src.start();
  return {
    stop(releaseSeconds = 0.05) {
      const now = ctx.currentTime;
      output.gain.cancelScheduledValues(now);
      output.gain.setValueAtTime(output.gain.value, now);
      output.gain.linearRampToValueAtTime(0, now + releaseSeconds);
      src.stop(now + releaseSeconds + 0.05);
    },
  };
}

// --- fretted-instrument shape (yueqin, dizi) ---
// A grid of rows (courses/strings), each a run of keys mapped to
// consecutive semitones, with an optional octave-shift control. Handles
// rendering, pointer wiring, and default press/release/keyboard wiring —
// but an instrument with extra behavior on top of a plain pluck (yueqin's
// tremolo/songs/tutorial mode) should pass manualWiring:true and build its
// own press/release/keydown logic from the returned primitives instead of
// using the default onKeyDown/pressNote this factory wires up, since that
// default has no hook for "do something different than a quick pluck."
function createFrettedInstrument(config) {
  const {
    id,
    cardEl,
    rows, // [{ id, label, base, keys: [...] }]
    fretCount = rows[0].keys.length,
    octaveRange = null, // { min, max, step } or null to disable octave shift
    tonicMidi = null, // enables pentatonic-style fret highlighting if set
    synth = null, // (freq, opts) => voice — used when no sample covers a note
    sampleLoader = null, // from createSampleLoader(); key = `${rowId}-${fret}`
    broadcast = true,
    manualWiring = false,
  } = config;

  const KEY_TO_NOTE = {};
  for (const row of rows) {
    row.keys.forEach((key, fret) => {
      KEY_TO_NOTE[key] = { string: row.id, fret };
    });
  }

  let octaveShift = 0;

  function isPentatonic(midi) {
    if (tonicMidi == null) return false;
    const diff = ((midi % 12) - (tonicMidi % 12) + 12) % 12;
    return [0, 2, 4, 7, 9].includes(diff);
  }

  function setOctaveShift(shift) {
    if (!octaveRange) return;
    octaveShift = Math.max(octaveRange.min, Math.min(octaveRange.max, shift));
    render();
    const el = cardEl.querySelector('.octave-readout');
    if (el) el.textContent = `octave: ${octaveShift > 0 ? '+' : ''}${octaveShift}`;
  }

  function midiFor(rowId, fret, shift = octaveShift) {
    const row = rows.find((r) => r.id === rowId);
    return row.base + fret + shift * (octaveRange?.step ?? 12);
  }

  function render() {
    for (const row of rows) {
      const container = cardEl.querySelector(`[data-row="${row.id}"]`);
      if (!container) continue;
      container.innerHTML = '';
      for (let fret = 0; fret < fretCount; fret++) {
        // wrapAfter is purely visual (a row with more frets than comfortably
        // fit on one line, e.g. erhu's 20) — splits the DISPLAY into extra
        // lines without touching rowId/fret numbering, so sample keys
        // (`${rowId}-${fret}`) and the keyboard map are completely unaffected.
        if (row.wrapAfter && fret > 0 && fret % row.wrapAfter === 0) {
          const wrapBreak = document.createElement('div');
          wrapBreak.className = 'fret-row-break';
          container.appendChild(wrapBreak);
        }
        const midi = midiFor(row.id, fret);
        const div = document.createElement('div');
        div.className = 'fret' + (isPentatonic(midi) ? ' scale-note' : '');
        div.dataset.fret = String(fret);
        div.innerHTML = `<span class="key">${row.keys[fret]}</span><span class="note">${midiToName(midi)}</span>`;
        const noteId = `ptr:${id}:${row.id}:${fret}`;
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

  // Momentary flash (auto-clears after 150ms) — used for remote plays over
  // the relay, since a relay message is a one-shot "this note played"
  // event with no matching release signal to key off of.
  function lightUpFret(rowId, fret) {
    const el = cardEl.querySelector(`[data-row="${rowId}"] .fret[data-fret="${fret}"]`);
    if (!el) return;
    el.classList.add('lit');
    setTimeout(() => el.classList.remove('lit'), 150);
  }

  // Persistent on/off — used for local presses, so the fret stays lit for
  // exactly as long as it's actually held instead of flickering on a fixed
  // timer regardless of hold duration.
  function setFretLit(rowId, fret, on) {
    const el = cardEl.querySelector(`[data-row="${rowId}"] .fret[data-fret="${fret}"]`);
    if (!el) return;
    el.classList.toggle('lit', on);
  }

  const heldKeys = new Set();
  const heldNoteInfo = {};
  const quickVoices = {};

  async function playNote(rowId, fret, shift = octaveShift, { doBroadcast = true, momentaryLight = true } = {}) {
    if (momentaryLight) lightUpFret(rowId, fret);
    const midi = midiFor(rowId, fret, shift);
    const freq = midiToFreq(midi);

    if (broadcast && doBroadcast) sendRelay(id, { string: rowId, fret, octaveShift: shift });

    if (sampleLoader) {
      await sampleLoader.ready;
      const buf = await sampleLoader.getBuffer(`${rowId}-${fret}`);
      if (buf) return playBuffer(buf, { destination: getInstrumentGain(id) });
    }
    return synth ? synth(freq, { destination: getInstrumentGain(id) }) : undefined;
  }

  function pressNote(noteId, rowId, fret) {
    if (heldKeys.has(noteId)) return;
    heldKeys.add(noteId);
    heldNoteInfo[noteId] = { string: rowId, fret };
    setFretLit(rowId, fret, true);
    ensureAudio();
    playNote(rowId, fret, undefined, { momentaryLight: false }).then((voice) => {
      if (!voice) return;
      if (heldKeys.has(noteId)) quickVoices[noteId] = voice;
      else voice.stop(0.05);
    });
  }

  function releaseKey(noteId) {
    const info = heldNoteInfo[noteId];
    heldKeys.delete(noteId);
    delete heldNoteInfo[noteId];
    if (info) {
      setFretLit(info.string, info.fret, false);
      if (broadcast) sendRelay(id, { string: info.string, fret: info.fret, released: true });
    }
    if (quickVoices[noteId]) {
      quickVoices[noteId].stop();
      delete quickVoices[noteId];
    }
  }

  function onKeyDown(e) {
    if (e.repeat) return;
    const key = e.key.toLowerCase();
    const mapped = KEY_TO_NOTE[key];
    if (!mapped) return;
    e.preventDefault();
    pressNote(key, mapped.string, mapped.fret);
  }

  function onKeyUp(e) {
    const key = e.key.toLowerCase();
    if (KEY_TO_NOTE[key]) e.preventDefault();
    releaseKey(key);
  }

  function onBlur() {
    [...heldKeys].forEach(releaseKey);
  }

  // Remote voices, keyed per-sender-per-note so a later `released` message
  // from that same sender stops the right one — a sustained sample (dizi,
  // erhu) would otherwise just play out its full natural length on every
  // other client regardless of how long the sender actually held it, since
  // remote playback has no local key-up event to react to.
  const remoteVoices = {};

  function playRemote(msg) {
    const key = `${msg.senderId}:${msg.string}:${msg.fret}`;
    if (msg.released) {
      remoteVoices[key]?.stop();
      delete remoteVoices[key];
      return;
    }
    playNote(msg.string, msg.fret, msg.octaveShift, { doBroadcast: false }).then((voice) => {
      if (voice) remoteVoices[key] = voice;
    });
  }

  if (!manualWiring) {
    registerInstrument(id, cardEl, { onKeyDown, onKeyUp, onBlur });
    render();
  }
  // manualWiring instruments render themselves (typically with their own
  // press/release handlers layered on top, e.g. yueqin's tremolo) — calling
  // the default render() here would just get immediately replaced.
  if (broadcast) registerRelayHandler(id, playRemote);

  const api = {
    id, cardEl, rows, fretCount, KEY_TO_NOTE,
    render, setOctaveShift, lightUpFret, setFretLit, midiFor,
    playNote, pressNote, releaseKey,
    onKeyDown, onKeyUp, onBlur,
    heldKeys, heldNoteInfo, quickVoices,
    getOctaveShift: () => octaveShift,
  };
  instrumentAPIs[id] = api;
  return api;
}

// --- pad-instrument shape (erhu, dizi, bangu, cricket board) ---
// A small number of discrete triggers, no pitch/octave concept — each pad
// just plays one specific sound. `pads` is [{ id, key, label, synth?:
// (opts)=>voice, sampleKey?: string }] — a pad can use either a synth
// function or a sample key (looked up via sampleLoader), whichever the
// config provides for that pad. Hold/release works the same way as the
// fretted instrument's press/release (held-note tracking + stopping the
// voice early on release) — a plain drum hit or pluck just ends on its
// own before you'd ever release the key, but a sustained sample (dizi)
// can now be held for its full natural length and cut clean on release
// instead of needing to be pre-trimmed to some fixed short duration.
function createPadInstrument(config) {
  const { id, cardEl, pads, sampleLoader = null, broadcast = true, manualWiring = false, containerSelector = '.pads' } = config;

  const KEY_TO_PAD = {};
  for (const pad of pads) if (!pad.break && !pad.caption) KEY_TO_PAD[pad.key] = pad;

  // { break: true } entries force a new row (a full-width spacer). {
  // caption: '...' } entries label whichever run of real pads came right
  // before them — those pads get wrapped together with the caption into a
  // .pad-group (pads on top, small text below), and the GROUP is what
  // joins the normal flex-wrap flow. That keeps captioned pads sitting
  // inline with their neighbors in the same rows as before, instead of
  // the caption's own width forcing a break after every single group.
  //
  // containerSelector defaults to '.pads', but a card with more than one
  // pad-instrument sharing it (erhu's FX board + its expressive-notes row)
  // needs each one pointed at its OWN container — otherwise both target
  // the same '.pads' div and each render() wipes out the other's content.
  function render() {
    const container = cardEl.querySelector(containerSelector);
    if (!container) return;
    container.innerHTML = '';
    let pending = []; // pad divs since the last caption/break, awaiting a caption or a flush

    function flush(captionText) {
      if (pending.length === 0) return;
      if (captionText) {
        const group = document.createElement('div');
        group.className = 'pad-group';
        const row = document.createElement('div');
        row.className = 'pad-group-row';
        pending.forEach((div) => row.appendChild(div));
        const label = document.createElement('div');
        label.className = 'pad-caption';
        label.textContent = captionText;
        group.appendChild(row);
        group.appendChild(label);
        container.appendChild(group);
      } else {
        pending.forEach((div) => container.appendChild(div));
      }
      pending = [];
    }

    for (const pad of pads) {
      if (pad.break) {
        flush();
        const spacer = document.createElement('div');
        spacer.className = 'pad-row-break';
        container.appendChild(spacer);
        continue;
      }
      if (pad.caption) {
        flush(pad.caption);
        continue;
      }
      const div = document.createElement('div');
      div.className = 'pad';
      div.dataset.pad = pad.id;
      div.innerHTML = `<span class="key">${pad.key}</span><span class="note">${pad.label}</span>`;
      const noteId = `ptr:${id}:${pad.id}`;
      div.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        pressPad(noteId, pad.id);
      });
      div.addEventListener('pointerup', () => releasePad(noteId));
      div.addEventListener('pointerleave', () => releasePad(noteId));
      div.addEventListener('pointercancel', () => releasePad(noteId));
      pending.push(div);
    }
    flush();
  }

  // Momentary flash — remote plays only (see the fretted instrument's
  // identical split above: a relay message has no release signal to key
  // a persistent light off of).
  function lightUpPad(padId) {
    const el = cardEl.querySelector(`.pad[data-pad="${padId}"]`);
    if (!el) return;
    el.classList.add('lit');
    setTimeout(() => el.classList.remove('lit'), 150);
  }

  function setPadLit(padId, on) {
    const el = cardEl.querySelector(`.pad[data-pad="${padId}"]`);
    if (!el) return;
    el.classList.toggle('lit', on);
  }

  const heldKeys = new Set();
  const heldPadInfo = {};
  const quickVoices = {};

  // A pad's sampleKey can be a plain string, or { default: '...', <variant>:
  // '...' } to offer an alternate take selectable via setVariant/toggleVariant
  // (e.g. dizi's normal notes vs. a faster-vibrato take of the same note).
  // Missing/not-yet-recorded variant files just fail silently via the
  // sampleLoader's existing null-on-missing-file behavior — no separate
  // error handling needed here.
  let activeVariant = 'default';

  function resolveSampleKey(pad, variant = activeVariant) {
    if (pad.sampleKey && typeof pad.sampleKey === 'object') {
      return pad.sampleKey[variant] ?? pad.sampleKey.default;
    }
    return pad.sampleKey;
  }

  function setVariant(name) {
    activeVariant = name;
  }

  // variant here is the SENDER's active variant, not this client's own —
  // a note's relay message carries whichever take the sender had toggled
  // (see playRemote below), so what you hear always matches what they
  // played, regardless of your own local vibrato-toggle state.
  async function playPad(padId, { doBroadcast = true, momentaryLight = true, variant } = {}) {
    const pad = pads.find((p) => p.id === padId);
    if (!pad) return;
    if (momentaryLight) lightUpPad(padId);
    if (broadcast && doBroadcast) sendRelay(id, { pad: padId, variant: activeVariant });

    const sampleKey = resolveSampleKey(pad, variant);
    if (sampleKey && sampleLoader) {
      await sampleLoader.ready;
      const buf = await sampleLoader.getBuffer(sampleKey);
      if (buf) return playBuffer(buf, { destination: getInstrumentGain(id) });
    }
    return pad.synth ? pad.synth({ destination: getInstrumentGain(id) }) : undefined;
  }

  function pressPad(noteId, padId) {
    if (heldKeys.has(noteId)) return;
    heldKeys.add(noteId);
    heldPadInfo[noteId] = padId;
    setPadLit(padId, true);
    ensureAudio();
    const pad = pads.find((p) => p.id === padId);
    playPad(padId, { momentaryLight: false }).then((voice) => {
      if (!voice) return;
      // oneShot pads (e.g. a drum stroke that should always finish its
      // natural decay) never get stopped early on release — just don't
      // track them as a quick-releasable voice at all.
      if (pad?.oneShot) return;
      if (heldKeys.has(noteId)) quickVoices[noteId] = voice;
      else voice.stop(0.05);
    });
  }

  function releasePad(noteId) {
    const padId = heldPadInfo[noteId];
    heldKeys.delete(noteId);
    delete heldPadInfo[noteId];
    if (padId) {
      setPadLit(padId, false);
      const pad = pads.find((p) => p.id === padId);
      if (broadcast && !pad?.oneShot) sendRelay(id, { pad: padId, released: true });
    }
    if (quickVoices[noteId]) {
      quickVoices[noteId].stop();
      delete quickVoices[noteId];
    }
  }

  function onKeyDown(e) {
    if (e.repeat) return;
    const pad = KEY_TO_PAD[e.key.toLowerCase()];
    if (!pad) return;
    e.preventDefault();
    pressPad(pad.key, pad.id);
  }

  function onKeyUp(e) {
    const key = e.key.toLowerCase();
    if (KEY_TO_PAD[key]) e.preventDefault();
    releasePad(key);
  }

  function onBlur() {
    [...heldKeys].forEach(releasePad);
  }

  // Same per-sender-per-pad voice tracking as the fretted instrument, for
  // the same reason: a sustained pad (dizi note, gong, naobo, rattle) needs
  // a release message to stop early on remote clients, since there's no
  // local key-up event to react to otherwise.
  const remoteVoices = {};

  function playRemote(msg) {
    const key = `${msg.senderId}:${msg.pad}`;
    if (msg.released) {
      remoteVoices[key]?.stop();
      delete remoteVoices[key];
      return;
    }
    playPad(msg.pad, { doBroadcast: false, variant: msg.variant }).then((voice) => {
      if (voice) remoteVoices[key] = voice;
    });
  }

  if (!manualWiring) {
    registerInstrument(id, cardEl, { onKeyDown, onKeyUp, onBlur });
  }
  if (broadcast) registerRelayHandler(id, playRemote);

  render();

  const api = {
    id, cardEl, pads, render, playPad, triggerPad: (padId) => playPad(padId), lightUpPad, onKeyDown, onKeyUp, onBlur,
    setVariant, getVariant: () => activeVariant,
  };
  instrumentAPIs[id] = api;
  return api;
}

// --- ensemble sequencer ---
// A "song" here is spread across whichever instruments the arrangement
// calls for (not just one), so this doesn't know anything about frets or
// pads specifically — each note just carries a `play()` callback the
// caller builds by closing over whichever instrument.playNote/playPad it
// needs, plus an optional `duration` for sustained notes that need
// cutting off early to match the arrangement's rhythm (a plain pluck or
// drum hit can just omit it and decay on its own, same as yueqin's
// existing single-instrument playSong already does).
function playEnsembleSong(notes, { onDone } = {}) {
  ensureAudio();
  const timers = [];
  const activeVoices = [];

  for (const note of notes) {
    const startTimer = setTimeout(() => {
      const result = note.play();
      if (result && typeof result.then === 'function') {
        result.then((voice) => {
          if (!voice) return;
          if (note.duration) {
            const stopTimer = setTimeout(() => voice.stop(), note.duration * 1000);
            timers.push(stopTimer);
          } else {
            activeVoices.push(voice);
          }
        });
      }
    }, note.time * 1000);
    timers.push(startTimer);
  }

  const totalMs = Math.max(0, ...notes.map((n) => (n.time + (n.duration || 0)) * 1000)) + 600;
  const doneTimer = setTimeout(() => onDone?.(), totalMs);
  timers.push(doneTimer);

  return {
    stop() {
      timers.forEach(clearTimeout);
      activeVoices.forEach((v) => v.stop?.());
    },
  };
}
