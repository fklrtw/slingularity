import { useEffect } from 'react';
import { useGameStore } from '../store';
import { sfx } from '../audio/sfx-proxy';

/**
 * Custom hook to handle global game inputs (keyboard, mouse, touch)
 *
 * Centralizes input logic to keep components focused on rendering.
 */
export function useGameInputs() {
  const annihilateNextPlanet = useGameStore(s => s.annihilateNextPlanet);
  const resetGame = useGameStore(s => s.resetGame);
  const startGame = useGameStore(s => s.startGame);
  const startNextLevel = useGameStore(s => s.startNextLevel);

  useEffect(() => {
    /**
     * Unified handler for all primary game actions
     */
    const handleAction = (event: KeyboardEvent | MouseEvent | TouchEvent) => {
      // Access fresh state values to avoid stale closures
      const { settingsMenuOpen, privacyMenuOpen, creditsMenuOpen, gameStarted, gameOver, levelFinished, settings } = useGameStore.getState();

      if (settingsMenuOpen || privacyMenuOpen || creditsMenuOpen) {
        return;
      }

      const isKeyboard = event instanceof KeyboardEvent;
      const target = event.target as HTMLElement;

      // Ignore actions originating from the HUD or interactive elements
      if (!isKeyboard && target instanceof Element && (
        target.closest('.hud-common')
        || target.closest('button')
        || target.closest('input')
        || target.closest('select')
        || target.closest('.settings-panel')
        || target.closest('.start-screen-overlay')
      )) {
        return;
      }

      // Initialize audio context on any user interaction if audio is enabled
      if (settings.sfxEnabled || settings.musicEnabled) {
        sfx.init();
      }

      // Handle Reset key
      if (isKeyboard && event.code === 'KeyR') {
        if (settings.sfxEnabled) {
          sfx.playRestart();
        }
        resetGame();
        return;
      }

      // Filter for primary triggers
      const isSpace = isKeyboard && event.code === 'Space';
      const isMouse = event instanceof MouseEvent;
      const isTouch = event instanceof TouchEvent;

      if (!isSpace && !isMouse && !isTouch) {
        return;
      }

      // Prevent default for gameplay keys/touches
      if (isSpace || isTouch) {
        event.preventDefault();
      }

      if (!gameStarted && !gameOver) {
        if (settings.sfxEnabled) {
          sfx.playStartMission();
        }
        startGame();
        return;
      }

      if (!gameStarted) {
        return;
      }

      if (gameOver) {
        if (settings.sfxEnabled) {
          sfx.playRestart();
        }
        resetGame();
        return;
      }

      if (levelFinished) {
        startNextLevel();
        return;
      }

      // Gameplay action: only if not hitting some other UI element
      // (StartScreen/GameOverScreen buttons are fine, they are not .hud-common)
      annihilateNextPlanet();
    };

    window.addEventListener('keydown', handleAction);
    window.addEventListener('mousedown', handleAction);
    window.addEventListener('touchstart', handleAction, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleAction);
      window.removeEventListener('mousedown', handleAction);
      window.removeEventListener('touchstart', handleAction);
    };
  }, [annihilateNextPlanet, resetGame, startGame, startNextLevel]);
}
