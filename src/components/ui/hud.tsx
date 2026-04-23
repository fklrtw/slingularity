import chroma from 'chroma-js';
import React, { useEffect, useMemo, useRef } from 'react';

import type { Mesh } from 'three';
import type { SystemRefData } from '../../entities/solar-system';
import { useHudEffects } from '../../hooks/use-hud-effects';
import { useThemeColors } from '../../hooks/use-theme-colors';
import { useGameStore } from '../../store';
import {
  TEXT_HUD_DISTANCE,
  TEXT_HUD_LEVEL,
  TEXT_HUD_PLANETS,
  TEXT_HUD_SCORE,
  TEXT_HUD_SUN_EXPANSION,
  TEXT_HUD_VELOCITY,
  TEXT_RESTART_HINT,
} from '../../text.config';
import { MINIMAP_SCREEN_RATIO } from './minimap.config';
import { SettingsMenu } from './settings-menu';
import { CreditsMenu } from './credits-menu';
import { PrivacyMenu } from './privacy-menu';
import './hud.css';

export interface HUDProps {
  systemRef: React.RefObject<SystemRefData>
  spaceshipRef?: React.RefObject<Mesh | null>
}

/**
 * Hud component
 *
 * renders 2d info overlays.
 * Made with the help of Gemini.
 */
export function Hud({ systemRef, spaceshipRef }: HUDProps) {
  const level = useGameStore(s => s.level);
  const totalPlanets = useGameStore(s => s.totalPlanets);
  const resetGame = useGameStore(s => s.resetGame);
  const debugEnabled = useGameStore(s => s.isDebug);
  const themeColors = useThemeColors();
  const showPrivacy = useGameStore(s => s.privacyMenuOpen);
  const setPrivacyMenuOpen = useGameStore(s => s.setPrivacyMenuOpen);
  const showCredits = useGameStore(s => s.creditsMenuOpen);
  const setCreditsMenuOpen = useGameStore(s => s.setCreditsMenuOpen);

  const containerRef = useRef<HTMLDivElement>(null);

  // pre-calculate score color scale
  const scoreColorScale = useMemo(() => {
    return chroma.scale([
      themeColors.themeDanger.getStyle(),
      themeColors.themeHighlight.getStyle(),
    ]).mode('lch');
  }, [themeColors.themeDanger, themeColors.themeHighlight]);

  // DOM refs for fast imperative updates
  const scoreRef = useRef<HTMLDivElement>(null);
  const distRef = useRef<HTMLDivElement>(null);
  const sunBarRef = useRef<HTMLDivElement>(null);
  const shipMarkerRef = useRef<HTMLDivElement>(null);
  const velBarRef = useRef<HTMLDivElement>(null);
  const velTextRef = useRef<HTMLDivElement>(null);
  const fpsRef = useRef<HTMLDivElement>(null);
  const debugRef = useRef<HTMLDivElement>(null);

  // Update minimap frame size on resize via CSS variables
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) {
        return;
      }
      const size = Math.min(window.innerWidth, window.innerHeight) * MINIMAP_SCREEN_RATIO;
      containerRef.current.style.setProperty('--minimap-width', `${size}px`);
      containerRef.current.style.setProperty('--minimap-height', `${size}px`);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // delegate high-frequency UI updates to the hook
  useHudEffects({
    systemRef,
    spaceshipRef,
    scoreColorScale,
    sunColorScale: themeColors.sunColorScale,
    domRefs: {
      scoreRef,
      distRef,
      sunBarRef,
      shipMarkerRef,
      velBarRef,
      velTextRef,
      fpsRef,
      debugRef,
    }
  });

  return (
    <div ref={containerRef} className="hud-overlay">

      {/* minimap border frame - ALWAYS VISIBLE */}
      <div className="hud-minimap-border" />

      {/* statistics overlay */}
      <div className="hud-stats-container">
        <table className="hud-stats-table">
          <tbody>
            <tr className="hud-common hud-level-info">
              <td className="hud-label">
                {TEXT_HUD_LEVEL}
                :
              </td>
              <td className="hud-value">
                {level}
              </td>
            </tr>
            {totalPlanets > 1 && (
              <tr className="hud-common hud-planets-info">
                <td className="hud-label">
                  {TEXT_HUD_PLANETS}
                  :
                </td>
                <td className="hud-value">
                  {totalPlanets}
                </td>
              </tr>
            )}
            {!debugEnabled && (
              <tr className="hud-common hud-score">
                <td className="hud-label">
                  {TEXT_HUD_SCORE}
                  :
                </td>
                <td className="hud-value">
                  <div ref={scoreRef}>0</div>
                </td>
              </tr>
            )}
            <tr className="hud-common hud-distance">
              <td className="hud-label">
                {TEXT_HUD_DISTANCE}
                :
              </td>
              <td className="hud-value">
                <div ref={distRef}>0u</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* hidden element to keep raf loop happy if it expects fpsRef to be somewhere */}
        <div ref={fpsRef} style={{ display: 'none' }} />

        {/* sun growth gauge */}
        <div className="hud-gauge-group">
          <div className="hud-common hud-gauge-label hud-sun-label">
            {TEXT_HUD_SUN_EXPANSION}
          </div>
          <div className="hud-gauge-bg hud-sun-gauge-bg">
            <div ref={sunBarRef} className="hud-gauge-fill hud-sun-gauge-fill" />
            <div ref={shipMarkerRef} className="hud-ship-marker" />
          </div>
        </div>

        {/* velocity gauge */}
        <div className="hud-gauge-group">
          <div className="hud-vel-header">
            <div className="hud-common hud-gauge-label">
              {TEXT_HUD_VELOCITY}
            </div>
            <div ref={velTextRef} className="hud-common hud-vel-text" />
          </div>
          <div className="hud-gauge-bg hud-vel-gauge-bg">
            <div ref={velBarRef} className="hud-gauge-fill hud-vel-gauge-fill" />
          </div>
        </div>
      </div>

      {/* mobile restart button */}
      <div className="hud-controls-container">
        <button
          onClick={() => resetGame()}
          className="hud-common hud-control-button hud-icon-button"
          title={TEXT_RESTART_HINT}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 'inherit' }}>restart_alt</span>
        </button>
        <SettingsMenu />
      </div>

      {debugEnabled && (
        <div className="hud-debug-container">
          <div ref={debugRef} className="hud-common hud-debug-content" />
          {/* hidden element to keep raf loop happy if it expects fpsRef to be somewhere */}
          <div ref={fpsRef} style={{ display: 'none' }} />
        </div>
      )}

      <div className="hud-common hud-disclaimer">
        <div className="hud-disclaimer-row">
          v0.0.1 | Made with Gemini
        </div>
        <div className="hud-disclaimer-row">
          © 2026
          {' '}
          <a
            href="https://github.com/fklrtw"
            target="_blank"
            rel="noreferrer"
            className="hud-link"
          >
            fklrtw
          </a>
          {' '}
          |
          {' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setPrivacyMenuOpen(true);
            }}
            className="hud-link"
          >
            Privacy
          </a>
          {' '}
          |
          {' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setCreditsMenuOpen(true);
            }}
            className="hud-link"
          >
            Credits
          </a>
        </div>
      </div>

      {showPrivacy && (
        <PrivacyMenu onClose={() => setPrivacyMenuOpen(false)} />
      )}

      {showCredits && (
        <CreditsMenu
          onClose={() => {
            setCreditsMenuOpen(false);
          }}
        />
      )}
    </div>
  );
}
