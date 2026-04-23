import { useGLTF, useTexture } from '@react-three/drei';
import { render } from '@testing-library/react';
import React from 'react';
import type { Mesh } from 'three';
import { Vector3 } from 'three';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Spaceship } from './spaceship';
import { useGameStore, type GameState } from '../store';
import type { SystemRefData } from './solar-system';

// Mock the store
vi.mock('../store', () => ({
  useGameStore: Object.assign(
    vi.fn(),
    {
      getState: vi.fn(),
    }
  ),
}));

// Mock simulation hooks
vi.mock('../hooks/use-spaceship-simulation', () => ({
  useSpaceshipSimulation: vi.fn(() => ({
    shockwaveRef: { current: null },
    spaceshipMeshRef: { current: null },
    laserPoints: null,
    trailRef: { current: null },
  })),
}));

// Mock app.config to provide missing constants
vi.mock('../app.config', () => ({
  APP_MIN_LAST_PLANET_DIST: 500,
  APP_SUN_POS: new Vector3(0, 0, 0),
}));

vi.mock('@react-three/drei', async () => {
  const actual = await vi.importActual('@react-three/drei');
  return {
    ...actual,
    useGLTF: vi.fn().mockReturnValue({ scene: { clone: () => ({ traverse: vi.fn() }) } }),
    useTexture: vi.fn().mockReturnValue({ clone: () => ({ wrapS: 0, wrapT: 0 }) }),
  };
});

describe('Spaceship component', () => {
  const initialPosition = new Vector3(100, 0, 0);
  const initialVelocity = new Vector3(0, 10, 0);
  const systemRef = { current: { planets: [], counter: 0 } } as unknown as React.RefObject<SystemRefData>;
  const spaceshipRef = { current: null } as React.RefObject<Mesh | null>;

  const defaultState = {
    isDebug: false,
    settings: { sfxVolume: 1.0, musicVolume: 1.0 },
  } as unknown as GameState;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(defaultState));
    vi.mocked(useGameStore.getState).mockReturnValue(defaultState);
  });

  it('should render a group with cones', () => {
    const { container } = render(
      <Spaceship
        initialPosition={initialPosition}
        initialVelocity={initialVelocity}
        initialOrbitDirection={1}
        systemRef={systemRef}
        spaceshipRef={spaceshipRef}
        resetCounter={0}
      />
    );

    const group = container.querySelector('group');
    expect(group).toBeTruthy();
  });

  it('should resolve model and texture paths relative to Vite base URL', () => {
    render(
      <Spaceship
        initialPosition={initialPosition}
        initialVelocity={initialVelocity}
        initialOrbitDirection={1}
        systemRef={systemRef}
        spaceshipRef={spaceshipRef}
        resetCounter={0}
      />
    );

    expect(useGLTF).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}models/low_poly_space_ship.glb`);
    expect(useTexture).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}models/textures/Material_baseColor.png`);
  });
});
