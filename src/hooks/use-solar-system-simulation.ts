import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { APP_COLLISION_CHECK_INTERVAL } from '../app.config';
import { PORTALS_PORTAL_DIST_OFFSET } from '../entities/portal.config';
import { PHYSICS_TRANSITION_FINISH_DELAY } from '../components/ui/finish-screen.config';
import { GAME_OVER_SCREEN_TRANSITION_DIE_DELAY } from '../components/ui/game-over-screen.config';
import type { SystemRefData } from '../entities/solar-system';
import { SOLAR_SYSTEM_DT_MAX } from '../entities/solar-system.config';
import { SPACESHIP_SPEED_MULTIPLIER } from '../entities/spaceship.config';
import { calculatePlanetNextState, checkAnnihilationCollisions } from '../physics/solar-system-physics';
import { useGameStore } from '../store';
import { Vector3 } from 'three';

import type { AnnihilationResult } from '../physics/solar-system-physics';

const _v1 = new Vector3();
const _collisionResult: AnnihilationResult = { annihilatedPlanets: [], annihilatedRings: [] };

/**
 * Hook to drive the solar system simulation
 *
 * Orchestrates planet movement, sun growth, celestial collisions, and high-level
 * simulation state machine (transition delays).
 * Updates the systemRef in useFrame to keep high-frequency physics data
 * available to other systems without React state overhead.
 * @param systemRef Shared reference to the solar system state
 */
export function useSolarSystemSimulation(systemRef: React.RefObject<SystemRefData>) {
  const gameOver = useGameStore(s => s.gameOver);
  const levelFinished = useGameStore(s => s.levelFinished);
  const growSun = useGameStore(s => s.growSun);
  const resetCounter = useGameStore(s => s.resetCounter);
  const disablePlanet = useGameStore(s => s.disablePlanet);
  const disableRings = useGameStore(s => s.disableRings);
  const setLastPlanetDist = useGameStore(s => s.setLastPlanetDist);
  const finishLevel = useGameStore(s => s.finishLevel);
  const triggerGameOver = useGameStore(s => s.triggerGameOver);
  const setPortalPosition = useGameStore(s => s.setPortalPosition);

  const lastCollisionCheckRef = useRef(0);
  const finishTimerRef = useRef(0);
  const deathTimerRef = useRef(0);

  // reset transition timer on game end or level completion
  useEffect(() => {
    if (gameOver || levelFinished) {
      finishTimerRef.current = 0;
      deathTimerRef.current = 0;
    }
  }, [gameOver, levelFinished]);

  // update last planet distance only when level changes
  useEffect(() => {
    if (systemRef.current) {
      const planets = systemRef.current.planets;
      let lastPlanet;
      for (let i = planets.length - 1; i >= 0; i--) {
        if (planets[i].isPlanet) {
          lastPlanet = planets[i];
          break;
        }
      }
      if (lastPlanet) {
        setLastPlanetDist((lastPlanet.semiMajorAxis || 0) + PORTALS_PORTAL_DIST_OFFSET);
      }
    }
  }, [resetCounter, setLastPlanetDist, systemRef]);

  useFrame((state, delta) => {
    if (!systemRef.current || systemRef.current.counter !== resetCounter) {
      return;
    }

    // pause simulation if menu is open
    const gameStoreState = useGameStore.getState();
    if (gameStoreState.settingsMenuOpen || gameStoreState.privacyMenuOpen || gameStoreState.creditsMenuOpen || gameStoreState.isLoadingLevel) {
      return;
    }

    const { sunRadius, annihilatedPlanets, annihilatedRings, gameStarted, isFinishing, isDying } = gameStoreState;

    const systemData = systemRef.current;
    const planets = systemData.planets;
    const now = performance.now() / 1000;

    // sync sun physical radius for physics detection
    const isSwallowing = sunRadius >= systemData.portalDist;

    if (isSwallowing && !gameStoreState.isPortalAnnihilated && !gameStoreState.isStarting) {
      useGameStore.getState().disablePortal();
    }

    // handle level completion transition delay
    if (isFinishing && !levelFinished) {
      finishTimerRef.current += delta;
      if (finishTimerRef.current > PHYSICS_TRANSITION_FINISH_DELAY) {
        finishLevel();
      }
    }

    // handle death sequence transition delay
    if (isDying && !gameOver) {
      deathTimerRef.current += delta;
      if (deathTimerRef.current > GAME_OVER_SCREEN_TRANSITION_DIE_DELAY) {
        triggerGameOver(gameStoreState.gameOverReason);
      }
    }

    if (!gameStarted) {
      return;
    }

    const actualDelta = Math.min(delta, SOLAR_SYSTEM_DT_MAX);
    const dt = actualDelta * SPACESHIP_SPEED_MULTIPLIER;

    // --- Planet Movement Update ---
    const sunPos = planets[0].position;
    for (let i = 1; i < planets.length; i++) {
      const p = planets[i];
      p.currentAngle = calculatePlanetNextState(p, sunPos, dt, annihilatedPlanets.has(i));
    }

    // --- Portal Position Update ---
    // Tie portal position to the outermost planet's direction (ignoring comets)
    // Only update while the level is active to maintain alignment with the solar system axis
    if (!levelFinished && !gameOver && !isFinishing) {
      let lastPlanet;
      for (let i = planets.length - 1; i >= 0; i--) {
        if (planets[i].isPlanet) {
          lastPlanet = planets[i];
          break;
        }
      }

      if (lastPlanet) {
        // Calculate normalized direction from sun to planet
        const dir = _v1.subVectors(lastPlanet.position, sunPos).normalize();
        // Position at pre-calculated distance
        const newPortalPos = dir.multiplyScalar(systemData.portalDist).add(sunPos);

        // Update both the high-frequency ref and the reactive store
        systemData.portalPosition.copy(newPortalPos);
        setPortalPosition(newPortalPos);
      }
    }

    // --- Sun Growth & Portal Consumption ---
    const sunStatus = gameStoreState.sunStatus;

    if (sunStatus === 'normal' && isSwallowing) {
      // Always transition to supernova sequence when sun hits portal boundary
      useGameStore.getState().triggerSupernova(gameStoreState.gameOverReason || 'The sun consumed the system');
    } else if (sunStatus === 'supernova_flash') {
      // Stay in flash state for a short time
      finishTimerRef.current += delta;
      if (finishTimerRef.current > 1.0) { // 1 second flash
        useGameStore.getState().triggerCollapse();
        finishTimerRef.current = 0;
      }
    } else if (sunStatus === 'remnant') {
      // End of sequence - already handled by triggerSupernova showing Game Over
    } else {
      // Normal growth in all other statuses (normal, supernova_expanding, collapsing)
      growSun(dt);
    }

    // sync sun physical radius and mass for physics detection
    if (planets[0] && planets[0].isSun) {
      planets[0].radius = sunRadius;
      planets[0].atmosphereRadius = sunRadius;
      planets[0].crashRadius = sunRadius;
      planets[0].mass = gameStoreState.sunMass;
    }

    // --- Celestial Collision Detection (Throttled) ---
    // Note: APP_COLLISION_CHECK_INTERVAL is used here for throttling
    if (now - lastCollisionCheckRef.current > APP_COLLISION_CHECK_INTERVAL) {
      checkAnnihilationCollisions(planets, annihilatedPlanets, annihilatedRings, _collisionResult);
      _collisionResult.annihilatedPlanets.forEach((idx: number) => {
        const p = planets[idx];
        if (p) {
          // If swallowed by sun, add its mass to the sun
          if (p.position.distanceTo(planets[0].position) < sunRadius) {
            useGameStore.getState().addSunMass(p.mass || 0);
          }
        }
        disablePlanet(idx);
      });
      _collisionResult.annihilatedRings.forEach((idx: number) => disableRings(idx));
      lastCollisionCheckRef.current = now;
    }
  }, -4);
}
