// Professional Audio Engine with Authentic Game Sound Effects
// Uses genuine recorded card & casino audio with Web Audio API pre-decoded buffers
// for zero-latency, realistic pitch variation, and robust fallback support.

class SoundEffects {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private buffers: Map<string, AudioBuffer> = new Map();
  private loadingPromises: Map<string, Promise<AudioBuffer | null>> = new Map();

  // Sound asset definitions
  private soundUrls: Record<string, string[]> = {
    'card-deal': ['/sounds/card-deal.ogg', '/sounds/card-deal-2.ogg'],
    'card-play': ['/sounds/card-play.ogg', '/sounds/card-play-2.ogg'],
    'card-select': ['/sounds/card-select.ogg'],
    'card-cut': ['/sounds/card-cut.ogg'],
    'card-shuffle': ['/sounds/card-shuffle.ogg'],
    'turn-bell': ['/sounds/turn-bell.ogg'],
    'victory': ['/sounds/victory.ogg'],
    'donkey-penalty': ['/sounds/donkey-penalty.ogg'],
  };

  constructor() {
    if (typeof window !== 'undefined') {
      // Pre-load audio assets on first user interaction or idle
      const warmUp = () => {
        this.initCtx();
        this.preloadAll();
        window.removeEventListener('click', warmUp);
        window.removeEventListener('touchstart', warmUp);
      };
      window.addEventListener('click', warmUp, { once: true });
      window.addEventListener('touchstart', warmUp, { once: true });

      // Background preload
      setTimeout(() => {
        this.preloadAll();
      }, 1000);
    }
  }

  private initCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private async loadBuffer(url: string): Promise<AudioBuffer | null> {
    if (this.buffers.has(url)) {
      return this.buffers.get(url)!;
    }
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    const promise = (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const arrayBuf = await res.arrayBuffer();
        const ctx = this.initCtx();
        if (!ctx) return null;
        const audioBuf = await ctx.decodeAudioData(arrayBuf);
        this.buffers.set(url, audioBuf);
        return audioBuf;
      } catch (err) {
        // Silently handle if format or fetch fails
        return null;
      }
    })();

    this.loadingPromises.set(url, promise);
    return promise;
  }

  public preloadAll() {
    Object.values(this.soundUrls).forEach(urls => {
      urls.forEach(url => this.loadBuffer(url));
    });
  }

  private playSound(
    soundKey: string,
    options: {
      volume?: number;
      pitchVariation?: number;
      fallback?: () => void;
    } = {}
  ) {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    const urls = this.soundUrls[soundKey] || [];
    if (urls.length === 0) {
      if (options.fallback) options.fallback();
      return;
    }

    // Pick a random variation if multiple available (e.g. card-play-1 vs card-play-2)
    const url = urls[Math.floor(Math.random() * urls.length)];
    const buffer = this.buffers.get(url);

    if (ctx && buffer) {
      try {
        const source = ctx.createBufferSource();
        source.buffer = buffer;

        // Realistic acoustic pitch micro-variation (+- 4%)
        const variation = options.pitchVariation ?? 0.05;
        if (variation > 0) {
          source.playbackRate.value = 1.0 + (Math.random() * 2 - 1) * variation;
        }

        const gainNode = ctx.createGain();
        gainNode.gain.value = Math.max(0, Math.min(1.5, options.volume ?? 1.0));

        source.connect(gainNode);
        gainNode.connect(ctx.destination);

        source.start(0);
        return;
      } catch (e) {
        // Fallback to HTML5 audio element
      }
    }

    // Attempt HTML5 Audio element fallback
    try {
      const audio = new Audio(url);
      audio.volume = Math.max(0, Math.min(1, options.volume ?? 1.0));
      audio.play().catch(() => {
        if (options.fallback) options.fallback();
      });
    } catch {
      if (options.fallback) options.fallback();
    }
  }

  // 1. Realistic Card Slide / Deal Sound
  public playCardDeal() {
    this.playSound('card-deal', {
      volume: 0.9,
      pitchVariation: 0.06,
      fallback: () => this.synthCardFoley(120, 0.12, 0.3)
    });
  }

  // 2. Realistic Card Select / Tap Sound
  public playCardSelect() {
    this.playSound('card-select', {
      volume: 0.85,
      pitchVariation: 0.04,
      fallback: () => this.synthCardSelect()
    });
  }

  // 3. Authentic Card Play / Slap on Felt Table
  public playCardPlay() {
    this.playSound('card-play', {
      volume: 1.0,
      pitchVariation: 0.05,
      fallback: () => this.synthCardFoley(80, 0.15, 0.5)
    });
  }

  // 4. Donkey Cut / All Trick Cards Swept to Player
  public playCutSound() {
    this.playSound('card-cut', {
      volume: 1.0,
      fallback: () => {
        this.synthCardFoley(60, 0.3, 0.6);
        this.playDonkeySound();
      }
    });
  }

  // 5. Card Shuffle
  public playCardShuffle() {
    this.playSound('card-shuffle', {
      volume: 0.85
    });
  }

  // 6. Turn Notification Bell / Chime (When it becomes your turn)
  public playTurnAlert() {
    this.playSound('turn-bell', {
      volume: 0.8,
      fallback: () => this.synthChime([880, 1320], 0.25)
    });
  }

  // 7. Time Warning (When turn timer is low <= 5s)
  public playUnoWarning() {
    this.playSound('turn-bell', {
      volume: 0.7,
      pitchVariation: 0.1,
      fallback: () => this.synthChime([660, 880], 0.15)
    });
  }

  // 8. Victory Celebration Fanfare (When a player clears cards / wins)
  public playVictory() {
    this.playSound('victory', {
      volume: 1.0,
      fallback: () => this.synthChime([523.25, 659.25, 783.99, 1046.5], 0.45)
    });
  }

  // 9. Donkey Penalty Sound (When player is cut or becomes the Donkey)
  public playDonkeySound() {
    this.playSound('donkey-penalty', {
      volume: 0.95,
      fallback: () => this.synthDonkeyBrass()
    });
  }

  // 10. Cute Bubble Pop (When invalid card is tapped)
  public playPop() {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Frequency sweeps smoothly down from 750Hz to 320Hz for a crisp bubble pop
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.07);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  // --- Organic Procedural Foley Synthesizers (High-Quality Fallbacks) ---

  // Realistic card paper friction / tap synthesis using bandpass filtered noise
  private synthCardFoley(freq: number, duration: number, gainVal: number) {
    const ctx = this.initCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * duration;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 8, now);
    filter.frequency.exponentialRampToValueAtTime(freq * 2, now + duration);
    filter.Q.value = 3.0;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + duration);
  }

  private synthCardSelect() {
    const ctx = this.initCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.04);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  private synthChime(notes: number[], noteDuration: number) {
    const ctx = this.initCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.09;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + noteDuration);
    });
  }

  private synthDonkeyBrass() {
    const ctx = this.initCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.linearRampToValueAtTime(460, now + 0.18);
    osc.frequency.linearRampToValueAtTime(180, now + 0.42);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  }
}

export const sounds = new SoundEffects();
