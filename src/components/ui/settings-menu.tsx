import React from 'react';
import { createPortal } from 'react-dom';
import { sfx } from '../../audio/sfx-proxy';
import { useGameStore } from '../../store';
import { SettingToggle } from './setting-toggle';
import './settings-menu.css';

/**
 * SettingsMenu component
 *
 * Provides a UI for toggling performance-heavy features like shadows and custom shaders.
 */
export function SettingsMenu() {
  const settings = useGameStore(s => s.settings);
  const updateSettings = useGameStore(s => s.updateSettings);
  const isOpen = useGameStore(s => s.settingsMenuOpen);
  const setSettingsMenuOpen = useGameStore(s => s.setSettingsMenuOpen);

  /**
   * Toggles the visibility of the settings menu and stops event propagation
   * to prevent triggering game actions like planet annihilation.
   * @param e - React MouseEvent
   */
  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (useGameStore.getState().settings.sfxEnabled) {
      sfx.playUIClick();
    }
    setSettingsMenuOpen(!isOpen);
  };

  /**
   * Prevents clicks within the settings panel from bubbling up to the overlay or game.
   * @param e - React MouseEvent
   */
  const handlePanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  /**
   * Applies a global settings preset.
   */
  const applyPreset = (preset: 'low' | 'medium' | 'high') => {
    if (preset === 'low') {
      updateSettings({
        shaders: 'off',
        shadows: 'off',
        detailLevel: 'low',
        spaceshipDetail: 'low',
        antialiasing: 'low',
        resolutionScale: 'low',
        postProcessing: false
      });
    } else if (preset === 'medium') {
      updateSettings({
        shaders: 'basic',
        shadows: 'basic',
        detailLevel: 'medium',
        spaceshipDetail: 'high',
        antialiasing: 'medium',
        resolutionScale: 'medium',
        postProcessing: true
      });
    } else {
      updateSettings({
        shaders: 'advanced',
        shadows: 'advanced',
        detailLevel: 'high',
        spaceshipDetail: 'high',
        antialiasing: 'high',
        resolutionScale: 'high',
        postProcessing: true
      });
    }
  };

  return (
    <>
      <button
        className="hud-common hud-control-button hud-icon-button settings-toggle"
        onClick={toggle}
        title="Settings"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 'inherit' }}>settings</span>
      </button>

      {isOpen && createPortal(
        <div className="settings-overlay" onClick={toggle}>
          <div className="settings-panel" onClick={handlePanelClick}>
            <h2>Settings</h2>

            <div className="settings-content">
              <div className="setting-group-title">Gameplay</div>

              <div className="setting-item">
                <div className="setting-row">
                  <div className="setting-label">
                    <span className="setting-title">Sound Effects</span>
                    <span className="setting-desc">Enables or disables sound effects</span>
                  </div>
                  <div className="setting-control">
                    <button
                      className={`setting-dropdown ${settings.sfxEnabled ? 'active' : 'inactive'}`}
                      onClick={() => updateSettings({ sfxEnabled: !settings.sfxEnabled })}
                    >
                      {settings.sfxEnabled ? 'SFX ON' : 'SFX OFF'}
                    </button>
                  </div>
                </div>
                {settings.sfxEnabled && (
                  <div className="volume-slider-container">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={settings.sfxVolume ?? 1.0}
                      onChange={e => updateSettings({ sfxVolume: parseFloat(e.target.value) })}
                    />
                    <span className="volume-percentage">
                      {Math.round((settings.sfxVolume ?? 1.0) * 100)}
                      %
                    </span>
                  </div>
                )}
              </div>

              <div className="setting-item">
                <div className="setting-row">
                  <div className="setting-label">
                    <span className="setting-title">Music</span>
                    <span className="setting-desc">Enables or disables background music</span>
                  </div>
                  <div className="setting-control">
                    <button
                      className={`setting-dropdown ${settings.musicEnabled ? 'active' : 'inactive'}`}
                      onClick={() => updateSettings({ musicEnabled: !settings.musicEnabled })}
                    >
                      {settings.musicEnabled ? 'MUSIC ON' : 'MUSIC OFF'}
                    </button>
                  </div>
                </div>
                {settings.musicEnabled && (
                  <div className="volume-slider-container">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={settings.musicVolume ?? 1.0}
                      onChange={e => updateSettings({ musicVolume: parseFloat(e.target.value) })}
                    />
                    <span className="volume-percentage">
                      {Math.round((settings.musicVolume ?? 1.0) * 100)}
                      %
                    </span>
                  </div>
                )}
              </div>

              <div className="setting-row">
                <div className="setting-label">
                  <span className="setting-title">Camera Mode</span>
                  <span className="setting-desc">Changes how the camera tracks the action</span>
                </div>
                <div className="setting-control">
                  <select
                    value={settings.cameraMode}
                    onChange={e => updateSettings({ cameraMode: e.target.value as 'heliocentric' | 'aligned' | 'ship' })}
                    className="setting-dropdown"
                  >
                    <option value="heliocentric">Heliocentric</option>
                    <option value="aligned">Axis Alignment</option>
                    <option value="ship">Orbital Tracking</option>
                  </select>
                </div>
              </div>

              <div className="setting-group-title">Visual fidelity</div>

              <div className="setting-row" style={{ marginTop: '0.5rem' }}>
                <div
                  className="setting-control"
                  style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'space-between' }}
                >
                  <button className="setting-dropdown" style={{ flex: 1 }} onClick={() => applyPreset('low')}>Low</button>
                  <button className="setting-dropdown" style={{ flex: 1 }} onClick={() => applyPreset('medium')}>
                    Medium
                  </button>
                  <button className="setting-dropdown" style={{ flex: 1 }} onClick={() => applyPreset('high')}>
                    High
                  </button>
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-label">
                  <span className="setting-title">Detail Level</span>
                  <span className="setting-desc">Controls the quality of background and celestial effects</span>
                </div>
                <div className="setting-control">
                  <select
                    value={settings.detailLevel}
                    onChange={e => updateSettings({ detailLevel: e.target.value as 'low' | 'medium' | 'high' })}
                    className="setting-dropdown"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-label">
                  <span className="setting-title">Spaceship Detail</span>
                  <span className="setting-desc">Controls the visual fidelity of the player ship</span>
                </div>
                <div className="setting-control">
                  <select
                    value={settings.spaceshipDetail}
                    onChange={e => updateSettings({ spaceshipDetail: e.target.value as 'low' | 'high' })}
                    className="setting-dropdown"
                  >
                    <option value="low">Low (Cone)</option>
                    <option value="high">High (Model)</option>
                  </select>
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-label">
                  <span className="setting-title">Resolution Scale</span>
                  <span className="setting-desc">Adjusts the rendering resolution for performance or quality</span>
                </div>
                <div className="setting-control">
                  <select
                    value={settings.resolutionScale}
                    onChange={e => updateSettings({ resolutionScale: e.target.value as 'low' | 'medium' | 'high' })}
                    className="setting-dropdown"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-label">
                  <span className="setting-title">Antialiasing</span>
                  <span className="setting-desc">Smooths out jagged edges in the rendering</span>
                </div>
                <div className="setting-control">
                  <select
                    value={settings.antialiasing}
                    onChange={e => updateSettings({ antialiasing: e.target.value as 'low' | 'medium' | 'high' })}
                    className="setting-dropdown"
                  >
                    <option value="low">Low (None)</option>
                    <option value="medium">Medium (Fast)</option>
                    <option value="high">High (Quality)</option>
                  </select>
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-label">
                  <span className="setting-title">Shadows</span>
                  <span className="setting-desc">Real-time inter-planetary shadows</span>
                </div>
                <div className="setting-control">
                  <select
                    value={settings.shadows}
                    onChange={e => updateSettings({ shadows: e.target.value as 'off' | 'basic' | 'advanced' })}
                    className="setting-dropdown"
                  >
                    <option value="off">Off (Low)</option>
                    <option value="basic">Medium</option>
                    <option value="advanced">High</option>
                  </select>
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-label">
                  <span className="setting-title">Shader Quality</span>
                  <span className="setting-desc">Advanced cel-shading, basic lighting, or disabled</span>
                </div>
                <div className="setting-control">
                  <select
                    value={settings.shaders}
                    onChange={e => updateSettings({ shaders: e.target.value as 'off' | 'basic' | 'advanced' })}
                    className="setting-dropdown"
                  >
                    <option value="off">Off</option>
                    <option value="basic">Basic</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-label">
                  <span className="setting-title">Post-Processing</span>
                  <span className="setting-desc">Enable cinematic effects like Bloom</span>
                </div>
                <div className="setting-control">
                  <SettingToggle
                    value={settings.postProcessing}
                    onChange={val => updateSettings({ postProcessing: val })}
                  />
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-label">
                  <span className="setting-title">Auto-Performance</span>
                  <span className="setting-desc">Automatically reduce quality if FPS drops</span>
                </div>
                <div className="setting-control">
                  <SettingToggle
                    value={settings.autoPerformance}
                    onChange={val => updateSettings({ autoPerformance: val })}
                  />
                </div>
              </div>

            </div>

            <button className="settings-close" onClick={toggle}>
              Close
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
