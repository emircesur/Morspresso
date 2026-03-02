/**
 * Morspresso — Test Suite
 * Comprehensive tests for the Morse code engine.
 */

import { describe, it, expect } from 'vitest';
import { encodeText, parseMorseToElements } from '../src/engine/encoder';
import { decodeMorse, decodeMorseTree, decodeSamples } from '../src/engine/decoder';
import { CHAR_TO_MORSE, MORSE_TO_CHAR, PROSIGNS, getAllMappings, buildMorseTree,
  TURKISH_TO_MORSE,
  GREEK_TO_MORSE, CYRILLIC_TO_MORSE, HEBREW_TO_MORSE, ARABIC_TO_MORSE,
  KOREAN_TO_MORSE, JAPANESE_TO_MORSE, PERSIAN_TO_MORSE,
  Q_CODES, ABBREVIATIONS,
  getAlphabetMap, getReverseMorseMap, ALPHABETS,
} from '../src/engine/morse-map';
import { calculateTiming, estimateWPM } from '../src/engine/timing';
import { goertzel, detectPitch, adaptiveThreshold, addWhiteNoise } from '../src/engine/dsp';

// ============================
// Morse Map Tests
// ============================
describe('Morse Code Mappings', () => {
  it('should have all 26 letters', () => {
    for (let i = 65; i <= 90; i++) {
      const char = String.fromCharCode(i);
      expect(CHAR_TO_MORSE[char]).toBeDefined();
    }
  });

  it('should have all 10 digits', () => {
    for (let i = 0; i <= 9; i++) {
      expect(CHAR_TO_MORSE[String(i)]).toBeDefined();
    }
  });

  it('should have reverse mapping for all characters', () => {
    for (const [char, morse] of Object.entries(CHAR_TO_MORSE)) {
      if (char === ' ') continue;
      expect(MORSE_TO_CHAR[morse]).toBe(char);
    }
  });

  it('should have unique Morse codes for each character', () => {
    const codes = new Set<string>();
    for (const [char, morse] of Object.entries(CHAR_TO_MORSE)) {
      if (char === ' ') continue;
      expect(codes.has(morse)).toBe(false);
      codes.add(morse);
    }
  });

  it('should have prosigns', () => {
    expect(PROSIGNS['<SOS>']).toBe('...---...');
    expect(PROSIGNS['<SK>']).toBe('...-.-');
    expect(PROSIGNS['<AR>']).toBe('.-.-.');
  });

  it('should build a valid Morse tree', () => {
    const tree = buildMorseTree();
    expect(tree.dot?.char).toBe('E');
    expect(tree.dash?.char).toBe('T');
    expect(tree.dot?.dot?.char).toBe('I');
    expect(tree.dot?.dash?.char).toBe('A');
  });

  it('should return all mappings for reference chart', () => {
    const mappings = getAllMappings();
    expect(mappings.length).toBeGreaterThan(40);
    const sos = mappings.find(m => m.char === 'S');
    expect(sos).toBeDefined();
    expect(sos!.morse).toBe('...');
  });
});

// ============================
// Encoder Tests
// ============================
describe('Encoder', () => {
  it('should encode single letters', () => {
    expect(encodeText('E')).toBe('.');
    expect(encodeText('T')).toBe('-');
    expect(encodeText('A')).toBe('.-');
  });

  it('should encode words', () => {
    expect(encodeText('SOS')).toBe('... --- ...');
    expect(encodeText('HI')).toBe('.... ..');
  });

  it('should encode multiple words with / separator', () => {
    const result = encodeText('HELLO WORLD');
    expect(result).toContain('/');
    expect(result).toBe('.... . .-.. .-.. --- / .-- --- .-. .-.. -..');
  });

  it('should be case-insensitive', () => {
    expect(encodeText('sos')).toBe(encodeText('SOS'));
    expect(encodeText('Hello')).toBe(encodeText('HELLO'));
  });

  it('should encode numbers', () => {
    expect(encodeText('123')).toBe('.---- ..--- ...--');
  });

  it('should encode punctuation', () => {
    expect(encodeText('?')).toBe('..--..');
    expect(encodeText('.')).toBe('.-.-.-');
  });

  it('should handle prosigns', () => {
    expect(encodeText('<SOS>')).toBe('...---...');
    expect(encodeText('<SK>')).toBe('...-.-');
  });

  it('should skip unknown characters', () => {
    expect(encodeText('A~B')).toBe('.- -...');
  });

  it('should parse morse into elements correctly', () => {
    const elements = parseMorseToElements('... ---');
    const types = elements.map(e => e.type);
    expect(types).toContain('dot');
    expect(types).toContain('dash');
    expect(types).toContain('inter-char');
    expect(types).toContain('intra-char');
  });
});

// ============================
// Decoder Tests
// ============================
describe('Decoder', () => {
  it('should decode single characters', () => {
    expect(decodeMorse('.')).toBe('E');
    expect(decodeMorse('-')).toBe('T');
    expect(decodeMorse('.-')).toBe('A');
  });

  it('should decode words', () => {
    expect(decodeMorse('... --- ...')).toBe('SOS');
    expect(decodeMorse('.... ..')).toBe('HI');
  });

  it('should decode multiple words', () => {
    expect(decodeMorse('.... . .-.. .-.. --- / .-- --- .-. .-.. -..')).toBe('HELLO WORLD');
  });

  it('should handle extra whitespace', () => {
    expect(decodeMorse('  ...  ---  ...  ')).toBe('SOS');
  });

  it('should return ? for truly unknown codes', () => {
    expect(decodeMorse('.-.-.-.-.-')).toBe('?');
  });

  it('should decode prosign <HH> (8 dots)', () => {
    expect(decodeMorse('........')).toBe('<HH>');
  });

  it('should decode using tree method', () => {
    expect(decodeMorseTree('... --- ...')).toBe('SOS');
    expect(decodeMorseTree('.... . .-.. .-.. --- / .-- --- .-. .-.. -..')).toBe('HELLO WORLD');
  });

  it('should roundtrip encode→decode', () => {
    const texts = ['SOS', 'HELLO WORLD', 'THE QUICK BROWN FOX', '123 ABC', 'TEST?'];
    for (const text of texts) {
      const encoded = encodeText(text);
      const decoded = decodeMorse(encoded);
      expect(decoded).toBe(text.toUpperCase());
    }
  });
});

// ============================
// Timing Tests
// ============================
describe('Timing', () => {
  it('should calculate standard PARIS timing at 20 WPM', () => {
    const timing = calculateTiming({ charSpeed: 20, overallSpeed: 20, frequency: 700 });
    expect(timing.dot).toBeCloseTo(60, 0);  // 1200/20 = 60ms
    expect(timing.dash).toBeCloseTo(180, 0); // 3×60 = 180ms
    expect(timing.intraChar).toBeCloseTo(60, 0);
    expect(timing.interChar).toBeCloseTo(180, 0);
    expect(timing.wordGap).toBeCloseTo(420, 0);
  });

  it('should stretch gaps for Farnsworth timing', () => {
    const standard = calculateTiming({ charSpeed: 20, overallSpeed: 20, frequency: 700 });
    const farnsworth = calculateTiming({ charSpeed: 20, overallSpeed: 10, frequency: 700 });

    // Character elements should be the same speed
    expect(farnsworth.dot).toBe(standard.dot);
    expect(farnsworth.dash).toBe(standard.dash);
    expect(farnsworth.intraChar).toBe(standard.intraChar);

    // Gaps should be longer
    expect(farnsworth.interChar).toBeGreaterThan(standard.interChar);
    expect(farnsworth.wordGap).toBeGreaterThan(standard.wordGap);
  });

  it('should estimate WPM from dot duration', () => {
    expect(estimateWPM(60)).toBeCloseTo(20, 0);
    expect(estimateWPM(120)).toBeCloseTo(10, 0);
    expect(estimateWPM(24)).toBeCloseTo(50, 0);
  });
});

// ============================
// DSP Tests
// ============================
describe('DSP', () => {
  it('should detect a sine wave with Goertzel', () => {
    const sampleRate = 8000;
    const freq = 700;
    const duration = 0.1; // 100ms
    const N = Math.floor(sampleRate * duration);
    const samples = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      samples[i] = Math.sin(2 * Math.PI * freq * i / sampleRate);
    }

    const mag700 = goertzel(samples, sampleRate, 700);
    const mag1000 = goertzel(samples, sampleRate, 1000);

    // Should detect strong signal at 700Hz
    expect(mag700).toBeGreaterThan(0.1);
    // Should not detect much at 1000Hz
    expect(mag700).toBeGreaterThan(mag1000 * 5);
  });

  it('should detect pitch of a sine wave', () => {
    const sampleRate = 8000;
    const freq = 440;
    const N = 2048;
    const samples = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      samples[i] = Math.sin(2 * Math.PI * freq * i / sampleRate);
    }

    const result = detectPitch(samples, sampleRate);
    expect(result.frequency).toBeCloseTo(freq, -1); // Within ~10Hz
  });

  it('should calculate adaptive threshold', () => {
    const quiet = Array(100).fill(0.01); // noise floor
    const loud = Array(10).fill(0.5);    // signals
    const all = [...quiet, ...loud];

    const thresh = adaptiveThreshold(all, 6);
    expect(thresh).toBeGreaterThan(0.01);
    expect(thresh).toBeLessThan(0.5);
  });

  it('should add white noise', () => {
    const clean = new Float32Array(1000).fill(0);
    const noisy = addWhiteNoise(clean, 0.5);

    // Should have non-zero values
    let sumAbs = 0;
    for (let i = 0; i < noisy.length; i++) {
      sumAbs += Math.abs(noisy[i]);
    }
    expect(sumAbs / noisy.length).toBeGreaterThan(0.1);
  });
});

// ============================
// Audio Decoder Tests (PCM)
// ============================
describe('Audio Decoder (PCM)', () => {
  function generateMorsePCM(morseStr: string, dotMs: number = 60, sampleRate: number = 8000, freq: number = 700): Float32Array {
    const dashMs = dotMs * 3;
    const intraGap = dotMs;
    const interGap = dotMs * 3;
    const wordGap = dotMs * 7;

    const parts = morseStr.split(' ');
    let totalMs = 0;

    for (const part of parts) {
      if (part === '/') {
        totalMs += wordGap;
        continue;
      }
      for (let i = 0; i < part.length; i++) {
        if (i > 0) totalMs += intraGap;
        totalMs += part[i] === '.' ? dotMs : dashMs;
      }
      totalMs += interGap; // After each character
    }
    totalMs += 100; // padding

    const totalSamples = Math.ceil(sampleRate * totalMs / 1000);
    const buffer = new Float32Array(totalSamples);
    let pos = 0;

    for (const part of parts) {
      if (part === '/') {
        pos += Math.floor(sampleRate * wordGap / 1000);
        continue;
      }
      for (let i = 0; i < part.length; i++) {
        if (i > 0) pos += Math.floor(sampleRate * intraGap / 1000);
        const dur = part[i] === '.' ? dotMs : dashMs;
        const samples = Math.floor(sampleRate * dur / 1000);
        for (let j = 0; j < samples; j++) {
          buffer[pos + j] = Math.sin(2 * Math.PI * freq * (pos + j) / sampleRate) * 0.8;
        }
        pos += samples;
      }
      pos += Math.floor(sampleRate * interGap / 1000);
    }

    return buffer;
  }

  it('should decode clean SOS', () => {
    const morse = '... --- ...';
    const pcm = generateMorsePCM(morse, 80);
    const result = decodeSamples(pcm, 8000);
    expect(result.text).toBe('SOS');
  });

  it('should decode clean HELLO', () => {
    const morse = '.... . .-.. .-.. ---';
    const pcm = generateMorsePCM(morse, 80);
    const result = decodeSamples(pcm, 8000);
    expect(result.text).toBe('HELLO');
  });

  it('should estimate WPM', () => {
    const morse = '... --- ...';
    const pcm = generateMorsePCM(morse, 60); // 20 WPM
    const result = decodeSamples(pcm, 8000);
    expect(result.estimatedWPM).toBeGreaterThan(10);
    expect(result.estimatedWPM).toBeLessThan(40);
  });

  it('should handle noisy SOS', () => {
    const morse = '... --- ...';
    const pcm = generateMorsePCM(morse, 80);
    const noisy = addWhiteNoise(pcm, 0.1);
    const result = decodeSamples(noisy, 8000);
    // May not be perfect but should get close
    expect(result.text.length).toBeGreaterThan(0);
  });
});

// ============================
// Edge Cases
// ============================
describe('Edge Cases', () => {
  it('should handle empty input', () => {
    expect(encodeText('')).toBe('');
    expect(decodeMorse('')).toBe('');
  });

  it('should handle consecutive spaces', () => {
    const encoded = encodeText('A  B');
    expect(encoded).toContain('/');
  });

  it('should handle most punctuation roundtrip', () => {
    // Some punctuation shares Morse codes with prosigns (e.g. '(' = <KN>)
    const punctuation = '.,?!/&:;=+-_"$@';
    for (const char of punctuation) {
      if (CHAR_TO_MORSE[char]) {
        const encoded = encodeText(char);
        const decoded = decodeMorse(encoded);
        expect(decoded).toBe(char);
      }
    }
  });
});

// ============================
// Non-Latin Alphabet Tests
// ============================
describe('Non-Latin Alphabets', () => {
  it('should have all 9 alphabets registered', () => {
    expect(ALPHABETS.length).toBe(9);
    const ids = ALPHABETS.map(a => a.id);
    expect(ids).toContain('latin');
    expect(ids).toContain('turkish');
    expect(ids).toContain('greek');
    expect(ids).toContain('cyrillic');
    expect(ids).toContain('korean');
    expect(ids).toContain('japanese');
  });

  it('should have Greek alphabet with 24 letters', () => {
    expect(Object.keys(GREEK_TO_MORSE).length).toBe(24);
    expect(GREEK_TO_MORSE['Α']).toBe('.-');
    expect(GREEK_TO_MORSE['Ω']).toBe('.--');
    expect(GREEK_TO_MORSE['Σ']).toBe('...');
  });

  it('should have Cyrillic alphabet with key letters', () => {
    expect(CYRILLIC_TO_MORSE['А']).toBe('.-');
    expect(CYRILLIC_TO_MORSE['Б']).toBe('-...');
    expect(CYRILLIC_TO_MORSE['Ж']).toBe('...-');
    expect(CYRILLIC_TO_MORSE['Я']).toBe('.-.-');
    expect(Object.keys(CYRILLIC_TO_MORSE).length).toBeGreaterThanOrEqual(30);
  });

  it('should have Hebrew alphabet with 22 letters', () => {
    expect(Object.keys(HEBREW_TO_MORSE).length).toBe(22);
    expect(HEBREW_TO_MORSE['א']).toBe('.-');
    expect(HEBREW_TO_MORSE['ת']).toBe('-');
  });

  it('should have Arabic alphabet with key letters', () => {
    expect(ARABIC_TO_MORSE['ا']).toBe('.-');
    expect(ARABIC_TO_MORSE['ب']).toBe('-...');
    expect(Object.keys(ARABIC_TO_MORSE).length).toBeGreaterThanOrEqual(28);
  });

  it('should have Persian alphabet with extra letters', () => {
    expect(PERSIAN_TO_MORSE['پ']).toBe('.--.');
    expect(PERSIAN_TO_MORSE['چ']).toBe('---.');
    expect(PERSIAN_TO_MORSE['گ']).toBe('--.-');
  });

  it('should have Korean Hangul consonants and vowels', () => {
    expect(KOREAN_TO_MORSE['ㄱ']).toBe('.-..');
    expect(KOREAN_TO_MORSE['ㅏ']).toBe('.');
    expect(KOREAN_TO_MORSE['ㅎ']).toBe('.---');
    expect(Object.keys(KOREAN_TO_MORSE).length).toBe(26);
  });

  it('should have Japanese Wabun code katakana', () => {
    expect(JAPANESE_TO_MORSE['ア']).toBe('--.--');
    expect(JAPANESE_TO_MORSE['イ']).toBe('.-');
    expect(JAPANESE_TO_MORSE['ン']).toBe('.-.-.');
    expect(Object.keys(JAPANESE_TO_MORSE).length).toBeGreaterThanOrEqual(45);
  });

  it('should encode Greek text to Morse', () => {
    const result = encodeText('ΑΒΓ', { alphabet: 'greek' });
    expect(result).toBe('.- -... --.');
  });

  it('should decode Morse to Cyrillic', () => {
    const result = decodeMorse('.- -... .--', 'cyrillic');
    expect(result).toBe('АБВ');
  });

  it('should encode Korean and decode back', () => {
    const encoded = encodeText('ㅎㅏ', { alphabet: 'korean' });
    expect(encoded).toBe('.--- .');
    const decoded = decodeMorse(encoded, 'korean');
    expect(decoded).toBe('ㅎㅏ');
  });

  it('should get alphabet map by ID', () => {
    const greekMap = getAlphabetMap('greek');
    expect(greekMap).toBe(GREEK_TO_MORSE);
    const latinMap = getAlphabetMap('latin');
    expect(latinMap).toBe(CHAR_TO_MORSE);
  });

  it('should build reverse Morse map for non-Latin', () => {
    const reverseGreek = getReverseMorseMap('greek');
    expect(reverseGreek['.-']).toBe('Α');
    expect(reverseGreek['...']).toBe('Σ');
  });

  it('should build Morse tree for non-Latin alphabet', () => {
    const tree = buildMorseTree('cyrillic');
    expect(tree.dot?.char).toBe('Е');
    expect(tree.dash?.char).toBe('Т');
  });

  it('should return grouped mappings for all alphabets', () => {
    const all = getAllMappings();
    expect(all.length).toBeGreaterThan(200);
    const groups = new Set(all.map(m => m.group));
    expect(groups.has('Letters')).toBe(true);
    expect(groups.has('Greek (Ελληνικά)')).toBe(true);
    expect(groups.has('Korean (한국어)')).toBe(true);
  });

  it('should return filtered mappings for specific alphabet', () => {
    const greek = getAllMappings('greek');
    expect(greek.every(m => m.group.includes('Greek'))).toBe(true);
    expect(greek.length).toBe(24);
  });

  it('should fall back to Latin numbers when encoding non-Latin with digits', () => {
    const result = encodeText('Α1', { alphabet: 'greek' });
    expect(result).toBe('.- .----');
  });

  it('should have Turkish alphabet with 32 characters', () => {
    expect(Object.keys(TURKISH_TO_MORSE).length).toBe(32);
    // Standard Latin letters present
    expect(TURKISH_TO_MORSE['A']).toBe('.-');
    expect(TURKISH_TO_MORSE['Z']).toBe('--..');
    // Turkish-specific letters
    expect(TURKISH_TO_MORSE['Ç']).toBe('-.-..');
    expect(TURKISH_TO_MORSE['Ğ']).toBe('--.-.');
    expect(TURKISH_TO_MORSE['İ']).toBe('..');
    expect(TURKISH_TO_MORSE['Ö']).toBe('---.');
    expect(TURKISH_TO_MORSE['Ş']).toBe('.--..'); 
    expect(TURKISH_TO_MORSE['Ü']).toBe('..--');
  });

  it('should encode Turkish text with special chars', () => {
    const result = encodeText('ÇAĞ', { alphabet: 'turkish' });
    expect(result).toBe('-.-.. .- --.-.');
  });

  it('should decode Morse to Turkish', () => {
    const decoded = decodeMorse('-.-.. .- --.-.', 'turkish');
    expect(decoded).toBe('ÇAĞ');
  });

  it('should roundtrip Turkish encode→decode', () => {
    const text = 'ÖŞÜÇ';
    const encoded = encodeText(text, { alphabet: 'turkish' });
    const decoded = decodeMorse(encoded, 'turkish');
    expect(decoded).toBe(text);
  });

  it('should have Q codes', () => {
    expect(Object.keys(Q_CODES).length).toBeGreaterThanOrEqual(15);
    expect(Q_CODES['QTH']).toBe('Location / position');
    expect(Q_CODES['QSL']).toBe('Acknowledge receipt');
  });

  it('should have common abbreviations', () => {
    expect(Object.keys(ABBREVIATIONS).length).toBeGreaterThanOrEqual(15);
    expect(ABBREVIATIONS['73']).toBe('Best regards');
    expect(ABBREVIATIONS['CQ']).toBe('Calling any station');
  });

  it('should include Q codes and abbreviations in Latin mappings', () => {
    const all = getAllMappings('latin');
    const groups = new Set(all.map(m => m.group));
    expect(groups.has('Q Codes')).toBe(true);
    expect(groups.has('Abbreviations')).toBe(true);
  });

  it('should have 9 alphabets registered', () => {
    expect(ALPHABETS.length).toBe(9);
    const ids = ALPHABETS.map(a => a.id);
    expect(ids).toContain('turkish');
  });
});
