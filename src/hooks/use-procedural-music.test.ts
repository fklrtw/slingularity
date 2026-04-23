import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useProceduralMusic, music } from './use-procedural-music';
import { useGameStore, type GameState } from '../store';

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));

const mockStrudelEvaluate = vi.fn();
const mockStrudelStop = vi.fn();
const mockStrudelOn = vi.fn();
const mockInitStrudel = vi.fn().mockResolvedValue({
  evaluate: mockStrudelEvaluate,
  stop: mockStrudelStop,
  on: mockStrudelOn
});

vi.mock('@strudel/web', () => ({
  initStrudel: mockInitStrudel,
  superdough: vi.fn(),
  hw: vi.fn(),
}));

vi.mock('./use-audio-effects', () => ({
  sfx: {
    getCtx: vi.fn().mockReturnValue({}),
    getMusicOutput: vi.fn().mockReturnValue({}),
    resume: vi.fn(),
    init: vi.fn(),
  }
}));

vi.mock('../store', () => ({
  useGameStore: Object.assign(
    vi.fn(),
    {
      getState: vi.fn(),
    }
  ),
}));

describe('useProceduralMusic', () => {
  const createState = (overrides: Partial<GameState>) => ({
    settings: { musicEnabled: true, sfxEnabled: true, sfxVolume: 1.0, musicVolume: 1.0 },
    gameStarted: true,
    isStarting: false,
    isFinishing: false,
    gameOver: false,
    lastPlanetIndex: 1,
    velocity: 0,
    ...overrides,
  } as GameState);

  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error Resetting singleton private state for tests
    music.initPromise = null;
    // @ts-expect-error Resetting singleton private state for tests
    music.strudel = null;
    music.lastCps = 1.0;
  });

  it('loads Strudel early if music is enabled even if game is not started', async () => {
    const state = createState({ gameStarted: false, settings: { ...createState({}).settings, musicEnabled: true } });
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(state));
    vi.mocked(useGameStore.getState).mockReturnValue(state);

    renderHook(() => useProceduralMusic());
    await waitFor(() => {
      expect(mockInitStrudel).toHaveBeenCalled();
    });
  });

  it('does not load Strudel if both music and sfx are disabled', () => {
    const state = createState({ gameStarted: false, settings: { ...createState({}).settings, musicEnabled: false, sfxEnabled: false } });
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(state));
    vi.mocked(useGameStore.getState).mockReturnValue(state);

    renderHook(() => useProceduralMusic());
    expect(mockInitStrudel).not.toHaveBeenCalled();
  });

  it('evaluates game over sequence when game over triggers', async () => {
    // Initial state: not game over
    const state = createState({ gameOver: false });
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(state));
    vi.mocked(useGameStore.getState).mockReturnValue(state);

    const { rerender } = renderHook(() => useProceduralMusic());

    await waitFor(() => {
      expect(mockInitStrudel).toHaveBeenCalled();
      expect(mockStrudelEvaluate).toHaveBeenCalled();
    });

    mockStrudelEvaluate.mockClear();

    // Update state to game over
    const newState = createState({ gameOver: true });
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(newState));
    vi.mocked(useGameStore.getState).mockReturnValue(newState);

    rerender();

    await waitFor(() => {
      expect(mockStrudelEvaluate).toHaveBeenCalledWith(expect.stringContaining(`note("0 2 4")`));
    });
  });

  it('plays victory variation when level is finishing', async () => {
    // Initial state
    const state = createState({ isFinishing: false });
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(state));
    vi.mocked(useGameStore.getState).mockReturnValue(state);

    const { rerender } = renderHook(() => useProceduralMusic());

    await waitFor(() => {
      expect(mockInitStrudel).toHaveBeenCalled();
    });

    // Update state to finishing
    const newState = createState({ isFinishing: true });
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(newState));
    vi.mocked(useGameStore.getState).mockReturnValue(newState);

    rerender();

    await waitFor(() => {
      const evaluateCalls = mockStrudelEvaluate.mock.calls.map(call => call[0]);
      expect(evaluateCalls.some(code => code.includes('variation === \'victory\'') || code.includes('C:major'))).toBeTruthy();
    });
  });

  it('applies quadratic volume mapping to music gain', async () => {
    // 50% slider volume
    const state = createState({ settings: { ...createState({}).settings, musicVolume: 0.5 } });
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(state));
    vi.mocked(useGameStore.getState).mockReturnValue(state);

    renderHook(() => useProceduralMusic());

    await waitFor(() => {
      expect(mockStrudelEvaluate).toHaveBeenCalled();
      const lastCall = mockStrudelEvaluate.mock.calls[mockStrudelEvaluate.mock.calls.length - 1][0];
      // 0.5^2 = 0.25
      expect(lastCall).toContain('.gain(0.25)');
    });
  });
});
