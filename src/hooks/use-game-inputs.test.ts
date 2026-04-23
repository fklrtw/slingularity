import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useGameInputs } from './use-game-inputs';
import { type GameState, useGameStore } from '../store';

// Mock the store
vi.mock('../store', () => ({
  useGameStore: Object.assign(
    vi.fn(),
    {
      getState: vi.fn(),
    }
  ),
}));

describe('useGameInputs', () => {
  const mockAnnihilateNextPlanet = vi.fn();
  const mockResetGame = vi.fn();
  const mockStartGame = vi.fn();
  const mockStartNextLevel = vi.fn();

  const createState = (overrides: Partial<GameState> = {}): GameState => ({
    annihilateNextPlanet: mockAnnihilateNextPlanet,
    gameOver: false,
    gameStarted: false,
    audioPromptAnswered: true,
    levelFinished: false, resetGame: mockResetGame,
    startGame: mockStartGame,
    startNextLevel: mockStartNextLevel,
    settingsMenuOpen: false,
    settings: {
      sfxEnabled: true,
      sfxVolume: 1.0, musicVolume: 1.0 },
    ...overrides,
  } as unknown as GameState);

  beforeEach(() => {
    vi.clearAllMocks();

    const defaultState = createState();
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(defaultState));
    vi.mocked(useGameStore.getState).mockReturnValue(defaultState);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const fireKeyDown = (code: string) => {
    const event = new KeyboardEvent('keydown', { code, bubbles: true });
    vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);
    return event;
  };

  const fireMouseDown = (target: HTMLElement = document.createElement('canvas')) => {
    const event = new MouseEvent('mousedown', { bubbles: true });
    // Use defineProperty because 'target' is read-only on the event object
    Object.defineProperty(event, 'target', { value: target, enumerable: true });
    window.dispatchEvent(event);
    return event;
  };

  const fireTouchStart = (target: HTMLElement = document.createElement('canvas')) => {
    const event = new TouchEvent('touchstart', { bubbles: true });
    vi.spyOn(event, 'preventDefault');
    Object.defineProperty(event, 'target', { value: target, enumerable: true });
    window.dispatchEvent(event);
    return event;
  };

  describe('KeyR Handling', () => {
    it('should trigger resetGame when KeyR is pressed, regardless of game state', () => {
      renderHook(() => useGameInputs());
      fireKeyDown('KeyR');
      expect(mockResetGame).toHaveBeenCalled();
    });
  });

  describe('Primary Action Triggers (Space, Mouse, Touch)', () => {
    const primaryActions = [
      { name: 'Space', fire: () => fireKeyDown('Space') },
      { name: 'MouseDown', fire: fireMouseDown },
      { name: 'TouchStart', fire: fireTouchStart },
    ];

    describe('Game NOT Started', () => {
      beforeEach(() => {
        const state = createState({ gameStarted: false });
        vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(state));
        vi.mocked(useGameStore.getState).mockReturnValue(state);
      });

      primaryActions.forEach(({ name, fire }) => {
        it(`should start game on ${name}`, () => {
          renderHook(() => useGameInputs());
          fire();
          expect(mockStartGame).toHaveBeenCalled();
        });
      });
    });

    describe('Game Over', () => {
      beforeEach(() => {
        const state = createState({ gameOver: true, gameStarted: true });
        vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(state));
        vi.mocked(useGameStore.getState).mockReturnValue(state);
      });

      primaryActions.forEach(({ name, fire }) => {
        it(`should reset game on ${name}`, () => {
          renderHook(() => useGameInputs());
          fire();
          expect(mockResetGame).toHaveBeenCalled();
        });
      });
    });

    describe('Level Finished', () => {
      beforeEach(() => {
        const state = createState({ gameStarted: true, levelFinished: true });
        vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(state));
        vi.mocked(useGameStore.getState).mockReturnValue(state);
      });

      primaryActions.forEach(({ name, fire }) => {
        it(`should start next level on ${name}`, () => {
          renderHook(() => useGameInputs());
          fire();
          expect(mockStartNextLevel).toHaveBeenCalled();
        });
      });
    });

    describe('Active Gameplay', () => {
      beforeEach(() => {
        const state = createState({ gameStarted: true, levelFinished: false });
        vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(state));
        vi.mocked(useGameStore.getState).mockReturnValue(state);
      });

      primaryActions.forEach(({ name, fire }) => {
        it(`should annihilate next planet on ${name}`, () => {
          renderHook(() => useGameInputs());
          fire();
          expect(mockAnnihilateNextPlanet).toHaveBeenCalled();
        });
      });
    });
  });

  describe('Event Prevention', () => {
    it('should call preventDefault for Spacebar', () => {
      renderHook(() => useGameInputs());
      const event = fireKeyDown('Space');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should NOT call preventDefault for other keys (e.g. Enter)', () => {
      renderHook(() => useGameInputs());
      const event = fireKeyDown('Enter');
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should call preventDefault for TouchStart', () => {
      const state = createState({ gameStarted: true });
      vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(state));
      vi.mocked(useGameStore.getState).mockReturnValue(state);

      renderHook(() => useGameInputs());
      const event = fireTouchStart();
      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('UI Integration', () => {
    it('should ignore inputs when settings menu is open', () => {
      const state = createState({ settingsMenuOpen: true, gameStarted: false });
      vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(state));
      vi.mocked(useGameStore.getState).mockReturnValue(state);

      renderHook(() => useGameInputs());
      fireKeyDown('Space');
      expect(mockStartGame).not.toHaveBeenCalled();

      fireKeyDown('KeyR');
      expect(mockResetGame).not.toHaveBeenCalled();
    });

    it('should ignore clicks on HUD elements outside gameplay', () => {
      const state = createState({ gameStarted: false });
      vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(state));
      vi.mocked(useGameStore.getState).mockReturnValue(state);

      renderHook(() => useGameInputs());
      const hudElement = document.createElement('div');
      hudElement.className = 'hud-common';
      const button = document.createElement('button');
      hudElement.appendChild(button);

      fireMouseDown(button);
      expect(mockStartGame).not.toHaveBeenCalled();
    });

    it('should ignore clicks on start screen buttons (handled by React onClick)', () => {
      const state = createState({ gameStarted: false });
      vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(state));
      vi.mocked(useGameStore.getState).mockReturnValue(state);

      renderHook(() => useGameInputs());
      const button = document.createElement('button');
      button.className = 'start-screen-button';

      fireMouseDown(button);
      expect(mockStartGame).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = renderHook(() => useGameInputs());
      unmount();
      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    });
  });
});
