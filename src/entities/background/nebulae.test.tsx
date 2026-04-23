import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Nebulae, generateNoiseTexture } from './nebulae';
import { useGameStore, type GameState } from '../../store';

vi.mock('../../store', () => ({
  useGameStore: Object.assign(
    vi.fn(),
    {
      getState: vi.fn(),
    }
  ),
}));

vi.mock('../../hooks/use-theme-colors', () => ({
  useThemeColors: () => ({ nebulaPalette: ['#ff0000', '#00ff00'] })
}));

describe('Nebulae Component', () => {
  beforeEach(() => {
    const state = {
      resetCounter: 0,
      settings: { detailLevel: 'high', sfxVolume: 1.0, musicVolume: 1.0 }
    } as unknown as GameState;
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(state));
    vi.mocked(useGameStore.getState).mockReturnValue(state);
  });

  it('should render a group with nebula meshes', () => {
    const { container } = render(<Nebulae depth={10} />);
    const groups = container.querySelectorAll('group');
    const meshes = container.querySelectorAll('mesh');

    expect(groups.length).toBeGreaterThan(0);
    expect(meshes.length).toBeGreaterThan(0); // Driven by BACKGROUND_NEBULA_COUNT
  });

  it('should generate a noise texture', () => {
    const rng = vi.fn().mockReturnValue(0.5);
    const tex = generateNoiseTexture(4, rng);
    expect(tex).toBeDefined();
    expect(tex.image.width).toBe(4);
    expect(tex.image.height).toBe(4);
    expect(tex.image.data).toBeInstanceOf(Uint8Array);
  });
});
