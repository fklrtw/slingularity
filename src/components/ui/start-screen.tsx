import React from 'react';
import { sfx } from '../../audio/sfx-proxy';
import { useGameStore } from '../../store';
import {
  TEXT_CONTROL_R,
  TEXT_CONTROL_R_DESC,
  TEXT_CONTROL_SPACE,
  TEXT_CONTROL_SPACE_DESC,
  TEXT_CONTROLS_HEADER,
  TEXT_GAME_TITLE,
  TEXT_OBJECTIVE_HEADER,
  TEXT_OBJECTIVE_TEXT,
  TEXT_START_BTN,
  TEXT_START_HINT,
} from '../../text.config';
import { SettingToggle } from './setting-toggle';
import './start-screen.css';

/**
 * StartScreen component
 *
 * Initial overlay explaining game mechanics and waiting for player to begin.
 * Handles both click/touch and spacebar input for session initialization.
 * Made with the help of Gemini.
 */
export function StartScreen() {
  const gameStarted = useGameStore(s => s.gameStarted);
  const gameOver = useGameStore(s => s.gameOver);
  const settings = useGameStore(s => s.settings);
  const updateSettings = useGameStore(s => s.updateSettings);

  /**
   * Applies a global settings preset.
   */
  const applyPreset = (preset: 'low' | 'medium' | 'high') => {
    if (preset === 'low') {
      updateSettings({
        shaders: 'off',
        shadows: 'off',
        detailLevel: 'low',
        antialiasing: 'low',
        resolutionScale: 'low',
        postProcessing: false
      });
    } else if (preset === 'medium') {
      updateSettings({
        shaders: 'basic',
        shadows: 'basic',
        detailLevel: 'medium',
        antialiasing: 'medium',
        resolutionScale: 'medium',
        postProcessing: true
      });
    } else {
      updateSettings({
        shaders: 'advanced',
        shadows: 'advanced',
        detailLevel: 'high',
        antialiasing: 'high',
        resolutionScale: 'high',
        postProcessing: true
      });
    }
  };

  // Hidden once the session officially starts
  if (gameStarted || gameOver) {
    return null;
  }

  return (
    <div className="start-screen-overlay">
      <h1 className="start-screen-common start-screen-title">
        {TEXT_GAME_TITLE}
      </h1>

      <div className="start-screen-content scrollable-content">
        <h2 className="start-screen-common start-screen-header">
          {TEXT_OBJECTIVE_HEADER}
        </h2>
        <p className="start-screen-common start-screen-text" style={{ whiteSpace: 'pre-wrap' }}>
          {TEXT_OBJECTIVE_TEXT}
        </p>

        <h2 className="start-screen-common start-screen-header">
          {TEXT_CONTROLS_HEADER}
        </h2>
        <div className="start-screen-controls">
          <div className="start-screen-common start-screen-control-key">
            {TEXT_CONTROL_SPACE}
          </div>
          <div className="start-screen-common start-screen-control-desc">{TEXT_CONTROL_SPACE_DESC}</div>
          <div className="start-screen-common start-screen-control-key">
            {TEXT_CONTROL_R}
          </div>
          <div className="start-screen-common start-screen-control-desc">{TEXT_CONTROL_R_DESC}</div>
        </div>

        <h2 className="start-screen-common start-screen-header start-screen-audio-header">
          Settings
        </h2>
        <div className="start-screen-presets">
          <button
            className="start-screen-common start-screen-button start-screen-preset-button"
            onClick={(e) => {
              e.stopPropagation();
              applyPreset('low');
            }}
          >
            Low
          </button>
          <button
            className="start-screen-common start-screen-button start-screen-preset-button"
            onClick={(e) => {
              e.stopPropagation();
              applyPreset('medium');
            }}
          >
            Medium
          </button>
          <button
            className="start-screen-common start-screen-button start-screen-preset-button"
            onClick={(e) => {
              e.stopPropagation();
              applyPreset('high');
            }}
          >
            High
          </button>
        </div>

        <div className="start-screen-controls start-screen-audio-controls">
          <div className="start-screen-common start-screen-control-desc">Auto-Performance</div>
          <SettingToggle
            className="start-screen-common start-screen-button start-screen-audio-button"
            value={settings.autoPerformance}
            onChange={val => updateSettings({ autoPerformance: val })}
          />

          <div className="start-screen-common start-screen-control-desc">Sound Effects</div>
          <SettingToggle
            className="start-screen-common start-screen-button start-screen-audio-button"
            value={settings.sfxEnabled}
            onChange={val => updateSettings({ sfxEnabled: val })}
          />

          <div className="start-screen-common start-screen-control-desc">Procedural Music</div>
          <SettingToggle
            className="start-screen-common start-screen-button start-screen-audio-button"
            value={settings.musicEnabled}
            onChange={val => updateSettings({ musicEnabled: val })}
          />
        </div>
      </div>

      <button
        className="start-screen-common start-screen-button"
        onClick={(e) => {
          e.stopPropagation();
          if (useGameStore.getState().settings.sfxEnabled || useGameStore.getState().settings.musicEnabled) {
            sfx.init();
          }
          if (useGameStore.getState().settings.sfxEnabled) {
            sfx.playStartMission();
          }
          useGameStore.getState().startGame();
        }}
      >
        {TEXT_START_BTN}
      </button>

      <div className="start-screen-common start-screen-hint">
        {TEXT_START_HINT}
      </div>
    </div>
  );
}
