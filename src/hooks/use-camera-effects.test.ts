/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook } from '@testing-library/react';
import type * as FiberType from '@react-three/fiber';
import { useFrame, useThree } from '@react-three/fiber';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { type RefObject } from 'react';
import { type Mesh, Vector3, Quaternion } from 'three';
import { useCameraEffects } from './use-camera-effects';
import { type GameState, useGameStore } from '../store';
import type { SystemRefData } from '../entities/solar-system';
import { CAMERA_CONFIG_SHIP } from '../camera.config';

// Mock @react-three/fiber
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: vi.fn(),
}));

// Mock Store
vi.mock('../store', () => {
  const storeFn = vi.fn();

  (storeFn as any).getState = vi.fn(() => (storeFn as any).__mockState || {});
  return { useGameStore: storeFn };
});

describe('useCameraEffects', () => {
  let frameCallback: FiberType.RenderCallback;
  const mockCamera = {
    position: new Vector3(),
    up: new Vector3(0, 1, 0),
    lookAt: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFrame).mockImplementation((cb: FiberType.RenderCallback) => {
      frameCallback = cb;
      return null;
    });
    vi.mocked(useThree).mockReturnValue({ camera: mockCamera } as unknown as FiberType.RootState);
  });

  const systemRef = {
    current: {
      planets: [
        { isSun: true, position: new Vector3() },
        { id: 'p1', position: new Vector3(0, 100, 0) }
      ],
      counter: 1,
    }
  } as unknown as RefObject<SystemRefData>;

  const spaceshipRef = {
    current: {
      position: new Vector3(50, 0, 0),
      quaternion: new Quaternion(),
      userData: { resetCounter: 1 }
    }
  } as unknown as RefObject<Mesh>;

  it('should update camera position and lookAt on frame (Default)', () => {
    const __state = {
      annihilatedPlanets: new Set(),
      isFinishing: false,
      portalPosition: new Vector3(0, 500, 0),
      resetCounter: 1,
      settings: { cameraMode: 'heliocentric', sfxVolume: 1.0, musicVolume: 1.0 },
    } as unknown as GameState;
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(__state));
    (useGameStore as any).__mockState = __state;

    renderHook(() => useCameraEffects({ spaceshipRef, systemRef }));
    frameCallback({} as unknown as FiberType.RootState, 0.016);

    expect(mockCamera.lookAt).toHaveBeenCalled();
    expect(mockCamera.position.z).toBeGreaterThan(0);
  });

  it('should position camera on axis in Aligned mode', () => {
    // Initial render with counter 0
    const __state0 = {
      annihilatedPlanets: new Set(),
      isFinishing: false,
      portalPosition: new Vector3(0, 500, 0),
      resetCounter: 0,
      settings: { cameraMode: 'aligned', sfxVolume: 1.0, musicVolume: 1.0 },
    } as unknown as GameState;
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(__state0));
    (useGameStore as any).__mockState = __state0;

    const { rerender } = renderHook(() => useCameraEffects({ spaceshipRef, systemRef }));

    // Trigger isNewLevel by incrementing resetCounter
    const __state1 = {
      annihilatedPlanets: new Set(),
      isFinishing: false,
      portalPosition: new Vector3(0, 500, 0),
      resetCounter: 1,
      settings: { cameraMode: 'aligned', sfxVolume: 1.0, musicVolume: 1.0 },
    } as unknown as GameState;
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(__state1));
    (useGameStore as any).__mockState = __state1;

    rerender();
    frameCallback({} as unknown as FiberType.RootState, 0.016);

    // Ship at (50, 0, 0), Sun at (0, 0, 0), Portal at (0, 500, 0)
    // Axis is (0, 1, 0). Ship projection on axis is at (0, 0, 0).
    // Deviation factor is 0.15. Target x should be 50 * 0.15 = 7.5
    expect(mockCamera.position.x).toBeCloseTo(7.5, 1);
  });

  it('should follow ship exactly in Ship mode', () => {
    const __state0Ship = {
      annihilatedPlanets: new Set(),
      isFinishing: false,
      portalPosition: new Vector3(0, 500, 0),
      resetCounter: 0,
      settings: { cameraMode: 'ship', sfxVolume: 1.0, musicVolume: 1.0 },
    } as unknown as GameState;
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(__state0Ship));
    (useGameStore as any).__mockState = __state0Ship;

    const { rerender } = renderHook(() => useCameraEffects({ spaceshipRef, systemRef }));

    const __state1Ship = {
      annihilatedPlanets: new Set(),
      isFinishing: false,
      portalPosition: new Vector3(0, 500, 0),
      resetCounter: 1,
      settings: { cameraMode: 'ship', sfxVolume: 1.0, musicVolume: 1.0 },
    } as unknown as GameState;
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(__state1Ship));
    (useGameStore as any).__mockState = __state1Ship;

    rerender();
    frameCallback({} as unknown as FiberType.RootState, 0.016);

    expect(mockCamera.position.x).toBeCloseTo(50, 1);
    expect(mockCamera.position.y).toBeCloseTo(0, 1);
    expect(mockCamera.position.z).toBeCloseTo(CAMERA_CONFIG_SHIP.dist, 1);
  });
});
