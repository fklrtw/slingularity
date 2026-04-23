import { renderHook } from '@testing-library/react';
import type * as FiberType from '@react-three/fiber';
import { useFrame, type RenderCallback } from '@react-three/fiber';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { type RefObject } from 'react';
import { Color, type Mesh, ShaderMaterial, Vector3 } from 'three';
import { useSolarSystemEffects } from './use-solar-system-effects';
import { type GameState, useGameStore } from '../store';
import {
  SHOCKWAVE_ANNIHILATION_PHASE1_DURATION,
  SHOCKWAVE_ANNIHILATION_PHASE2_DURATION,
} from '../entities/shockwave.config';
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

describe('useSolarSystemEffects', () => {
  let frameCallback: RenderCallback;

  const baseState = {
    gameStarted: true,
    annihilatedPlanets: new Set(),
    annihilatedRings: new Set(),
    level: 1,
    sunRadius: 10,
    resetCounter: 0,
    settingsMenuOpen: false,
    isDebug: false,
    settings: { shaders: 'advanced', sfxVolume: 1.0, musicVolume: 1.0 }
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

  const createMockMesh = () => ({
    position: new Vector3(),
    scale: new Vector3(1, 1, 1),
    rotation: { z: 0 },
    visible: true,
    material: new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color() },
        uSunPos: { value: new Vector3() },
        uSunInfluence: { value: 0 },
        uRotation: { value: 0 },
        uLightRotation: { value: 0 },
        uProgress: { value: 0 },
        uOpacity: { value: 1 },
      }
    }),
  } as unknown as Mesh);

  const systemRef = {
    current: {
      planets: [
        { isSun: true, position: new Vector3() },
        { id: 'p1', position: new Vector3(100, 0, 0), radius: 5, color: '#ff0000', atmosphereRadius: 20, crashRadius: 6, hasRings: false }
      ],
      counter: 0,
    }
  } as unknown as RefObject<SystemRefData>;

  it('should sync mesh position and scale in normal mode', () => {
    const meshes = { current: [null, createMockMesh()] } as RefObject<(Mesh | null)[]>;
    const rings = { current: [] } as RefObject<(Mesh | null)[]>;
    const bands = { current: [] } as RefObject<(Mesh | null)[]>;
    const annihilators = { current: [] } as RefObject<(Mesh | null)[]>;

    renderHook(() => useSolarSystemEffects({ systemRef, meshes, rings, bands, annihilators }));

    vi.spyOn(performance, 'now').mockReturnValue(0);
    frameCallback({} as unknown as FiberType.RootState, 0.016);

    expect(meshes.current[1]?.position.x).toBe(100);
    expect(meshes.current[1]?.scale.x).toBe(5);
  });

  it('should handle annihilation phase 2 (shockwave)', () => {
    const mesh = createMockMesh();
    const meshes = { current: [null, mesh] } as RefObject<(Mesh | null)[]>;
    const annihilator = createMockMesh();
    const annihilators = { current: [null, annihilator] } as RefObject<(Mesh | null)[]>;

    const state = { ...baseState, annihilatedPlanets: new Set([1]) };
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(state));
    vi.mocked(useGameStore.getState).mockReturnValue(state);

    renderHook(() => useSolarSystemEffects({ systemRef, meshes, rings: { current: [] } as unknown as RefObject<(Mesh | null)[]>, bands: { current: [] } as unknown as RefObject<(Mesh | null)[]>, annihilators }));

    // Start at time 10
    vi.spyOn(performance, 'now').mockReturnValue(10000);
    frameCallback({} as unknown as FiberType.RootState, 0.016);

    // Move to phase 2
    vi.spyOn(performance, 'now').mockReturnValue((10.0 + SHOCKWAVE_ANNIHILATION_PHASE1_DURATION + SHOCKWAVE_ANNIHILATION_PHASE2_DURATION * 0.5) * 1000);
    frameCallback({} as unknown as FiberType.RootState, 0.016);

    expect(mesh.visible).toBe(false);
    expect(annihilator.visible).toBe(true);
    expect((annihilator.material as ShaderMaterial).uniforms.uProgress.value).toBeCloseTo(0.5, 1);
  });

  it('should handle annihilation phase 3 (fade)', () => {
    const mesh = createMockMesh();
    const meshes = { current: [null, mesh] } as RefObject<(Mesh | null)[]>;
    const annihilator = createMockMesh();
    const annihilators = { current: [null, annihilator] } as RefObject<(Mesh | null)[]>;

    const state = { ...baseState, annihilatedPlanets: new Set([1]) };
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(state));
    vi.mocked(useGameStore.getState).mockReturnValue(state);

    renderHook(() => useSolarSystemEffects({ systemRef, meshes, rings: { current: [] } as unknown as RefObject<(Mesh | null)[]>, bands: { current: [] } as unknown as RefObject<(Mesh | null)[]>, annihilators }));

    // Start at time 10
    vi.spyOn(performance, 'now').mockReturnValue(10000);
    frameCallback({} as unknown as FiberType.RootState, 0.016);

    // Move to phase 2
    vi.spyOn(performance, 'now').mockReturnValue((10.0 + SHOCKWAVE_ANNIHILATION_PHASE1_DURATION + SHOCKWAVE_ANNIHILATION_PHASE2_DURATION * 0.5) * 1000);
    frameCallback({} as unknown as FiberType.RootState, 0.016);

    // Move to phase 3
    vi.spyOn(performance, 'now').mockReturnValue((10.0 + SHOCKWAVE_ANNIHILATION_PHASE1_DURATION + SHOCKWAVE_ANNIHILATION_PHASE2_DURATION + 0.1) * 1000);
    frameCallback({} as unknown as FiberType.RootState, 0.016);

    expect(mesh.visible).toBe(false);
    expect(annihilator.visible).toBe(true);
    expect((annihilator.material as ShaderMaterial).uniforms.uOpacity.value).toBeLessThan(1.0);
  });
});
