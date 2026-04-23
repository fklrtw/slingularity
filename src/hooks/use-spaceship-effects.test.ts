import { renderHook, act } from '@testing-library/react';
import type * as FiberType from '@react-three/fiber';
import { type RenderCallback, useFrame } from '@react-three/fiber';
import { type Mock, describe, expect, it, vi, beforeEach } from 'vitest';
import { type RefObject } from 'react';
import { type Mesh, Vector3, MeshStandardMaterial } from 'three';
import { useSpaceshipEffects } from './use-spaceship-effects';
import { type GameState, useGameStore } from '../store';
import type { SystemRefData } from '../entities/solar-system';
import {
  SPACESHIP_BOOST_EFFECT_DURATION,
} from '../entities/spaceship.config';

// Mock @react-three/fiber
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));

// Mock Store
vi.mock('../store', () => {
  const storeFn = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (storeFn as any).getState = vi.fn(() => (storeFn as any).__mockState || {});
  return { useGameStore: storeFn };
});

describe('useSpaceshipEffects', () => {
  let frameCallback: RenderCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFrame).mockImplementation((cb: RenderCallback) => {
      frameCallback = cb;
      return null;
    });

    // Default store state
    const __stateDef = {
      gameStarted: true,
      isDying: false,
      isFinishing: false,
      gameOver: false,
      levelFinished: false,
      isStarting: false,
      triggerGameOver: vi.fn(),
      gameOverReason: '',
      laserEvent: null,
      orbitingPlanetIndex: null,
      setVelocity: vi.fn(),
      setDistToSun: vi.fn(),
      settingsMenuOpen: false,
      settings: { shaders: 'advanced', sfxVolume: 1.0, musicVolume: 1.0 },
    } as unknown as GameState;
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(__stateDef));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useGameStore as any).__mockState = __stateDef;
  });

  const posRef = { current: new Vector3() };
  const velRef = { current: new Vector3(10, 0, 0) };
  const systemRef = {
    current: {
      planets: [{ isSun: true, position: new Vector3() }],
      counter: 0,
      portalPosition: new Vector3(100, 0, 0),
      portalDist: 100,
      shipParams: { pos: new Vector3(), vel: new Vector3(), dir: 1 }
    }
  } as unknown as RefObject<SystemRefData>;

  const spaceshipRef = { current: { position: new Vector3(), scale: { set: vi.fn() }, quaternion: { slerp: vi.fn() } } } as unknown as RefObject<Mesh | null>;
  const currentOrbitRadiusRef = { current: null } as RefObject<number | null>;
  const triggerBoostRef = { current: false } as RefObject<boolean>;

  it('should update spaceship position to match posRef', () => {
    posRef.current.set(123, 456, 0);
    renderHook(() => useSpaceshipEffects({
      posRef,
      velRef,
      systemRef,
      spaceshipRef,
      currentOrbitRadiusRef,
      triggerBoostRef,
      resetCounter: 0,
    }));

    vi.spyOn(performance, 'now').mockReturnValue(0);
    frameCallback({} as unknown as FiberType.RootState, 0.016);
    expect(spaceshipRef.current?.position.x).toBe(123);
    expect(spaceshipRef.current?.position.y).toBe(456);
  });

  it('should apply scale pulse during boost', () => {
    triggerBoostRef.current = true;
    renderHook(() => useSpaceshipEffects({
      posRef,
      velRef,
      systemRef,
      spaceshipRef,
      currentOrbitRadiusRef,
      triggerBoostRef,
      resetCounter: 0,
    }));

    // First frame triggers boost
    vi.spyOn(performance, 'now').mockReturnValue(0);
    frameCallback({} as unknown as FiberType.RootState, 0.016);

    // Check scale after some boost time (peak of sine is at half duration)
    vi.spyOn(performance, 'now').mockReturnValue(0);
    frameCallback({} as unknown as FiberType.RootState, SPACESHIP_BOOST_EFFECT_DURATION * 0.5);

    // We expect scale to be increased
    const scaleSetMock = spaceshipRef.current?.scale.set as unknown as Mock;
    const calls = scaleSetMock.mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toBeGreaterThan(1.0);
    expect(lastCall[1]).toBeGreaterThan(1.0);
    expect(lastCall[2]).toBeGreaterThan(1.0);
  });

  it('should hide spaceship when level is finished', () => {
    const __state1 = {
      levelFinished: true,
      gameStarted: true,
      settingsMenuOpen: false,
    } as unknown as GameState;
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(__state1));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useGameStore as any).__mockState = __state1;

    renderHook(() => useSpaceshipEffects({
      posRef,
      velRef,
      systemRef,
      spaceshipRef,
      currentOrbitRadiusRef,
      triggerBoostRef,
      resetCounter: 0,
    }));

    const ship = spaceshipRef.current as Mesh;
    ship.visible = true;

    vi.spyOn(performance, 'now').mockReturnValue(0);
    frameCallback({} as unknown as FiberType.RootState, 0.016);
    expect(ship.visible).toBe(false);
  });

  it('should hide spaceship immediately when isFinishing is true', () => {
    const __state2 = {
      isFinishing: true,
      gameStarted: true,
      settingsMenuOpen: false,
    } as unknown as GameState;
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(__state2));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useGameStore as any).__mockState = __state2;

    renderHook(() => useSpaceshipEffects({
      posRef,
      velRef,
      systemRef,
      spaceshipRef,
      currentOrbitRadiusRef,
      triggerBoostRef,
      resetCounter: 0,
    }));

    const ship = spaceshipRef.current as Mesh;
    ship.visible = true;

    vi.spyOn(performance, 'now').mockReturnValue(0);
    frameCallback({} as unknown as FiberType.RootState, 0.016);
    expect(ship.visible).toBe(false);
  });

  it('should trigger laser beam visualization on laserEvent', () => {
    vi.useFakeTimers();
    let laserEventObj: { targetIndex: number } | null = null;
    const __state3 = {
      gameStarted: true,
      get laserEvent() {
        return laserEventObj;
      },
      settingsMenuOpen: false,
    } as unknown as GameState;
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(__state3));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useGameStore as any).__mockState = __state3;

    const { result, rerender } = renderHook(() => useSpaceshipEffects({
      posRef,
      velRef,
      systemRef,
      spaceshipRef,
      currentOrbitRadiusRef,
      triggerBoostRef,
      resetCounter: 0,
    }));

    // Initially null
    expect(result.current.laserPoints).toBeNull();

    // Trigger laser event
    laserEventObj = { targetIndex: 0 };
    act(() => {
      rerender();
    });

    expect(result.current.laserPoints).not.toBeNull();
    act(() => {
      vi.runAllTimers();
    });
    expect(result.current.laserPoints).toBeNull();
    vi.useRealTimers();
  });

  it('should play shockwave animation during dying sequence', () => {
    const __state4 = {
      isDying: true,
      gameOver: false,
      gameStarted: true,
      settingsMenuOpen: false,
      sunStatus: 'supernova_expanding',
    } as unknown as GameState;
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(__state4));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useGameStore as any).__mockState = __state4;

    const { result } = renderHook(() => useSpaceshipEffects({
      posRef,
      velRef,
      systemRef,
      spaceshipRef,
      currentOrbitRadiusRef,
      triggerBoostRef,
      resetCounter: 0,
    }));

    // Start with a tiny opacity so it drains immediately on one frame
    const sw = { visible: false, position: new Vector3(), scale: { addScaledVector: vi.fn(), set: vi.fn() }, material: { opacity: 0.001 } };
    if (result.current.shockwaveRef) {
      (result.current.shockwaveRef as RefObject<unknown>).current = sw;
    }

    vi.spyOn(performance, 'now').mockReturnValue(0);
    frameCallback({} as unknown as FiberType.RootState, 0.5); // Provide delta

    expect(sw.visible).toBe(true);
    expect(spaceshipRef.current?.visible).toBe(false);
  });

  it('should adjust emissive intensity based on proximity to planet (warming glow)', () => {
    const __state5 = {
      gameStarted: true,
      orbitingPlanetIndex: 1, // Will look at planets[1]
      settingsMenuOpen: false,
    } as unknown as GameState;
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(__state5));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useGameStore as any).__mockState = __state5;

    systemRef.current.planets.push({
      id: 'p1',
      position: new Vector3(),
      atmosphereRadius: 50,
      crashRadius: 10,
      velocity: new Vector3()
    } as unknown as SystemRefData['planets'][0]);

    currentOrbitRadiusRef.current = 20; // Between crash(10) and atmosphere(50)

    const mockMat = new MeshStandardMaterial();
    mockMat.emissiveIntensity = 0;
    const mockSpaceshipMesh = {
      material: mockMat,
      isMesh: true,
      traverse: vi.fn(function (this: Mesh, cb: (obj: Mesh) => void) {
        cb(this);
      }),
    } as unknown as Mesh;

    const { result } = renderHook(() => useSpaceshipEffects({
      posRef,
      velRef,
      systemRef,
      spaceshipRef,
      currentOrbitRadiusRef,
      triggerBoostRef,
      resetCounter: 0,
    }));

    if (result.current.spaceshipMeshRef) {
      (result.current.spaceshipMeshRef as RefObject<unknown>).current = mockSpaceshipMesh;
    }

    vi.spyOn(performance, 'now').mockReturnValue(0);
    frameCallback({} as unknown as FiberType.RootState, 0.016);

    expect(mockMat.emissiveIntensity).toBeGreaterThan(1.0); // Expect it to be boosted by the glow
  });

  it('should adjust orientation based on velocity', () => {
    renderHook(() => useSpaceshipEffects({
      posRef,
      velRef,
      systemRef,
      spaceshipRef,
      currentOrbitRadiusRef,
      triggerBoostRef,
      resetCounter: 0,
    }));

    // Ship has velocity (10, 0, 0)
    vi.spyOn(performance, 'now').mockReturnValue(0);
    frameCallback({} as unknown as FiberType.RootState, 0.016);
    expect(spaceshipRef.current?.quaternion.slerp).toHaveBeenCalled();
  });
});
