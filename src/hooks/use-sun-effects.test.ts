import chroma from 'chroma-js';
import { renderHook } from '@testing-library/react';
import type * as FiberType from '@react-three/fiber';
import { useFrame, type RenderCallback } from '@react-three/fiber';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Color, type Mesh, type PointLight, ShaderMaterial, Vector3 } from 'three';
import { useSunEffects, getSunColor } from './use-sun-effects';
import { SUN_CORE_SIZE, SUN_GLOW_LAYERS } from '../entities/sun.config';

// Mock @react-three/fiber
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));

// Mock Store
vi.mock('../store', () => {
  const state = {
    sunRadius: 10,
    lastPlanetDist: 500,
    resetCounter: 0,
    sunStatus: 'normal',
    sunRemnant: null,
    gameOver: false,
    settingsMenuOpen: false,
    creditsMenuOpen: false,
  };
  return {
    useGameStore: Object.assign(
      vi.fn(selector => selector(state)),
      {
        getState: vi.fn(() => state),
      }
    ),
  };
});

describe('useSunEffects', () => {
  let frameCallback: RenderCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFrame).mockImplementation((cb: RenderCallback) => {
      frameCallback = cb;
      return null;
    });
  });

  const mockScale = chroma.scale(['#ff0000', '#00ff00']).mode('lch');

  it('getSunColor should return different colors for different percentages', () => {
    const color0 = getSunColor(0, mockScale);
    const color50 = getSunColor(50, mockScale);
    const color100 = getSunColor(100, mockScale);

    expect(color0).toBe('#ff0000');
    expect(color100).toBe('#00ff00');
    expect(color0).not.toBe(color50);
    expect(color50).not.toBe(color100);
  });

  it('should update core and light based on store state', () => {
    const lightRef = { current: { color: new Color() } } as React.RefObject<PointLight>;
    const coreRef = {
      current: {
        scale: new Vector3(),
        material: new ShaderMaterial({ uniforms: { uColor: { value: new Color() }, time: { value: 0 } } })
      }
    } as unknown as React.RefObject<Mesh>;
    const glowRefs = { current: [] } as React.RefObject<(Mesh | null)[]>;

    renderHook(() => useSunEffects({
      lightRef,
      coreRef,
      glowRefs,
      sunColorScale: mockScale,
    }));

    vi.spyOn(performance, 'now').mockReturnValue(123000);
    frameCallback({} as unknown as FiberType.RootState, 0.016);

    expect(coreRef.current?.scale.x).toBe(10); // from mock store
    expect((coreRef.current?.material as ShaderMaterial).uniforms.time.value).toBe(123);
  });

  it('should update all glow layers proportionally', () => {
    const lightRef = { current: null } as React.RefObject<PointLight | null>;
    const coreRef = { current: null } as React.RefObject<Mesh | null>;

    const mockGlow = () => ({
      scale: new Vector3(),
      material: new ShaderMaterial({ uniforms: { uColor: { value: new Color() }, time: { value: 0 } } })
    }) as unknown as Mesh;

    const layers = [mockGlow(), mockGlow()];
    const glowRefs = { current: layers } as React.RefObject<(Mesh | null)[]>;

    renderHook(() => useSunEffects({
      lightRef,
      coreRef,
      glowRefs,
      sunColorScale: mockScale,
    }));

    vi.spyOn(performance, 'now').mockReturnValue(0);
    frameCallback({} as unknown as FiberType.RootState, 0.016);

    layers.forEach((mesh, i) => {
      const expectedScale = 10 * (SUN_GLOW_LAYERS[i].size / SUN_CORE_SIZE);
      expect(mesh.scale.x).toBeCloseTo(expectedScale, 2);
    });
  });
});
