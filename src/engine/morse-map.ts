/**
 * Morspresso - International Morse Code character mappings
 * Includes letters, numbers, punctuation, and prosigns.
 */

export const CHAR_TO_MORSE: Record<string, string> = {
  // Letters
  'A': '.-',    'B': '-...',  'C': '-.-.',  'D': '-..',
  'E': '.',     'F': '..-.',  'G': '--.',   'H': '....',
  'I': '..',    'J': '.---',  'K': '-.-',   'L': '.-..',
  'M': '--',    'N': '-.',    'O': '---',   'P': '.--.',
  'Q': '--.-',  'R': '.-.',   'S': '...',   'T': '-',
  'U': '..-',   'V': '...-',  'W': '.--',   'X': '-..-',
  'Y': '-.--',  'Z': '--..',

  // Numbers
  '0': '-----', '1': '.----', '2': '..---', '3': '...--',
  '4': '....-', '5': '.....', '6': '-....', '7': '--...',
  '8': '---..', '9': '----.',

  // Punctuation
  '.': '.-.-.-',  ',': '--..--',  '?': '..--..',  "'": '.----.',
  '!': '-.-.--',  '/': '-..-.',   '(': '-.--.',   ')': '-.--.-',
  '&': '.-...',   ':': '---...',  ';': '-.-.-.',  '=': '-...-',
  '+': '.-.-.',   '-': '-....-',  '_': '..--.-',  '"': '.-..-.',
  '$': '...-..-', '@': '.--.-.',

  // Space between words
  ' ': '/',
};

/** Prosigns - procedural signals sent as single characters (no inter-character gap) */
export const PROSIGNS: Record<string, string> = {
  '<AR>': '.-.-.',    // End of message
  '<AS>': '.-...',    // Wait
  '<BK>': '-...-.-',  // Break
  '<BT>': '-...-',    // New paragraph (double dash)
  '<CL>': '-.-..-..',  // Going off air
  '<CT>': '-.-.-',    // Commencing transmission
  '<KN>': '-.--.',    // Invitation to specific station
  '<SK>': '...-.-',   // End of contact
  '<SN>': '...-.',    // Understood (also VE)
  '<SOS>': '...---...', // Distress
  '<HH>': '........',  // Error (8 dots)
};

/** Reverse mapping: Morse -> Character */
export const MORSE_TO_CHAR: Record<string, string> = {};
for (const [char, morse] of Object.entries(CHAR_TO_MORSE)) {
  if (char !== ' ') {
    MORSE_TO_CHAR[morse] = char;
  }
}

/** Reverse prosigns mapping */
export const MORSE_TO_PROSIGN: Record<string, string> = {};
for (const [prosign, morse] of Object.entries(PROSIGNS)) {
  MORSE_TO_PROSIGN[morse] = prosign;
}

/**
 * Morse tree for efficient decoding.
 * Navigate left on '.', right on '-'.
 */
export interface MorseTreeNode {
  char?: string;
  dot?: MorseTreeNode;
  dash?: MorseTreeNode;
}

export function buildMorseTree(): MorseTreeNode {
  const root: MorseTreeNode = {};
  for (const [char, morse] of Object.entries(CHAR_TO_MORSE)) {
    if (char === ' ') continue;
    let node = root;
    for (const symbol of morse) {
      if (symbol === '.') {
        if (!node.dot) node.dot = {};
        node = node.dot;
      } else if (symbol === '-') {
        if (!node.dash) node.dash = {};
        node = node.dash;
      }
    }
    node.char = char;
  }
  return root;
}

/** Get all character entries for the reference chart */
export function getAllMappings(): Array<{ char: string; morse: string; display: string }> {
  const entries: Array<{ char: string; morse: string; display: string }> = [];
  for (const [char, morse] of Object.entries(CHAR_TO_MORSE)) {
    if (char === ' ') continue;
    const display = morse.split('').map(s => s === '.' ? '·' : '—').join(' ');
    entries.push({ char, morse, display });
  }
  for (const [prosign, morse] of Object.entries(PROSIGNS)) {
    const display = morse.split('').map(s => s === '.' ? '·' : '—').join(' ');
    entries.push({ char: prosign, morse, display });
  }
  return entries;
}
