#!/usr/bin/env node
/**
 * Morspresso CLI — morse-tool
 * 
 * Usage:
 *   morse-tool encode "HELLO WORLD"
 *   morse-tool decode ".... . .-.. .-.. --- / .-- --- .-. .-.. -.."
 *   morse-tool synth "SOS" --wpm 20 --noise 0.2 --output sos.wav
 *   morse-tool decode --file message.wav --verbose
 *   morse-tool info --text "PARIS"
 */

import { encodeText } from '../engine/encoder';
import { decodeMorse, decodeSamples } from '../engine/decoder';
import { generateMorseBuffer, audioBufferToWav, getTimingInfo } from '../engine/audio-engine';
import { addWhiteNoise } from '../engine/dsp';
import { calculateTiming } from '../engine/timing';
import type { AlphabetId } from '../engine/morse-map';
import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name: string, defaultVal: string = ''): string {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return defaultVal;
}

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

function printHelp() {
  console.log(`
📡 Morspresso CLI — morse-tool v1.0

Commands:
  encode <text>          Encode text to Morse code
  decode <morse>         Decode Morse code to text
  decode --file <path>   Decode a WAV file to text
  synth <text>           Synthesize Morse audio and save as WAV
  info <text>            Show timing information

Options:
  --wpm <number>         Words per minute (default: 20)
  --farnsworth <number>  Farnsworth overall speed (default: same as --wpm)
  --freq <number>        Tone frequency in Hz (default: 700)
  --alphabet <id>        Alphabet: latin, turkish, greek, cyrillic, hebrew,
                         arabic, persian, korean, japanese (default: latin)
  --noise <number>       Add white noise (0-1, default: 0)
  --output <path>        Output file path
  --verbose              Show detailed timing info
  --help                 Show this help

Examples:
  morse-tool encode "SOS"
  morse-tool encode "MERHABA" --alphabet turkish
  morse-tool decode "... --- ..."
  morse-tool synth "HELLO WORLD" --wpm 20 --output hello.wav
  morse-tool synth "SOS" --wpm 20 --noise 0.2
  morse-tool info "PARIS" --wpm 15 --farnsworth 5 --verbose
  `);
}

function cmdEncode() {
  const text = args[1];
  if (!text) {
    console.error('Error: No text provided. Usage: morse-tool encode "YOUR TEXT"');
    process.exit(1);
  }
  const alphabet = (getFlag('alphabet', 'latin') || 'latin') as AlphabetId;
  const morse = encodeText(text, { alphabet });
  console.log(morse);

  if (hasFlag('verbose')) {
    console.log(`\nOriginal: ${text}`);
    console.log(`Alphabet: ${alphabet}`);
    console.log(`Encoded:  ${morse}`);
    console.log(`Characters: ${text.length}`);
    console.log(`Morse symbols: ${morse.replace(/\s/g, '').length}`);
  }
}

function cmdDecode() {
  const filePath = getFlag('file');
  
  if (filePath) {
    // Decode WAV file
    console.log(`Decoding file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      console.error(`Error: File not found: ${filePath}`);
      process.exit(1);
    }

    const buffer = fs.readFileSync(filePath);
    // Parse WAV header to get sample rate and PCM data
    const { samples, sampleRate } = parseWavBuffer(buffer);
    const result = decodeSamples(samples, sampleRate);

    console.log(`\nDecoded text: ${result.text}`);
    console.log(`Morse:        ${result.morse}`);
    console.log(`Estimated:    ${result.estimatedWPM} WPM`);

    if (hasFlag('verbose')) {
      console.log(`\nTiming Map (${result.pulses.length} pulses):`);
      console.log('─'.repeat(60));
      for (const pulse of result.pulses) {
        const cls = pulse.classified || pulse.type;
        const icon = pulse.type === 'signal' ? '▶' : '·';
        console.log(
          `  ${icon} ${cls.padEnd(12)} ${pulse.durationMs.toFixed(1).padStart(8)}ms  @ ${pulse.startMs.toFixed(1).padStart(8)}ms`
        );
      }
    }
  } else {
    // Decode Morse string
    const morse = args[1];
    if (!morse) {
      console.error('Error: No Morse code or --file provided.');
      process.exit(1);
    }
    const text = decodeMorse(morse);
    console.log(text);

    if (hasFlag('verbose')) {
      const alphabet = (getFlag('alphabet', 'latin') || 'latin') as AlphabetId;
      console.log(`\nAlphabet: ${alphabet}`);
      console.log(`Morse:   ${morse}`);
      console.log(`Decoded: ${text}`);
    }
  }
}

function cmdSynth() {
  const text = args[1];
  if (!text) {
    console.error('Error: No text provided. Usage: morse-tool synth "YOUR TEXT"');
    process.exit(1);
  }

  const wpm = parseInt(getFlag('wpm', '20'), 10);
  const farnsworth = parseInt(getFlag('farnsworth', String(wpm)), 10);
  const freq = parseInt(getFlag('freq', '700'), 10);
  const noiseLevel = parseFloat(getFlag('noise', '0'));
  const outputPath = getFlag('output', `morspresso-${text.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}.wav`);
  const alphabet = (getFlag('alphabet', 'latin') || 'latin') as AlphabetId;

  console.log(`Synthesizing: "${text}"`);
  console.log(`Settings: ${wpm} WPM, Farnsworth: ${farnsworth} WPM, Freq: ${freq} Hz, Alphabet: ${alphabet}`);

  const buffer = generateMorseBuffer(text, {
    charSpeed: wpm,
    overallSpeed: farnsworth,
    frequency: freq,
    alphabet,
  });

  let samples = buffer.getChannelData(0);
  if (noiseLevel > 0) {
    console.log(`Adding noise: ${(noiseLevel * 100).toFixed(0)}%`);
    samples = addWhiteNoise(samples, noiseLevel);
  }

  // Write WAV
  const wavData = createWavBuffer(samples, buffer.sampleRate);
  fs.writeFileSync(outputPath, Buffer.from(wavData));
  console.log(`Saved: ${outputPath} (${(wavData.byteLength / 1024).toFixed(1)} KB)`);
}

function cmdInfo() {
  const text = args[1] || 'PARIS';
  const wpm = parseInt(getFlag('wpm', '20'), 10);
  const farnsworth = parseInt(getFlag('farnsworth', String(wpm)), 10);
  const alphabet = (getFlag('alphabet', 'latin') || 'latin') as AlphabetId;

  const timing = calculateTiming({
    charSpeed: wpm,
    overallSpeed: farnsworth,
    frequency: 700,
  });

  const morse = encodeText(text, { alphabet });

  console.log(`Text:    "${text}"`);
  console.log(`Morse:   ${morse}`);
  console.log(`\nTiming (char=${wpm} WPM, overall=${farnsworth} WPM):`);
  console.log(`  Dot:        ${timing.dot.toFixed(1)} ms`);
  console.log(`  Dash:       ${timing.dash.toFixed(1)} ms`);
  console.log(`  Intra-char: ${timing.intraChar.toFixed(1)} ms`);
  console.log(`  Inter-char: ${timing.interChar.toFixed(1)} ms`);
  console.log(`  Word gap:   ${timing.wordGap.toFixed(1)} ms`);

  if (hasFlag('verbose')) {
    const info = getTimingInfo(text, {
      charSpeed: wpm,
      overallSpeed: farnsworth,
      frequency: 700,
      waveform: 'sine',
      pan: 0,
      volume: 0.7,
      attackMs: 5,
      releaseMs: 5,
      alphabet,
    });

    console.log(`\nDetailed Timing Map:`);
    console.log('─'.repeat(60));
    let totalMs = 0;
    for (const entry of info) {
      if (entry.durationMs > 0) {
        console.log(
          `  ${entry.element.padEnd(14)} ${entry.durationMs.toFixed(1).padStart(8)} ms  @ ${entry.startMs.toFixed(1).padStart(8)} ms`
        );
        totalMs = Math.max(totalMs, entry.startMs + entry.durationMs);
      } else if (entry.element.startsWith('[')) {
        console.log(`  ${entry.element}`);
      }
    }
    console.log('─'.repeat(60));
    console.log(`  Total: ${totalMs.toFixed(1)} ms`);
  }
}

// === WAV Helpers (Node.js) ===

function parseWavBuffer(buffer: Buffer): { samples: Float32Array; sampleRate: number } {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // Verify RIFF header
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (riff !== 'RIFF') throw new Error('Not a WAV file');

  const numChannels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);

  // Find data chunk
  let offset = 12;
  while (offset < buffer.length - 8) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset), view.getUint8(offset + 1),
      view.getUint8(offset + 2), view.getUint8(offset + 3)
    );
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'data') {
      const dataOffset = offset + 8;
      const numSamples = chunkSize / (bitsPerSample / 8) / numChannels;
      const samples = new Float32Array(numSamples);

      for (let i = 0; i < numSamples; i++) {
        const sampleOffset = dataOffset + i * numChannels * (bitsPerSample / 8);
        if (bitsPerSample === 16) {
          samples[i] = view.getInt16(sampleOffset, true) / 32768;
        } else if (bitsPerSample === 8) {
          samples[i] = (view.getUint8(sampleOffset) - 128) / 128;
        } else if (bitsPerSample === 32) {
          samples[i] = view.getFloat32(sampleOffset, true);
        }
      }

      return { samples, sampleRate };
    }

    offset += 8 + chunkSize;
  }

  throw new Error('No data chunk found in WAV');
}

function createWavBuffer(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const bitsPerSample = 16;
  const numChannels = 1;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = samples.length * blockAlign;
  const totalSize = 44 + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // RIFF header
  writeStr(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeStr(view, 8, 'WAVE');
  writeStr(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF, true);
    offset += 2;
  }

  return buffer;
}

function writeStr(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// === Main ===
switch (command) {
  case 'encode':
    cmdEncode();
    break;
  case 'decode':
    cmdDecode();
    break;
  case 'synth':
    cmdSynth();
    break;
  case 'info':
    cmdInfo();
    break;
  case '--help':
  case '-h':
  case 'help':
  case undefined:
    printHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}
