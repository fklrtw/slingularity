import { renderHook, act, waitFor } from '@testing-library/react';
import { useFrame, useThree, type RenderCallback, type RootState } from '@react-three/fiber';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useBackgroundEffects } from './use-background-effects';
import { useGameStore, type GameState } from '../store';
import { Group, ShaderMaterial } from 'three';

// Mock @react-three/fiber
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: vi.fn(),
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

// Mock Hooks
vi.mock('./use-theme-colors', () => ({
  useThemeColors: () => ({ galaxyPalette: ['#ff0000'], textMain: { getStyle: () => '#ffffff' } })
}));

describe('useBackgroundEffects', () => {
  let frameCallback: RenderCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFrame).mockImplementation((cb: RenderCallback) => {
      frameCallback = cb;
      return null;
    });

    vi.mocked(useThree).mockReturnValue({
      size: { width: 1920, height: 1080 },
    } as unknown as ReturnType<typeof useThree>);

    const state = {
      resetCounter: 0,
      settingsMenuOpen: false,
      settings: { detailLevel: 'high', resolutionScale: 'high', antialiasing: 'high', sfxVolume: 1.0, musicVolume: 1.0 },
    } as unknown as GameState;

    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(state));
    vi.mocked(useGameStore.getState).mockReturnValue(state);

    // Mock fetch for GeoJSON data
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('stars')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            features: [
              { geometry: { type: 'Point', coordinates: [10, 20] }, properties: { mag: 1 } },
              { geometry: { type: 'Point', coordinates: [30, 40] }, properties: { mag: 5 } }
            ]
          })
        });
      } else if (url.includes('constellations')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            features: [
              { geometry: { type: 'LineString', coordinates: [[10, 20], [30, 40]] } },
              { geometry: { type: 'MultiLineString', coordinates: [[[50, 60], [70, 80]]] } }
            ]
          })
        });
      }
      return Promise.resolve({ json: () => Promise.resolve({ features: [] }) });
    });
  });

  it('should initialize galaxy data and geometry after fetch', async () => {
    const groupRef = { current: new Group() };
    const materialRef = { current: new ShaderMaterial({ uniforms: { viewportHeight: { value: 0 }, time: { value: 0 } } }) };

    const { result } = renderHook(() => useBackgroundEffects({ groupRef, materialRef }));

    expect(result.current.galaxyData).toBeDefined();
    expect(result.current.galaxyData.length).toBeGreaterThan(0);
    expect(result.current.starUniforms).toBeDefined();

    // Verify geometry is generated
    await waitFor(() => {
      expect(result.current.starGeometry).not.toBeNull();
      expect(result.current.constellationGeometry).not.toBeNull();
    });
  });

  it('should update group drift and material uniforms on frame', async () => {
    const groupRef = { current: new Group() };
    const materialRef = { current: new ShaderMaterial({ uniforms: { viewportHeight: { value: 0 }, time: { value: 0 } } }) };

    await act(async () => {
      renderHook(() => useBackgroundEffects({ groupRef, materialRef }));
    });

    // Simulate frame
    act(() => {
      frameCallback({
        camera: { position: { x: 100, y: 100 } },
      } as unknown as RootState, 0.016);
    });

    // Group should be offset by camera position + internal drift
    expect(groupRef.current.position.x).not.toBe(0);
    expect(groupRef.current.position.y).not.toBe(0);

    // Uniforms should be updated
    expect(materialRef.current.uniforms.viewportHeight.value).toBe(1080);
    expect(materialRef.current.uniforms.time.value).toBeGreaterThan(0);
  });
});
