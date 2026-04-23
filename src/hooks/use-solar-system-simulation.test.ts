import { renderHook } from '@testing-library/react';
import type * as FiberType from '@react-three/fiber';
import { useFrame, type RenderCallback } from '@react-three/fiber';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { type RefObject } from 'react';
import { Vector3 } from 'three';
import { useSolarSystemSimulation } from './use-solar-system-simulation';
import { type GameState, useGameStore } from '../store';
import { PHYSICS_TRANSITION_FINISH_DELAY } from '../components/ui/finish-screen.config';
import type { SystemRefData } from '../entities/solar-system';

// Mock @react-three/fiber
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));

// Mock Store
vi.mock('../store', () => ({
  useGameStore: Object.assign(
    vi.fn(),
    {
      getState: vi.fn(),
    }
  ),
}));

describe('useSolarSystemSimulation', () => {
  let frameCallback: RenderCallback;
  const mockFinishLevel = vi.fn();
  const mockGrowSun = vi.fn();
  const mockDisablePlanet = vi.fn();
  const mockDisableRings = vi.fn();
  const mockSetLastPlanetDist = vi.fn();
  const mockStartDying = vi.fn();
  const mockSetPortalPosition = vi.fn();

  const mockTriggerCollapse = vi.fn();
  const mockCompleteGameOver = vi.fn();
  const mockAddSunMass = vi.fn();
  const mockSetSunStatus = vi.fn();
  const mockDisablePortal = vi.fn();
  const mockTriggerSupernova = vi.fn();

  const baseState = {
    gameOver: false,
    levelFinished: false,
    growSun: mockGrowSun,
    sunRadius: 10,
    sunStatus: 'normal',
    sunMass: 20000,
    annihilatedPlanets: new Set(),
    annihilatedRings: new Set(),
    resetCounter: 0,
    gameStarted: true,
    disablePlanet: mockDisablePlanet,
    disableRings: mockDisableRings,
    disablePortal: mockDisablePortal,
    triggerSupernova: mockTriggerSupernova,
    isPortalAnnihilated: false,
    isStarting: false,
    addSunMass: mockAddSunMass,
    triggerCollapse: mockTriggerCollapse,
    completeGameOver: mockCompleteGameOver,
    setSunStatus: mockSetSunStatus,
    isDying: false,
    isFinishing: false,
    setLastPlanetDist: mockSetLastPlanetDist,
    lastPlanetDist: 500,
    startDying: mockStartDying,
    finishLevel: mockFinishLevel,
    settingsMenuOpen: false,
    setPortalPosition: mockSetPortalPosition,
    portalPosition: new Vector3(),
  } as unknown as GameState;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFrame).mockImplementation((cb: RenderCallback) => {
      frameCallback = cb;
      return null;
    });

    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(baseState));
    vi.mocked(useGameStore.getState).mockReturnValue(baseState);
  });

  const mockScene = {
    getObjectByName: vi.fn(),
  };

  const systemRef = {
    current: {
      planets: [
        { isSun: true, position: new Vector3(), radius: 10, atmosphereRadius: 10, crashRadius: 10, velocity: new Vector3() },
        { id: 'p1', position: new Vector3(100, 0, 0), radius: 5, isPlanet: true, semiMajorAxis: 100, velocity: new Vector3(), currentAngle: 0 }
      ],
      counter: 0,
      portalDist: 150,
      portalPosition: new Vector3(),
    }
  } as unknown as RefObject<SystemRefData>;

  it('should sync sun physics radius', () => {
    renderHook(() => useSolarSystemSimulation(systemRef));
    frameCallback({ scene: mockScene } as unknown as FiberType.RootState, 0.016);

    const sun = systemRef.current.planets[0];
    expect(sun.radius).toBe(10);
    expect(sun.crashRadius).toBe(10);
  });

  it('should grow sun and move planets', () => {
    renderHook(() => useSolarSystemSimulation(systemRef));
    frameCallback({ scene: mockScene } as unknown as FiberType.RootState, 0.016);

    expect(mockGrowSun).toHaveBeenCalled();
    // Planet angle should have changed from 0
    expect(systemRef.current.planets[1].currentAngle).not.toBe(0);
  });

  it('should trigger triggerSupernova if sun exceeds lastPlanetDist', () => {
    const bigSunState = { ...baseState, sunRadius: 600, lastPlanetDist: 500 };
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(bigSunState));
    vi.mocked(useGameStore.getState).mockReturnValue(bigSunState);

    renderHook(() => useSolarSystemSimulation(systemRef));
    frameCallback({ scene: mockScene } as unknown as FiberType.RootState, 0.016);

    expect(mockTriggerSupernova).toHaveBeenCalled();
  });

  it('should call disablePortal if sun exceeds portalDist', () => {
    const bigSunState = { ...baseState, sunRadius: 200, isPortalAnnihilated: false, isStarting: false };
    // systemRef.current.portalDist is 150
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(bigSunState));
    vi.mocked(useGameStore.getState).mockReturnValue(bigSunState);

    renderHook(() => useSolarSystemSimulation(systemRef));
    frameCallback({ scene: mockScene } as unknown as FiberType.RootState, 0.016);

    expect(mockDisablePortal).toHaveBeenCalled();
  });

  it('should handle level completion transition delay', () => {
    const finishingState = { ...baseState, isFinishing: true };
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(finishingState));
    vi.mocked(useGameStore.getState).mockReturnValue(finishingState);

    renderHook(() => useSolarSystemSimulation(systemRef));

    // Simulate frames up to delay
    frameCallback({ scene: mockScene } as unknown as FiberType.RootState, PHYSICS_TRANSITION_FINISH_DELAY * 0.5);
    expect(mockFinishLevel).not.toHaveBeenCalled();

    frameCallback({ scene: mockScene } as unknown as FiberType.RootState, PHYSICS_TRANSITION_FINISH_DELAY * 0.6 + 0.5);
    expect(mockFinishLevel).toHaveBeenCalled();
  });

  it('should update portal position based on outermost planet', () => {
    renderHook(() => useSolarSystemSimulation(systemRef));
    frameCallback({ scene: mockScene } as unknown as FiberType.RootState, 0.016);

    // p1 is at (100, 0, 0), sun is at (0,0,0). Direction is (1,0,0).
    // Portal dist is 150. Position should be 150 units away from sun in direction of planet.
    expect(systemRef.current.portalPosition.x).toBeCloseTo(150);
    expect(systemRef.current.portalPosition.y).toBeCloseTo(0);
    expect(mockSetPortalPosition).toHaveBeenCalled();
  });
});
