import { renderHook } from '@testing-library/react';
import type * as FiberType from '@react-three/fiber';
import { useFrame, type RenderCallback } from '@react-three/fiber';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { type RefObject } from 'react';
import { type Mesh, Vector3 } from 'three';
import { useSpaceshipPhysics } from './use-spaceship-physics';
import { type GameState, useGameStore } from '../store';
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

describe('useSpaceshipPhysics', () => {
  let frameCallback: RenderCallback;
  const mockSetOrbitingPlanet = vi.fn();
  const mockAddDistance = vi.fn();
  const mockTickTime = vi.fn();
  const mockSetVelocity = vi.fn();
  const mockSetDistToSun = vi.fn();
  const mockStartDying = vi.fn();
  const mockStartFinishing = vi.fn();
  const mockDisablePlanet = vi.fn();
  const mockClearLastAnnihilated = vi.fn();

  const baseState = {
    orbitingPlanetIndex: null as number | null,
    setOrbitingPlanet: mockSetOrbitingPlanet,
    addDistance: mockAddDistance,
    tickTime: mockTickTime,
    annihilatedPlanets: new Set(),
    lastAnnihilatedIndex: null,
    clearLastAnnihilated: mockClearLastAnnihilated,
    level: 1,
    setVelocity: mockSetVelocity,
    setDistToSun: mockSetDistToSun,
    gameStarted: true,
    isDying: false,
    isFinishing: false,
    levelFinished: false,
    gameOver: false,
    startDying: mockStartDying,
    startFinishing: mockStartFinishing,
    disablePlanet: mockDisablePlanet,
    isPortalInitialized: true,
    sunRadius: 10,
    portalPosition: new Vector3(500, 0, 0),
    settingsMenuOpen: false,
    isDebug: false,
    settings: { sfxVolume: 1.0, musicVolume: 1.0 }
  } as unknown as GameState;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFrame).mockImplementation((cb: RenderCallback) => {
      frameCallback = cb;
      return null;
    });

    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(baseState));
    vi.mocked(useGameStore.getState).mockReturnValue(baseState);
    vi.spyOn(performance, 'now').mockReturnValue(0);
  });

  const initialPosition = new Vector3(100, 0, 0);
  const initialVelocity = new Vector3(0, 10, 0);
  const systemRef = {
    current: {
      planets: [
        { isSun: true, position: new Vector3(), radius: 10, crashRadius: 10, velocity: new Vector3(), mass: 1000, atmosphereRadius: 10 },
        { id: 'p1', position: new Vector3(120, 0, 0), radius: 5, crashRadius: 10, velocity: new Vector3(), mass: 100, atmosphereRadius: 20, semiMajorAxis: 120, isPlanet: true }
      ],
      counter: 0,
      portalPosition: new Vector3(500, 0, 0),
      portalDist: 500,
    }
  } as unknown as RefObject<SystemRefData>;

  const spaceshipRef = { current: null } as RefObject<Mesh | null>;

  describe('Movement Integration', () => {
    it('should follow the first planet if game has not started', () => {
      const inactiveState = { ...baseState, gameStarted: false };
      vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(inactiveState));
      vi.mocked(useGameStore.getState).mockReturnValue(inactiveState);

      const { result } = renderHook(() => useSpaceshipPhysics({
        initialPosition,
        initialVelocity,
        initialOrbitDirection: 1,
        systemRef,
        spaceshipRef,
        resetCounter: 0,
      }));

      // Initial pos is at 100, planet 1 is at 120. Offset is -20.
      frameCallback({} as unknown as FiberType.RootState, 0.016);
      expect(result.current.posRef.current.x).toBe(100);

      // Move planet to 130
      systemRef.current.planets[1].position.set(130, 0, 0);
      frameCallback({} as unknown as FiberType.RootState, 0.016);
      expect(result.current.posRef.current.x).toBe(110);
    });

    it('should update position and velocity during active flight', () => {
      const { result } = renderHook(() => useSpaceshipPhysics({
        initialPosition,
        initialVelocity,
        initialOrbitDirection: 1,
        systemRef,
        spaceshipRef,
        resetCounter: 0,
      }));

      frameCallback({} as unknown as FiberType.RootState, 0.1);
      expect(result.current.posRef.current.y).toBeGreaterThan(0);
      expect(mockAddDistance).toHaveBeenCalled();
      expect(mockTickTime).toHaveBeenCalled();
    });
  });

  describe('Event Detection', () => {
    it('should trigger startDying when crashing into the sun', () => {
      const { result } = renderHook(() => useSpaceshipPhysics({
        initialPosition,
        initialVelocity,
        initialOrbitDirection: 1,
        systemRef,
        spaceshipRef,
        resetCounter: 0,
      }));

      // Move ship into sun (radius 10)
      result.current.posRef.current.set(5, 0, 0);
      frameCallback({} as unknown as FiberType.RootState, 0.016);
      expect(mockStartDying).toHaveBeenCalled();
    });

    it('should trigger startDying when crashing into a planet', () => {
      const { result } = renderHook(() => useSpaceshipPhysics({
        initialPosition,
        initialVelocity,
        initialOrbitDirection: 1,
        systemRef,
        spaceshipRef,
        resetCounter: 0,
      }));

      // Move ship into planet 1 (pos 120, crashRadius 10)
      result.current.posRef.current.set(121, 0, 0);
      frameCallback({} as unknown as FiberType.RootState, 0.016);
      expect(mockStartDying).toHaveBeenCalled();
      expect(mockDisablePlanet).toHaveBeenCalledWith(1);
    });

    it('should trigger startFinishing when reaching the portal', () => {
      const { result } = renderHook(() => useSpaceshipPhysics({
        initialPosition,
        initialVelocity,
        initialOrbitDirection: 1,
        systemRef,
        spaceshipRef,
        resetCounter: 0,
      }));

      // Portal is at 500
      result.current.posRef.current.set(495, 0, 0);
      frameCallback({} as unknown as FiberType.RootState, 0.016);
      expect(mockStartFinishing).toHaveBeenCalled();
    });

    it('should trigger startDying when lost in space', () => {
      const { result } = renderHook(() => useSpaceshipPhysics({
        initialPosition,
        initialVelocity,
        initialOrbitDirection: 1,
        systemRef,
        spaceshipRef,
        resetCounter: 0,
      }));

      // Move ship far beyond portal (at 500)
      result.current.posRef.current.set(2000, 0, 0);
      frameCallback({} as unknown as FiberType.RootState, 0.016);
      expect(mockStartDying).toHaveBeenCalled();
    });

    it('should capture orbit when near a planet', () => {
      const { result } = renderHook(() => useSpaceshipPhysics({
        initialPosition,
        initialVelocity,
        initialOrbitDirection: 1,
        systemRef,
        spaceshipRef,
        resetCounter: 0,
      }));

      // Move ship near planet 1 (pos 120, atmosphereRadius 20)
      result.current.posRef.current.set(135, 0, 0);
      frameCallback({} as unknown as FiberType.RootState, 0.016);
      expect(mockSetOrbitingPlanet).toHaveBeenCalled();
    });

    it('should trigger boost when exiting an annihilated planet', () => {
      const annihilatedState = {
        ...baseState,
        orbitingPlanetIndex: 1,
        annihilatedPlanets: new Set([1]),
      };
      vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(annihilatedState));
      vi.mocked(useGameStore.getState).mockReturnValue(annihilatedState);

      const { result } = renderHook(() => useSpaceshipPhysics({
        initialPosition,
        initialVelocity,
        initialOrbitDirection: 1,
        systemRef,
        spaceshipRef,
        resetCounter: 0,
      }));

      // Simulate one frame orbiting annihilated planet
      frameCallback({} as unknown as FiberType.RootState, 0.016);

      // Now set orbiting to null to simulate exiting
      annihilatedState.orbitingPlanetIndex = null as unknown as number;
      frameCallback({} as unknown as FiberType.RootState, 0.016);

      expect(result.current.triggerBoostRef.current).toBe(true);
    });

    it('should clear lastAnnihilatedIndex if it is set', () => {
      const lastAnnihilatedState = { ...baseState, lastAnnihilatedIndex: 2 };
      vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(lastAnnihilatedState));
      vi.mocked(useGameStore.getState).mockReturnValue(lastAnnihilatedState);

      renderHook(() => useSpaceshipPhysics({
        initialPosition,
        initialVelocity,
        initialOrbitDirection: 1,
        systemRef,
        spaceshipRef,
        resetCounter: 0,
      }));

      frameCallback({} as unknown as FiberType.RootState, 0.016);
      expect(mockClearLastAnnihilated).toHaveBeenCalled();
    });
  });
});
