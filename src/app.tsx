/**
 * Slingularity Main Application.
 * Made with the help of Gemini.
 */
import { Canvas, useThree } from '@react-three/fiber';
import React, { useEffect, useRef } from 'react';
import type { Mesh } from 'three';
import * as THREE from 'three';
import {
  APP_LOADING_MIN_DURATION_MS,
  APP_LOADING_MOUNT_DELAY_MS,
  APP_LOADING_FALLBACK_DURATION_MS,
} from './app.config';
import { Background } from './components/environment/background';
import { Effects } from './components/environment/effects';
import { OrbitLines } from './components/indicators/orbit-lines';
import { TargetLines } from './components/indicators/target-lines';
import { CAMERA_FOV, CAMERA_INITIAL_POS } from './camera.config';
import { FinishScreen } from './components/ui/finish-screen';
import { FloatingScores } from './components/ui/floating-scores';
import { GameOverScreen } from './components/ui/game-over-screen';
import { Hud } from './components/ui/hud';
import { Minimap } from './components/ui/minimap';
import { StartScreen } from './components/ui/start-screen';
import { LevelLoadingScreen } from './components/ui/level-loading-screen';
import { Soundboard } from './components/ui/soundboard';
import { Portal } from './entities/portal';
import { type SystemRefData, SolarSystem } from './entities/solar-system';
import { Spaceship } from './entities/spaceship';
import { Sun } from './entities/sun';
const AudioEngine = React.lazy(() => import('./components/audio/AudioEngine'));

import { useCameraEffects } from './hooks/use-camera-effects';
import { useGameInputs } from './hooks/use-game-inputs';
import { usePerformanceMonitor } from './hooks/use-performance-monitor';
import { useSolarSystemFactory } from './hooks/use-solar-system-factory';
import { useSolarSystemSimulation } from './hooks/use-solar-system-simulation';
import { useDebugTrigger } from './hooks/use-debug-trigger';
import { useGameStore } from './store';
import './app.css';

/**

 * GraphicsUpdater component
 * Forces material recompilation when critical graphics settings change.
 */

function GraphicsUpdater() {
  const scene = useThree(s => s.scene);
  const settings = useGameStore(s => s.settings);
  useEffect(() => {
    scene.traverse((obj) => {
      if ((obj as Mesh).material) {
        const mat = (obj as Mesh).material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => {
            m.needsUpdate = true;
          });
        } else {
          mat.needsUpdate = true;
        }
      }
    });
  }, [settings.shadows, settings.shaders, settings.detailLevel, scene]);
  return null;
}

/**
 * ShaderWarmup component
 * Owns the level-loading lifecycle by pre-compiling all scene shaders
 * asynchronously using renderer.compileAsync(). The loading screen is dismissed
 * only after both the shader compilation promise resolves AND a minimum display
 * floor has elapsed (to prevent the screen from flashing too briefly).
 * Falls back to a fixed timer on browsers without compileAsync support.
 */
function ShaderWarmup() {
  const { gl, scene, camera } = useThree();
  const resetCounter = useGameStore(s => s.resetCounter);
  const isLoadingLevel = useGameStore(s => s.isLoadingLevel);
  const finishLoadingLevel = useGameStore(s => s.finishLoadingLevel);
  const markShadersCompiled = useGameStore(s => s.markShadersCompiled);

  useEffect(() => {
    if (!isLoadingLevel) {
      return;
    }

    let cancelled = false;
    const startTime = performance.now();

    /**
     * Finishes the loading phase, respecting the minimum display floor
     * to prevent the loading screen from flashing too briefly.
     */
    const finishWithMinFloor = () => {
      if (cancelled) {
        return;
      }
      const elapsed = performance.now() - startTime;
      const remaining = APP_LOADING_MIN_DURATION_MS - elapsed;
      if (remaining > 0) {
        setTimeout(() => {
          if (!cancelled) {
            finishLoadingLevel();
          }
        }, remaining);
      } else {
        finishLoadingLevel();
      }
    };

    // defer slightly to ensure all meshes have mounted into the scene graph
    const mountTimer = setTimeout(() => {
      if (cancelled) {
        return;
      }
      if (typeof gl.compileAsync === 'function') {
        // shader-driven: wait for actual GPU compilation to complete
        gl.compileAsync(scene, camera)
          .then(() => {
            markShadersCompiled();
            finishWithMinFloor();
          })
          .catch((err: unknown) => {
            console.warn('Async shader compilation warning:', err);
            markShadersCompiled();
            finishWithMinFloor();
          });
      } else {
        // fallback: fixed timer for browsers without compileAsync
        markShadersCompiled();
        setTimeout(finishWithMinFloor, APP_LOADING_FALLBACK_DURATION_MS - APP_LOADING_MOUNT_DELAY_MS);
      }
    }, APP_LOADING_MOUNT_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(mountTimer);
    };
  }, [isLoadingLevel, resetCounter, gl, scene, camera, finishLoadingLevel, markShadersCompiled]);

  return null;
}

/**
 * GameLoop component
 *
 * handles global simulation logic like sun growth, celestial collisions,
 * and high-level mission objective checks.
 */
export function GameLoop({ systemRef, spaceshipRef }: {
  systemRef: React.RefObject<SystemRefData>
  spaceshipRef: React.RefObject<Mesh | null>
}) {
  // Initialize simulation hooks
  useSolarSystemSimulation(systemRef);
  useCameraEffects({ spaceshipRef, systemRef });
  usePerformanceMonitor();

  return null;
}

/**
 * Main App component
 *
 * high-level root component responsible for level generation, resource initialization,
 * and the main Three.js canvas setup.
 */
export default function App() {
  const level = useGameStore(s => s.level);
  const initLevel = useGameStore(s => s.initLevel);
  const setTotalPlanets = useGameStore(s => s.setTotalPlanets);
  const resetCounter = useGameStore(s => s.resetCounter);
  const shadowsEnabled = useGameStore(s => s.settings.shadows);
  const resolutionScale = useGameStore(s => s.settings.resolutionScale);
  const antialiasing = useGameStore(s => s.settings.antialiasing);
  const settings = useGameStore(s => s.settings);
  const gameStarted = useGameStore(s => s.gameStarted);
  const spaceshipRef = useRef<Mesh | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize global game inputs and debug trigger
  useGameInputs();
  useDebugTrigger();

  /**
   * generates the initial planetary data for the current level.
   */
  const systemData = useSolarSystemFactory(level, resetCounter);

  useEffect(() => {
    setTotalPlanets(systemData.planets.filter(p => p.isPlanet).length);
  }, [systemData, setTotalPlanets]);

  const systemRef = useRef<SystemRefData>(systemData);
  useEffect(() => {
    systemRef.current = systemData;
  }, [systemData]);

  useEffect(() => {
    initLevel();
  }, [level, resetCounter, initLevel]);

  // loading lifecycle is now driven by ShaderWarmup inside the Canvas

  const { shipParams } = systemData;

  const [hash, setHash] = React.useState(window.location.hash);
  React.useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (hash === '#soundboard') {
    return <Soundboard />;
  }

  return (
    <div
      ref={containerRef}
      className="app-container"
    >
      <Hud systemRef={systemRef} spaceshipRef={spaceshipRef} />
      <StartScreen />
      <LevelLoadingScreen />
      <FinishScreen />
      <GameOverScreen />

      <Canvas
        shadows={shadowsEnabled === 'advanced' ? { type: THREE.PCFShadowMap } : shadowsEnabled === 'basic' ? { type: THREE.BasicShadowMap } : false}
        eventSource={containerRef as React.RefObject<HTMLElement>}
        camera={{ position: CAMERA_INITIAL_POS, fov: CAMERA_FOV }}
        dpr={resolutionScale === 'high' ? [1, 2] : (resolutionScale === 'medium' ? 1.5 : 1)}
        gl={{
          antialias: antialiasing !== 'low',
          powerPreference: 'high-performance',
          precision: resolutionScale === 'high' ? 'highp' : (resolutionScale === 'medium' ? 'mediump' : 'lowp'),
          stencil: false,
          alpha: false,
        }}
      >
        <Background />
        <Effects />

        <GraphicsUpdater />
        <ShaderWarmup />
        <GameLoop systemRef={systemRef} spaceshipRef={spaceshipRef} />

        {((settings.sfxEnabled || settings.musicEnabled) && gameStarted) && (
          <React.Suspense fallback={null}>
            <AudioEngine systemRef={systemRef} spaceshipRef={spaceshipRef} />
          </React.Suspense>
        )}

        <group>
          <Sun />
          <SolarSystem systemRef={systemRef} systemData={systemData} />
          <Portal key={`start-${resetCounter}`} type="start" initialPosition={shipParams.pos} systemRef={systemRef} />
          <Portal
            key={`end-${resetCounter}`}
            type="end"
            systemRef={systemRef}
          />
          <OrbitLines systemData={systemData} />
          <TargetLines systemData={systemData} />
          <Spaceship
            key={`${level}-${resetCounter}`}
            initialPosition={shipParams.pos}
            initialVelocity={shipParams.vel}
            initialOrbitDirection={shipParams.dir}
            systemRef={systemRef}
            spaceshipRef={spaceshipRef}
            resetCounter={resetCounter}
          />
          <FloatingScores />
        </group>

        <Minimap />
      </Canvas>
    </div>
  );
}
