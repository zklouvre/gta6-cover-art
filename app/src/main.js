// Vice Cover Studio: wires the editor. Pick a layout and a grade, fill the panels with
// the samples or your own photos, tune each panel, write the words, export the PNG.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).

import { drawCover, layoutPanels, panelAt } from './cover.js';
import { LAYOUTS, PRESETS, SIZES, TREATMENTS, SAMPLES, defaultState } from './presets.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const sizeLabel = document.getElementById('sizeLabel');

let state = defaultState();
let selected = 0;
let photos = [];
const photoCache = new Map();
const uploads = new Map();
let uploadCounter = 0;

// ---------------------------------------------------------------------------
// History: every committed change is a snapshot, so Undo / Redo walk the build.
// ---------------------------------------------------------------------------

const history = { stack: [JSON.stringify(state)], index: 0 };

function pushHistory() {
  const snap = JSON.stringify(state);
  if (snap === history.stack[history.index]) return;
  history.stack = history.stack.slice(0, history.index + 1);
  history.stack.push(snap);
  if (history.stack.length > 60) history.stack.shift();
  history.index = history.stack.length - 1;
  syncHistoryButtons();
}

function restoreHistory() {
  state = JSON.parse(history.stack[history.index]);
  selected = Math.min(selected, (LAYOUTS[state.layout]?.panels ?? 1) - 1);
  syncHistoryButtons();
  void loadPhotos().then(redraw);
}

function undo() {
  if (history.index === 0) return;
  history.index -= 1;
  restoreHistory();
  setStatus('Undid the last change.');
}

function redo() {
  if (history.index >= history.stack.length - 1) return;
  history.index += 1;
  restoreHistory();
  setStatus('Redid the change.');
}

function syncHistoryButtons() {
  document.getElementById('undo').disabled = history.index === 0;
  document.getElementById('redo').disabled = history.index >= history.stack.length - 1;
}

// ---------------------------------------------------------------------------
// Photos: the samples ship with the app; uploads are read on this machine only.
// ---------------------------------------------------------------------------

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function resolvePhoto(src) {
  if (!src) return null;
  if (photoCache.has(src)) return photoCache.get(src);
  let img = null;
  if (SAMPLES[src]) {
    img = await loadImage(SAMPLES[src].file);
  } else if (uploads.has(src)) {
    img = uploads.get(src).img;
  }
  photoCache.set(src, img);
  return img;
}

async function loadPhotos() {
  photos = await Promise.all(state.slots.map((slot) => resolvePhoto(slot.src)));
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function redraw() {
  const size = SIZES[state.size];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCover(canvas, state, photos, { selected });
  sizeLabel.textContent = `${size.label} · ${size.dims}`;
  fitCanvas();
}

/** Fits the preview canvas inside its frame, keeping its aspect (the editor only). */
function fitCanvas() {
  if (document.body.classList.contains('shot-cover')) return;
  const wrap = document.querySelector('.canvas-wrap');
  if (!wrap) return;
  const availW = wrap.clientWidth;
  const availH = wrap.clientHeight;
  if (!availW || !availH) return;
  const scale = Math.min(availW / canvas.width, availH / canvas.height, 1);
  canvas.style.width = `${Math.floor(canvas.width * scale)}px`;
  canvas.style.height = `${Math.floor(canvas.height * scale)}px`;
}

window.addEventListener('resize', fitCanvas);

function setStatus(text) {
  statusEl.textContent = text;
}

/** A committed change: history, a fresh draw, and the panel cards in step. */
function commit(message) {
  pushHistory();
  redraw();
  buildSlotCards();
  if (message) setStatus(message);
}

// ---------------------------------------------------------------------------
// Controls: layout, grade, size, words
// ---------------------------------------------------------------------------

/** A tiny poster sketch of a layout, for its button. */
function layoutSketch(id) {
  const sketches = {
    'vice-grid': '<rect x="2" y="2" width="13" height="13" rx="1"/><rect x="17" y="2" width="13" height="13" rx="1"/><rect x="2" y="17" width="13" height="13" rx="1"/><rect x="17" y="17" width="13" height="13" rx="1"/>',
    diagonal: '<path d="M2 2h28v10L2 26z"/><path d="M2 26l28-14v14z"/>',
    'hero-strip': '<rect x="2" y="2" width="28" height="16" rx="1"/><rect x="2" y="20" width="8" height="10" rx="1"/><rect x="12" y="20" width="8" height="10" rx="1"/><rect x="22" y="20" width="8" height="10" rx="1"/>',
    single: '<rect x="2" y="2" width="28" height="28" rx="1"/>',
    'nine-grid': '<rect x="2" y="2" width="8" height="8" rx="1"/><rect x="12" y="2" width="8" height="8" rx="1"/><rect x="22" y="2" width="8" height="8" rx="1"/><rect x="2" y="12" width="8" height="8" rx="1"/><rect x="12" y="12" width="8" height="8" rx="1"/><rect x="22" y="12" width="8" height="8" rx="1"/><rect x="2" y="22" width="8" height="8" rx="1"/><rect x="12" y="22" width="8" height="8" rx="1"/><rect x="22" y="22" width="8" height="8" rx="1"/>',
    tilted: '<rect x="4" y="6" width="14" height="18" rx="1" transform="rotate(-8 11 15)"/><rect x="12" y="4" width="14" height="18" rx="1" transform="rotate(4 19 13)"/><rect x="20" y="8" width="14" height="18" rx="1" transform="rotate(10 27 17)"/>',
  };
  return `<svg viewBox="0 0 32 32" aria-hidden="true">${sketches[id] ?? ''}</svg>`;
}

function buildLayoutButtons() {
  const wrap = document.getElementById('layoutButtons');
  wrap.innerHTML = '';
  for (const [id, def] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice';
    b.dataset.layout = id;
    b.setAttribute('aria-pressed', String(state.layout === id));
    b.innerHTML = `${layoutSketch(id)}<span class="choice-name">${def.name}</span><span class="choice-blurb">${def.blurb}</span>`;
    b.addEventListener('click', () => {
      if (state.layout === id) return;
      state.layout = id;
      selected = 0;
      document.querySelectorAll('#layoutButtons .choice').forEach((el) => {
        el.setAttribute('aria-pressed', String(el.dataset.layout === id));
      });
      commit(`Layout: ${def.name} — ${def.panels} photo panel${def.panels > 1 ? 's' : ''}.`);
    });
    wrap.appendChild(b);
  }
}

function buildPresetButtons() {
  const wrap = document.getElementById('presetButtons');
  wrap.innerHTML = '';
  for (const [id, def] of Object.entries(PRESETS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice preset';
    b.dataset.preset = id;
    b.setAttribute('aria-pressed', String(state.preset === id));
    const chip = `linear-gradient(135deg, ${def.title[0]}, ${def.title[1]} 55%, ${def.title[2]})`;
    b.innerHTML = `<span class="swatch" style="background:${chip}"></span><span class="choice-name">${def.name}</span><span class="choice-blurb">${def.tag}</span>`;
    b.addEventListener('click', () => {
      if (state.preset === id) return;
      state.preset = id;
      document.querySelectorAll('#presetButtons .choice').forEach((el) => {
        el.setAttribute('aria-pressed', String(el.dataset.preset === id));
      });
      commit(`Grade: ${def.name}.`);
    });
    wrap.appendChild(b);
  }
}

function buildSizeButtons() {
  const wrap = document.getElementById('sizeButtons');
  wrap.innerHTML = '';
  for (const [id, def] of Object.entries(SIZES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'seg';
    b.dataset.size = id;
    b.setAttribute('aria-pressed', String(state.size === id));
    b.innerHTML = `<span class="seg-name">${def.label}</span><span class="seg-dims">${def.dims}</span>`;
    b.addEventListener('click', () => {
      if (state.size === id) return;
      state.size = id;
      document.querySelectorAll('#sizeButtons .seg').forEach((el) => {
        el.setAttribute('aria-pressed', String(el.dataset.size === id));
      });
      commit(`Export size: ${def.dims}.`);
    });
    wrap.appendChild(b);
  }
}

function bindWordInputs() {
  const title = document.getElementById('title');
  const subtitle = document.getElementById('subtitle');
  const credits = document.getElementById('credits');
  title.value = state.title;
  subtitle.value = state.subtitle;
  credits.value = state.credits;
  let timer = null;
  const onInput = (key, el) => () => {
    state[key] = el.value;
    redraw();
    clearTimeout(timer);
    timer = setTimeout(() => pushHistory(), 700);
  };
  title.addEventListener('input', onInput('title', title));
  subtitle.addEventListener('input', onInput('subtitle', subtitle));
  credits.addEventListener('input', onInput('credits', credits));
}

// ---------------------------------------------------------------------------
// Panel cards: one per photo panel of the current layout.
// ---------------------------------------------------------------------------

const fileInput = document.getElementById('fileInput');
let uploadTarget = 0;
fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  fileInput.value = '';
  if (!file) return;
  try {
    const url = URL.createObjectURL(file);
    const img = await loadImage(url);
    uploadCounter += 1;
    const id = `up${uploadCounter}`;
    uploads.set(id, { img, url, name: file.name });
    state.slots[uploadTarget].src = id;
    commit(`Your photo “${file.name}” is in Panel ${uploadTarget + 1}.`);
  } catch {
    setStatus('That file did not load as a photo — try another image.');
  }
});

function thumbFor(slot) {
  if (!slot.src) return '';
  if (SAMPLES[slot.src]) return SAMPLES[slot.src].file;
  const up = uploads.get(slot.src);
  return up ? up.url : '';
}

function buildSlotCards() {
  const wrap = document.getElementById('slotCards');
  const count = LAYOUTS[state.layout]?.panels ?? 1;
  wrap.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const slot = state.slots[i];
    const card = document.createElement('article');
    card.className = `slot-card${i === selected ? ' selected' : ''}`;
    card.dataset.slot = String(i);
    const thumb = thumbFor(slot);
    card.innerHTML = `
      <button type="button" class="slot-head" data-action="select">
        <span class="slot-thumb">${thumb ? `<img src="${thumb}" alt="">` : '<span class="slot-empty">＋</span>'}</span>
        <span class="slot-title">Panel ${i + 1}</span>
        <span class="slot-src">${slot.src ? (SAMPLES[slot.src]?.name ?? uploads.get(slot.src)?.name ?? 'Upload') : 'Empty'}</span>
      </button>
      <div class="slot-sources">
        <button type="button" data-action="sample" data-photo="pier">Pier</button>
        <button type="button" data-action="sample" data-photo="boulevard">Boulevard</button>
        <button type="button" data-action="upload">Upload…</button>
        <button type="button" data-action="clear">Clear</button>
      </div>
      <label class="slider">Zoom <input type="range" min="1" max="2.5" step="0.01" value="${slot.zoom}" data-field="zoom"><output>${slot.zoom.toFixed(2)}×</output></label>
      <label class="slider">Left–right <input type="range" min="-0.5" max="0.5" step="0.01" value="${slot.ox}" data-field="ox"><output>${Math.round(slot.ox * 100)}</output></label>
      <label class="slider">Up–down <input type="range" min="-0.5" max="0.5" step="0.01" value="${slot.oy}" data-field="oy"><output>${Math.round(slot.oy * 100)}</output></label>
      <label class="treatment">Treatment
        <select data-field="treatment">
          ${Object.entries(TREATMENTS).map(([v, label]) => `<option value="${v}"${slot.treatment === v ? ' selected' : ''}>${label}</option>`).join('')}
        </select>
      </label>`;
    card.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        const action = actionBtn.dataset.action;
        if (action === 'select') {
          selectSlot(i);
        } else if (action === 'sample') {
          state.slots[i].src = actionBtn.dataset.photo;
          commit(`Panel ${i + 1}: ${SAMPLES[actionBtn.dataset.photo].name} photo.`);
        } else if (action === 'upload') {
          uploadTarget = i;
          fileInput.click();
        } else if (action === 'clear') {
          state.slots[i].src = null;
          commit(`Panel ${i + 1} cleared.`);
        }
        return;
      }
      selectSlot(i);
    });
    card.addEventListener('input', (e) => {
      const field = e.target.dataset.field;
      if (!field) return;
      if (field === 'treatment') {
        state.slots[i].treatment = e.target.value;
        commit(`Panel ${i + 1} treatment: ${TREATMENTS[e.target.value]}.`);
        return;
      }
      const value = Number(e.target.value);
      state.slots[i][field] = value;
      const out = e.target.parentElement.querySelector('output');
      if (out) out.textContent = field === 'zoom' ? `${value.toFixed(2)}×` : String(Math.round(value * 100));
      redraw();
    });
    card.addEventListener('change', (e) => {
      const field = e.target.dataset.field;
      if (field && field !== 'treatment') pushHistory();
    });
    wrap.appendChild(card);
  }
}

function selectSlot(i) {
  if (selected === i) return;
  selected = i;
  redraw();
  document.querySelectorAll('.slot-card').forEach((el) => {
    el.classList.toggle('selected', Number(el.dataset.slot) === i);
  });
  const card = document.querySelector(`.slot-card[data-slot="${i}"]`);
  card?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  setStatus(`Panel ${i + 1} selected — tune it below, or click another panel on the cover.`);
}

// ---------------------------------------------------------------------------
// Export, shuffle, reset
// ---------------------------------------------------------------------------

document.getElementById('export').addEventListener('click', () => {
  // Render fresh at the chosen size (the on-screen canvas is always the
  // 1080x1080 preview, so exporting it would give the wrong dimensions
  // for Portrait and Wide). No selection ring on the exported art.
  const size = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, state, photos, { selected: -1 });
  off.toBlob((blob) => {
    if (!blob) {
      setStatus('Export did not produce a file — try again.');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${state.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
    setStatus(`Saved vice-cover-${state.size}.png — ${size.dims}, ready to post.`);
  }, 'image/png');
});

document.getElementById('shuffle').addEventListener('click', () => {
  const layouts = Object.keys(LAYOUTS);
  const presets = Object.keys(PRESETS);
  state.layout = layouts[Math.floor(Math.random() * layouts.length)];
  state.preset = presets[Math.floor(Math.random() * presets.length)];
  const names = ['pier', 'boulevard'];
  for (const slot of state.slots) slot.src = names[Math.floor(Math.random() * names.length)];
  selected = 0;
  document.querySelectorAll('#layoutButtons .choice').forEach((el) => {
    el.setAttribute('aria-pressed', String(el.dataset.layout === state.layout));
  });
  document.querySelectorAll('#presetButtons .choice').forEach((el) => {
    el.setAttribute('aria-pressed', String(el.dataset.preset === state.preset));
  });
  void loadPhotos().then(() => commit('Shuffled: a new layout, grade and photo mix.'));
});

document.getElementById('reset').addEventListener('click', () => {
  state = defaultState();
  selected = 0;
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('credits').value = state.credits;
  buildLayoutButtons();
  buildPresetButtons();
  buildSizeButtons();
  void loadPhotos().then(() => commit('Back to the fresh Vice City cover.'));
});

document.getElementById('undo').addEventListener('click', undo);
document.getElementById('redo').addEventListener('click', redo);
document.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod || e.target.matches('input, select, textarea')) return;
  if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
  } else if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') {
    e.preventDefault();
    redo();
  }
});

// Click a panel on the cover itself to select it.
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const hit = panelAt(state.layout, canvas.width, canvas.height, x, y);
  if (hit >= 0) selectSlot(hit);
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function boot() {
  try {
    await Promise.all([
      document.fonts.load('40px Anton'),
      document.fonts.load('40px "Bebas Neue"'),
      document.fonts.load('40px Pacifico'),
    ]);
    await document.fonts.ready;
  } catch {
    // The system faces still draw; the vendored faces are a bonus.
  }
  buildLayoutButtons();
  buildPresetButtons();
  buildSizeButtons();
  bindWordInputs();
  syncHistoryButtons();

  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    // A cover shot is the art alone: no editor selection ring on it.
    if (shot === 'cover') selected = -1;
    await runShot(shot, new URLSearchParams(location.search), {
      setState(patch) {
        Object.assign(state, patch);
        selected = 0;
      },
      async loadPhoto(name) {
        return resolvePhoto(name);
      },
      async applyPhotos() {
        await loadPhotos();
      },
      redraw() {
        buildLayoutButtons();
        buildPresetButtons();
        buildSizeButtons();
        buildSlotCards();
        // A cover shot is the art alone: no editor selection ring on it.
        // (runShot's setState resets selected to 0, so this must come after.)
        selected = shot === 'cover' ? -1 : 0;
        redraw();
      },
    });
    return;
  }
  await loadPhotos();
  buildSlotCards();
  redraw();
  setStatus('Pick a layout and a grade, then Export PNG.');
}

void boot();
