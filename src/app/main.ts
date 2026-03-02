/**
 * Morspresso — Main Application
 * Wires up UI to the Morse code engine.
 */

import {
  encodeText,
  decodeMorse,
  decodeSamples,
  scheduleMorsePlayback,
  generateMorseBuffer,
  audioBufferToWav,
  getTimingInfo,
  getAllMappings,
  ALPHABETS,
  MORSE_TO_CHAR,
  getReverseMorseMap,
  type AlphabetId,
  type AudioEngineOptions,
  type WaveformType,
  type PlaybackEvent,
} from '../engine/index';
import { Visualizer } from './visualizer';
import { MorseKeyDecoder } from './morse-key';

// ============================
// Application State
// ============================
interface AppState {
  audioCtx: AudioContext | null;
  currentPlayback: { cancel: () => void; analyser: AnalyserNode } | null;
  isPlaying: boolean;
  visualizer: Visualizer | null;
  morseKey: MorseKeyDecoder | null;
  options: AudioEngineOptions;
  activeTab: string;
  activeViz: string;
  alphabet: AlphabetId;
}

const state: AppState = {
  audioCtx: null,
  currentPlayback: null,
  isPlaying: false,
  visualizer: null,
  morseKey: null,
  options: {
    charSpeed: 20,
    overallSpeed: 15,
    frequency: 700,
    waveform: 'sine',
    pan: 0,
    volume: 0.7,
    attackMs: 5,
    releaseMs: 5,
    alphabet: 'latin',
  },
  activeTab: 'text',
  activeViz: 'waterfall',
  alphabet: 'latin' as AlphabetId,
};

// ============================
// DOM References
// ============================
const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const $$ = <T extends HTMLElement>(sel: string) => document.querySelectorAll<T>(sel);

// ============================
// Initialization
// ============================
function init() {
  initTabs();
  initControls();
  initSettings();
  initAlphabetSelector();
  initCharMap();
  initKeyboardShortcuts();
  initFileDrop();
  initStraightKey();
  initShareableURL();
  initTheme();
  initServiceWorker();

  // Initialize visualizer
  const canvas = $<HTMLCanvasElement>('#viz-canvas');
  state.visualizer = new Visualizer(canvas);

  logConsole('info', '» Ready. Type a message and press Play.');
}

// ============================
// Tab Switching
// ============================
function initTabs() {
  for (const tab of $$<HTMLButtonElement>('.tab')) {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab!;
      state.activeTab = tabName;

      $$('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      $$('.tab-content').forEach(c => c.classList.remove('active'));
      $(`[data-tab-content="${tabName}"]`).classList.add('active');
    });
  }

  for (const tab of $$<HTMLButtonElement>('.viz-tab')) {
    tab.addEventListener('click', () => {
      const vizName = tab.dataset.viz!;
      state.activeViz = vizName;

      $$('.viz-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      if (state.visualizer) {
        state.visualizer.setMode(vizName as 'waterfall' | 'oscilloscope' | 'spectrum');
      }
    });
  }
}

// ============================
// Main Text Input → Morse 
// ============================
function initControls() {
  const inputText = $<HTMLTextAreaElement>('#input-text');
  const morseOutput = $('#morse-output');
  const inputMorse = $<HTMLTextAreaElement>('#input-morse');
  const textOutput = $('#text-output');

  // Text → Morse (live)
  inputText.addEventListener('input', () => {
    const text = inputText.value;
    if (text.trim()) {
      const morse = encodeText(text, { alphabet: state.alphabet });
      morseOutput.textContent = morse;
    } else {
      morseOutput.textContent = '';
    }
    updateURL(text);
  });

  // Morse → Text (live)
  inputMorse.addEventListener('input', () => {
    const morse = inputMorse.value.trim();
    if (morse) {
      const text = decodeMorse(morse, state.alphabet);
      textOutput.textContent = text;
    } else {
      textOutput.textContent = '';
    }
  });

  // Play button
  $('#btn-play').addEventListener('click', () => {
    if (state.isPlaying) return;
    play();
  });

  // Stop button
  $('#btn-stop').addEventListener('click', stop);

  // Export WAV
  $('#btn-export').addEventListener('click', exportWAV);

  // Share URL
  $('#btn-share').addEventListener('click', shareURL);

  // Clear
  $('#btn-clear').addEventListener('click', () => {
    inputText.value = '';
    morseOutput.textContent = '';
    inputMorse.value = '';
    textOutput.textContent = '';
    stop();
    updateURL('');
  });
}

// ============================
// Audio Playback
// ============================
function ensureAudioContext(): AudioContext {
  if (!state.audioCtx || state.audioCtx.state === 'closed') {
    state.audioCtx = new AudioContext();
  }
  if (state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }
  return state.audioCtx;
}

function play() {
  const text = getCurrentText();
  if (!text.trim()) {
    logConsole('error', '» No text to play.');
    return;
  }

  stop(); // Stop any current playback

  const ctx = ensureAudioContext();
  state.isPlaying = true;

  const btnPlay = $<HTMLButtonElement>('#btn-play');
  const btnStop = $<HTMLButtonElement>('#btn-stop');
  btnPlay.disabled = true;
  btnPlay.classList.add('playing');
  btnStop.disabled = false;

  // Log timing info
  const timingInfo = getTimingInfo(text, state.options);
  logConsole('info', `» Playing: "${text}" [alphabet: ${state.options.alphabet}]`);
  logConsole('timing', `» Timing: char=${state.options.charSpeed}WPM, overall=${state.options.overallSpeed}WPM, freq=${state.options.frequency}Hz`);

  const lamp = $('#signal-lamp');
  const lampText = $('#lamp-text');
  lampText.textContent = ''; // Clear lamp text on new playback
  let currentChar = '';
  const reverseMap = getReverseMorseMap(state.alphabet);

  const { duration, cancel, analyser } = scheduleMorsePlayback(ctx, text, state.options, (event: PlaybackEvent) => {
    switch (event.type) {
      case 'signal-on':
        lamp.classList.add('on');
        logConsole('signal', `  ▶ ON  @ ${event.timeMs.toFixed(1)}ms  dur=${event.durationMs.toFixed(1)}ms`);
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(event.durationMs);
        }
        break;

      case 'signal-off':
        lamp.classList.remove('on');
        break;

      case 'char':
        currentChar = event.char;
        // Lookup display character using current alphabet's reverse map
        const displayChar = reverseMap[event.char] || MORSE_TO_CHAR[event.char] || event.char;
        lampText.textContent = (lampText.textContent || '') + displayChar;
        logConsole('char', `  [${displayChar}] = ${event.char}`);
        break;

      case 'done':
        lamp.classList.remove('on');
        logConsole('info', `» Playback complete (${duration.toFixed(0)}ms)`);
        resetPlaybackUI();
        break;
    }
  });

  state.currentPlayback = { cancel, analyser };

  // Start visualizer
  if (state.visualizer) {
    state.visualizer.start(analyser);
  }

  // Auto-reset after duration
  setTimeout(() => {
    if (state.isPlaying) {
      resetPlaybackUI();
    }
  }, duration + 200);
}

function stop() {
  if (state.currentPlayback) {
    state.currentPlayback.cancel();
    state.currentPlayback = null;
  }
  resetPlaybackUI();
  if (state.visualizer) {
    state.visualizer.stop();
  }
}

function resetPlaybackUI() {
  state.isPlaying = false;
  const btnPlay = $<HTMLButtonElement>('#btn-play');
  const btnStop = $<HTMLButtonElement>('#btn-stop');
  btnPlay.disabled = false;
  btnPlay.classList.remove('playing');
  btnStop.disabled = true;
  $('#signal-lamp').classList.remove('on');
}

function getCurrentText(): string {
  if (state.activeTab === 'text') {
    return $<HTMLTextAreaElement>('#input-text').value;
  }
  if (state.activeTab === 'morse') {
    return decodeMorse($<HTMLTextAreaElement>('#input-morse').value, state.alphabet);
  }
  return '';
}

// ============================
// WAV Export
// ============================
function exportWAV() {
  const text = getCurrentText();
  if (!text.trim()) {
    showToast('No text to export');
    return;
  }

  logConsole('info', `» Generating WAV for: "${text}"`);

  try {
    const buffer = generateMorseBuffer(text, state.options);
    const blob = audioBufferToWav(buffer);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `morspresso-${text.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}.wav`;
    a.click();
    URL.revokeObjectURL(url);

    logConsole('info', `» WAV exported (${(blob.size / 1024).toFixed(1)} KB)`);
    showToast('WAV file downloaded!');
  } catch (e) {
    logConsole('error', `» Export failed: ${e}`);
    showToast('Export failed');
  }
}

// ============================
// Shareable URLs
// ============================
function updateURL(text: string) {
  if (text.trim()) {
    const encoded = encodeURIComponent(text);
    history.replaceState(null, '', `#${encoded}`);
  } else {
    history.replaceState(null, '', window.location.pathname);
  }
}

function shareURL() {
  const text = getCurrentText();
  if (!text.trim()) {
    showToast('No text to share');
    return;
  }
  const url = `${window.location.origin}${window.location.pathname}#${encodeURIComponent(text)}`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('Link copied to clipboard!');
    });
  } else {
    prompt('Share this URL:', url);
  }
}

function initShareableURL() {
  const hash = window.location.hash.slice(1);
  if (hash) {
    const text = decodeURIComponent(hash);
    $<HTMLTextAreaElement>('#input-text').value = text;
    const morse = encodeText(text, { alphabet: state.alphabet });
    $('#morse-output').textContent = morse;
    logConsole('info', `» Loaded from URL: "${text}"`);
  }
}

// ============================
// Settings Controls
// ============================
function initSettings() {
  // Character Speed
  bindRange('char-speed', 'char-speed-val', (v) => {
    state.options.charSpeed = v;
    return `${v} WPM`;
  });

  // Overall Speed
  bindRange('overall-speed', 'overall-speed-val', (v) => {
    state.options.overallSpeed = Math.min(v, state.options.charSpeed);
    const el = $<HTMLInputElement>('#overall-speed');
    if (v > state.options.charSpeed) {
      el.value = String(state.options.charSpeed);
    }
    return `${state.options.overallSpeed} WPM`;
  });

  // Frequency
  bindRange('frequency', 'frequency-val', (v) => {
    state.options.frequency = v;
    return `${v} Hz`;
  });

  // Volume
  bindRange('volume', 'volume-val', (v) => {
    state.options.volume = v / 100;
    return `${v}%`;
  });

  // Pan
  bindRange('pan', 'pan-val', (v) => {
    state.options.pan = v / 100;
    if (v === 0) return 'Center';
    return v < 0 ? `L ${Math.abs(v)}%` : `R ${v}%`;
  });

  // Attack
  bindRange('attack', 'attack-val', (v) => {
    state.options.attackMs = v;
    return `${v}ms`;
  });

  // Release
  bindRange('release', 'release-val', (v) => {
    state.options.releaseMs = v;
    return `${v}ms`;
  });

  // Waveform
  for (const btn of $$<HTMLButtonElement>('.wave-btn')) {
    btn.addEventListener('click', () => {
      $$('.wave-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.options.waveform = btn.dataset.wave as WaveformType;
      logConsole('info', `» Waveform: ${state.options.waveform}`);
    });
  }
}

function bindRange(inputId: string, valueId: string, handler: (val: number) => string) {
  const input = $<HTMLInputElement>(`#${inputId}`);
  const display = $(`#${valueId}`);
  const update = () => {
    const v = parseInt(input.value, 10);
    display.textContent = handler(v);
  };
  input.addEventListener('input', update);
  update(); // Initialize display
}

// ============================
// Alphabet Selector
// ============================
function initAlphabetSelector() {
  const select = $<HTMLSelectElement>('#alphabet-select');
  select.addEventListener('change', () => {
    state.alphabet = select.value as AlphabetId;
    state.options.alphabet = state.alphabet;
    logConsole('info', `» Alphabet changed to: ${ALPHABETS.find(a => a.id === state.alphabet)?.name ?? state.alphabet}`);

    // Sync straight key decoder alphabet
    if (state.morseKey) {
      state.morseKey.setAlphabet(state.alphabet);
    }

    // Re-trigger live encode/decode
    const inputText = $<HTMLTextAreaElement>('#input-text');
    const inputMorse = $<HTMLTextAreaElement>('#input-morse');

    if (state.activeTab === 'text' && inputText.value.trim()) {
      const morse = encodeText(inputText.value, { alphabet: state.alphabet });
      $('#morse-output').textContent = morse;
    } else if (state.activeTab === 'morse' && inputMorse.value.trim()) {
      const text = decodeMorse(inputMorse.value, state.alphabet);
      $('#text-output').textContent = text;
    }

    // Set text direction based on alphabet
    const info = ALPHABETS.find(a => a.id === state.alphabet);
    if (info) {
      inputText.dir = info.direction;
      inputMorse.dir = 'ltr'; // Morse is always LTR
    }
  });
}

// ============================
// Character Map
// ============================
function initCharMap() {
  const overlay = $('#charmap-overlay');
  const content = $('#charmap-content');
  const search = $<HTMLInputElement>('#charmap-search');
  const alphabetFilter = $<HTMLSelectElement>('#charmap-alphabet');

  function render(filter: string = '', alphabetId?: string) {
    content.innerHTML = '';
    const f = filter.toLowerCase();

    // Get mappings for the selected alphabet(s)
    const mappings = getAllMappings(alphabetId as AlphabetId || undefined);

    // Group by the group field
    const groups: Record<string, typeof mappings> = {};
    for (const m of mappings) {
      if (!groups[m.group]) groups[m.group] = [];
      groups[m.group].push(m);
    }

    for (const [groupName, entries] of Object.entries(groups)) {
      const filtered = entries.filter(e =>
        !f || e.char.toLowerCase().includes(f) || e.morse.includes(f)
      );
      if (filtered.length === 0) continue;

      const groupEl = document.createElement('div');
      groupEl.className = 'charmap-group';
      groupEl.innerHTML = `<div class="charmap-group-title">${groupName}</div>`;

      for (const entry of filtered) {
        const el = document.createElement('div');
        el.className = 'charmap-entry';
        el.innerHTML = `
          <span class="charmap-char">${entry.char}</span>
          <span class="charmap-code">${entry.morse}</span>
          <span class="charmap-visual">${entry.display}</span>
        `;
        groupEl.appendChild(el);
      }

      content.appendChild(groupEl);
    }
  }

  render('', 'latin');

  search.addEventListener('input', () => render(search.value, alphabetFilter.value));
  alphabetFilter.addEventListener('change', () => render(search.value, alphabetFilter.value));

  // Open/Close
  $('#btn-charmap').addEventListener('click', () => {
    overlay.classList.add('open');
    search.focus();
  });

  $('#charmap-close').addEventListener('click', () => {
    overlay.classList.remove('open');
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('open');
    }
  });
}

// ============================
// Keyboard Shortcuts
// ============================
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Don't capture when typing in inputs
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'TEXTAREA' || target.tagName === 'INPUT';

    if (e.key === 'Escape') {
      e.preventDefault();
      // Close charmap if open
      if ($('#charmap-overlay').classList.contains('open')) {
        $('#charmap-overlay').classList.remove('open');
        return;
      }
      stop();
      $<HTMLTextAreaElement>('#input-text').value = '';
      $('#morse-output').textContent = '';
    }

    // Enter → Play/Stop (when not in textarea)
    if (e.key === 'Enter' && !isInput) {
      e.preventDefault();
      if (state.isPlaying) {
        stop();
      } else {
        play();
      }
    }

    if (e.ctrlKey && e.key === 'm') {
      e.preventDefault();
      const overlay = $('#charmap-overlay');
      overlay.classList.toggle('open');
    }
  });
}

// ============================
// File Drop / Decode
// ============================
function initFileDrop() {
  const dropZone = $('#file-drop');
  const fileInput = $<HTMLInputElement>('#file-input');
  const resultDiv = $('#decode-result');

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer?.files[0];
    if (file) decodeFile(file);
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) decodeFile(file);
  });

  async function decodeFile(file: File) {
    logConsole('info', `» Decoding file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    resultDiv.classList.add('visible');
    resultDiv.innerHTML = '<span style="color:var(--text-muted)">Decoding...</span>';

    try {
      const arrayBuffer = await file.arrayBuffer();
      const ctx = ensureAudioContext();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const samples = audioBuffer.getChannelData(0);
      const result = decodeSamples(samples, audioBuffer.sampleRate, { alphabet: state.alphabet });

      resultDiv.innerHTML = `
        <div style="color:var(--green);font-size:1.1rem;margin-bottom:8px">${result.text || '(no text detected)'}</div>
        <div style="color:var(--accent)">${result.morse}</div>
        <div style="color:var(--text-muted);margin-top:8px">Estimated: ${result.estimatedWPM} WPM · ${result.pulses.length} pulses detected</div>
      `;

      logConsole('info', `» Decoded: "${result.text}" (${result.estimatedWPM} WPM)`);

      // Log pulse details
      for (const pulse of result.pulses.slice(0, 50)) {
        logConsole('timing', `  ${pulse.type === 'signal' ? '▶' : '·'} ${pulse.classified || pulse.type} ${pulse.durationMs.toFixed(1)}ms @ ${pulse.startMs.toFixed(1)}ms`);
      }
    } catch (e) {
      resultDiv.innerHTML = `<span style="color:var(--red)">Decode failed: ${e}</span>`;
      logConsole('error', `» Decode failed: ${e}`);
    }
  }
}

// ============================
// Straight Key (Interactive Morse KB)
// ============================
function initStraightKey() {
  const keyBtn = $<HTMLButtonElement>('#straight-key');
  state.morseKey = new MorseKeyDecoder(
    (morse) => {
      $('#key-morse').textContent = morse;
    },
    (text) => {
      $('#key-decoded').textContent = text;
    },
    () => {
      // Key-down: play tone + light lamp
      const ctx = ensureAudioContext();
      const osc = ctx.createOscillator();
      osc.type = state.options.waveform;
      osc.frequency.value = state.options.frequency;
      const gain = ctx.createGain();
      gain.gain.value = state.options.volume;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      $('#signal-lamp').classList.add('on');
      if (navigator.vibrate) navigator.vibrate(50);
      return { osc, gain };
    },
    () => {
      // Key-up: stop tone + unlamp
      $('#signal-lamp').classList.remove('on');
    }
  );

  // Mouse events
  keyBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    keyBtn.classList.add('pressed');
    state.morseKey!.keyDown();
  });

  keyBtn.addEventListener('mouseup', () => {
    keyBtn.classList.remove('pressed');
    state.morseKey!.keyUp();
  });

  keyBtn.addEventListener('mouseleave', () => {
    if (keyBtn.classList.contains('pressed')) {
      keyBtn.classList.remove('pressed');
      state.morseKey!.keyUp();
    }
  });

  // Touch events
  keyBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    keyBtn.classList.add('pressed');
    state.morseKey!.keyDown();
  });

  keyBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    keyBtn.classList.remove('pressed');
    state.morseKey!.keyUp();
  });

  // Spacebar for straight key (when not in input)
  document.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'TEXTAREA' || target.tagName === 'INPUT';
    if (e.code === 'Space' && !isInput && !e.repeat) {
      e.preventDefault();
      keyBtn.classList.add('pressed');
      state.morseKey!.keyDown();
    }
  });

  document.addEventListener('keyup', (e) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'TEXTAREA' || target.tagName === 'INPUT';
    if (e.code === 'Space' && !isInput) {
      e.preventDefault();
      keyBtn.classList.remove('pressed');
      state.morseKey!.keyUp();
    }
  });
}

// ============================
// Pro Console
// ============================
function logConsole(type: string, message: string) {
  const consoleEl = $('#console-output');
  const line = document.createElement('div');
  line.className = `console-line console-${type}`;
  line.textContent = message;
  consoleEl.appendChild(line);
  consoleEl.scrollTop = consoleEl.scrollHeight;

  // Limit to 500 lines
  while (consoleEl.childElementCount > 500) {
    consoleEl.removeChild(consoleEl.firstChild!);
  }
}

$('#btn-clear-console')?.addEventListener('click', () => {
  const consoleEl = $('#console-output');
  consoleEl.innerHTML = '<div class="console-line console-info">» Console cleared.</div>';
});

// ============================
// Toast
// ============================
function showToast(message: string) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ============================
// Theme Toggle (Dark / Light)
// ============================
function initTheme() {
  const saved = localStorage.getItem('morspresso-theme');
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = '☀️';
  }

  const btn = $('#btn-theme');
  btn.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (isLight) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('morspresso-theme', 'dark');
      const icon = document.getElementById('theme-icon');
      if (icon) icon.textContent = '🌙';
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('morspresso-theme', 'light');
      const icon = document.getElementById('theme-icon');
      if (icon) icon.textContent = '☀️';
    }
  });
}

// ============================
// Service Worker (PWA)
// ============================
function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // SW registration failed, that's okay
    });
  }
}

// ============================
// Init on DOM ready
// ============================
document.addEventListener('DOMContentLoaded', init);
