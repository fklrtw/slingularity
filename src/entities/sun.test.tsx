import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../store';
import { sunFragmentShader, Sun } from './sun';

vi.mock('../store', () => {
  const store = {
    settings: { shaders: 'advanced', detailLevel: 'high', sfxVolume: 1.0, musicVolume: 1.0 },
    sunStatus: 'normal',
    sunRemnant: 'white-dwarf'
  };
  return {
    useGameStore: vi.fn(selector => selector(store))
  };
});

vi.mock('../hooks/use-theme-colors', () => ({
  useThemeColors: () => ({ themeHighlight: '#ff0000', sunColorScale: vi.fn() })
}));

vi.mock('../hooks/use-sun-effects', () => ({
  useSunEffects: vi.fn()
}));

describe('Sun Component Shaders', () => {
  it('should include band animation constants from config', () => {
    // Current values from sun.config.ts (band1_freq: 2.5, band2_freq: 1.5)
    expect(sunFragmentShader).toContain('sin(vPosition.y * 2.5');
    expect(sunFragmentShader).toContain('sin(vPosition.x * 1.5');
    expect(sunFragmentShader).toContain('vPosition.y * 0.5'); // Coordinate mixing
  });

  it('should implement rim lighting / fresnel effect', () => {
    // Current values from sun.config.ts (rim_pow: 1.5, rim_step: 0.45, rim_mult: 0.7)
    expect(sunFragmentShader).toContain('float fresnel = pow(1.0 - max(0.0, dot(vNormal, vViewDir)), 1.5)');
    expect(sunFragmentShader).toContain('vec3 rim = rimColor * smoothstep(0.45 - 0.15, 0.45 + 0.15, fresnel) * 0.7');
  });

  it('should include time-based animation uniforms', () => {
    expect(sunFragmentShader).toContain('uniform float time;');
    expect(sunFragmentShader).toContain('uniform vec3 uColor;');
  });
});

describe('Sun Component', () => {
  it('should render the Sun group, light, core and glow layers', () => {
    const { container } = render(<Sun />);

    // The top level is a group. Inside it should be a pointLight and several meshes.
    // Core mesh (1) + glow layers (from SUN_GLOW_LAYERS in config)
    const pointLights = container.querySelectorAll('pointLight');
    expect(pointLights.length).toBe(1);

    const meshes = container.querySelectorAll('mesh');
    // We expect at least 1 core mesh.
    expect(meshes.length).toBeGreaterThan(0);
  });

  it('should render the brilliant white flash overlay during supernova_flash', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useGameStore).mockImplementation((selector: any) => selector({
      settings: { shaders: 'advanced', detailLevel: 'high' },
      sunStatus: 'supernova_flash',
      sunRemnant: 'white-dwarf'
    }));

    const { container } = render(<Sun />);
    const meshes = container.querySelectorAll('mesh');
    // Core (1) + Glow Layers (3) + Flash Overlay (1) = 5
    expect(meshes.length).toBe(5);

    // Verify the flash overlay is there (renderOrder 10000)
    // We can't easily check props of rendered three-fiber components with basic testing library
    // but the count is a good indicator.
  });
});
