/**
 * Morspresso - Advanced Audio Engine
 * Web Audio API playback with Farnsworth timing, custom waveforms,
 * ADSR envelope shaping, stereo panning, and WAV export.
 */

import { encodeText, parseMorseToElements, type MorseElement } from './encoder';
import { calculateTiming, type TimingConfig, type TimingValues } from './timing';
import type { AlphabetId } from './morse-map';

export type WaveformType = 'sine' | 'square' | 'triangle' | 'sawtooth';

export interface AudioEngineOptions {
  charSpeed: number;       // WPM for character speed
  overallSpeed: number;    // WPM for overall speed (Farnsworth)
  frequency: number;       // Hz
  waveform: WaveformType;
  pan: number;             // -1 (left) to 1 (right)
  volume: number;          // 0 to 1
  attackMs: number;        // ADSR attack in ms
  releaseMs: number;       // ADSR release in ms
  alphabet: AlphabetId;    // Which alphabet to encode with
}

export const DEFAULT_OPTIONS: AudioEngineOptions = {
  charSpeed: 20,
  overallSpeed: 15,
  frequency: 700,
  waveform: 'sine',
  pan: 0,
  volume: 0.7,
  attackMs: 5,
  releaseMs: 5,
  alphabet: 'latin',
};

export type PlaybackCallback = (event: PlaybackEvent) => void;
export type PlaybackEvent =
  | { type: 'element'; element: MorseElement; timeMs: number }
  | { type: 'signal-on'; timeMs: number; durationMs: number }
  | { type: 'signal-off'; timeMs: number }
  | { type: 'char'; char: string; timeMs: number }
  | { type: 'done' };

/**
 * Schedule Morse code playback on a Web Audio AudioContext.
 * Returns the total duration and a cancel function.
 */
export function scheduleMorsePlayback(
  ctx: AudioContext,
  text: string,
  options: Partial<AudioEngineOptions> = {},
  callback?: PlaybackCallback
): { duration: number; cancel: () => void; analyser: AnalyserNode } {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const timing = calculateTiming({
    charSpeed: opts.charSpeed,
    overallSpeed: opts.overallSpeed,
    frequency: opts.frequency,
  });
  const morseStr = encodeText(text, { alphabet: opts.alphabet });
  const elements = parseMorseToElements(morseStr);

  // Audio graph: Oscillator -> Gain (envelope) -> Panner -> Analyser -> Destination
  const oscillator = ctx.createOscillator();
  oscillator.type = opts.waveform;
  oscillator.frequency.setValueAtTime(opts.frequency, ctx.currentTime);

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, ctx.currentTime);

  const panNode = ctx.createStereoPanner();
  panNode.pan.setValueAtTime(opts.pan, ctx.currentTime);

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(opts.volume, ctx.currentTime);

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;

  oscillator.connect(gainNode);
  gainNode.connect(panNode);
  panNode.connect(masterGain);
  masterGain.connect(analyser);
  analyser.connect(ctx.destination);

  oscillator.start(ctx.currentTime);

  // Schedule all elements
  let currentTime = ctx.currentTime + 0.05; // Small delay for stability
  const startTime = currentTime;
  const attackS = opts.attackMs / 1000;
  const releaseS = opts.releaseMs / 1000;
  const callbacks: Array<{ time: number; fn: () => void }> = [];

  for (const element of elements) {
    const relTimeMs = (currentTime - startTime) * 1000;

    switch (element.type) {
      case 'dot':
      case 'dash': {
        const durationMs = element.type === 'dot' ? timing.dot : timing.dash;
        const durationS = durationMs / 1000;

        // ADSR envelope: attack -> sustain -> release
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(1, currentTime + attackS);
        gainNode.gain.setValueAtTime(1, currentTime + durationS - releaseS);
        gainNode.gain.linearRampToValueAtTime(0, currentTime + durationS);

        if (callback) {
          callbacks.push({
            time: relTimeMs,
            fn: () => {
              callback({ type: 'signal-on', timeMs: relTimeMs, durationMs });
            },
          });
          callbacks.push({
            time: relTimeMs + durationMs,
            fn: () => callback({ type: 'signal-off', timeMs: relTimeMs + durationMs }),
          });
        }

        currentTime += durationS;
        break;
      }
      case 'intra-char':
        currentTime += timing.intraChar / 1000;
        break;
      case 'inter-char':
        currentTime += timing.interChar / 1000;
        break;
      case 'word-gap':
        currentTime += timing.wordGap / 1000;
        break;
      case 'char-boundary':
        if (callback) {
          callbacks.push({
            time: relTimeMs,
            fn: () => callback({ type: 'char', char: element.char, timeMs: relTimeMs }),
          });
        }
        break;
    }
  }

  const totalDuration = (currentTime - startTime) * 1000;

  // Schedule callbacks via setTimeout
  let cancelled = false;
  const timeouts: ReturnType<typeof setTimeout>[] = [];

  if (callback) {
    const baseTime = performance.now();
    for (const cb of callbacks) {
      const delay = cb.time;
      const t = setTimeout(() => {
        if (!cancelled) cb.fn();
      }, delay);
      timeouts.push(t);
    }
    // Done callback
    const doneTimeout = setTimeout(() => {
      if (!cancelled) callback({ type: 'done' });
    }, totalDuration + 50);
    timeouts.push(doneTimeout);
  }

  const cancel = () => {
    cancelled = true;
    timeouts.forEach(clearTimeout);
    try {
      oscillator.stop();
      oscillator.disconnect();
      gainNode.disconnect();
      panNode.disconnect();
      masterGain.disconnect();
      analyser.disconnect();
    } catch { /* already stopped */ }
  };

  // Auto-stop oscillator
  oscillator.stop(currentTime + 0.1);

  return { duration: totalDuration, cancel, analyser };
}

/**
 * Generate an AudioBuffer for the given text (for export or offline use).
 */
export function generateMorseBuffer(
  text: string,
  options: Partial<AudioEngineOptions> = {},
  sampleRate: number = 44100
): AudioBuffer {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const timing = calculateTiming({
    charSpeed: opts.charSpeed,
    overallSpeed: opts.overallSpeed,
    frequency: opts.frequency,
  });
  const morseStr = encodeText(text, { alphabet: opts.alphabet });
  const elements = parseMorseToElements(morseStr);

  // Calculate total duration
  let totalMs = 0;
  for (const el of elements) {
    switch (el.type) {
      case 'dot': totalMs += timing.dot; break;
      case 'dash': totalMs += timing.dash; break;
      case 'intra-char': totalMs += timing.intraChar; break;
      case 'inter-char': totalMs += timing.interChar; break;
      case 'word-gap': totalMs += timing.wordGap; break;
    }
  }
  totalMs += 100; // padding

  const totalSamples = Math.ceil(sampleRate * totalMs / 1000);
  const buffer = new Float32Array(totalSamples);
  const attackSamples = Math.floor(sampleRate * opts.attackMs / 1000);
  const releaseSamples = Math.floor(sampleRate * opts.releaseMs / 1000);

  let samplePos = 0;
  let phase = 0;
  const phaseIncrement = (2 * Math.PI * opts.frequency) / sampleRate;

  for (const el of elements) {
    let durationMs = 0;
    let isSignal = false;

    switch (el.type) {
      case 'dot': durationMs = timing.dot; isSignal = true; break;
      case 'dash': durationMs = timing.dash; isSignal = true; break;
      case 'intra-char': durationMs = timing.intraChar; break;
      case 'inter-char': durationMs = timing.interChar; break;
      case 'word-gap': durationMs = timing.wordGap; break;
      case 'char-boundary': continue;
    }

    const samples = Math.floor(sampleRate * durationMs / 1000);

    if (isSignal) {
      for (let i = 0; i < samples && samplePos + i < totalSamples; i++) {
        let envelope = 1;
        if (i < attackSamples) {
          envelope = i / attackSamples;
        } else if (i > samples - releaseSamples) {
          envelope = (samples - i) / releaseSamples;
        }

        let sample: number;
        switch (opts.waveform) {
          case 'sine':
            sample = Math.sin(phase);
            break;
          case 'square':
            sample = Math.sin(phase) >= 0 ? 1 : -1;
            break;
          case 'triangle':
            sample = 2 * Math.abs(2 * ((phase / (2 * Math.PI)) % 1) - 1) - 1;
            break;
          case 'sawtooth':
            sample = 2 * ((phase / (2 * Math.PI)) % 1) - 1;
            break;
          default:
            sample = Math.sin(phase);
        }

        buffer[samplePos + i] = sample * envelope * opts.volume;
        phase += phaseIncrement;
      }
    }

    samplePos += samples;
  }

  // Create AudioBuffer
  const offlineCtx = typeof OfflineAudioContext !== 'undefined'
    ? new OfflineAudioContext(1, totalSamples, sampleRate)
    : null;

  if (offlineCtx) {
    const audioBuffer = offlineCtx.createBuffer(1, totalSamples, sampleRate);
    audioBuffer.getChannelData(0).set(buffer);
    return audioBuffer;
  }

  // Fallback: construct manually
  const audioBuffer = {
    length: totalSamples,
    numberOfChannels: 1,
    sampleRate,
    duration: totalMs / 1000,
    getChannelData: (ch: number) => ch === 0 ? buffer : new Float32Array(0),
    copyToChannel: () => {},
    copyFromChannel: () => {},
  } as unknown as AudioBuffer;

  return audioBuffer;
}

/**
 * Export an AudioBuffer to a WAV Blob.
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.getChannelData(0);
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = samples.length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);           // Subchunk1Size
  view.setUint16(20, 1, true);            // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // PCM data
  let offset = headerSize;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Get timing info for the pro-mode console.
 */
export function getTimingInfo(
  text: string,
  options: Partial<AudioEngineOptions> = {}
): Array<{ element: string; durationMs: number; startMs: number }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const timing = calculateTiming({
    charSpeed: opts.charSpeed,
    overallSpeed: opts.overallSpeed,
    frequency: opts.frequency,
  });
  const morseStr = encodeText(text, { alphabet: opts.alphabet });
  const elements = parseMorseToElements(morseStr);
  const info: Array<{ element: string; durationMs: number; startMs: number }> = [];
  let currentMs = 0;

  for (const el of elements) {
    let durationMs = 0;
    let label = '';
    switch (el.type) {
      case 'dot': durationMs = timing.dot; label = '· (dot)'; break;
      case 'dash': durationMs = timing.dash; label = '— (dash)'; break;
      case 'intra-char': durationMs = timing.intraChar; label = 'intra-gap'; break;
      case 'inter-char': durationMs = timing.interChar; label = 'char-gap'; break;
      case 'word-gap': durationMs = timing.wordGap; label = 'word-gap'; break;
      case 'char-boundary': label = `[${el.char}]`; break;
    }
    info.push({ element: label, durationMs, startMs: currentMs });
    currentMs += durationMs;
  }

  return info;
}
