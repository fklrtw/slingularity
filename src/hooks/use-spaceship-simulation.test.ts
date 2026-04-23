import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSpaceshipSimulation } from './use-spaceship-simulation';
import { useSpaceshipPhysics } from './use-spaceship-physics';
import { useSpaceshipEffects } from './use-spaceship-effects';
import type { Group } from 'three';
import { Vector3, Mesh } from 'three';
import type { SystemRefData } from '../entities/solar-system';

// Mock dependencies
vi.mock('./use-spaceship-physics', () => ({
  useSpaceshipPhysics: vi.fn()
}));

vi.mock('./use-spaceship-effects', () => ({
  useSpaceshipEffects: vi.fn()
}));

describe('useSpaceshipSimulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delegate to physics and effects hooks and return refs', () => {
    // Mock return values
    const mockPosRef = { current: new Vector3() };
    const mockVelRef = { current: new Vector3() };
    const mockCurrentOrbitRadiusRef = { current: 10 };
    const mockTriggerBoostRef = { current: false };
    const mockCrashedIntoPlanetRef = { current: false };

    const mockShockwaveRef = { current: null };
    const mockSpaceshipMeshRef = { current: null };
    const mockTrailRef = { current: null };
    const mockLaserPoints = [new Vector3(), new Vector3()];

    vi.mocked(useSpaceshipPhysics).mockReturnValue({
      posRef: mockPosRef,
      velRef: mockVelRef,
      currentOrbitRadiusRef: mockCurrentOrbitRadiusRef as { current: number | null },
      triggerBoostRef: mockTriggerBoostRef as { current: boolean },
      crashedIntoPlanetRef: mockCrashedIntoPlanetRef as { current: boolean },
    });

    vi.mocked(useSpaceshipEffects).mockReturnValue({
      shockwaveRef: mockShockwaveRef as { current: Mesh | null },
      spaceshipMeshRef: mockSpaceshipMeshRef as { current: Mesh | null },
      trailRef: mockTrailRef as unknown as React.RefObject<Group>,
      laserPoints: mockLaserPoints as unknown as [Vector3, Vector3] | null,
    });

    const props = {
      initialPosition: new Vector3(),
      initialVelocity: new Vector3(),
      initialOrbitDirection: 1,
      systemRef: { current: { planets: [] } } as unknown as React.RefObject<SystemRefData>,
      spaceshipRef: { current: new Mesh() } as unknown as React.RefObject<Mesh | null>,
      resetCounter: 0
    };

    const { result } = renderHook(() => useSpaceshipSimulation(props));

    // Verify delegations
    expect(useSpaceshipPhysics).toHaveBeenCalledWith(props);
    expect(useSpaceshipEffects).toHaveBeenCalledWith({
      posRef: mockPosRef,
      velRef: mockVelRef,
      systemRef: props.systemRef,
      spaceshipRef: props.spaceshipRef,
      currentOrbitRadiusRef: mockCurrentOrbitRadiusRef,
      triggerBoostRef: mockTriggerBoostRef,
      resetCounter: props.resetCounter,
    });

    // Verify returns
    expect(result.current.shockwaveRef).toBe(mockShockwaveRef);
    expect(result.current.spaceshipMeshRef).toBe(mockSpaceshipMeshRef);
    expect(result.current.trailRef).toBe(mockTrailRef);
    expect(result.current.laserPoints).toBe(mockLaserPoints);
  });
});
