import { renderHook } from '@testing-library/react';
import type * as FiberType from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { type RefObject } from 'react';
import { type Group, Vector3 } from 'three';
import { useFloatingScoreEffects, type TextRef } from './use-floating-score-effects';

// Mock @react-three/fiber
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));

describe('useFloatingScoreEffects', () => {
  let frameCallback: FiberType.RenderCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFrame).mockImplementation((cb: FiberType.RenderCallback) => {
      frameCallback = cb;
      return null;
    });
  });

  it('should update position and opacity', () => {
    const onComplete = vi.fn();
    const groupRef = { current: { position: new Vector3() } } as unknown as RefObject<Group>;
    const mainTextRef = { current: { fillOpacity: 1 } } as unknown as RefObject<TextRef>;
    const multTextRef = { current: { fillOpacity: 1 } } as unknown as RefObject<TextRef>;

    // Set a fixed start time
    const startTime = 1000;
    const score = { id: 1, value: 100, position: new Vector3(10, 20, 0), startTime, multiplier: 2 };

    renderHook(() => useFloatingScoreEffects({
      score,
      onComplete,
      groupRef,
      mainTextRef,
      multTextRef,
    }));

    // Simulate half a second (500ms) after startTime
    vi.spyOn(performance, 'now').mockReturnValue(startTime + 500);
    frameCallback({} as unknown as FiberType.RootState, 0.5);

    expect(groupRef.current.position.y).toBeGreaterThan(20);
    expect(mainTextRef.current.fillOpacity).toBeLessThan(1);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('should call onComplete after 2 seconds', () => {
    const onComplete = vi.fn();
    const groupRef = { current: { position: new Vector3() } } as unknown as RefObject<Group>;
    const mainTextRef = { current: { fillOpacity: 1 } } as unknown as RefObject<TextRef>;
    const multTextRef = { current: { fillOpacity: 1 } } as unknown as RefObject<TextRef>;

    // Set a fixed start time
    const startTime = 1000;
    const score = { id: 1, value: 100, position: new Vector3(10, 20, 0), startTime, multiplier: 2 };

    renderHook(() => useFloatingScoreEffects({
      score,
      onComplete,
      groupRef,
      mainTextRef,
      multTextRef,
    }));

    // Simulate 2.1 seconds after startTime
    vi.spyOn(performance, 'now').mockReturnValue(startTime + 2100);
    frameCallback({} as unknown as FiberType.RootState, 2.1);

    expect(onComplete).toHaveBeenCalledWith(1);
  });
});
