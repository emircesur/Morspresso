/**
 * Morspresso - Morse Code Decoder
 * Decodes Morse strings and raw audio samples back to text.
 */

import { MORSE_TO_CHAR, MORSE_TO_PROSIGN, getReverseMorseMap, buildMorseTree, type MorseTreeNode, type AlphabetId } from './morse-map';
import { estimateWPM } from './timing';

/**
 * Decode a standard Morse code string to text.
 * Input format: dots/dashes separated by spaces, words by " / ".
 */
export function decodeMorse(morse: string, alphabet: AlphabetId = 'latin'): string {
  const reverseMap = getReverseMorseMap(alphabet);
  const words = morse.trim().split(/\s*\/\s*/);
  return words.map(word => {
    const chars = word.trim().split(/\s+/);
    return chars.map(code => {
      if (!code) return '';
      // Check alphabet-specific map first
      if (reverseMap[code]) return reverseMap[code];
      // Fallback: if non-Latin, also check Latin for numbers/punctuation
      if (alphabet !== 'latin' && MORSE_TO_CHAR[code]) return MORSE_TO_CHAR[code];
      // Check prosigns (Latin mode)
      if (alphabet === 'latin' && MORSE_TO_PROSIGN[code]) return MORSE_TO_PROSIGN[code];
      return '?';
    }).join('');
  }).join(' ');
}

/**
 * Decode using Morse tree (more efficient for streaming).
 */
export function decodeMorseTree(morse: string, alphabet: AlphabetId = 'latin'): string {
  const tree = buildMorseTree(alphabet);
  const words = morse.trim().split(/\s*\/\s*/);
  return words.map(word => {
    const chars = word.trim().split(/\s+/);
    return chars.map(code => {
      if (!code) return '';
      let node: MorseTreeNode | undefined = tree;
      for (const s of code) {
        if (!node) break;
        node = s === '.' ? node.dot : node.dash;
      }
      return node?.char || '?';
    }).join('');
  }).join(' ');
}

/**
 * Result of audio sample decoding
 */
export interface DecodeResult {
  text: string;
  morse: string;
  estimatedWPM: number;
  pulses: PulseInfo[];
}

export interface PulseInfo {
  type: 'signal' | 'silence';
  startMs: number;
  durationMs: number;
  classified?: 'dot' | 'dash' | 'intra-char' | 'inter-char' | 'word-gap';
}

/**
 * Decode raw PCM audio samples into text.
 * This is the core DSP decoding pipeline:
 * 1. Detect signal/silence regions
 * 2. Classify pulses (dot/dash/gaps)
 * 3. Map to characters
 */
export function decodeSamples(
  buffer: Float32Array,
  sampleRate: number,
  options: {
    frequency?: number;
    adaptiveThreshold?: boolean;
    alphabet?: AlphabetId;
  } = {}
): DecodeResult {
  const { adaptiveThreshold = true, alphabet = 'latin' } = options;

  // Step 1: Compute envelope (RMS in windows)
  const windowSize = Math.floor(sampleRate * 0.005); // 5ms windows
  const hopSize = Math.floor(windowSize / 2);
  const envelope: number[] = [];
  const times: number[] = [];

  for (let i = 0; i + windowSize <= buffer.length; i += hopSize) {
    let sum = 0;
    for (let j = i; j < i + windowSize; j++) {
      sum += buffer[j] * buffer[j];
    }
    envelope.push(Math.sqrt(sum / windowSize));
    times.push((i + windowSize / 2) / sampleRate * 1000);
  }

  // Step 2: Adaptive thresholding
  let threshold: number;
  if (adaptiveThreshold && envelope.length > 0) {
    const sorted = [...envelope].sort((a, b) => a - b);
    const noiseFloor = sorted[Math.floor(sorted.length * 0.3)] || 0;
    const signalPeak = sorted[Math.floor(sorted.length * 0.9)] || 0;
    threshold = noiseFloor + (signalPeak - noiseFloor) * 0.3;
  } else {
    threshold = 0.1;
  }

  // Step 3: Detect pulses
  const pulses: PulseInfo[] = [];
  let inSignal = false;
  let pulseStart = 0;

  for (let i = 0; i < envelope.length; i++) {
    const isSignal = envelope[i] > threshold;
    if (isSignal && !inSignal) {
      // Rising edge
      if (pulses.length > 0 || i > 0) {
        // Record silence gap before this signal
        const silenceStart = pulses.length > 0
          ? pulses[pulses.length - 1].startMs + pulses[pulses.length - 1].durationMs
          : 0;
        const silenceDuration = times[i] - silenceStart;
        if (silenceDuration > 1) {
          pulses.push({
            type: 'silence',
            startMs: silenceStart,
            durationMs: silenceDuration,
          });
        }
      }
      inSignal = true;
      pulseStart = times[i];
    } else if (!isSignal && inSignal) {
      // Falling edge
      pulses.push({
        type: 'signal',
        startMs: pulseStart,
        durationMs: times[i] - pulseStart,
      });
      inSignal = false;
    }
  }
  // Handle signal at end
  if (inSignal && times.length > 0) {
    pulses.push({
      type: 'signal',
      startMs: pulseStart,
      durationMs: times[times.length - 1] - pulseStart,
    });
  }

  // Step 4: Classify pulses using "PARIS" calibration
  const signalPulses = pulses.filter(p => p.type === 'signal');
  if (signalPulses.length === 0) {
    return { text: '', morse: '', estimatedWPM: 0, pulses };
  }

  // Find the shortest signal pulse — likely a dot
  const durations = signalPulses.map(p => p.durationMs).sort((a, b) => a - b);
  const estimatedDot = durations[Math.floor(durations.length * 0.25)] || durations[0];
  const dotDashThreshold = estimatedDot * 2; // midpoint between dot (1x) and dash (3x)

  // Classify signals
  for (const pulse of pulses) {
    if (pulse.type === 'signal') {
      pulse.classified = pulse.durationMs < dotDashThreshold ? 'dot' : 'dash';
    }
  }

  // Classify silences (using same dot estimate)
  const silencePulses = pulses.filter(p => p.type === 'silence');
  if (silencePulses.length > 0) {
    const silDurations = silencePulses.map(p => p.durationMs).sort((a, b) => a - b);
    const shortSilence = silDurations[0];
    const intraInterThreshold = shortSilence * 2.5;
    const interWordThreshold = shortSilence * 5;

    for (const pulse of pulses) {
      if (pulse.type === 'silence') {
        if (pulse.durationMs > interWordThreshold) {
          pulse.classified = 'word-gap';
        } else if (pulse.durationMs > intraInterThreshold) {
          pulse.classified = 'inter-char';
        } else {
          pulse.classified = 'intra-char';
        }
      }
    }
  }

  // Step 5: Build Morse string from classified pulses
  let morseStr = '';
  for (const pulse of pulses) {
    switch (pulse.classified) {
      case 'dot': morseStr += '.'; break;
      case 'dash': morseStr += '-'; break;
      case 'intra-char': break; // no separator within character
      case 'inter-char': morseStr += ' '; break;
      case 'word-gap': morseStr += ' / '; break;
    }
  }

  // Step 6: Decode Morse string to text
  const text = decodeMorse(morseStr.trim(), alphabet);
  const wpm = estimateWPM(estimatedDot);

  return {
    text,
    morse: morseStr.trim(),
    estimatedWPM: Math.round(wpm),
    pulses,
  };
}

/**
 * Decode a WAV file (or any audio file) using AudioContext.
 * Browser-only function.
 */
export async function decodeWavFile(file: File | Blob): Promise<DecodeResult> {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new OfflineAudioContext(1, 1, 44100);
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  const samples = audioBuffer.getChannelData(0);
  return decodeSamples(samples, audioBuffer.sampleRate);
}
