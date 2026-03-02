/**
 * Morspresso - DSP Module
 * Goertzel algorithm, FFT pitch detection, adaptive thresholding.
 */

/**
 * Goertzel algorithm - efficient single-frequency detection.
 * More efficient than FFT when you only need one frequency.
 * Returns the magnitude of the target frequency in the buffer.
 */
export function goertzel(samples: Float32Array, sampleRate: number, targetFreq: number): number {
  const N = samples.length;
  const k = Math.round(N * targetFreq / sampleRate);
  const w = (2 * Math.PI * k) / N;
  const coeff = 2 * Math.cos(w);

  let s0 = 0, s1 = 0, s2 = 0;
  for (let i = 0; i < N; i++) {
    s0 = samples[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }

  const power = s1 * s1 + s2 * s2 - coeff * s1 * s2;
  return Math.sqrt(Math.abs(power)) / N;
}

/**
 * Sliding Goertzel: compute the target frequency magnitude over time.
 * Returns an array of { time, magnitude } entries.
 */
export function slidingGoertzel(
  samples: Float32Array,
  sampleRate: number,
  targetFreq: number,
  windowMs: number = 10,
  hopMs: number = 5
): Array<{ timeMs: number; magnitude: number }> {
  const windowSize = Math.floor(sampleRate * windowMs / 1000);
  const hopSize = Math.floor(sampleRate * hopMs / 1000);
  const results: Array<{ timeMs: number; magnitude: number }> = [];

  for (let i = 0; i + windowSize <= samples.length; i += hopSize) {
    const window = samples.slice(i, i + windowSize);
    const mag = goertzel(window, sampleRate, targetFreq);
    results.push({
      timeMs: (i + windowSize / 2) / sampleRate * 1000,
      magnitude: mag,
    });
  }

  return results;
}

/**
 * FFT-based pitch detection.
 * Finds the strongest frequency component in the signal.
 */
export function detectPitch(samples: Float32Array, sampleRate: number): {
  frequency: number;
  magnitude: number;
} {
  // Use power-of-2 FFT size
  const fftSize = nextPow2(samples.length);
  const real = new Float64Array(fftSize);
  const imag = new Float64Array(fftSize);

  // Copy and apply Hann window
  for (let i = 0; i < samples.length; i++) {
    const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / (samples.length - 1)));
    real[i] = samples[i] * window;
  }

  // In-place FFT
  fft(real, imag);

  // Find peak magnitude (skip DC, only look at positive frequencies)
  let maxMag = 0;
  let maxBin = 1;
  const nyquist = fftSize / 2;

  for (let i = 1; i < nyquist; i++) {
    const mag = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
    if (mag > maxMag) {
      maxMag = mag;
      maxBin = i;
    }
  }

  // Quadratic interpolation for sub-bin accuracy
  const prev = maxBin > 0
    ? Math.sqrt(real[maxBin - 1] ** 2 + imag[maxBin - 1] ** 2) : 0;
  const next = maxBin < nyquist - 1
    ? Math.sqrt(real[maxBin + 1] ** 2 + imag[maxBin + 1] ** 2) : 0;

  let delta = 0;
  if (prev + next > 0) {
    delta = 0.5 * (next - prev) / (2 * maxMag - prev - next);
  }

  const frequency = (maxBin + delta) * sampleRate / fftSize;

  return { frequency, magnitude: maxMag / fftSize };
}

/**
 * Adaptive threshold calculator.
 * Returns the threshold level set X dB above the noise floor.
 */
export function adaptiveThreshold(
  magnitudes: number[],
  dbAboveFloor: number = 6
): number {
  if (magnitudes.length === 0) return 0;

  const sorted = [...magnitudes].sort((a, b) => a - b);
  // Noise floor = median of bottom 30%
  const floorIdx = Math.floor(sorted.length * 0.3);
  const noiseFloor = sorted[floorIdx] || sorted[0];

  // Convert dB to linear multiplier
  const multiplier = Math.pow(10, dbAboveFloor / 20);
  return noiseFloor * multiplier;
}

// === Internal FFT helpers ===

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/**
 * In-place Cooley-Tukey radix-2 FFT.
 */
function fft(real: Float64Array, imag: Float64Array): void {
  const N = real.length;

  // Bit-reversal permutation
  let j = 0;
  for (let i = 0; i < N - 1; i++) {
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
    let m = N >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }

  // FFT butterfly stages
  for (let size = 2; size <= N; size *= 2) {
    const halfSize = size / 2;
    const angle = -2 * Math.PI / size;

    for (let i = 0; i < N; i += size) {
      for (let k = 0; k < halfSize; k++) {
        const tw_r = Math.cos(angle * k);
        const tw_i = Math.sin(angle * k);

        const a = i + k;
        const b = a + halfSize;

        const tr = real[b] * tw_r - imag[b] * tw_i;
        const ti = real[b] * tw_i + imag[b] * tw_r;

        real[b] = real[a] - tr;
        imag[b] = imag[a] - ti;
        real[a] += tr;
        imag[a] += ti;
      }
    }
  }
}

/**
 * Generate white noise for testing decoder robustness.
 */
export function addWhiteNoise(samples: Float32Array, noiseLevel: number): Float32Array {
  const result = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    result[i] = samples[i] + (Math.random() * 2 - 1) * noiseLevel;
  }
  return result;
}

/**
 * Compute the spectrum (magnitude array) for the AnalyserNode waterfall.
 */
export function computeSpectrum(
  real: Float64Array,
  imag: Float64Array,
  fftSize: number
): Float32Array {
  const spectrum = new Float32Array(fftSize / 2);
  for (let i = 0; i < fftSize / 2; i++) {
    spectrum[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }
  return spectrum;
}
