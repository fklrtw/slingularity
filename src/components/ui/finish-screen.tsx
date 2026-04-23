import React from 'react';
import { useGameStore } from '../../store';
import { sfx } from '../../audio/sfx-proxy';
import { TEXT_LAST_PLANET_HEADER, TEXT_NEXT_LEVEL_BTN } from '../../text.config';
import './finish-screen.css';

/**
 * FinishScreen component
 *
 * Success overlay displayed when the player successfully enters the celestial portal.
 * Shows high score statistics and allows progression to the next level.
 */
export function FinishScreen() {
  const levelFinished = useGameStore(s => s.levelFinished);
  const gameOver = useGameStore(s => s.gameOver);
  const startNextLevel = useGameStore(s => s.startNextLevel);
  const score = useGameStore(s => (s.levelFinished ? s.score : null));
  const highScores = useGameStore(s => s.highScores);
  const debugEnabled = useGameStore(s => s.isDebug);

  // only visible when the victory sequence completes
  if (!levelFinished || gameOver) {
    return null;
  }

  return (
    <div className="finish-screen-overlay">
      <h1 className="finish-screen-common finish-screen-header">{TEXT_LAST_PLANET_HEADER}</h1>

      {!debugEnabled && (
        <div className="finish-screen-stats-container">
          <div className="finish-screen-common finish-screen-score">
            Score:
            {' '}
            {score ? score.integerValue().toString() : '0'}
          </div>
          <div className="finish-screen-common finish-screen-best">
            Best at finish:
            {' '}
            {highScores.atLevelFinish}
          </div>
        </div>
      )}

      <button
        onClick={() => {
          if (useGameStore.getState().settings.sfxEnabled || useGameStore.getState().settings.musicEnabled) {
            sfx.init();
          }
          if (useGameStore.getState().settings.sfxEnabled) {
            sfx.playStartMission();
          }
          startNextLevel();
        }}
        className="finish-screen-common finish-screen-button"
      >
        {TEXT_NEXT_LEVEL_BTN}
      </button>
    </div>
  );
}
