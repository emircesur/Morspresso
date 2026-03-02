/**
 * Morspresso - Public Engine API
 * Clean, importable library for other developers.
 */

export {
  CHAR_TO_MORSE, MORSE_TO_CHAR, PROSIGNS, MORSE_TO_PROSIGN,
  TURKISH_TO_MORSE,
  GREEK_TO_MORSE, CYRILLIC_TO_MORSE, HEBREW_TO_MORSE, ARABIC_TO_MORSE,
  PERSIAN_TO_MORSE, KOREAN_TO_MORSE, JAPANESE_TO_MORSE,
  Q_CODES, ABBREVIATIONS,
  ALPHABETS, getAlphabetMap, getReverseMorseMap,
  getAllMappings, buildMorseTree,
} from './morse-map';
export type { MorseTreeNode, AlphabetId, AlphabetInfo, MappingEntry } from './morse-map';

export { encodeText, parseMorseToElements } from './encoder';
export type { MorseElement, EncodeOptions } from './encoder';

export { decodeMorse, decodeMorseTree, decodeSamples, decodeWavFile } from './decoder';
export type { DecodeResult, PulseInfo } from './decoder';

export { calculateTiming, estimateWPM } from './timing';
export type { TimingConfig, TimingValues } from './timing';

export {
  scheduleMorsePlayback,
  generateMorseBuffer,
  audioBufferToWav,
  getTimingInfo,
  DEFAULT_OPTIONS,
} from './audio-engine';
export type { AudioEngineOptions, WaveformType, PlaybackCallback, PlaybackEvent } from './audio-engine';

export { goertzel, slidingGoertzel, detectPitch, adaptiveThreshold, addWhiteNoise } from './dsp';
