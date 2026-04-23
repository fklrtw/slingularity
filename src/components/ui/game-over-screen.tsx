import React from 'react';
import { useGameStore } from '../../store';
import { sfx } from '../../audio/sfx-proxy';
import {
  TEXT_GAME_OVER_HEADER,
  TEXT_RESTART_BTN,
} from '../../text.config';
import './game-over-screen.css';

/**
 * GameOverScreen component
 *
 * Overlay displayed when the player loses the game.
 * Shows the reason for failure, high scores, and a restart button.
 */
export function GameOverScreen() {
  const gameOver = useGameStore(s => s.gameOver);
  const gameOverReason = useGameStore(s => s.gameOverReason);
  const highScores = useGameStore(s => s.highScores);
  const resetGame = useGameStore(s => s.resetGame);

  if (!gameOver) {
    return null;
  }

  return (
    <div className="game-over-screen-container">
      <h1 className="game-over-screen-common game-over-screen-header">
        {TEXT_GAME_OVER_HEADER}
      </h1>
      <p className="game-over-screen-common game-over-screen-reason">
        {gameOverReason}
      </p>

      <div className="game-over-screen-scores-container">
        <h2 className="game-over-screen-common game-over-screen-scores-header">High scores</h2>
        <div className="game-over-screen-common game-over-screen-scores-list">
          All-time:
          {' '}
          {highScores.allTime}
          <br />
          At level finish:
          {' '}
          {highScores.atLevelFinish}
          <br />
          In stable orbit:
          {' '}
          {highScores.inStableOrbit}
        </div>
      </div>

      <button
        onClick={() => {
          if (useGameStore.getState().settings.sfxEnabled || useGameStore.getState().settings.musicEnabled) {
            sfx.init();
          }
          if (useGameStore.getState().settings.sfxEnabled) {
            sfx.playRestart();
          }
          resetGame();
        }}
        className="game-over-screen-common game-over-screen-button"
      >
        {TEXT_RESTART_BTN}
      </button>
    </div>
  );
}
