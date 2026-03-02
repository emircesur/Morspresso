/**
 * Morspresso - Text ↔ Morse Encoder
 */

import { CHAR_TO_MORSE, PROSIGNS, getAlphabetMap, type AlphabetId } from './morse-map';

export interface EncodeOptions {
  /** Include prosigns (e.g. <SK>, <AR>) */
  prosigns?: boolean;
  /** Which alphabet to encode with (default: 'latin') */
  alphabet?: AlphabetId;
}

/**
 * Encode plain text into Morse code string.
 * Returns dots (.), dashes (-), spaces for character gaps, and / for word gaps.
 */
export function encodeText(text: string, options: EncodeOptions = {}): string {
  const { prosigns = true, alphabet = 'latin' } = options;
  const charMap = getAlphabetMap(alphabet);
  // Only uppercase for Latin/Turkish/Greek/Cyrillic scripts
  const input = alphabet === 'latin' || alphabet === 'turkish' || alphabet === 'greek' || alphabet === 'cyrillic'
    ? text.toUpperCase()
    : text;
  const result: string[] = [];

  let i = 0;
  while (i < input.length) {
    // Check for prosigns first (Latin mode only)
    if (prosigns && alphabet === 'latin' && input[i] === '<') {
      const end = input.indexOf('>', i);
      if (end !== -1) {
        const tag = input.slice(i, end + 1);
        if (PROSIGNS[tag]) {
          result.push(PROSIGNS[tag]);
          i = end + 1;
          continue;
        }
      }
    }

    const char = input[i];
    if (char === ' ') {
      result.push('/');
    } else if (charMap[char]) {
      result.push(charMap[char]);
    } else if (alphabet !== 'latin' && CHAR_TO_MORSE[char.toUpperCase()]) {
      // Fallback to Latin for numbers/punctuation when using non-Latin alphabet
      result.push(CHAR_TO_MORSE[char.toUpperCase()]);
    }
    // Skip unknown characters silently
    i++;
  }

  return result.join(' ');
}

/**
 * Parse a Morse string into a sequence of elements for audio scheduling.
 * Returns an array of { type, duration_units } objects.
 */
export type MorseElement =
  | { type: 'dot' }
  | { type: 'dash' }
  | { type: 'intra-char' }  // gap within character
  | { type: 'inter-char' }  // gap between characters
  | { type: 'word-gap' }    // gap between words
  | { type: 'char-boundary'; char: string }; // metadata: which character

export function parseMorseToElements(morseString: string): MorseElement[] {
  const elements: MorseElement[] = [];
  const parts = morseString.split(' ');

  for (let pi = 0; pi < parts.length; pi++) {
    const part = parts[pi];
    if (part === '/') {
      elements.push({ type: 'word-gap' });
      continue;
    }
    if (part === '') continue;

    // Add inter-character gap before each character (except first)
    if (elements.length > 0) {
      const last = elements[elements.length - 1];
      if (last.type !== 'word-gap') {
        elements.push({ type: 'inter-char' });
      }
    }

    elements.push({ type: 'char-boundary', char: part });

    for (let si = 0; si < part.length; si++) {
      if (si > 0) {
        elements.push({ type: 'intra-char' });
      }
      if (part[si] === '.') {
        elements.push({ type: 'dot' });
      } else if (part[si] === '-') {
        elements.push({ type: 'dash' });
      }
    }
  }

  return elements;
}
