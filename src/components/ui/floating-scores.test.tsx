import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FloatingScores } from './floating-scores';
import { useGameStore, type GameState } from '../../store';
import { Vector3 } from 'three';

// Mock @react-three/drei
vi.mock('@react-three/drei', () => ({
  Text: React.forwardRef((props: { visible?: boolean, position?: [number, number, number], children?: React.ReactNode }, ref: React.ForwardedRef<{ fillOpacity: number }>) => {
    if (ref) {
      if (typeof ref === 'function') {
        ref({ fillOpacity: 1 });
      } else {
        ref.current = { fillOpacity: 1 };
      }
    }
    return <div data-testid="drei-text" data-visible={props.visible} data-position={props.position}>{props.children}</div>;
  })
}));

// Mock Store
vi.mock('../../store', () => ({
  useGameStore: vi.fn(),
}));

// Mock Hooks
vi.mock('../../hooks/use-theme-colors', () => ({
  useThemeColors: () => ({ themePrimary: '#ff0000', themeHighlight: '#00ff00' })
}));

vi.mock('../../hooks/use-floating-score-effects', () => ({
  useFloatingScoreEffects: () => {
    // Just a mock that simulates the effect without useFrame
  }
}));

describe('FloatingScores Component', () => {
  const mockRemoveFloatingScore = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render nothing but the WARMUP text if floatingScores is empty', () => {
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => {
      if (selector.toString().includes('floatingScores')) {
        return [];
      }
      if (selector.toString().includes('removeFloatingScore')) {
        return mockRemoveFloatingScore;
      }
      return null;
    });

    const { queryAllByTestId } = render(<FloatingScores />);
    const texts = queryAllByTestId('drei-text');
    expect(texts).toHaveLength(1);
    expect(texts[0].textContent).toBe('WARMUP');
  });

  it('should render floating scores correctly', () => {
    const scores = [
      { id: 1, value: 100, position: new Vector3(0, 0, 0), startTime: 0, multiplier: 2 },
      { id: 2, value: 50, position: new Vector3(10, 0, 0), startTime: 0, multiplier: 0 }
    ];

    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => {
      if (selector.toString().includes('floatingScores')) {
        return scores;
      }
      if (selector.toString().includes('removeFloatingScore')) {
        return mockRemoveFloatingScore;
      }
      return null;
    });

    const { queryAllByTestId } = render(<FloatingScores />);
    const texts = queryAllByTestId('drei-text');

    // 1 warmup + 2 main scores + 1 multiplier = 4 Text components
    expect(texts).toHaveLength(4);

    // Check main point values
    expect(texts[1].textContent).toBe('+100');
    expect(texts[2].textContent).toBe('x2');
    expect(texts[3].textContent).toBe('+50');
  });
});
