import { render } from '@testing-library/react';
import React from 'react';
import { Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { Portal } from './portal';
import type { SystemRefData } from './solar-system';

// Mock dependencies
vi.mock('../store', () => ({
  useGameStore: vi.fn(selector => selector({
    resetCounter: 0,
    portalPosition: new Vector3(200, 0, 0),
    settings: { detailLevel: 'high', sfxVolume: 1.0, musicVolume: 1.0 }
  })),
}));

vi.mock('../hooks/use-theme-colors', () => ({
  useThemeColors: () => ({ themePortal: '#00ffff' }),
}));

vi.mock('../hooks/use-portal-effects', () => ({
  usePortalEffects: vi.fn(),
}));

describe('Portal Component', () => {
  const mockSystemRef = {
    current: {
      planets: [],
      counter: 0,
      portalPosition: new Vector3(200, 0, 0),
      portalDist: 200,
      shipParams: { pos: new Vector3(), vel: new Vector3(), dir: 1 }
    }
  } as unknown as React.RefObject<SystemRefData>;

  it('should render a group with torus and sphere for start portal', () => {
    const { container } = render(
      <Portal
        type="start"
        initialPosition={new Vector3(0, 0, 0)}
        systemRef={mockSystemRef}
      />
    );

    expect(container.querySelector('group')).toBeTruthy();
    expect(container.querySelector('torusGeometry')).toBeTruthy();
    expect(container.querySelector('sphereGeometry')).toBeTruthy();
  });

  it('should render an end portal', () => {
    const { container } = render(
      <Portal
        type="end"
        systemRef={mockSystemRef}
      />
    );

    expect(container.querySelector('group')).toBeTruthy();
  });
});
