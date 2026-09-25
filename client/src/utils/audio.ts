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

  // 4. Donkey Cut / Dramatic Loud Music Cue & Penalty Disadvantage Stinger
  public playCutMusic() {
    if (!this.enabled) return;
    const ctx = this.initCtx();

    // Also trigger recorded cut foley impact if available
    this.playSound('card-cut', { volume: 1.0 });

    if (!ctx) return;
    const now = ctx.currentTime;

    try {
      // Master Limiter / Compressor for loud, punchy, unclipped audio
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-6, now);
      compressor.knee.setValueAtTime(3, now);
      compressor.ratio.setValueAtTime(12, now);
      compressor.attack.setValueAtTime(0.003, now);
      compressor.release.setValueAtTime(0.15, now);
      compressor.connect(ctx.destination);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(1.1, now);
      masterGain.connect(compressor);

      // Part A: Heavy Sub-bass Drop / Impact Boom
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(130, now);
      subOsc.frequency.exponentialRampToValueAtTime(38, now + 0.35);
      subGain.gain.setValueAtTime(0.9, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      subOsc.connect(subGain);
      subGain.connect(masterGain);
      subOsc.start(now);
      subOsc.stop(now + 0.4);

      // Part B: Aggressive Slashing Whoosh Noise
      const bufferSize = Math.floor(ctx.sampleRate * 0.25);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(2200, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(400, now + 0.22);
      noiseFilter.Q.value = 2.5;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.65, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);
      noiseSource.start(now);
      noiseSource.stop(now + 0.25);

      // Part C: Dramatic Minor Brass Hit / Stabs (Loud Cinematic Stinger: Strike 1 & Strike 2)
      const chordNotes = [130.81, 155.56, 196.00, 261.63];
      chordNotes.forEach(freq => {
        // First Hit: immediate at now
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        const filter1 = ctx.createBiquadFilter();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, now);
        filter1.type = 'lowpass';
        filter1.frequency.setValueAtTime(1400, now);
        filter1.frequency.exponentialRampToValueAtTime(450, now + 0.22);
        gain1.gain.setValueAtTime(0.45, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc1.connect(filter1);
        filter1.connect(gain1);
        gain1.connect(masterGain);
        osc1.start(now);
        osc1.stop(now + 0.26);

        // Second Accented Hit: at now + 0.26s (Higher pitch sting)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        const filter2 = ctx.createBiquadFilter();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(freq * 1.189, now + 0.26);
        filter2.type = 'lowpass';
        filter2.frequency.setValueAtTime(1800, now + 0.26);
        filter2.frequency.exponentialRampToValueAtTime(500, now + 0.52);
        gain2.gain.setValueAtTime(0.5, now + 0.26);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc2.connect(filter2);
        filter2.connect(gain2);
        gain2.connect(masterGain);
        osc2.start(now + 0.26);
        osc2.stop(now + 0.56);
      });

      // Part D: Comedic & Dramatic Descending Disadvantage Horns (Penalty trombone slide)
      const penaltySteps = [
        { start: now + 0.58, dur: 0.16, freq: 311.13, endFreq: 293.66 }, // Eb4 -> D4
        { start: now + 0.76, dur: 0.16, freq: 293.66, endFreq: 277.18 }, // D4 -> C#4
        { start: now + 0.94, dur: 0.16, freq: 277.18, endFreq: 261.63 }, // C#4 -> C4
        { start: now + 1.12, dur: 0.55, freq: 261.63, endFreq: 196.00 }, // Big low slide C4 -> G3 (wahhh!)
      ];

      penaltySteps.forEach((step, idx) => {
        const brassOsc = ctx.createOscillator();
        const brassGain = ctx.createGain();
        const brassFilter = ctx.createBiquadFilter();

        brassOsc.type = 'sawtooth';
        brassOsc.frequency.setValueAtTime(step.freq, step.start);
        brassOsc.frequency.linearRampToValueAtTime(step.endFreq, step.start + step.dur);

        brassFilter.type = 'bandpass';
        brassFilter.frequency.setValueAtTime(step.freq * 1.6, step.start);
        brassFilter.frequency.linearRampToValueAtTime(step.endFreq * 1.2, step.start + step.dur);
        brassFilter.Q.value = 3.5;

        const vol = idx === penaltySteps.length - 1 ? 0.65 : 0.5;
        brassGain.gain.setValueAtTime(vol, step.start);
        brassGain.gain.exponentialRampToValueAtTime(0.001, step.start + step.dur);

        brassOsc.connect(brassFilter);
        brassFilter.connect(brassGain);
        brassGain.connect(masterGain);

        brassOsc.start(step.start);
        brassOsc.stop(step.start + step.dur + 0.05);
      });
    } catch (e) {
      // Fallback to donkey brass
      this.playDonkeySound();
    }
  }

  // Alias for backward compatibility
  public playCutSound() {
    this.playCutMusic();
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

  public playCallUnoSound() {
    if (!this.enabled) return;
    this.synthChime([523.25, 659.25, 783.99, 1046.5], 0.35);
  }

  public playCatchUnoSound() {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.3);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  public playStackSlamSound() {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.3);
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  public playReverseSound() {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.3);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playMercyEliminatedSound() {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.7);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.8);
  }
}

export const sounds = new SoundEffects();
