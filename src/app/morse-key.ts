/**
 * Morspresso — Interactive Morse Key Decoder
 * Decodes user taps on the straight key into text.
 * Uses timing analysis with jitter tolerance.
 */

import { MORSE_TO_CHAR, MORSE_TO_PROSIGN } from '../engine/morse-map';

type ToneHandle = { osc: OscillatorNode; gain: GainNode };

export class MorseKeyDecoder {
  private keyDownTime: number = 0;
  private keyUpTime: number = 0;
  private currentChar: string = '';
  private currentText: string = '';
  private fullMorse: string = '';
  private charTimeout: ReturnType<typeof setTimeout> | null = null;
  private wordTimeout: ReturnType<typeof setTimeout> | null = null;
  private dotEstimate: number = 80; // ms, adaptive
  private isDown: boolean = false;
  private pressCount: number = 0;
  private toneHandle: ToneHandle | null = null;

  private onMorseUpdate: (morse: string) => void;
  private onTextUpdate: (text: string) => void;
  private onKeyDown: () => ToneHandle;
  private onKeyUp: () => void;

  constructor(
    onMorseUpdate: (morse: string) => void,
    onTextUpdate: (text: string) => void,
    onKeyDown: () => ToneHandle,
    onKeyUp: () => void,
  ) {
    this.onMorseUpdate = onMorseUpdate;
    this.onTextUpdate = onTextUpdate;
    this.onKeyDown = onKeyDown;
    this.onKeyUp = onKeyUp;
  }

  keyDown() {
    if (this.isDown) return;
    this.isDown = true;
    this.keyDownTime = performance.now();
    this.pressCount++;

    // Clear character/word timeouts
    if (this.charTimeout) clearTimeout(this.charTimeout);
    if (this.wordTimeout) clearTimeout(this.wordTimeout);

    // Start tone
    this.toneHandle = this.onKeyDown();
  }

  keyUp() {
    if (!this.isDown) return;
    this.isDown = false;
    const now = performance.now();
    const pressDuration = now - this.keyDownTime;
    this.keyUpTime = now;

    // Stop tone
    if (this.toneHandle) {
      try {
        this.toneHandle.osc.stop();
        this.toneHandle.osc.disconnect();
        this.toneHandle.gain.disconnect();
      } catch { /* already stopped */ }
      this.toneHandle = null;
    }
    this.onKeyUp();

    // Adaptive dot estimate: update based on shortest press
    if (this.pressCount <= 3 || pressDuration < this.dotEstimate * 0.7) {
      this.dotEstimate = Math.max(30, pressDuration);
    }

    // Classify: dot or dash (threshold at 2x estimated dot)
    const threshold = this.dotEstimate * 2;
    if (pressDuration < threshold) {
      this.currentChar += '.';
    } else {
      this.currentChar += '-';
    }

    // Update morse display
    this.fullMorse += this.currentChar.slice(-1);
    this.onMorseUpdate(this.fullMorse);

    // Set timeout for character completion (3x dot)
    this.charTimeout = setTimeout(() => {
      this.finalizeChar();
    }, this.dotEstimate * 3);

    // Set timeout for word gap (7x dot)
    this.wordTimeout = setTimeout(() => {
      this.finalizeWord();
    }, this.dotEstimate * 7);
  }

  private finalizeChar() {
    if (!this.currentChar) return;
    const decoded = MORSE_TO_CHAR[this.currentChar] || MORSE_TO_PROSIGN[this.currentChar] || '?';
    this.currentText += decoded;
    this.fullMorse += ' ';
    this.onTextUpdate(this.currentText);
    this.onMorseUpdate(this.fullMorse);
    this.currentChar = '';
  }

  private finalizeWord() {
    if (this.currentChar) {
      this.finalizeChar();
    }
    this.currentText += ' ';
    this.fullMorse += '/ ';
    this.onTextUpdate(this.currentText);
    this.onMorseUpdate(this.fullMorse);
  }

  reset() {
    this.currentChar = '';
    this.currentText = '';
    this.fullMorse = '';
    this.pressCount = 0;
    this.dotEstimate = 80;
    if (this.charTimeout) clearTimeout(this.charTimeout);
    if (this.wordTimeout) clearTimeout(this.wordTimeout);
    this.onMorseUpdate('');
    this.onTextUpdate('');
  }
}
