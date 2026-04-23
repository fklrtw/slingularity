import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useHudEffects } from './use-hud-effects';
import { type GameState, useGameStore } from '../store';
import { Vector3, Mesh } from 'three';
import BigNumber from 'bignumber.js';

// Mock Store
vi.mock('../store', () => ({
  useGameStore: {
    getState: vi.fn(),
  },
}));

vi.mock('./use-sun-effects', () => ({
  getSunColor: vi.fn().mockReturnValue('#ffff00'),
}));

describe('useHudEffects', () => {
  let rafCallback: (time: number) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallback = cb;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    vi.mocked(useGameStore.getState).mockReturnValue({
      score: new BigNumber(100),
      distanceTraveled: 500,
      sunRadius: 10,
      lastPlanetDist: 100,
      distToSun: 50,
      velocity: 5,
      gameStarted: true,
      levelFinished: false,
      isDying: false,
      isFinishing: false,
      gameOver: false,
      settingsMenuOpen: false,
      portalPosition: new Vector3(),
      isDebug: false,
      settings: { sfxVolume: 1.0, musicVolume: 1.0 },
    } as unknown as GameState);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('should update HUD elements in the raf loop', () => {
    const domRefs = {
      scoreRef: { current: document.createElement('div') },
      distRef: { current: document.createElement('div') },
      sunBarRef: { current: document.createElement('div') },
      shipMarkerRef: { current: document.createElement('div') },
      velBarRef: { current: document.createElement('div') },
      velTextRef: { current: document.createElement('div') },
      fpsRef: { current: document.createElement('div') },
      debugRef: { current: document.createElement('div') },
    };

    const scoreColorScale = vi.fn().mockReturnValue({ hex: () => '#ffffff' });
    const sunColorScale = vi.fn();

    renderHook(() => useHudEffects({
      scoreColorScale,
      sunColorScale,
      domRefs,
    } as unknown as Parameters<typeof useHudEffects>[0]));

    expect(rafCallback).toBeDefined();
    rafCallback(performance.now());

    expect(domRefs.scoreRef.current.textContent).toContain('100');
    expect(domRefs.distRef.current.textContent).toContain('500');
    expect(domRefs.sunBarRef.current.style.width).toBe('10%');
    expect(domRefs.shipMarkerRef.current.style.left).toBe('50%');
    expect(domRefs.velBarRef.current.style.width).toBe('0.5%');
    expect(domRefs.velTextRef.current.textContent).toBe('5');
  });

  it('should update FPS counter after 1 second', () => {
    const domRefs = {
      scoreRef: { current: null },
      distRef: { current: null },
      sunBarRef: { current: null },
      shipMarkerRef: { current: null },
      velBarRef: { current: null },
      velTextRef: { current: null },
      fpsRef: { current: document.createElement('div') },
      debugRef: { current: null },
    };

    const scoreColorScale = vi.fn();
    const sunColorScale = vi.fn();

    renderHook(() => useHudEffects({
      scoreColorScale,
      sunColorScale,
      domRefs,
    } as unknown as Parameters<typeof useHudEffects>[0]));

    const start = performance.now();
    rafCallback(start);
    rafCallback(start + 16);
    rafCallback(start + 32);

    expect(domRefs.fpsRef.current.textContent).toBe('');

    // Advance time past 1000ms
    rafCallback(start + 1016);

    // 4 frames in ~1016ms -> ~4 fps
    expect(domRefs.fpsRef.current.textContent).toContain('fps:');
  });

  it('should populate debug overlay when debug setting is true', async () => {
    vi.mocked(useGameStore.getState).mockReturnValue({
      score: new BigNumber(100),
      distanceTraveled: 500,
      sunRadius: 10,
      lastPlanetDist: 100,
      distToSun: 50,
      velocity: 5,
      gameStarted: true,
      levelFinished: false,
      isDying: false,
      isFinishing: false,
      gameOver: false,
      settingsMenuOpen: false,
      portalPosition: new Vector3(),
      isDebug: true,
      settings: { sfxVolume: 1.0, musicVolume: 1.0 },
    } as unknown as GameState);

    const domRefs = {
      scoreRef: { current: null },
      distRef: { current: null },
      sunBarRef: { current: null },
      shipMarkerRef: { current: null },
      velBarRef: { current: null },
      velTextRef: { current: null },
      fpsRef: { current: null },
      debugRef: { current: document.createElement('div') },
    };

    const systemRef = {
      current: {
        planets: [
          { position: new Vector3(1, 2, 3) },
          { position: new Vector3(4, 5, 6) }
        ]
      }
    };
    const spaceshipRef = { current: new Mesh() };
    spaceshipRef.current.position.set(10, 20, 30);

    const scoreColorScale = vi.fn();
    const sunColorScale = vi.fn();

    renderHook(() => useHudEffects({
      systemRef,
      spaceshipRef,
      scoreColorScale,
      sunColorScale,
      domRefs,
    } as unknown as Parameters<typeof useHudEffects>[0]));

    rafCallback(performance.now());

    const html = domRefs.debugRef.current.innerHTML;
    expect(html).toContain('DEBUG HUD');
    expect(html).toContain('Ship Pos: (10, 20)');
    expect(html).toContain('P0: (1, 2)');
    expect(html).toContain('P1: (4, 5)');
  });
});
