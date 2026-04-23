import { renderHook } from '@testing-library/react';
import type * as FiberType from '@react-three/fiber';
import { useFrame, type RenderCallback } from '@react-three/fiber';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { type RefObject } from 'react';
import { Vector3 } from 'three';
import { useSolarSystemSimulation } from './use-solar-system-simulation';
import { type GameState, useGameStore } from '../store';
import { PHYSICS_TRANSITION_FINISH_DELAY } from '../components/ui/finish-screen.config';
import { GAME_OVER_SCREEN_TRANSITION_DIE_DELAY } from '../components/ui/game-over-screen.config';
import { PORTALS_PORTAL_SWELL_DURATION, PORTALS_PORTAL_COLLAPSE_DURATION } from '../entities/portal.config';
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

describe('Transition Delays', () => {
  let frameCallback: RenderCallback;
  const mockFinishLevel = vi.fn();
  const mockTriggerGameOver = vi.fn();
  const mockSetLastPlanetDist = vi.fn();
  const mockSetPortalPosition = vi.fn();

  const mockGrowSun = vi.fn();

  const baseState = {
    gameOver: false,
    levelFinished: false,
    growSun: mockGrowSun,
    sunRadius: 10,
    resetCounter: 0,
    gameStarted: true,
    isDying: false,
    isFinishing: false,
    setLastPlanetDist: mockSetLastPlanetDist,
    finishLevel: mockFinishLevel,
    triggerGameOver: mockTriggerGameOver,
    setPortalPosition: mockSetPortalPosition,
    gameOverReason: 'TEST REASON',
    settingsMenuOpen: false,
    privacyMenuOpen: false,
    creditsMenuOpen: false,
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

  const systemRef = {
    current: {
      planets: [
        { isSun: true, position: new Vector3(), radius: 10, atmosphereRadius: 10, crashRadius: 10, velocity: new Vector3() },
      ],
      counter: 0,
      portalDist: 150,
      portalPosition: new Vector3(),
    }
  } as unknown as RefObject<SystemRefData>;

  it('should ensure portal teleportation finishes before level finish screen', () => {
    const portalAnimationDuration = PORTALS_PORTAL_SWELL_DURATION + PORTALS_PORTAL_COLLAPSE_DURATION;

    // Requirement: portal finishes (0.7s) before screen (1.0s)
    expect(portalAnimationDuration).toBeLessThan(PHYSICS_TRANSITION_FINISH_DELAY);

    const finishingState = { ...baseState, isFinishing: true };
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(finishingState));
    vi.mocked(useGameStore.getState).mockReturnValue(finishingState);

    renderHook(() => useSolarSystemSimulation(systemRef));

    // After portal animation finishes (e.g. 0.8s), levelFinished should still be false
    frameCallback({} as unknown as FiberType.RootState, 0.8);
    expect(mockFinishLevel).not.toHaveBeenCalled();

    // After full finish delay (1.0s), levelFinished should be triggered
    frameCallback({} as unknown as FiberType.RootState, 0.21); // Total 1.01s
    expect(mockFinishLevel).toHaveBeenCalled();
  });

  it('should ensure game over screen shows only after die delay', () => {
    const dyingState = { ...baseState, isDying: true };
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(dyingState));
    vi.mocked(useGameStore.getState).mockReturnValue(dyingState);

    renderHook(() => useSolarSystemSimulation(systemRef));

    // Before delay (e.g. 0.3s), gameOver should still be false
    frameCallback({} as unknown as FiberType.RootState, GAME_OVER_SCREEN_TRANSITION_DIE_DELAY * 0.5);
    expect(mockTriggerGameOver).not.toHaveBeenCalled();

    // After delay (0.6s), gameOver should be triggered
    frameCallback({} as unknown as FiberType.RootState, GAME_OVER_SCREEN_TRANSITION_DIE_DELAY * 0.6); // Total 1.1 * delay
    expect(mockTriggerGameOver).toHaveBeenCalledWith('TEST REASON');
  });
});
