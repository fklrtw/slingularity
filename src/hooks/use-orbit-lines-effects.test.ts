import { renderHook } from '@testing-library/react';
import type * as FiberType from '@react-three/fiber';
import { useFrame, type RenderCallback } from '@react-three/fiber';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { type RefObject } from 'react';
import { Vector3 } from 'three';
import { useOrbitLinesEffects } from './use-orbit-lines-effects';
import { type GameState, useGameStore } from '../store';
import type { SystemRefData } from '../entities/solar-system';

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

describe('useOrbitLinesEffects', () => {
  let frameCallback: RenderCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFrame).mockImplementation((cb: RenderCallback) => {
      frameCallback = cb;
      return null;
    });

    // Default store state
    const __stateDef = {
      annihilatedPlanets: new Set(),
      resetCounter: 0,
    } as unknown as GameState;
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(__stateDef));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useGameStore as any).__mockState = __stateDef;
  });

  const systemData = {
    planets: [
      { isSun: true, position: new Vector3(0, 0, 0) },
      { id: 'p1', position: new Vector3(100, 0, 0) },
      { id: 'p2', position: new Vector3(200, 0, 0) },
    ],
    counter: 0,
  } as SystemRefData;

  it('should sync visibility based on annihilation state', () => {
    const mockLine1 = { visible: true };
    const mockLine2 = { visible: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lineRefs = { current: [null, mockLine1, mockLine2] } as unknown as RefObject<(any | null)[]>;

    // p1 is dead
    const __state1 = {
      annihilatedPlanets: new Set([1]),
      resetCounter: 0,
    } as unknown as GameState;
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(__state1));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useGameStore as any).__mockState = __state1;

    renderHook(() => useOrbitLinesEffects({ systemData, lineRefs }));

    frameCallback({} as unknown as FiberType.RootState, 0.016);
    frameCallback({} as unknown as FiberType.RootState, 0.016);
    frameCallback({} as unknown as FiberType.RootState, 0.016);
    frameCallback({} as unknown as FiberType.RootState, 0.016);

    expect(mockLine1.visible).toBe(false);
    expect(mockLine2.visible).toBe(true);
  });
});
