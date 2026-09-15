/**
 * REHAAN_ENGINE Web Audio Spatial Synthesis Engine
 * Provides dynamic spatial airflow velocity synthesis, sci-fi UI transients,
 * and cinematic distant starship laser blasters & explosion rumbles.
 */

export class SpatialAudioEngine {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;
    
    // Check saved user preference or default to true
    const saved = localStorage.getItem('rehaan_engine_audio_enabled');
    this.isEnabled = saved !== null ? saved === 'true' : true;

    // Audio graph nodes for ambient airflow
    this.noiseNode = null;
    this.windFilter = null;
    this.windGain = null;
    this.masterGain = null;

    // Combat Master Bus (subtle low-pass filtering for cinematic distant depth)
    this.combatBus = null;
    
    // Rate limit clicks
    this.lastClickTime = 0;
  }

  init() {
    if (this.isInitialized) {
      if (this.ctx && this.ctx.state === 'suspended' && this.isEnabled) {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Master gain node
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isEnabled ? 1 : 0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Cinematic Combat Sub-bus (low-pass filtered so space battle sounds feel distant and atmospheric)
      this.combatBus = this.ctx.createBiquadFilter();
      this.combatBus.type = 'lowpass';
      this.combatBus.frequency.setValueAtTime(1400, this.ctx.currentTime);
      this.combatBus.Q.setValueAtTime(0.7, this.ctx.currentTime);
      this.combatBus.connect(this.masterGain);

      // Generate pink/brown celestial noise buffer for spatial airflow
      const sampleRate = this.ctx.sampleRate;
      const bufferSize = sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
      const output = noiseBuffer.getChannelData(0);

      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.76160 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
        b6 = white * 0.115926;
      }

      this.noiseNode = this.ctx.createBufferSource();
      this.noiseNode.buffer = noiseBuffer;
      this.noiseNode.loop = true;

      // Resonant Lowpass Filter for whoosh shaping
      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'lowpass';
      this.windFilter.frequency.setValueAtTime(260, this.ctx.currentTime);
      this.windFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

      this.windGain = this.ctx.createGain();
      this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.noiseNode.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.masterGain);
      this.noiseNode.start(0);

      this.isInitialized = true;
    } catch (err) {
      console.warn('Spatial Web Audio initialization deferred:', err);
    }
  }

  // Distant Star Wars style Laser Blaster SFX (Cyan Rebel chirp or Red Imperial blaster)
  playLaser(faction = 'rebel', volume = 0.035) {
    if (!this.isEnabled || !this.ctx || !this.isInitialized) return;
    if (this.ctx.state === 'suspended') return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = faction === 'rebel' ? 'sawtooth' : 'square';
      const startF = faction === 'rebel' ? 950 + Math.random() * 200 : 780 + Math.random() * 150;
      const endF = faction === 'rebel' ? 120 : 90;

      osc.frequency.setValueAtTime(startF, now);
      osc.frequency.exponentialRampToValueAtTime(endF, now + 0.12);

      const targetVol = Math.min(0.06, Math.max(0.012, volume));
      gain.gain.setValueAtTime(targetVol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.combatBus || this.masterGain);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch (e) {}
  }

  // Distant Cinematic Deep Space Explosion Rumble
  playExplosion(volume = 0.08) {
    if (!this.isEnabled || !this.ctx || !this.isInitialized) return;
    if (this.ctx.state === 'suspended') return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.6);

      const actualVol = Math.min(0.12, Math.max(0.02, volume));
      gain.gain.setValueAtTime(actualVol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

      osc.connect(gain);
      gain.connect(this.combatBus || this.masterGain);

      osc.start(now);
      osc.stop(now + 0.68);
    } catch (e) {}
  }

  playClick() {
    if (!this.isEnabled) return;
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime;
    if (now - this.lastClickTime < 0.06) return;
    this.lastClickTime = now;

    try {
      // 1. Futuristic tonal chirp
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      osc.type = 'sine';
      const startFreq = 1800 + Math.random() * 300;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.045);

      oscGain.gain.setValueAtTime(0.08, now);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.05);

      // 2. Crisp UI snap transient
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();

      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(820, now);
      clickOsc.frequency.exponentialRampToValueAtTime(140, now + 0.025);

      clickGain.gain.setValueAtTime(0.12, now);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

      clickOsc.connect(clickGain);
      clickGain.connect(this.masterGain);

      clickOsc.start(now);
      clickOsc.stop(now + 0.03);
    } catch (e) {}
  }

  updateWind(speed) {
    if (!this.isInitialized || !this.isEnabled || !this.ctx || !this.windGain || !this.windFilter) return;

    const normalizedSpeed = Math.min(1.0, speed / 38);
    const targetGain = normalizedSpeed > 0.01 ? Math.min(0.24, 0.01 + normalizedSpeed * 0.22) : 0;
    const targetFreq = 260 + normalizedSpeed * 1100;

    const now = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(targetGain, now, 0.08);
    this.windFilter.frequency.setTargetAtTime(targetFreq, now, 0.08);
  }

  toggle() {
    this.isEnabled = !this.isEnabled;
    localStorage.setItem('rehaan_engine_audio_enabled', String(this.isEnabled));

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isEnabled ? 1 : 0, this.ctx.currentTime, 0.05);
    }

    if (this.isEnabled) {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } else {
      if (this.windGain && this.ctx) {
        this.windGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
      }
    }

    return this.isEnabled;
  }
}
