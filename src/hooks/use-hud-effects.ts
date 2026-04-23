import type chroma from 'chroma-js';
import type { Scale } from 'chroma-js';
import { useEffect } from 'react';
import { Vector3, type Mesh } from 'three';
import { DIFFICULTY_SCORING_SCORE_CRITICAL_THRESHOLD } from '../difficulty.config';
import { SOLAR_SYSTEM_VELOCITY_MAX } from '../entities/solar-system.config';
import { getSunColor } from './use-sun-effects';
import { useGameStore } from '../store';
import type { SystemRefData } from '../entities/solar-system';

/**
 * Properties for the useHudEffects hook.
 */
export interface UseHudEffectsProps {
  systemRef?: React.RefObject<SystemRefData>
  spaceshipRef?: React.RefObject<Mesh | null>
  scoreColorScale: chroma.Scale
  sunColorScale: Scale
  domRefs: {
    scoreRef: React.RefObject<HTMLDivElement | null>
    distRef: React.RefObject<HTMLDivElement | null>
    sunBarRef: React.RefObject<HTMLDivElement | null>
    shipMarkerRef: React.RefObject<HTMLDivElement | null>
    velBarRef: React.RefObject<HTMLDivElement | null>
    velTextRef: React.RefObject<HTMLDivElement | null>
    fpsRef: React.RefObject<HTMLDivElement | null>
    debugRef: React.RefObject<HTMLDivElement | null>
  }
}
const _zeroVector = new Vector3(0, 0, 0);

/**
 * Manages high-frequency UI updates for the HUD
 *
 * Uses requestAnimationFrame to perform imperative DOM mutations, bypassing
 * React's render cycle for performance-critical telemetry (score, velocity, etc.).
 * @param props - hook properties including DOM refs and color scales
 */
export function useHudEffects({
  systemRef,
  spaceshipRef,
  scoreColorScale,
  sunColorScale,
  domRefs,
}: UseHudEffectsProps) {
  useEffect(() => {
    let frames = 0;
    let lastFpsTime = performance.now();
    let rafId: number;
    let currentFps = 0;

    const { scoreRef, distRef, sunBarRef, shipMarkerRef, velBarRef, velTextRef, fpsRef, debugRef } = domRefs;

    const loop = (now: number) => {
      // update FPS counter every second
      frames++;
      if (now > lastFpsTime + 1000) {
        currentFps = Math.round((frames * 1000) / (now - lastFpsTime));
        if (fpsRef.current) {
          fpsRef.current.textContent = `fps: ${currentFps}`;
        }
        lastFpsTime = now;
        frames = 0;
      }

      // access store directly to avoid component re-renders
      const state = useGameStore.getState();

      // --- score display ---
      if (scoreRef.current) {
        scoreRef.current.textContent = state.score.integerValue().toString();

        const scoreVal = state.score.toNumber();
        const ratio = Math.min(1, Math.max(0, scoreVal / DIFFICULTY_SCORING_SCORE_CRITICAL_THRESHOLD));
        const color = scoreColorScale(ratio).hex();
        scoreRef.current.style.color = color;
        scoreRef.current.style.textShadow = `0 0 ${10 + (1 - ratio) * 10}px ${color}`;
      }

      // --- distance display ---
      if (distRef.current) {
        distRef.current.textContent = `${Math.floor(state.distanceTraveled)}u`;
      }

      // --- sun expansion gauge ---
      if (sunBarRef.current) {
        const percent = Math.min(100, (state.sunRadius / state.lastPlanetDist) * 100);
        sunBarRef.current.style.width = `${percent}%`;

        const color = getSunColor(percent, sunColorScale);
        sunBarRef.current.style.background = color;
        sunBarRef.current.style.boxShadow = `0 0 10px ${color}`;
      }

      // --- ship position marker on gauge ---
      if (shipMarkerRef.current) {
        if (state.distToSun <= state.lastPlanetDist) {
          const percent = Math.min(100, (state.distToSun / state.lastPlanetDist) * 100);
          shipMarkerRef.current.style.left = `${percent}%`;
          shipMarkerRef.current.style.display = 'block';
        } else {
          shipMarkerRef.current.style.display = 'none';
        }
      }

      // --- velocity gauge ---
      if (velBarRef.current) {
        const percent = Math.min(100, (state.velocity / SOLAR_SYSTEM_VELOCITY_MAX) * 100);
        velBarRef.current.style.width = `${percent}%`;
      }

      // --- velocity text ---
      if (velTextRef.current) {
        velTextRef.current.textContent = Math.round(state.velocity).toString();
      }

      // --- debug overlay ---
      if (state.isDebug && debugRef.current) {
        const vel = Math.round(state.velocity);

        let shipPosStr = 'N/A';
        if (spaceshipRef?.current) {
          const sp = spaceshipRef.current.position;
          shipPosStr = `(${Math.round(sp.x)}, ${Math.round(sp.y)})`;
        }

        let planetsStr = '';
        if (systemRef?.current) {
          const planets = systemRef.current.planets;
          for (let i = 0; i < Math.min(10, planets.length); i++) {
            const p = planets[i];
            planetsStr += `P${i}: (${Math.round(p.position.x)}, ${Math.round(p.position.y)})<br/>`;
          }
        }

        const pp = state.portalPosition || _zeroVector;
        const portalPosStr = `(${Math.round(pp.x)}, ${Math.round(pp.y)})`;
        const flags = `gameStarted: ${state.gameStarted}<br/>levelFinished: ${state.levelFinished}<br/>isDying: ${state.isDying}<br/>isFinishing: ${state.isFinishing}<br/>gameOver: ${state.gameOver}<br/>isPortalAnnihilated: ${state.isPortalAnnihilated}<br/>settingsMenuOpen: ${state.settingsMenuOpen}`;

        debugRef.current.innerHTML = `<strong>DEBUG HUD</strong><br/>FPS: ${currentFps}<br/>Velocity: <span style="font-size: 1.5em; color: white;">${vel}</span><br/>Ship Pos: ${shipPosStr}<br/>Portal Pos: ${portalPosStr}<br/><br/>Flags:<br/>${flags}<br/><br/>Planets (First 10):<br/>${planetsStr}`;
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [scoreColorScale, systemRef, spaceshipRef, sunColorScale, domRefs]);
}
