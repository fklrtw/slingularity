import React from 'react';
import { useGameStore } from '../../store';
import { TEXT_LOADING_TIPS } from '../../text.config';
import './level-loading-screen.css';

/**
 * LevelLoadingScreen component
 *
 * Full-screen loading overlay designed to bridge shader compilation and mesh allocation stutters.
 * Features a dynamic theme-consistent orbital loader animation and randomized gameplay tips.
 */
export function LevelLoadingScreen() {
  const gameStarted = useGameStore(s => s.gameStarted);
  const isLoadingLevel = useGameStore(s => s.isLoadingLevel);
  const level = useGameStore(s => s.level);
  const resetCounter = useGameStore(s => s.resetCounter);

  // pick a tip deterministically based on level and resetCounter to avoid shifting tips mid-load
  const tipIndex = (level + resetCounter) % TEXT_LOADING_TIPS.length;
  const currentTip = TEXT_LOADING_TIPS[tipIndex];

  if (!gameStarted || !isLoadingLevel) {
    return null;
  }

  return (
    <div className="level-loading-overlay">
      <div className="level-loading-panel">
        <h2 className="level-loading-title">
          {`GENERATING SYSTEM L - LEVEL ${level}`}
        </h2>

        {/* Orbital slingshot loading graphic */}
        <div className="orbital-loader">
          <div className="orbital-loader-sun" />
          <div className="orbital-loader-path" />
          <div className="orbital-loader-ship" />
        </div>

        <div className="level-loading-status">
          CHARGING GRAVITY SYSTEMS...
        </div>

        <div className="level-loading-tip">
          {currentTip}
        </div>
      </div>
    </div>
  );
}
