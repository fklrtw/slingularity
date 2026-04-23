import { render } from '@testing-library/react';
import React from 'react';
import type { Mesh } from 'three';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SystemRefData } from './entities/solar-system';
import { GameLoop } from './app';
import { useSolarSystemSimulation } from './hooks/use-solar-system-simulation';
import { useCameraEffects } from './hooks/use-camera-effects';

// Mock R3F
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));

// Mock the store
vi.mock('./store', () => {
  const mockState = {
    settings: {
      autoPerformance: true,
      shadows: true,
      shaders: 'advanced',
      detailLevel: 'high',
      resolutionScale: 'high',
      antialiasing: 'high',
      sfxVolume: 1.0,
      musicVolume: 1.0
    },
    isDebug: false,
    updateSettings: vi.fn(),
  };
  const mockStore = vi.fn(selector => selector(mockState));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mockStore as any).getState = vi.fn(() => mockState);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mockStore as any).subscribe = vi.fn(() => vi.fn());
  return { useGameStore: mockStore };
});

// Mock simulation hooks
vi.mock('./hooks/use-solar-system-simulation', () => ({
  useSolarSystemSimulation: vi.fn(),
}));
vi.mock('./hooks/use-camera-effects', () => ({
  useCameraEffects: vi.fn(),
}));

describe('GameLoop Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize simulation and camera hooks with correct references', () => {
    const systemRef = { current: { planets: [], counter: 0 } };
    const spaceshipRef = { current: null };

    render(
      <GameLoop
        systemRef={systemRef as unknown as React.RefObject<SystemRefData>}
        spaceshipRef={spaceshipRef as unknown as React.RefObject<Mesh | null>}
      />
    );

    expect(useSolarSystemSimulation).toHaveBeenCalledWith(systemRef);
    expect(useCameraEffects).toHaveBeenCalledWith({ spaceshipRef, systemRef });
  });
});
