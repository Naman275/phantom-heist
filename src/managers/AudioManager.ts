// ============================================================
// Audio Manager — Sound Effects & Music (procedurally generated)
// ============================================================

export class AudioManager {
  private static instance: AudioManager;
  private audioCtx: AudioContext | null = null;
  private soundEnabled = true;
  private musicEnabled = true;
  private musicGain: GainNode | null = null;
  private musicOsc: OscillatorNode | null = null;

  private constructor() {}

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private ensureContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  setSoundEnabled(enabled: boolean): void { this.soundEnabled = enabled; }
  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!enabled) this.stopMusic();
  }

  // ---- Sound Effects (all synthesized — no files needed) ----

  playClick(): void {
    if (!this.soundEnabled) return;
    this.playTone(800, 0.05, 'square', 0.15);
  }

  playSuccess(): void {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    this.playToneAt(523, now, 0.1, 'sine', 0.2);
    this.playToneAt(659, now + 0.1, 0.1, 'sine', 0.2);
    this.playToneAt(784, now + 0.2, 0.15, 'sine', 0.25);
  }

  playFail(): void {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    this.playToneAt(400, now, 0.15, 'sawtooth', 0.15);
    this.playToneAt(300, now + 0.15, 0.2, 'sawtooth', 0.15);
    this.playToneAt(200, now + 0.3, 0.3, 'sawtooth', 0.2);
  }

  playHit(): void {
    if (!this.soundEnabled) return;
    this.playNoise(0.08, 0.2);
    this.playTone(200, 0.1, 'square', 0.15);
  }

  playJump(): void {
    if (!this.soundEnabled) return;
    this.playSweep(300, 600, 0.12, 'sine', 0.1);
  }

  playCoinPickup(): void {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    this.playToneAt(988, now, 0.05, 'sine', 0.12);
    this.playToneAt(1319, now + 0.06, 0.08, 'sine', 0.12);
  }

  playTrapPlace(): void {
    if (!this.soundEnabled) return;
    this.playTone(440, 0.06, 'triangle', 0.1);
  }

  playLevelUp(): void {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => {
      this.playToneAt(freq, now + i * 0.12, 0.12, 'sine', 0.2);
    });
  }

  playDailyReward(): void {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    [392, 523, 659, 784, 1047].forEach((freq, i) => {
      this.playToneAt(freq, now + i * 0.08, 0.1, 'triangle', 0.15);
    });
  }

  // ---- Background Music (simple procedural loop) ----

  playMenuMusic(): void {
    if (!this.musicEnabled) return;
    this.stopMusic();
    const ctx = this.ensureContext();
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.06;
    this.musicGain.connect(ctx.destination);

    // Simple ambient pad
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 220;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.3;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 30;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(this.musicGain);
    osc.start();
    lfo.start();
    this.musicOsc = osc;
  }

  stopMusic(): void {
    try {
      if (this.musicOsc) {
        this.musicOsc.stop();
        this.musicOsc.disconnect();
        this.musicOsc = null;
      }
      if (this.musicGain) {
        this.musicGain.disconnect();
        this.musicGain = null;
      }
    } catch { /* already stopped */ }
  }

  // ---- Primitive Sound Generators ----

  private playTone(freq: number, duration: number, type: OscillatorType, volume: number): void {
    const ctx = this.ensureContext();
    this.playToneAt(freq, ctx.currentTime, duration, type, volume);
  }

  private playToneAt(freq: number, startTime: number, duration: number, type: OscillatorType, volume: number): void {
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  private playSweep(freqStart: number, freqEnd: number, duration: number, type: OscillatorType, volume: number): void {
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.01);
  }

  private playNoise(duration: number, volume: number): void {
    const ctx = this.ensureContext();
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }
}
