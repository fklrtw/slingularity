import { useEffect, useRef } from 'react';
import { AUDIO_CONFIG } from '../audio.config';
import { useGameStore } from '../store';
import { useFrame } from '@react-three/fiber';
import type React from 'react';
import type { Mesh } from 'three';
import type { SystemRefData } from '../entities/solar-system';
import { DIFFICULTY_SCORING_SCORE_CRITICAL_THRESHOLD } from '../difficulty.config';

/**
 * Procedural Sound Effects Engine using native Web Audio API
 * Synthesizes all in-game sound effects dynamically.
 */
export class SFXEngine {
  private analyzer: AnalyserNode | null = null;
  private cometFilter: BiquadFilterNode | null = null;
  private cometGain: GainNode | null = null;
  private cometSource: AudioBufferSourceNode | null = null;
  private ctx: AudioContext | null = null;
  private dragGain: GainNode | null = null;
  private dragSource: AudioBufferSourceNode | null = null;
  private listeners: ((event: { type: string, label: string }) => void)[] = [];
  private masterGain: GainNode | null = null;
  private mixer: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sunFilter: BiquadFilterNode | null = null;
  private sunGain: GainNode | null = null;
  private sunSource: AudioBufferSourceNode | null = null;

  /**
   * Adds a listener for SFX trigger events.
   * @param cb - Callback function for SFX events.
   * @returns Cleanup function.
   */
  addSfxListener(cb: (event: { type: string, label: string }) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  /**
   * Returns the global analyzer node.
   * @returns The AnalyserNode or null.
   */
  getAnalyzer() {
    return this.analyzer;
  }

  /**
   * Returns the current AudioContext.
   * @returns The AudioContext or null.
   */
  getCtx() {
    return this.ctx;
  }

  /**
   * Returns the node that Music engine should connect to.
   * @returns The GainNode or null.
   */
  getMusicOutput() {
    return this.musicGain;
  }

  /**
   * Initializes the AudioContext and sets up the routing graph.
   */
  init() {
    if (typeof window === 'undefined' || (!window.AudioContext && !(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)) {
      return;
    }
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      this.analyzer = this.ctx.createAnalyser();
      this.analyzer.fftSize = 2048;

      this.mixer = this.ctx.createGain();
      this.mixer.connect(this.ctx.destination);
      this.mixer.connect(this.analyzer);

      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.mixer);

      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.mixer);
    }
    this.resume();
  }

  /**
   * Broadcasts an SFX event to all listeners.
   * @param type - The SFX category.
   * @param label - Descriptive label for visuals.
   */
  private notify(type: string, label: string) {
    this.listeners.forEach(l => l({ type, label }));
  }

  /**
   * Plays a subtle sweeping comet annihilation sound.
   */
  playCometAnnihilation() {
    this.notify('explosion', 'COMET');
    if (!this.ctx) {
      return;
    }
    const t = this.ctx.currentTime;

    this.playNoiseExplosion(0.05, AUDIO_CONFIG.SFX.VOLUMES.COMET_ANNIHILATION_NOISE, 4000, 'bandpass');
    this.playNoiseExplosion(0.4, AUDIO_CONFIG.SFX.VOLUMES.COMET_ANNIHILATION_NOISE * 0.5, 1500, 'lowpass');

    [1.5, 1.6, 1.7].forEach((detune) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400 * detune, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.3);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(AUDIO_CONFIG.SFX.VOLUMES.COMET_ANNIHILATION_SWEEP, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(gain);
      if (this.masterGain) {
        gain.connect(this.masterGain);
      }
      osc.start(t);
      osc.stop(t + 0.4);
    });

    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(250, t);
    sub.frequency.exponentialRampToValueAtTime(50, t + 0.2);

    subGain.gain.setValueAtTime(0, t);
    subGain.gain.linearRampToValueAtTime(AUDIO_CONFIG.SFX.VOLUMES.COMET_ANNIHILATION_SWEEP * 2, t + 0.02);
    subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    sub.connect(subGain);
    if (this.masterGain) {
      subGain.connect(this.masterGain);
    }
    sub.start(t);
    sub.stop(t + 0.4);

    this.playImpactReverb(1.0, AUDIO_CONFIG.SFX.VOLUMES.COMET_ANNIHILATION_SWEEP * 0.8, 80);
  }

  /**
   * Plays a high-impact structural hull failure sound.
   */
  playCrash() {
    this.notify('crash', 'CRASH');
    if (!this.ctx) {
      return;
    }
    const t = this.ctx.currentTime;

    this.playNoiseExplosion(0.12, 1.8, 3500, 'bandpass');
    this.playNoiseExplosion(0.08, 1.5, 8000, 'highpass');

    [1, 1.03].forEach((detune) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100 * detune, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.5);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.6, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      osc.connect(gain);
      if (this.masterGain) {
        gain.connect(this.masterGain);
      }
      osc.start(t);
      osc.stop(t + 0.6);
    });

    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(160, t + 0.05);
    thud.frequency.exponentialRampToValueAtTime(25, t + 2.0);

    thudGain.gain.setValueAtTime(0, t + 0.05);
    thudGain.gain.linearRampToValueAtTime(1.8, t + 0.1);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);

    thud.connect(thudGain);
    if (this.masterGain) {
      thudGain.connect(this.masterGain);
    }
    thud.start(t + 0.05);
    thud.stop(t + 2.6);

    this.playImpactReverb(3.5, 1.2, 40);
  }

  /**
   * Plays a low-frequency descending sine sweep for game over.
   */
  playGameOver() {
    this.notify('ui', 'GAME OVER');
    this.resume();
    if (!this.ctx || !this.masterGain) {
      return;
    }
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Increased volume for Game Over
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 1.5);

    gain.gain.setValueAtTime(AUDIO_CONFIG.SFX.VOLUMES.GAME_OVER * 2.0, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 1.6);

    // Impact reverb tail
    this.playImpactReverb(3.0, AUDIO_CONFIG.SFX.VOLUMES.GAME_OVER * 1.5, 60);
  }

  /**
   * Internal helper for deep resonant tails.
   * @param duration - Tail length.
   * @param volume - Peak gain.
   * @param freq - Filter frequency.
   */
  private playImpactReverb(duration: number, volume: number, freq: number) {
    if (!this.ctx) {
      return;
    }
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq, t);
    filter.frequency.exponentialRampToValueAtTime(10, t + duration);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    source.connect(filter);
    filter.connect(g);
    if (this.masterGain) {
      g.connect(this.masterGain);
    }
    source.start(t);
  }

  /**
   * Synthesizes and plays a falling sawtooth laser shot.
   */
  playLaser() {
    this.notify('laser', 'LASER');
    if (!this.ctx) {
      return;
    }
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    if (this.masterGain) {
      gain.connect(this.masterGain);
    };

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1500, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 1.0);

    gain.gain.setValueAtTime(AUDIO_CONFIG.SFX.VOLUMES.LASER, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);

    osc.start(t);
    osc.stop(t + 1.1);
  }

  /**
   * Plays a double-beep urgency pattern.
   */
  playLowEnergyWarning() {
    this.notify('ui', 'LOW ENERGY');
    if (!this.ctx) {
      return;
    }
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.setValueAtTime(440, t + 0.1);
    osc.frequency.setValueAtTime(330, t + 0.15);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(AUDIO_CONFIG.SFX.VOLUMES.LOW_ENERGY, t + 0.02);
    gain.gain.linearRampToValueAtTime(0, t + 0.1);
    gain.gain.linearRampToValueAtTime(AUDIO_CONFIG.SFX.VOLUMES.LOW_ENERGY * 0.8, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    if (this.masterGain) {
      gain.connect(this.masterGain);
    }
    osc.start(t);
    osc.stop(t + 0.35);
  }

  /**
   * Internal helper for noise-based effects.
   * @param duration - Burst length.
   * @param volume - Peak gain.
   * @param freq - Filter frequency.
   * @param type - Filter type.
   */
  private playNoiseExplosion(duration: number, volume: number, freq: number, type: BiquadFilterType = 'lowpass') {
    if (!this.ctx) {
      return;
    }
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    filter.frequency.exponentialRampToValueAtTime(freq * 0.1, t + duration);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    source.connect(filter);
    filter.connect(g);
    if (this.masterGain) {
      g.connect(this.masterGain);
    }
    source.start(t);
  }

  /**
   * Plays a massive resonant celestial explosion.
   */
  playPlanetAnnihilation() {
    this.notify('explosion', 'PLANET');
    if (!this.ctx) {
      return;
    }
    const t = this.ctx.currentTime;

    this.playNoiseExplosion(0.1, AUDIO_CONFIG.SFX.VOLUMES.PLANET_ANNIHILATION_NOISE * 1.5, 2500, 'bandpass');
    this.playNoiseExplosion(1.2, AUDIO_CONFIG.SFX.VOLUMES.PLANET_ANNIHILATION_NOISE, 800, 'lowpass');

    [1, 1.05, 1.1].forEach((detune) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = detune === 1 ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(180 * detune, t);
      osc.frequency.exponentialRampToValueAtTime(20, t + 0.8);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(AUDIO_CONFIG.SFX.VOLUMES.PLANET_ANNIHILATION_CLUSTER, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

      osc.connect(gain);
      if (this.masterGain) {
        gain.connect(this.masterGain);
      }
      osc.start(t);
      osc.stop(t + 0.9);
    });

    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(150, t);
    sub.frequency.exponentialRampToValueAtTime(10, t + 0.6);

    subGain.gain.setValueAtTime(0, t);
    subGain.gain.linearRampToValueAtTime(AUDIO_CONFIG.SFX.VOLUMES.PLANET_ANNIHILATION_SUB * 1.5, t + 0.05);
    subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.7);

    sub.connect(subGain);
    if (this.masterGain) {
      subGain.connect(this.masterGain);
    }
    sub.start(t);
    sub.stop(t + 0.8);

    this.playImpactReverb(2.0, AUDIO_CONFIG.SFX.VOLUMES.PLANET_ANNIHILATION_SUB * 0.6, 50);
  }

  /**
   * Plays a high-pitched rising portal emergence sound.
   */
  playPortalEmerge() {
    this.notify('portal', 'PORTAL');
    if (!this.ctx) {
      return;
    }
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(1500, t + 0.4);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(AUDIO_CONFIG.SFX.VOLUMES.PORTAL_EMERGE, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(gain);
    if (this.masterGain) {
      gain.connect(this.masterGain);
    };
    osc.start(t);
    osc.stop(t + 0.6);
  }

  /**
   * Plays a high-pitched falling portal entry sound.
   */
  playPortalEnter() {
    this.notify('portal', 'ENTRY');
    if (!this.ctx) {
      return;
    }
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1500, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.4);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(AUDIO_CONFIG.SFX.VOLUMES.PORTAL_EMERGE, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(gain);
    if (this.masterGain) {
      gain.connect(this.masterGain);
    };
    osc.start(t);
    osc.stop(t + 0.6);
  }

  /**
   * Plays a mission restart beep.
   */
  playRestart() {
    this.notify('ui', 'RESTART');
    if (!this.ctx) {
      return;
    }
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.2);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(AUDIO_CONFIG.SFX.VOLUMES.RESTART, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain);
    if (this.masterGain) {
      gain.connect(this.masterGain);
    }
    osc.start(t);
    osc.stop(t + 0.35);
  }

  /**
   * Plays a cinematic mission start sweep.
   */
  playStartMission() {
    this.notify('ui', 'START');
    if (!this.ctx) {
      return;
    }
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 1.0);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(AUDIO_CONFIG.SFX.VOLUMES.START_MISSION, t + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    osc.connect(gain);
    if (this.masterGain) {
      gain.connect(this.masterGain);
    }
    osc.start(t);
    osc.stop(t + 1.3);
  }

  /**
   * Plays a sub-bass solar engulfment sound.
   */
  playSunFall() {
    this.notify('sun', 'SUN GULP');
    if (!this.ctx) {
      return;
    }
    const t = this.ctx.currentTime;

    const searDuration = 0.3;
    const searBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * searDuration, this.ctx.sampleRate);
    const searData = searBuffer.getChannelData(0);
    for (let i = 0; i < searData.length; i++) {
      searData[i] = Math.random() * 2 - 1;
    }
    const searSource = this.ctx.createBufferSource();
    searSource.buffer = searBuffer;
    const searFilter = this.ctx.createBiquadFilter();
    searFilter.type = 'lowpass';
    searFilter.frequency.setValueAtTime(200, t);
    searFilter.frequency.exponentialRampToValueAtTime(8000, t + searDuration);
    const searGain = this.ctx.createGain();
    searGain.gain.setValueAtTime(0.001, t);
    searGain.gain.linearRampToValueAtTime(AUDIO_CONFIG.SFX.VOLUMES.SUN_GULP_SEAR, t + searDuration * 0.8);
    searGain.gain.exponentialRampToValueAtTime(0.001, t + searDuration);
    searSource.connect(searFilter);
    searFilter.connect(searGain);
    if (this.masterGain) {
      searGain.connect(this.masterGain);
    }
    searSource.start(t);

    const pingOsc = this.ctx.createOscillator();
    const pingGain = this.ctx.createGain();
    pingOsc.type = 'square';
    pingOsc.frequency.setValueAtTime(4000, t + 0.3);
    pingOsc.frequency.exponentialRampToValueAtTime(1000, t + 0.5);
    pingGain.gain.setValueAtTime(0, t + 0.3);
    pingGain.gain.linearRampToValueAtTime(AUDIO_CONFIG.SFX.VOLUMES.SUN_GULP_VAPOR, t + 0.31);
    pingGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    pingOsc.connect(pingGain);
    if (this.masterGain) {
      pingGain.connect(this.masterGain);
    }
    pingOsc.start(t + 0.3);
    pingOsc.stop(t + 0.6);

    const thudOsc = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(120, t + 0.3);
    thudOsc.frequency.exponentialRampToValueAtTime(20, t + 1.0);
    thudGain.gain.setValueAtTime(0, t + 0.3);
    thudGain.gain.linearRampToValueAtTime(AUDIO_CONFIG.SFX.VOLUMES.SUN_GULP_THUD, t + 0.35);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
    thudOsc.connect(thudGain);
    if (this.masterGain) {
      thudGain.connect(this.masterGain);
    }
    thudOsc.start(t + 0.3);
    thudOsc.stop(t + 1.2);
  }

  /**
   * Plays a clean UI interaction beep.
   */
  playUIClick() {
    this.notify('ui', 'CLICK');
    if (!this.ctx) {
      return;
    }
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.1);
    gain.gain.setValueAtTime(AUDIO_CONFIG.SFX.VOLUMES.UI_CLICK, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain);
    if (this.masterGain) {
      gain.connect(this.masterGain);
    }
    osc.start(t);
    osc.stop(t + 0.15);
  }

  /**
   * Fades out all audio by ramping the mixer gain to near-zero.
   * @param duration - Time in seconds for the fade.
   */
  fadeOut(duration: number) {
    if (!this.ctx || !this.mixer) {
      return;
    }
    const t = this.ctx.currentTime;
    // Use exponential ramp for natural fade, but must ramp to a non-zero value
    this.mixer.gain.setValueAtTime(this.mixer.gain.value, t);
    this.mixer.gain.exponentialRampToValueAtTime(0.001, t + duration);
  }

  /**
   * Resets the mixer gain to full (1.0).
   */
  resetMixer() {
    if (!this.ctx || !this.mixer) {
      return;
    }
    this.mixer.gain.setValueAtTime(1.0, this.ctx.currentTime);
  }

  /**
   * Resumes the AudioContext if suspended.
   */
  resume() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      if (this.analyzer && this.mixer) {
        this.mixer.connect(this.ctx.destination);
        this.mixer.connect(this.analyzer);
      }
    }
  }

  /**
   * Sets the master volume for sound effects.
   * @param volume - Slider value (0-1).
   */
  setVolume(volume: number) {
    if (this.masterGain && this.ctx) {
      const gain = Math.max(0, volume * volume);
      this.masterGain.gain.setValueAtTime(gain, this.ctx.currentTime);
    }
  }

  /**
   * Updates atmospheric drag rumble.
   * @param isDragging - Active state.
   * @param intensity - Depth factor.
   */
  updateAtmosphericDrag(isDragging: boolean, intensity = 0) {
    if (!this.ctx) {
      return;
    }
    if (isDragging && !this.dragSource) {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      this.dragSource = this.ctx.createBufferSource();
      this.dragSource.buffer = buffer;
      this.dragSource.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;

      this.dragGain = this.ctx.createGain();
      this.dragGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

      this.dragSource.connect(filter);
      filter.connect(this.dragGain);
      if (this.masterGain) {
        this.dragGain.connect(this.masterGain);
      }
      this.dragSource.start();
    }

    if (this.dragGain) {
      const targetGain = isDragging ? Math.min(AUDIO_CONFIG.SFX.VOLUMES.DRAG_MAX, intensity * AUDIO_CONFIG.SFX.VOLUMES.DRAG_MAX) : 0.001;
      this.dragGain.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + 0.1);
    }

    if (!isDragging && this.dragSource && this.dragGain) {
      const src = this.dragSource;
      this.dragSource = null;
      this.dragGain = null;
      setTimeout(() => {
        try {
          src.stop();
          src.disconnect();
        } catch {
          // Ignore
        }
      }, 150);
    }
  }

  /**
   * Updates comet proximity whoosh.
   * @param isActive - Active state.
   * @param distance - Proximity factor.
   */
  updateCometProximity(isActive: boolean, distance: number) {
    if (!this.ctx) {
      return;
    }
    if (isActive && !this.cometSource) {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      this.cometSource = this.ctx.createBufferSource();
      this.cometSource.buffer = buffer;
      this.cometSource.loop = true;

      this.cometFilter = this.ctx.createBiquadFilter();
      this.cometFilter.type = 'bandpass';
      this.cometFilter.Q.value = 1.0;

      this.cometGain = this.ctx.createGain();
      this.cometGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

      this.cometSource.connect(this.cometFilter);
      this.cometFilter.connect(this.cometGain);
      if (this.masterGain) {
        this.cometGain.connect(this.masterGain);
      }
      this.cometSource.start();
    }

    if (this.cometGain && this.cometFilter) {
      const rawIntensity = AUDIO_CONFIG.SFX.VOLUMES.COMET_PROXIMITY_FACTOR / (distance * distance + 1);

      const targetGain = isActive ? Math.min(AUDIO_CONFIG.SFX.VOLUMES.COMET_PROXIMITY_MAX, rawIntensity) : 0.001;
      this.cometGain.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + 0.1);

      const targetFreq = isActive ? Math.min(3000, 400 + rawIntensity * 3000) : 400;
      this.cometFilter.frequency.linearRampToValueAtTime(targetFreq, this.ctx.currentTime + 0.1);
    }

    if (!isActive && this.cometSource && this.cometGain) {
      const src = this.cometSource;
      this.cometSource = null;
      this.cometGain = null;
      this.cometFilter = null;
      setTimeout(() => {
        try {
          src.stop();
          src.disconnect();
        } catch {
          // Ignore
        }
      }, 150);
    }
  }

  /**
   * Updates sun proximity roar.
   * @param isActive - Active state.
   * @param distance - Proximity factor.
   */
  updateSunProximity(isActive: boolean, distance: number) {
    if (!this.ctx) {
      return;
    }
    if (isActive && !this.sunSource) {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      this.sunSource = this.ctx.createBufferSource();
      this.sunSource.buffer = buffer;
      this.sunSource.loop = true;

      this.sunFilter = this.ctx.createBiquadFilter();
      this.sunFilter.type = 'lowpass';

      this.sunGain = this.ctx.createGain();
      this.sunGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

      this.sunSource.connect(this.sunFilter);
      this.sunFilter.connect(this.sunGain);
      if (this.masterGain) {
        this.sunGain.connect(this.masterGain);
      }
      this.sunSource.start();
    }

    if (this.sunGain && this.sunFilter) {
      const rawIntensity = AUDIO_CONFIG.SFX.VOLUMES.SUN_PROXIMITY_FACTOR / (distance * distance + 1);
      const targetGain = isActive ? Math.min(AUDIO_CONFIG.SFX.VOLUMES.SUN_PROXIMITY_MAX * 0.5, rawIntensity * 0.2) : 0.001;
      this.sunGain.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + 0.1);

      const targetFreq = isActive ? Math.min(500, 60 + rawIntensity * 200) : 60;
      this.sunFilter.frequency.linearRampToValueAtTime(targetFreq, this.ctx.currentTime + 0.1);
    }

    if (!isActive && this.sunSource && this.sunGain) {
      const src = this.sunSource;
      this.sunSource = null;
      this.sunGain = null;
      this.sunFilter = null;
      setTimeout(() => {
        try {
          src.stop();
          src.disconnect();
        } catch {
          // Ignore
        }
      }, 150);
    }
  }
}

import { setSfxEngine } from '../audio/sfx-proxy';

export const sfx = new SFXEngine();
setSfxEngine(sfx);

/**
 * Hook to manage spatial audio effects based on game state.
 */
export function useAudioEffects(
  systemRef: React.RefObject<SystemRefData>,
  spaceshipRef: React.RefObject<Mesh | null>
) {
  const sfxEnabled = useGameStore(s => s.settings.sfxEnabled);
  const sfxVolume = useGameStore(s => s.settings.sfxVolume);
  const gameStarted = useGameStore(s => s.gameStarted);
  const laserEvent = useGameStore(s => s.laserEvent);
  const lastAnnihilatedIndex = useGameStore(s => s.lastAnnihilatedIndex);
  const isStarting = useGameStore(s => s.isStarting);
  const isFinishing = useGameStore(s => s.isFinishing);
  const isDying = useGameStore(s => s.isDying);
  const gameOver = useGameStore(s => s.gameOver);
  const gameOverReason = useGameStore(s => s.gameOverReason);

  const prevLaserEventRef = useRef(laserEvent);
  const prevAnnihilatedRef = useRef(lastAnnihilatedIndex);
  const prevIsDyingRef = useRef(isDying);
  const prevGameOverRef = useRef(gameOver);
  const prevIsStartingRef = useRef(isStarting);
  const prevIsFinishingRef = useRef(isFinishing);
  const lastWarningScoreRef = useRef<number | null>(null);
  const muteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    sfx.setVolume(sfxVolume);
  }, [sfxVolume]);

  useEffect(() => {
    if (gameStarted && sfxEnabled) {
      sfx.init();
      sfx.resetMixer();
    }
  }, [gameStarted, sfxEnabled]);

  useEffect(() => {
    if (!gameStarted || !sfxEnabled) {
      return;
    }

    if (isStarting && !prevIsStartingRef.current) {
      sfx.playPortalEmerge();
    }
    if (isFinishing && !prevIsFinishingRef.current) {
      sfx.playPortalEnter();
    }

    if (laserEvent && laserEvent !== prevLaserEventRef.current) {
      sfx.playLaser();
    }

    if (lastAnnihilatedIndex !== null && lastAnnihilatedIndex !== prevAnnihilatedRef.current) {
      const isComet = systemRef.current.planets[lastAnnihilatedIndex]?.isComet;
      if (isComet) {
        sfx.playCometAnnihilation();
      } else {
        sfx.playPlanetAnnihilation();
      }
    }

    if (isDying && !prevIsDyingRef.current) {
      if (gameOverReason.toLowerCase().includes('sun')) {
        sfx.playSunFall();
      } else if (gameOverReason.toLowerCase().includes('crashed')) {
        sfx.playCrash();
      }
    }

    if (gameOver && !prevGameOverRef.current) {
      sfx.playGameOver();
    }

    prevLaserEventRef.current = laserEvent;
    prevAnnihilatedRef.current = lastAnnihilatedIndex;
    prevIsDyingRef.current = isDying;
    prevGameOverRef.current = gameOver;
    prevIsStartingRef.current = isStarting;
    prevIsFinishingRef.current = isFinishing;
  }, [laserEvent, lastAnnihilatedIndex, isDying, gameOver, gameOverReason, gameStarted, sfxEnabled, systemRef, isStarting, isFinishing]);

  // check for low-energy warnings non-reactively to prevent root-level re-renders
  useEffect(() => {
    if (typeof useGameStore.subscribe !== 'function') {
      return;
    }
    const unsub = useGameStore.subscribe((state) => {
      if (!state.gameStarted || !state.settings.sfxEnabled) {
        return;
      }
      const scoreVal = state.score.toNumber();
      if (scoreVal < DIFFICULTY_SCORING_SCORE_CRITICAL_THRESHOLD && !state.isDying && !state.gameOver && !state.isFinishing) {
        const threshold = Math.floor(scoreVal / 100) * 100;
        if (lastWarningScoreRef.current === null || threshold < lastWarningScoreRef.current) {
          sfx.playLowEnergyWarning();
          lastWarningScoreRef.current = threshold;
        }
      } else if (scoreVal >= DIFFICULTY_SCORING_SCORE_CRITICAL_THRESHOLD) {
        lastWarningScoreRef.current = null;
      }
    });
    return unsub;
  }, []);

  useFrame(() => {
    const state = useGameStore.getState();
    if (state.gameOver || state.levelFinished || state.isFinishing) {
      if (!muteTimerRef.current) {
        // Wait 4 seconds for most sounds to finish, then fade out over 2 seconds
        muteTimerRef.current = setTimeout(() => {
          sfx.fadeOut(2.0);
        }, 4000);
      }
    } else if (muteTimerRef.current) {
      clearTimeout(muteTimerRef.current);
      muteTimerRef.current = null;
      sfx.resetMixer();
      sfx.setVolume(sfxVolume);
    }

    if (!gameStarted || !sfxEnabled || state.gameOver || state.levelFinished || state.isFinishing || state.isDying) {
      sfx.updateAtmosphericDrag(false);
      sfx.updateSunProximity(false, 1000);
      sfx.updateCometProximity(false, 1000);
      return;
    }

    const { planets } = systemRef.current;
    const spaceship = spaceshipRef.current;
    if (!planets || !spaceship) {
      return;
    }

    let isDragging = false;
    let dragIntensity = 0;
    const distToSun = spaceship.position.length();
    sfx.updateSunProximity(true, distToSun);

    let hasComet = false;
    let closestCometDist = 1000;

    for (const p of planets) {
      const dist = spaceship.position.distanceTo(p.position);
      if (p.isComet) {
        hasComet = true;
        closestCometDist = Math.min(closestCometDist, dist);
      }
      if (p.atmosphereRadius && dist < p.atmosphereRadius) {
        isDragging = true;
        const outerR = p.atmosphereRadius;
        const depth = Math.max(0, outerR - dist) / (outerR - p.radius);
        dragIntensity = Math.max(dragIntensity, depth);
      }
    }

    sfx.updateAtmosphericDrag(isDragging, dragIntensity);
    sfx.updateCometProximity(hasComet, closestCometDist);
  });
}
