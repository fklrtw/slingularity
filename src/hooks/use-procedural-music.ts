import { useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import { sfx } from '../audio/sfx-proxy';
import { AUDIO_CONFIG } from '../audio.config';

// Strudel is loaded dynamically to reduce initial bundle size

class ProceduralMusicEngine {
  private initPromise: Promise<void> | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private strudel: any = null;
  public currentVariation: 'normal' | 'orbit' | 'skip' | 'victory' | 'gameover' = 'normal';
  public currentNotes = 0;
  public lastCps = 1.0;
  private revertTimeout: ReturnType<typeof setTimeout> | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private hapListeners: ((hap: any) => void)[] = [];

  async init() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      if (!sfx.getCtx()) {
        sfx.init();
      }

      try {
        // @ts-expect-error The @strudel/web package does not provide types out of the box
        const strudelWeb = await import('@strudel/web');
        const { initStrudel } = strudelWeb;

        // STABLE INTEGRATION: Per REQUIREMENTS.md, we MUST NOT use defaultOutput override.
        // We use the 'output' parameter to route to our mixer.
        this.strudel = await initStrudel({
          audioContext: sfx.getCtx()!,
          output: sfx.getMusicOutput() || undefined,
          prebake: () => {},
          // Event listeners for Particle visualization
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onHap: (hap: any) => {
            this.hapListeners.forEach(listener => listener(hap));
          }
        });

        if (import.meta.env.DEV) {
          console.log('Strudel Engine Initialized (Standard Routing)');
        }

        sfx.resume();
      } catch (e) {
        console.error('Failed to initialize Strudel:', e);
        this.initPromise = null; // Allow retry
      }
    })();

    return this.initPromise;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addHapListener(cb: (hap: any) => void) {
    this.hapListeners.push(cb);
    return () => {
      this.hapListeners = this.hapListeners.filter(l => l !== cb);
    };
  }

  setTempo(cps: number) {
    if (Math.abs(cps - this.lastCps) > 0.1) {
      this.lastCps = cps;
      this.evaluateCode(this.currentVariation, this.currentNotes);
    }
  }

  getStackCode(scale: string = AUDIO_CONFIG.MUSIC.SCALES.BASE, variation: 'normal' | 'orbit' | 'skip' | 'victory' | 'gameover' = 'normal', notes = 0) {
    const musicVolumeSlider = useGameStore.getState().settings.musicVolume ?? 1.0;
    // Quadratic mapping for perceived linearity: gain = volume^2
    const musicVolume = musicVolumeSlider * musicVolumeSlider;

    // Base components for the "nice" random melody
    const mel1 = `note(irand(12).segment(8)).scale("${scale}").s("sine").cutoff(perlin.range(600, 2000).fast(0.2)).room(0.8).gain(0.4).jux(rev)`;
    const mel2 = `note(irand(12).segment(4)).scale("${scale}").s("sine").cutoff(perlin.range(400, 1200).fast(0.1)).room(0.9).gain(0.35).delay(0.5).jux(rev)`;

    const bass = `note("0").scale("${scale}").s("triangle").gain(0.25).decay(2.0).slow(2)`;

    let finalSeq = `chooseCycles(stack(${mel1}, ${bass}), stack(${mel2}, ${bass}))`;
    const targetCps = 1.0;

    // Event-based variations REPLACE the normal melody for their duration
    if (variation === 'victory') {
      // Matches the 0.2s interval of the SFX chime (roughly 4 notes in 0.8s)
      const victoryNotes = `note("C5 E5 G5 C6").scale("${AUDIO_CONFIG.MUSIC.SCALES.VICTORY}").s("sine").gain(0.7).decay(4).room(0.9).struct("x x x x")`;
      finalSeq = `stack(${victoryNotes}, note("C3").s("triangle").gain(0.5).decay(6).struct("x"))`;
    } else if (variation === 'orbit') {
      const orbitNotes = `note("0 4 7 12").scale("${scale}").s("sine").gain(0.4).room(0.6).decay(0.4)`;
      finalSeq = `stack(${orbitNotes}, ${bass})`;
    } else if (variation === 'skip') {
      const skipNotes = `note(run(${notes})).scale("${scale}").s("sine").gain(0.5).room(0.6).decay(0.2)`;
      finalSeq = `stack(${skipNotes}, ${bass})`;
    } else if (variation === 'gameover') {
      // Single minor chord strike (C Eb G) in base scale
      finalSeq = `note("0 2 4").scale("${scale}").s("sine").gain(1.3).decay(4.0).room(1.0).struct("x").slow(8)`;
    }

    return `
      setcps(${targetCps})
      ${finalSeq}.gain(${musicVolume})
    `;
  }

  evaluateCode(variation: 'normal' | 'orbit' | 'skip' | 'victory' | 'gameover' = 'normal', notes = 0) {
    this.currentVariation = variation;
    this.currentNotes = notes;
    if (!this.strudel) {
      return;
    }

    const scale = variation === 'orbit' || variation === 'skip' ? AUDIO_CONFIG.MUSIC.SCALES.SKIP : AUDIO_CONFIG.MUSIC.SCALES.BASE;
    this.strudel.evaluate(this.getStackCode(scale, variation, notes));

    // Non-invasive routing check: Try to connect Strudel's main output node if accessible
    const musicOutput = sfx.getMusicOutput();
    if (this.strudel.output && musicOutput) {
      try {
        // Only connect if it's a valid AudioNode and not already connected
        if (typeof this.strudel.output.connect === 'function') {
          this.strudel.output.connect(musicOutput);
        }
      } catch {
        // Ignore
      }
    }
  }

  playEvent(variation: 'normal' | 'orbit' | 'skip' | 'victory' | 'gameover', notes = 0) {
    if (this.revertTimeout) {
      clearTimeout(this.revertTimeout);
      this.revertTimeout = null;
    }

    this.evaluateCode(variation, notes);

    if (variation === 'orbit' || variation === 'skip' || variation === 'victory') {
      const durationMs = 1000; // 1 cycle at 1.0 CPS
      this.revertTimeout = setTimeout(() => {
        this.evaluateCode('normal');
      }, durationMs);
    } else if (variation === 'gameover') {
      // Hush after 6 seconds to allow reverb tail to finish
      this.revertTimeout = setTimeout(() => {
        this.hush();
      }, 6000);
    }
  }

  stop() {
    this.strudel?.stop?.();
  }

  hush() {
    this.strudel?.evaluate?.('hush');
  }

  isReady() {
    return this.strudel !== null;
  }
}

export const music = new ProceduralMusicEngine();

/**
 * Custom hook to manage procedural music using Strudel.js
 * Synthesizes a sci-fi atmosphere that reacts to spaceship velocity.
 */
export function useProceduralMusic() {
  const musicEnabled = useGameStore(s => s.settings.musicEnabled);
  const sfxEnabled = useGameStore(s => s.settings.sfxEnabled);
  const gameStarted = useGameStore(s => s.gameStarted);

  // 1. Core Initialization & Start Music
  useEffect(() => {
    if (!musicEnabled && !sfxEnabled) {
      return;
    }

    let isMounted = true;
    music.init().then(() => {
      if (!isMounted) {
        return;
      }
      // If the game is already started, trigger the initial music variation
      if (useGameStore.getState().gameStarted && useGameStore.getState().settings.musicEnabled) {
        music.playEvent('normal');
      }
    });

    return () => {
      isMounted = false;
    };
  }, [gameStarted, musicEnabled, sfxEnabled]);

  // Clean up only on full unmount
  useEffect(() => {
    return () => {
      music.stop();
      music.hush();
    };
  }, []);

  // 2. State Sync (Toggle & Level Transitions & Game Over)
  const isFinishing = useGameStore(s => s.isFinishing);
  const isStarting = useGameStore(s => s.isStarting);
  const gameOver = useGameStore(s => s.gameOver);

  const prevIsFinishingRef = useRef<boolean>(isFinishing);
  const prevIsStartingRef = useRef<boolean>(isStarting);
  const prevGameOverRef = useRef<boolean>(gameOver);

  useEffect(() => {
    if (!music.isReady() && !musicEnabled) {
      // Nothing to do if not loaded and disabled
    } else if (!musicEnabled) {
      music.stop();
      music.hush();
    }

    if (music.isReady() && musicEnabled && gameStarted) {
      const startingLevel = isStarting && (prevIsStartingRef.current === false);
      const retryLevel = !gameOver && (prevGameOverRef.current === true);
      const finishLevel = isFinishing && (prevIsFinishingRef.current === false);

      if (gameOver && prevGameOverRef.current === false) {
        music.playEvent('gameover');
      } else if (finishLevel) {
        music.playEvent('victory');
      } else if (startingLevel || retryLevel || (!isFinishing && prevIsFinishingRef.current === true)) {
        music.playEvent('normal');
      }
    }

    prevIsFinishingRef.current = isFinishing;
    prevIsStartingRef.current = isStarting;
    prevGameOverRef.current = gameOver;
  }, [musicEnabled, isFinishing, isStarting, gameOver, gameStarted]);

  // Handle toggling on mid-game and volume changes
  const prevMusicEnabled = useRef(musicEnabled);
  const musicVolume = useGameStore.getState().settings.musicVolume ?? 1.0;
  const prevMusicVolume = useRef(musicVolume);

  useEffect(() => {
    const isPlaying = music.isReady() && !useGameStore.getState().isFinishing && !useGameStore.getState().gameOver;

    if (musicEnabled && (prevMusicEnabled.current === false || musicVolume !== prevMusicVolume.current)) {
      sfx.resume();
      if (isPlaying) {
        music.evaluateCode(music.currentVariation, music.currentNotes);
      }
    }
    prevMusicEnabled.current = musicEnabled;
    prevMusicVolume.current = musicVolume;
  }, [musicEnabled, musicVolume]);

  // 3. Harmonic variations for Orbit / Skip
  const lastPlanetIndex = useGameStore(s => s.lastPlanetIndex);
  const prevLastPlanetIndexRef = useRef(lastPlanetIndex);

  useEffect(() => {
    if (!music.isReady() || !musicEnabled || useGameStore.getState().isFinishing || useGameStore.getState().gameOver) {
      return;
    }

    if (lastPlanetIndex !== prevLastPlanetIndexRef.current) {
      const numSkipped = lastPlanetIndex - prevLastPlanetIndexRef.current - 1;

      if (numSkipped > 0) {
        const notes = numSkipped * 3;
        music.playEvent('skip', notes);
      } else {
        music.playEvent('orbit');
      }
    }
    prevLastPlanetIndexRef.current = lastPlanetIndex;
  }, [lastPlanetIndex, musicEnabled]);
}
