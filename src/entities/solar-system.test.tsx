import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SolarSystem } from './solar-system';
import { useGameStore, type GameState } from '../store';
import { Vector3 } from 'three';
import type { SystemRefData } from './solar-system';

// Mock dependencies
vi.mock('../store', () => ({
  useGameStore: Object.assign(
    vi.fn(),
    {
      getState: vi.fn(),
    }
  ),
}));

vi.mock('./comet-tail', () => ({
  CometTail: () => <mesh data-testid="comet-tail" />
}));

vi.mock('../hooks/use-theme-colors', () => ({
  useThemeColors: () => ({
    themePrimarySoft: { getStyle: () => '#ff0000' }
  })
}));

vi.mock('../hooks/use-solar-system-effects', () => ({
  useSolarSystemEffects: vi.fn()
}));

describe('SolarSystem Component', () => {
  const baseState = {
    resetCounter: 0,
    annihilatedPlanets: new Set(),
    isDebug: false,
    settings: { shadows: true, shaders: 'advanced', autoPerformance: true, sfxVolume: 1.0, musicVolume: 1.0 }
  } as unknown as GameState;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(baseState));
    vi.mocked(useGameStore.getState).mockReturnValue(baseState);
  });

  const baseSystemData = {
    planets: [
      { id: 'sun', isSun: true, position: new Vector3(0, 0, 0) },
      { id: 'p1', position: new Vector3(100, 0, 0), hasRings: true },
      { id: 'p2', position: new Vector3(200, 0, 0), hasRings: false }
    ],
    counter: 0,
    portalPosition: new Vector3(),
    portalDist: 300,
    shipParams: { pos: new Vector3(), vel: new Vector3(), dir: 1 }
  } as unknown as SystemRefData;

  const systemRef = { current: baseSystemData };

  it('should render a group for each planet (excluding the sun)', () => {
    const { container } = render(<SolarSystem systemData={baseSystemData} systemRef={systemRef} />);

    const groups = container.querySelectorAll('group');
    expect(groups.length).toBe(3);

    const meshes = container.querySelectorAll('mesh');
    expect(meshes.length).toBe(7);
  });

  it('should render comets with tails', () => {
    const systemWithComet = {
      planets: [
        { id: 'sun', isSun: true, position: new Vector3(0, 0, 0) },
        { id: 'c1', isComet: true, position: new Vector3(150, 0, 0), radius: 2, velocity: new Vector3(0, 100, 0) }
      ],
      counter: 0,
      portalPosition: new Vector3(),
      portalDist: 300,
      shipParams: { pos: new Vector3(), vel: new Vector3(), dir: 1 }
    } as unknown as SystemRefData;

    const { container, getAllByTestId } = render(<SolarSystem systemData={systemWithComet} systemRef={{ current: systemWithComet }} />);

    const meshes = container.querySelectorAll('mesh');
    expect(meshes.length).toBe(4);
    expect(getAllByTestId('comet-tail')).toBeTruthy();
  });

  it('should return empty if counter mismatch', () => {
    const mismatchState = { ...baseState, resetCounter: 1 };
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(mismatchState));
    vi.mocked(useGameStore.getState).mockReturnValue(mismatchState);

    const { container } = render(<SolarSystem systemData={baseSystemData} systemRef={systemRef} />);

    const groups = container.querySelectorAll('group');
    expect(groups.length).toBe(1);

    const meshes = container.querySelectorAll('mesh');
    expect(meshes.length).toBe(0);
  });
});
