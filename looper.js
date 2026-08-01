// Ensemble looper UI — the actual recording/playback machinery
// (createLooper) lives in core.js since it needs to tap sendRelay directly;
// this file just wires the buttons to it and keeps the status text/button
// label in sync with whatever state the looper is actually in.
(function () {
  const looper = createLooper();
  const scopeBtn = document.getElementById('looper-scope');
  const toggleBtn = document.getElementById('looper-toggle');
  const saveBtn = document.getElementById('looper-save');
  const downloadBtn = document.getElementById('looper-download');
  const clearBtn = document.getElementById('looper-clear');
  const statusEl = document.getElementById('looper-status');
  const savedListEl = document.getElementById('saved-loops');

  function labelFor(state) {
    if (state === 'idle') return '● Record loop';
    if (state === 'recording') return '■ Stop (sets loop length)';
    if (state === 'playing') return '+ Overdub';
    if (state === 'overdubbing') return '■ Stop overdub';
    return '● Record loop';
  }

  function refresh() {
    const state = looper.getState();
    const scope = looper.getScope();
    scopeBtn.textContent = `loop scope: ${scope}`;
    scopeBtn.classList.toggle('active', scope === 'shared');
    scopeBtn.setAttribute('aria-pressed', String(scope === 'shared'));
    toggleBtn.textContent = labelFor(state);
    toggleBtn.classList.toggle('active', state === 'recording' || state === 'overdubbing');
    const dur = looper.getLoopDuration();
    const count = looper.getEventCount();
    const hasLoop = dur > 0;
    const scopeDescription = scope === 'shared' ? 'shared with relay peers' : 'this browser only';
    saveBtn.disabled = !hasLoop;
    downloadBtn.disabled = !hasLoop;
    if (state === 'idle') {
      statusEl.textContent = `looper: idle — ${scopeDescription}`;
    } else if (state === 'recording') {
      statusEl.textContent = `looper: recording ${scopeDescription}… play anything, hit stop to set the loop length`;
    } else if (state === 'overdubbing') {
      statusEl.textContent = `looper: overdubbing onto a ${dur.toFixed(1)}s loop (${count} events so far)`;
    } else {
      statusEl.textContent = `looper: playing a ${dur.toFixed(1)}s loop (${count} events)`;
    }
  }

  function renderSavedLoops() {
    savedListEl.innerHTML = '';
    const saved = looper.getSavedLoops();
    if (saved.length === 0) return;
    saved.forEach((loop, i) => {
      const wrap = document.createElement('span');
      wrap.className = 'brightness-label';
      const timeStr = loop.savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      wrap.textContent = `#${i + 1} (${loop.loopDuration.toFixed(1)}s, ${loop.scope || 'local'}, ${timeStr}) `;

      const loadBtn = document.createElement('button');
      loadBtn.className = 'song-btn';
      loadBtn.textContent = 'Load';
      loadBtn.addEventListener('click', () => {
        looper.loadSavedLoop(i);
        refresh();
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'song-btn';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => {
        looper.deleteSavedLoop(i);
        renderSavedLoops();
      });

      wrap.appendChild(loadBtn);
      wrap.appendChild(delBtn);
      savedListEl.appendChild(wrap);
    });
  }

  toggleBtn.addEventListener('click', () => {
    const state = looper.getState();
    if (state === 'idle' || state === 'playing') {
      ensureAudio();
      looper.startRecording();
    } else {
      looper.stopRecording();
    }
    refresh();
  });

  scopeBtn.addEventListener('click', () => {
    looper.setScope(looper.getScope() === 'local' ? 'shared' : 'local');
    refresh();
  });

  saveBtn.addEventListener('click', () => {
    looper.saveCurrentLoop();
    renderSavedLoops();
  });

  downloadBtn.addEventListener('click', async () => {
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Recording…';
    const blob = await looper.recordCurrentLoopAsAudio();
    downloadBtn.textContent = 'Download loop';
    refresh();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zhisizhu-loop-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  });

  clearBtn.addEventListener('click', () => {
    looper.clear();
    refresh();
  });

  setInterval(refresh, 250);
  refresh();
})();
