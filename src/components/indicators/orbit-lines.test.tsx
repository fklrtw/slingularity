import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { OrbitLines } from './orbit-lines';
import { useGameStore, type GameState } from '../../store';
import type { SystemRefData } from '../../entities/solar-system';

// Mock @react-three/drei
vi.mock('@react-three/drei', () => ({
  Line: React.forwardRef((props: { points?: unknown[] }, ref) => {
    // Give it a dummy structure so refs can attach if they want
    if (ref) {
      if (typeof ref === 'function') {
        ref({ visible: true }); // dummy ref
      } else {
        ref.current = { visible: true };
      }
    }
    return <div data-testid="drei-line" data-points={JSON.stringify(props.points)} />;
  })
}));

// Mock Store
vi.mock('../../store', () => ({
  useGameStore: vi.fn(),
}));

// Mock useThemeColors
vi.mock('../../hooks/use-theme-colors', () => ({
  useThemeColors: () => ({ themePrimaryDim: '#555555' })
}));

// Mock useOrbitLinesEffects
vi.mock('../../hooks/use-orbit-lines-effects', () => ({
  useOrbitLinesEffects: vi.fn(),
}));

describe('OrbitLines Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseSystemData = {
    planets: [
      { isSun: true, position: new Vector3(0, 0, 0), semiMajorAxis: 0, semiMinorAxis: 0, focusOffset: 0, id: 'sun' },
      { id: 'p1', position: new Vector3(100, 0, 0), semiMajorAxis: 100, semiMinorAxis: 80, focusOffset: 10, color: '#ff0000' },
      { id: 'p2', position: new Vector3(200, 0, 0), semiMajorAxis: 200, semiMinorAxis: 180, focusOffset: 20 }, // no color, defaults to theme
    ],
    counter: 0,
  } as unknown as SystemRefData;

  it('should return empty group if systemData is missing or counter does not match', () => {
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector({
      resetCounter: 1, // Mismatch
    } as unknown as GameState));

    const { queryAllByTestId } = render(<OrbitLines systemData={baseSystemData} />);
    expect(queryAllByTestId('drei-line')).toHaveLength(0);
  });

  it('should render orbit lines for planets, skipping the sun', () => {
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector({
      resetCounter: 0,
    } as unknown as GameState));

    const { getAllByTestId } = render(<OrbitLines systemData={baseSystemData} />);

    const lines = getAllByTestId('drei-line');
    expect(lines).toHaveLength(2); // p1 and p2

    const p1Points = JSON.parse(lines[0].getAttribute('data-points') || '[]');
    // 128 segments = 129 points
    expect(p1Points).toHaveLength(129);
    // At angle 0 (cos=1, sin=0), pos should be (100 - 10, 0, 0) = (90, 0, 0)
    expect(p1Points[0].x).toBeCloseTo(90);
    expect(p1Points[0].y).toBeCloseTo(0);
    expect(p1Points[0].z).toBeCloseTo(0);
  });
});
