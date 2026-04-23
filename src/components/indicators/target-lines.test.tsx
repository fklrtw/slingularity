/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { TargetLines } from './target-lines';
import { useGameStore, type GameState } from '../../store';
import type { SystemRefData } from '../../entities/solar-system';

// Mock @react-three/fiber
vi.mock('@react-three/fiber', () => ({
  useFrame: (callback: (state: any, delta: number) => void) => {
    React.useEffect(() => {
      callback({} as any, 0.016);
    }, [callback]);
  }
}));

// Mock Store
vi.mock('../../store', () => {
  const mockGetState = vi.fn();
  const mockUseGameStore = vi.fn().mockImplementation((selector: any) => {
    return selector(mockGetState());
  }) as any;
  mockUseGameStore.getState = mockGetState;

  return {
    useGameStore: mockUseGameStore,
  };
});

describe('TargetLines Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseSystemData = {
    planets: [
      { isSun: true, position: new Vector3(0, 0, 0) },
      { id: 'p1', position: new Vector3(100, 0, 0), isPlanet: true },
      { id: 'p2', position: new Vector3(200, 0, 0), isPlanet: true },
    ],
    counter: 0,
    portalPosition: new Vector3(),
    portalDist: 300,
    shipParams: { pos: new Vector3(), vel: new Vector3(), dir: 1 }
  } as unknown as SystemRefData;

  it('should return null if systemData is missing or counter does not match', () => {
    vi.mocked(useGameStore.getState).mockReturnValue({
      annihilatedPlanets: new Set(),
      portalPosition: new Vector3(300, 0, 0),
      resetCounter: 1, // Mismatch
    } as unknown as GameState);

    const { container } = render(<TargetLines systemData={baseSystemData} />);
    expect(container.firstChild).toBeNull();
  });

  it('should calculate lines connecting consecutive planets and the portal', () => {
    vi.mocked(useGameStore.getState).mockReturnValue({
      annihilatedPlanets: new Set(),
      portalPosition: new Vector3(300, 0, 0),
      resetCounter: 0,
    } as unknown as GameState);

    const { container } = render(<TargetLines systemData={baseSystemData} />);
    const geom = container.querySelector('buffergeometry') as any;
    expect(geom).not.toBeNull();

    // Verify connections were calculated and stored on ref for rendering
    expect(geom._testConnectionCount).toBe(2);

    // First connection (p1 -> p2)
    const points1 = Array.from(geom._testPositions.slice(0, 6));
    expect(points1).toEqual([100, 0, 0, 200, 0, 0]);

    // Second connection (p2 -> portal)
    const points2 = Array.from(geom._testPositions.slice(6, 12));
    expect(points2).toEqual([200, 0, 0, 300, 0, 0]);
  });

  it('should skip sun and annihilated planets', () => {
    vi.mocked(useGameStore.getState).mockReturnValue({
      annihilatedPlanets: new Set([1]), // p1 is annihilated
      portalPosition: new Vector3(300, 0, 0),
      resetCounter: 0,
    } as unknown as GameState);

    const { container } = render(<TargetLines systemData={baseSystemData} />);
    const geom = container.querySelector('buffergeometry') as any;
    expect(geom).not.toBeNull();

    expect(geom._testConnectionCount).toBe(1);

    // Only p2 -> portal connection
    const points = Array.from(geom._testPositions.slice(0, 6));
    expect(points).toEqual([200, 0, 0, 300, 0, 0]);
  });
});
