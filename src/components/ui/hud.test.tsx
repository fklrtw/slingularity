import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { Hud } from './hud';
import { render, screen, fireEvent } from '@testing-library/react';
import { useGameStore, type GameState } from '../../store';
import {
  TEXT_HUD_LEVEL,
  TEXT_HUD_SCORE,
  TEXT_RESTART_HINT,
} from '../../text.config';

import type { SystemRefData } from '../../entities/solar-system';

// Mock the store
vi.mock('../../store', () => ({
  useGameStore: Object.assign(
    vi.fn(),
    {
      getState: vi.fn(),
    }
  ),
}));

// Mock hooks
vi.mock('../../hooks/use-theme-colors', () => ({
  useThemeColors: () => ({
    themePrimary: { getStyle: () => '#ffffff' },
    themeHighlight: { getStyle: () => '#ffffff' },
    themeDanger: { getStyle: () => '#ffffff' },
    sunColorScale: () => ({ hex: () => '#ffffff' }),
  }),
}));

describe('Hud component', () => {
  const mockSystemRef = {
    current: {
      planets: [],
      counter: 0,
      portalPosition: new Vector3(),
      portalDist: 0,
      shipParams: { pos: new Vector3(), vel: new Vector3(), dir: 1 }
    }
  } as unknown as React.RefObject<SystemRefData>;

  const defaultState = {
    level: 1,
    totalPlanets: 5,
    resetGame: vi.fn(),
    isDebug: false,
    settings: { sfxVolume: 1.0, musicVolume: 1.0 },
    score: { integerValue: () => ({ toString: () => '10000' }), toNumber: () => 10000 },
    sunRadius: 10,
    lastPlanetDist: 500,
    distToSun: 0,
    velocity: 0,
    distanceTraveled: 0,
    annihilatedPlanets: new Set(),
  } as unknown as GameState;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(defaultState));
    vi.mocked(useGameStore.getState).mockReturnValue(defaultState);
  });

  it('should render game stats', () => {
    render(<Hud systemRef={mockSystemRef} />);
    expect(screen.getByText(TEXT_HUD_LEVEL, { exact: false })).toBeTruthy();
    expect(screen.getByText(TEXT_HUD_SCORE, { exact: false })).toBeTruthy();
  });

  it('should call resetGame when restart button is clicked', () => {
    const spy = vi.fn();
    const state = { ...defaultState, resetGame: spy };
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(state));
    vi.mocked(useGameStore.getState).mockReturnValue(state);

    render(<Hud systemRef={mockSystemRef} />);
    const restartBtn = screen.getByTitle(TEXT_RESTART_HINT, { exact: false });
    fireEvent.click(restartBtn);
    expect(spy).toHaveBeenCalled();
  });

  it('should hide planet count when totalPlanets is 1 or less', () => {
    const state = { ...defaultState, totalPlanets: 1 };
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(state));
    vi.mocked(useGameStore.getState).mockReturnValue(state);

    const { queryByText } = render(<Hud systemRef={mockSystemRef} />);
    expect(queryByText('planets', { exact: false })).toBeNull();
  });

  it('should render Debug Hud when debug setting is true', async () => {
    const state = {
      ...defaultState,
      isDebug: true,
      settings: { sfxVolume: 1.0, musicVolume: 1.0 }
    } as unknown as GameState;
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(state));
    vi.mocked(useGameStore.getState).mockReturnValue(state);

    // Mock requestAnimationFrame to run once and then stop to avoid infinite recursion
    vi.spyOn(window, 'requestAnimationFrame')
      .mockImplementationOnce((cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      })
      .mockImplementation(() => 0);

    render(<Hud systemRef={mockSystemRef} />);

    expect(screen.getByText(/DEBUG Hud/i)).toBeTruthy();
  });
});
