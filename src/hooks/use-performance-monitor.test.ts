import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../store';
import { usePerformanceMonitor } from './use-performance-monitor';

// Mock useFrame from @react-three/fiber
let frameCallback: (state: unknown, delta: number) => void;
vi.mock('@react-three/fiber', () => ({
  useFrame: (cb: (state: unknown, delta: number) => void) => {
    frameCallback = cb;
  },
}));

describe('usePerformanceMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.setState({
      settings: {
        autoPerformance: true,
        shadows: 'advanced',
        shaders: 'advanced',
        detailLevel: 'high',
        spaceshipDetail: 'high',
        resolutionScale: 'high',
        antialiasing: 'high',
        cameraMode: 'heliocentric',
        postProcessing: true,
        sfxEnabled: true,
        musicEnabled: true,
        sfxVolume: 1.0,
        musicVolume: 1.0,
      },
      isDebug: false,
    });

    Object.defineProperty(document, 'hasFocus', {
      value: () => true,
      configurable: true,
    });
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });

    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(performance, 'now').mockReturnValue(1000);
  });

  const simulateFrames = (count: number, msPerFrame: number) => {
    let currentTime = 1000;
    for (let i = 0; i < count; i++) {
      vi.spyOn(performance, 'now').mockReturnValue(currentTime);
      act(() => {
        frameCallback({}, msPerFrame / 1000);
      });
      currentTime += msPerFrame;
    }
  };

  it('should downgrade shadows if fps is below 45', () => {
    renderHook(() => usePerformanceMonitor());

    // 61 frames of 30ms each = ~33.3 FPS
    simulateFrames(62, 30);

    const state = useGameStore.getState();
    expect(state.settings.shadows).toBe('off');
  });

  it('should not downgrade if fps is above 45', () => {
    renderHook(() => usePerformanceMonitor());

    // 61 frames of 16ms each = ~62.5 FPS
    simulateFrames(62, 16);

    const state = useGameStore.getState();
    expect(state.settings.shadows).toBe('advanced');
  });

  it('should ignore frames if document does not have focus', () => {
    Object.defineProperty(document, 'hasFocus', { value: () => false });
    renderHook(() => usePerformanceMonitor());

    simulateFrames(62, 30);

    const state = useGameStore.getState();
    expect(state.settings.shadows).toBe('advanced');
  });
});
