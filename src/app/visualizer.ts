/**
 * Morspresso — Visualizer
 * Waterfall, Oscilloscope, and Spectrum display using Canvas API.
 */

export class Visualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private analyser: AnalyserNode | null = null;
  private animationId: number = 0;
  private mode: 'waterfall' | 'oscilloscope' | 'spectrum' = 'waterfall';
  private waterfallData: ImageData[] = [];
  private running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();

    // Handle resize
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(canvas.parentElement!);
  }

  private resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = 200 * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = '200px';
    this.ctx.scale(dpr, dpr);
  }

  setMode(mode: 'waterfall' | 'oscilloscope' | 'spectrum') {
    this.mode = mode;
    this.clear();
  }

  start(analyser: AnalyserNode) {
    this.analyser = analyser;
    this.running = true;
    this.waterfallData = [];
    this.draw();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.animationId);
    this.analyser = null;
  }

  private clear() {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = 200;
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, w, h);
  }

  private draw = () => {
    if (!this.running || !this.analyser) return;

    switch (this.mode) {
      case 'waterfall': this.drawWaterfall(); break;
      case 'oscilloscope': this.drawOscilloscope(); break;
      case 'spectrum': this.drawSpectrum(); break;
    }

    this.animationId = requestAnimationFrame(this.draw);
  };

  private drawWaterfall() {
    const analyser = this.analyser!;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = 200;
    const ctx = this.ctx;

    // Shift existing content up by 1 pixel
    const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    ctx.putImageData(imageData, 0, -(window.devicePixelRatio || 1));

    // Draw new row at bottom
    const barWidth = w / bufferLength;
    for (let i = 0; i < bufferLength; i++) {
      const value = dataArray[i];
      const hue = 240 - (value / 255) * 240; // Blue (cold) to Red (hot)
      const lightness = value / 255 * 60;
      ctx.fillStyle = value < 5
        ? '#000'
        : `hsl(${hue}, 100%, ${lightness}%)`;
      ctx.fillRect(i * barWidth, h - 1, barWidth + 1, 1);
    }
  }

  private drawOscilloscope() {
    const analyser = this.analyser!;
    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(dataArray);

    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = 200;
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 0.5;
    for (let y = 0; y < h; y += h / 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Waveform
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f0b429';
    ctx.shadowColor = '#f0b429';
    ctx.shadowBlur = 4;
    ctx.beginPath();

    const sliceWidth = w / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i];
      const y = (v + 1) / 2 * h;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.stroke();
    ctx.shadowBlur = 0;

    // Center line
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
  }

  private drawSpectrum() {
    const analyser = this.analyser!;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = 200;
    const ctx = this.ctx;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    const barWidth = (w / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * h;
      const hue = (i / bufferLength) * 360;

      // Gradient from bottom
      const gradient = ctx.createLinearGradient(x, h, x, h - barHeight);
      gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.8)`);
      gradient.addColorStop(1, `hsla(${hue}, 100%, 70%, 0.4)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(x, h - barHeight, barWidth - 1, barHeight);

      x += barWidth;
      if (x > w) break;
    }

    // Frequency labels
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    const sampleRate = analyser.context.sampleRate;
    const freqLabels = [100, 500, 1000, 2000, 5000, 10000];
    for (const freq of freqLabels) {
      const bin = Math.round(freq * analyser.fftSize / sampleRate);
      const xPos = (bin / bufferLength) * w;
      if (xPos < w) {
        ctx.fillText(`${freq >= 1000 ? freq / 1000 + 'k' : freq}`, xPos, h - 4);
      }
    }
  }
}
