/**
 * Morspresso - International Morse Code character mappings
 * Includes letters, numbers, punctuation, prosigns, and non-Latin alphabets.
 * Non-Latin data sourced from: https://en.wikipedia.org/wiki/Morse_code_for_non-Latin_alphabets
 */

// ============================
// Supported Alphabet Types
// ============================
export type AlphabetId =
  | 'latin'
  | 'turkish'
  | 'greek'
  | 'cyrillic'
  | 'hebrew'
  | 'arabic'
  | 'persian'
  | 'korean'
  | 'japanese';

export interface AlphabetInfo {
  id: AlphabetId;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
}

export const ALPHABETS: AlphabetInfo[] = [
  { id: 'latin',    name: 'Latin (International)', nativeName: 'Latin',    direction: 'ltr' },
  { id: 'turkish',  name: 'Turkish',               nativeName: 'Türkçe',   direction: 'ltr' },
  { id: 'greek',    name: 'Greek',                 nativeName: 'Ελληνικά', direction: 'ltr' },
  { id: 'cyrillic', name: 'Cyrillic (Russian)',     nativeName: 'Кириллица', direction: 'ltr' },
  { id: 'hebrew',   name: 'Hebrew',                nativeName: 'עברית',    direction: 'rtl' },
  { id: 'arabic',   name: 'Arabic',                nativeName: 'العربية',   direction: 'rtl' },
  { id: 'persian',  name: 'Persian (Farsi)',        nativeName: 'فارسی',    direction: 'rtl' },
  { id: 'korean',   name: 'Korean (Hangul)',        nativeName: '한국어',    direction: 'ltr' },
  { id: 'japanese', name: 'Japanese (Wabun)',       nativeName: '和文',     direction: 'ltr' },
];

// ============================
// Latin (International Morse Code)
// ============================
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

// ============================
// Turkish Alphabet (Latin + Ç Ğ İ Ö Ş Ü)
// Source: https://tr.wikipedia.org/wiki/Mors_alfabesi
// ============================
export const TURKISH_TO_MORSE: Record<string, string> = {
  // Standard Latin letters
  'A': '.-',    'B': '-...',  'C': '-.-.',  'D': '-..',
  'E': '.',     'F': '..-.',  'G': '--.',   'H': '....',
  'I': '..',    'J': '.---',  'K': '-.-',   'L': '.-..',
  'M': '--',    'N': '-.',    'O': '---',   'P': '.--.',
  'Q': '--.-',  'R': '.-.',   'S': '...',   'T': '-',
  'U': '..-',   'V': '...-',  'W': '.--',   'X': '-..-',
  'Y': '-.--',  'Z': '--..',
  // Turkish-specific letters
  'Ç': '-.-..',  // C + extra dot
  'Ğ': '--.-.',  // G + extra dot
  'İ': '..',     // Dotted I (same as Latin I)
  'Ö': '---.',   // O + extra dot
  'Ş': '.--..', // S with cedilla
  'Ü': '..--',   // U + extra dash
};

// ============================
// Q Codes & Common Morse Abbreviations
// Used across all alphabets by ham radio operators
// ============================
export const Q_CODES: Record<string, string> = {
  'QRA': 'Station name / call sign',
  'QRL': 'Busy / Are you busy?',
  'QRM': 'Interference',
  'QRN': 'Static / atmospheric noise',
  'QRO': 'Increase power',
  'QRP': 'Decrease power / low power',
  'QRQ': 'Send faster',
  'QRS': 'Send slower',
  'QRT': 'Stop transmitting',
  'QRV': 'Ready to receive',
  'QRX': 'Stand by / wait',
  'QRZ': 'Who is calling me?',
  'QSA': 'Signal strength',
  'QSB': 'Fading signal',
  'QSL': 'Acknowledge receipt',
  'QSO': 'Communication / contact',
  'QST': 'General call to all stations',
  'QSY': 'Change frequency',
  'QTH': 'Location / position',
};

export const ABBREVIATIONS: Record<string, string> = {
  'CQ':  'Calling any station',
  'DE':  'From / This is',
  'DX':  'Long distance',
  'RX':  'Receiver',
  'TX':  'Transmitter',
  'SK':  'Silent key (deceased operator)',
  'FB':  'Fine business (good)',
  'OM':  'Old man (fellow operator)',
  'YL':  'Young lady',
  'XYL': 'Wife (ex-young lady)',
  'HI':  'Laughter',
  'R':   'Received / Roger',
  'K':   'Go ahead / Over',
  'BK':  'Break',
  'CL':  'Closing station',
  'TNX': 'Thanks',
  'UR':  'Your / You are',
  'RST': 'Readability / Signal / Tone report',
  '73':  'Best regards',
  '88':  'Love and kisses',
  '99':  'Go away!',
};

// ============================
// Greek Alphabet
// ============================
export const GREEK_TO_MORSE: Record<string, string> = {
  'Α': '.-',     'Β': '-...',   'Γ': '--.',    'Δ': '-..',
  'Ε': '.',      'Ζ': '--..',   'Η': '....',   'Θ': '-.-.',
  'Ι': '..',     'Κ': '-.-',    'Λ': '.-..',   'Μ': '--',
  'Ν': '-.',     'Ξ': '-..-',   'Ο': '---',    'Π': '.--.',
  'Ρ': '.-.',    'Σ': '...',    'Τ': '-',      'Υ': '-.--',
  'Φ': '..-.',   'Χ': '----',   'Ψ': '--.-',   'Ω': '.--',
};

// ============================
// Cyrillic (Russian) Alphabet
// ============================
export const CYRILLIC_TO_MORSE: Record<string, string> = {
  'А': '.-',     'Б': '-...',   'В': '.--',    'Г': '--.',
  'Д': '-..',    'Е': '.',      'Ж': '...-',   'З': '--..',
  'И': '..',     'Й': '.---',   'К': '-.-',    'Л': '.-..',
  'М': '--',     'Н': '-.',     'О': '---',    'П': '.--.',
  'Р': '.-.',    'С': '...',    'Т': '-',      'У': '..-',
  'Ф': '..-.',   'Х': '....',   'Ц': '-.-.',   'Ч': '---.',
  'Ш': '----',   'Щ': '--.-',   'Ъ': '--.--',  'Ы': '-.--',
  'Ь': '-..-',   'Э': '..-..',  'Ю': '..--',   'Я': '.-.-',
  // Ukrainian extras (Ё uses same code as Е, І same as И)
  'Ї': '.---.',  'Є': '..-..',
};

// ============================
// Hebrew Alphabet
// ============================
export const HEBREW_TO_MORSE: Record<string, string> = {
  'א': '.-',     'ב': '-...',   'ג': '--.',    'ד': '-..',
  'ה': '---',    'ו': '.',      'ז': '--..',   'ח': '....',
  'ט': '..-',    'י': '..',     'כ': '-.-',    'ל': '.-..',
  'מ': '--',     'נ': '-.',     'ס': '-.-.',   'ע': '.---',
  'פ': '.--.',   'צ': '.--',    'ק': '--.-',   'ר': '.-.',
  'ש': '...',    'ת': '-',
};

// ============================
// Arabic Alphabet
// ============================
export const ARABIC_TO_MORSE: Record<string, string> = {
  'ا': '.-',     'ب': '-...',   'ت': '-',      'ث': '-.-.',
  'ج': '.---',   'ح': '....',   'خ': '---',    'د': '-..',
  'ذ': '--..',   'ر': '.-.',    'ز': '---.',   'س': '...',
  'ش': '----',   'ص': '-..-',   'ض': '...-',   'ط': '..-',
  'ظ': '-.--',   'ع': '.-.-',   'غ': '--.',    'ف': '..-.',
  'ق': '--.-',   'ك': '-.-',    'ل': '.-..',   'م': '--',
  'ن': '-.',     'ه': '..-..',  'و': '.--',    'ي': '..',
  'ﺀ': '.',
};

// ============================
// Persian (Farsi) Alphabet
// ============================
export const PERSIAN_TO_MORSE: Record<string, string> = {
  'ا': '.-',     'ب': '-...',   'پ': '.--.',   'ت': '-',
  'ث': '-.-.',   'ج': '.---',   'چ': '---.',   'ح': '....',
  'خ': '-..-',   'د': '-..',    'ذ': '...-',   'ر': '.-.',
  'ز': '--..',   'ژ': '--.',    'س': '...',    'ش': '----',
  'ص': '.-.-',   'ض': '..-..',  'ط': '..-',    'ظ': '-.--',
  'ع': '---',    'غ': '..--',   'ف': '..-.',   'ق': '...---',
  'ک': '-.-',    'گ': '--.-',   'ل': '.-..',   'م': '--',
  'ن': '-.',     'و': '.--',    'ه': '.',      'ی': '..',
};

// ============================
// Korean (Hangul) Alphabet — SKATS
// ============================
export const KOREAN_TO_MORSE: Record<string, string> = {
  // Consonants (자음)
  'ㄱ': '.-..',   'ㄴ': '..-.',   'ㄷ': '-...',   'ㄹ': '...-',
  'ㅁ': '--',     'ㅂ': '.--',    'ㅅ': '--.',    'ㅇ': '-.-',
  'ㅈ': '.--.',   'ㅊ': '-.-.',   'ㅋ': '-..-',   'ㅌ': '--..',
  'ㅍ': '---',    'ㅎ': '.---',
  // Vowels (모음)
  'ㅏ': '.',      'ㅑ': '..',     'ㅓ': '-',      'ㅕ': '...',
  'ㅗ': '.-',     'ㅛ': '-.',     'ㅜ': '....',   'ㅠ': '.-.',
  'ㅡ': '-..',    'ㅣ': '..-',    'ㅐ': '--.-',   'ㅔ': '-.--',
};

// ============================
// Japanese (Wabun Code) — Katakana
// ============================
export const JAPANESE_TO_MORSE: Record<string, string> = {
  // Gojūon order
  'ア': '--.--',   'イ': '.-',      'ウ': '..-',     'エ': '-.---',   'オ': '.-...',
  'カ': '.-..',    'キ': '-.-..',   'ク': '...-',    'ケ': '-.--',    'コ': '----',
  'サ': '-.-.-',   'シ': '--.-.',   'ス': '---.-',   'セ': '.---.',   'ソ': '---.',
  'タ': '-.',      'チ': '..-.',    'ツ': '.--.',    'テ': '.-.--',   'ト': '..-..',
  'ナ': '.-.',     'ニ': '-.-.',    'ヌ': '....',    'ネ': '--.-',    'ノ': '..--',
  'ハ': '-...',    'ヒ': '--..-',   'フ': '--..',    'ヘ': '.',       'ホ': '-..',
  'マ': '-..-',    'ミ': '..-.-',   'ム': '-',       'メ': '-...-',   'モ': '-..-.',
  'ヤ': '.--',     'ユ': '-..--',   'ヨ': '--',
  'ラ': '...',     'リ': '--.',     'ル': '-.--.',   'レ': '---',     'ロ': '.-.-',
  'ワ': '-.-',     'ヰ': '.-..-',   'ヱ': '.--..',   'ヲ': '.---',    'ン': '.-.-.',
  // Punctuation
  '゛': '..',      // Dakuten
  '゜': '..--.',   // Handakuten
  'ー': '.--.-',   // Chōonpu (long vowel)
};

// ============================
// Master alphabet map accessor
// ============================
const ALPHABET_MAPS: Record<AlphabetId, Record<string, string>> = {
  latin:    CHAR_TO_MORSE,
  turkish:  TURKISH_TO_MORSE,
  greek:    GREEK_TO_MORSE,
  cyrillic: CYRILLIC_TO_MORSE,
  hebrew:   HEBREW_TO_MORSE,
  arabic:   ARABIC_TO_MORSE,
  persian:  PERSIAN_TO_MORSE,
  korean:   KOREAN_TO_MORSE,
  japanese: JAPANESE_TO_MORSE,
};

/** Get the char→morse map for a given alphabet */
export function getAlphabetMap(alphabet: AlphabetId): Record<string, string> {
  return ALPHABET_MAPS[alphabet] ?? CHAR_TO_MORSE;
}

/** Build reverse morse→char map for a given alphabet */
export function getReverseMorseMap(alphabet: AlphabetId): Record<string, string> {
  const map = getAlphabetMap(alphabet);
  const reverse: Record<string, string> = {};
  for (const [char, morse] of Object.entries(map)) {
    if (char !== ' ' && !reverse[morse]) {
      reverse[morse] = char;
    }
  }
  return reverse;
}

// ============================
// Default Latin reverse maps (backwards compat)
// ============================

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

export function buildMorseTree(alphabet: AlphabetId = 'latin'): MorseTreeNode {
  const map = getAlphabetMap(alphabet);
  const root: MorseTreeNode = {};
  for (const [char, morse] of Object.entries(map)) {
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

// ============================
// Mapping entry for reference charts
// ============================
export interface MappingEntry {
  char: string;
  morse: string;
  display: string;
  group: string;
}

/** Get all character entries for the reference chart, optionally filtered by alphabet */
export function getAllMappings(alphabet?: AlphabetId): MappingEntry[] {
  const entries: MappingEntry[] = [];
  const toDisplay = (morse: string) => morse.split('').map(s => s === '.' ? '·' : '—').join(' ');

  if (!alphabet || alphabet === 'latin') {
    // Latin letters
    for (const [char, morse] of Object.entries(CHAR_TO_MORSE)) {
      if (char === ' ') continue;
      const group = /^[A-Z]$/.test(char)
        ? 'Letters'
        : /^[0-9]$/.test(char)
          ? 'Numbers'
          : 'Punctuation';
      entries.push({ char, morse, display: toDisplay(morse), group });
    }
    // Prosigns
    for (const [prosign, morse] of Object.entries(PROSIGNS)) {
      entries.push({ char: prosign, morse, display: toDisplay(morse), group: 'Prosigns' });
    }
  }

  // Non-Latin & extended alphabets
  const nonLatinSets: Array<{ id: AlphabetId; label: string; map: Record<string, string> }> = [
    { id: 'turkish',  label: 'Turkish (Türkçe)',         map: TURKISH_TO_MORSE },
    { id: 'greek',    label: 'Greek (Ελληνικά)',         map: GREEK_TO_MORSE },
    { id: 'cyrillic', label: 'Cyrillic (Кириллица)',     map: CYRILLIC_TO_MORSE },
    { id: 'hebrew',   label: 'Hebrew (עברית)',           map: HEBREW_TO_MORSE },
    { id: 'arabic',   label: 'Arabic (العربية)',          map: ARABIC_TO_MORSE },
    { id: 'persian',  label: 'Persian (فارسی)',           map: PERSIAN_TO_MORSE },
    { id: 'korean',   label: 'Korean (한국어)',            map: KOREAN_TO_MORSE },
    { id: 'japanese', label: 'Japanese Wabun (和文)',     map: JAPANESE_TO_MORSE },
  ];

  for (const { id, label, map } of nonLatinSets) {
    if (alphabet && alphabet !== id) continue;
    for (const [char, morse] of Object.entries(map)) {
      entries.push({ char, morse, display: toDisplay(morse), group: label });
    }
  }

  // Q Codes & Abbreviations (always shown unless filtering to a specific non-Latin alphabet)
  if (!alphabet || alphabet === 'latin' || alphabet === 'turkish') {
    for (const [code, meaning] of Object.entries(Q_CODES)) {
      const morse = encodeShortCode(code);
      entries.push({ char: code, morse, display: meaning, group: 'Q Codes' });
    }
    for (const [abbr, meaning] of Object.entries(ABBREVIATIONS)) {
      const morse = encodeShortCode(abbr);
      entries.push({ char: abbr, morse, display: meaning, group: 'Abbreviations' });
    }
  }

  return entries;
}

/** Helper to encode a short code string to morse for display */
function encodeShortCode(text: string): string {
  return text.toUpperCase().split('').map(c => CHAR_TO_MORSE[c] || '').filter(Boolean).join(' ');
}
