# 📡 Morspresso — Advanced Morse Code Translator

A full-featured Morse code translator with Web Audio API playback, real-time DSP signal processing, and a professional Ham Radio-inspired interface.

**[Live Demo →](https://emircesur.github.io/Morspresso/)**

---

## Features

### Advanced Audio Engine
- **Farnsworth Timing** — Set character speed and overall speed independently for optimal learning
- **Custom Waveforms** — Sine, Square, Triangle, and Sawtooth oscillators
- **ADSR Envelope Shaping** — Configurable attack/release to eliminate audio clicks
- **Stereo Panning** — Full left-to-right audio positioning
- **Variable Frequency** — 300Hz–1200Hz tone selection

### Visual & Interactive
- **Signal Lamp Emulator** — Flashes in perfect sync with audio playback
- **Real-time Waterfall Visualizer** — Scrolling frequency display like professional SDR software
- **Oscilloscope & Spectrum** — Multiple visualization modes
- **Interactive Straight Key** — Tap out Morse code with mouse, touch, or keyboard
- **Pro-Mode Console** — Millisecond-precision timing log for every pulse

### Functionality
- **WAV File Export** — Download generated audio as a .wav file
- **WAV File Decode** — Drop an audio file to decode Morse from it
- **Shareable URLs** — Auto-encode text in URL hash for instant sharing
- **Prosign Support** — `<SK>`, `<AR>`, `<SOS>` and more
- **Searchable Character Map** — Slide-out reference for all Morse codes

### PWA & Accessibility
- **Progressive Web App** — Works offline with Service Worker caching
- **Haptic Feedback** — Phone vibrates in sync with Morse code
- **Keyboard Shortcuts** — Space (Play/Stop), Esc (Clear), Ctrl+M (Character Map)

### Signal Processing (DSP)
- **Goertzel Algorithm** — Efficient single-frequency detection
- **FFT Pitch Detection** — Automatic frequency identification
- **Adaptive Thresholding** — Intelligent noise floor calculation
- **Self-Calibrating Decoder** — Automatic WPM detection via PARIS standard

### Library API
```typescript
import { encodeText, decodeMorse, generateMorseBuffer, decodeSamples } from 'morspresso';

// Encode
const morse = encodeText('HELLO WORLD');
// → ".... . .-.. .-.. --- / .-- --- .-. .-.. -.."

// Decode
const text = decodeMorse('... --- ...');
// → "SOS"

// Generate audio buffer
const buffer = generateMorseBuffer('SOS', { charSpeed: 20, frequency: 700 });

// Decode from PCM samples
const result = decodeSamples(samples, sampleRate);
```

### CLI Tool
```bash
# Encode text
npx tsx src/cli/morse-tool.ts encode "HELLO WORLD"

# Decode Morse
npx tsx src/cli/morse-tool.ts decode "... --- ..."

# Synthesize WAV
npx tsx src/cli/morse-tool.ts synth "SOS" --wpm 20 --output sos.wav

# Decode WAV file
npx tsx src/cli/morse-tool.ts decode --file message.wav --verbose

# Timing info
npx tsx src/cli/morse-tool.ts info "PARIS" --wpm 15 --farnsworth 5 --verbose
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (strict mode) |
| Audio | Web Audio API + OfflineAudioContext |
| Visualization | Canvas API |
| Build | Vite |
| Tests | Vitest |
| Deploy | GitHub Actions → GitHub Pages |
| PWA | Service Worker + Web App Manifest |

---

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## License

MIT
