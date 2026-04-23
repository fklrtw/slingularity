import { useFrame } from '@react-three/fiber';
import type React from 'react';
import { useEffect, useRef } from 'react';
import { type Mesh, Vector3 } from 'three';
import { APP_SUN_POS } from '../app.config';
import type { SystemRefData } from '../entities/solar-system';
import { SOLAR_SYSTEM_DT_MAX } from '../entities/solar-system.config';
import { SPACESHIP_SPEED_MULTIPLIER } from '../entities/spaceship.config';
import { calculateNextState, checkOrbitCapture } from '../physics/spaceship-physics';
import { useGameStore } from '../store';
import {
  TEXT_REASON_PLANET_CRASH,
  TEXT_REASON_SUN_CRASH,
  TEXT_REASON_LOST_IN_SPACE,
} from '../text.config';
import { PORTALS_PORTAL_SIZE } from '../entities/portal.config';

/**
 * Properties for the useSpaceshipPhysics hook.
 */
export interface UseSpaceshipPhysicsProps {
  initialPosition: Vector3
  initialVelocity: Vector3
  initialOrbitDirection: number
  systemRef: React.RefObject<SystemRefData>
  spaceshipRef: React.RefObject<Mesh | null>
  resetCounter: number
}

// --- Scratchpad Vectors (to avoid GC allocations in hot paths) ---

/**
 * Handles the pure movement integration and basic state synchronization
 *
 * It tracks physics-related values such as orbital mechanics, velocity,
 * and handles event detection for collisions and mission objective milestones.
 * @param props - hook properties including initial state and shared system ref
 */
export function useSpaceshipPhysics({
  initialPosition,
  initialVelocity,
  initialOrbitDirection,
  systemRef,
  resetCounter,
}: UseSpaceshipPhysicsProps) {
  const posRef = useRef(initialPosition.clone());
  const velRef = useRef(initialVelocity.clone());

  const orbitAngleRef = useRef<number | null>(null);
  const orbitDirectionRef = useRef(initialOrbitDirection);
  const capturedSpeedRef = useRef<number | null>(null);
  const currentOrbitRadiusRef = useRef<number | null>(null);
  const steeringPlanetIndexRef = useRef<number | null>(null);
  const entryPhaseRef = useRef<'shallow' | 'steep' | 'orbiting' | null>(null);
  const entrySpeedRef = useRef<number | null>(null);
  const entryRadiusRef = useRef<number | null>(null);

  const initialOffsetRef = useRef<Vector3 | null>(null);

  const crashedIntoPlanetRef = useRef(false);
  const triggerBoostRef = useRef(false);

  const setOrbitingPlanet = useGameStore(s => s.setOrbitingPlanet);
  const addDistance = useGameStore(s => s.addDistance);
  const tickTime = useGameStore(s => s.tickTime);
  const clearLastAnnihilated = useGameStore(s => s.clearLastAnnihilated);
  const setVelocity = useGameStore(s => s.setVelocity);
  const setDistToSun = useGameStore(s => s.setDistToSun);
  const levelFinished = useGameStore(s => s.levelFinished);
  const gameOver = useGameStore(s => s.gameOver);
  const startDying = useGameStore(s => s.startDying);
  const startFinishing = useGameStore(s => s.startFinishing);
  const disablePlanet = useGameStore(s => s.disablePlanet);

  const lastOrbitingPlanetIndexRef = useRef<number | null>(useGameStore.getState().orbitingPlanetIndex);

  useEffect(() => {
    posRef.current.copy(initialPosition);
    velRef.current.copy(initialVelocity);
    orbitAngleRef.current = null;
    steeringPlanetIndexRef.current = null;
    capturedSpeedRef.current = null;
    currentOrbitRadiusRef.current = null;
    entryPhaseRef.current = null;
    entrySpeedRef.current = null;
    entryRadiusRef.current = null;
    initialOffsetRef.current = null;
    crashedIntoPlanetRef.current = false;
    triggerBoostRef.current = false;
  }, [resetCounter, initialPosition, initialVelocity]);

  useEffect(() => {
    if (gameOver || levelFinished) {
      capturedSpeedRef.current = null;
      entryPhaseRef.current = null;
      entrySpeedRef.current = null;
      entryRadiusRef.current = null;
    }
  }, [gameOver, levelFinished]);

  useFrame((state, delta) => {
    if (!systemRef.current || systemRef.current.counter !== resetCounter) {
      return;
    }

    // pause physics if menu is open
    const gameStoreState = useGameStore.getState();
    if (gameStoreState.settingsMenuOpen || gameStoreState.privacyMenuOpen || gameStoreState.creditsMenuOpen || gameStoreState.isLoadingLevel) {
      return;
    }

    const { orbitingPlanetIndex, annihilatedPlanets, lastAnnihilatedIndex, level, gameStarted, isDying, isFinishing, isPortalInitialized, sunRadius } = gameStoreState;

    const planets = systemRef.current.planets;
    const currentPos = posRef.current;
    const currentVel = velRef.current;

    if (!gameStarted) {
      const p1 = planets[1];
      if (p1) {
        if (!initialOffsetRef.current) {
          initialOffsetRef.current = new Vector3().subVectors(initialPosition, p1.position);
        }
        currentPos.copy(p1.position).add(initialOffsetRef.current);
        currentVel.copy(initialVelocity).sub(planets[1].velocity).add(p1.velocity);
      }
    }

    if (gameStarted && !levelFinished && !gameOver && !isDying && !isFinishing) {
      const actualDelta = Math.min(delta, SOLAR_SYSTEM_DT_MAX);
      const dt = actualDelta * SPACESHIP_SPEED_MULTIPLIER;

      const effectiveOrbitingIndex = (orbitingPlanetIndex === null && lastOrbitingPlanetIndexRef.current !== null && annihilatedPlanets.has(lastOrbitingPlanetIndexRef.current))
        ? lastOrbitingPlanetIndexRef.current
        : orbitingPlanetIndex;

      const nextState = calculateNextState({
        currentPos,
        currentVel,
        dt,
        planets,
        orbitingPlanetIndex: effectiveOrbitingIndex,
        annihilatedPlanets,
        lastAnnihilatedPlanetIndex: lastAnnihilatedIndex,
        level,
        orbitAngle: orbitAngleRef.current,
        orbitDirection: orbitDirectionRef.current,
        capturedSpeed: capturedSpeedRef.current,
        currentOrbitRadius: currentOrbitRadiusRef.current,
        steeringPlanetIndex: steeringPlanetIndexRef.current,
        entryPhase: entryPhaseRef.current,
        entrySpeed: entrySpeedRef.current,
        entryRadius: entryRadiusRef.current,
      });

      if (lastAnnihilatedIndex !== null) {
        clearLastAnnihilated();
      }

      // Physics values are mutated in place in currentPos/currentVel
      orbitAngleRef.current = nextState.orbitAngle;
      orbitDirectionRef.current = nextState.orbitDirection;
      capturedSpeedRef.current = nextState.capturedSpeed;
      currentOrbitRadiusRef.current = nextState.currentOrbitRadius ?? null;
      entryPhaseRef.current = nextState.entryPhase ?? null;
      entrySpeedRef.current = nextState.entrySpeed ?? null;
      entryRadiusRef.current = nextState.entryRadius ?? null;
      crashedIntoPlanetRef.current = nextState.crashedIntoPlanet;

      if (orbitingPlanetIndex !== null && nextState.orbitingPlanetIndex === null) {
        setOrbitingPlanet(null);
      }

      if (steeringPlanetIndexRef.current !== null && nextState.steeringPlanetIndex === null) {
        if (annihilatedPlanets.has(steeringPlanetIndexRef.current)) {
          triggerBoostRef.current = true;
        }
      }
      if (lastOrbitingPlanetIndexRef.current !== null && nextState.orbitingPlanetIndex === null) {
        if (annihilatedPlanets.has(lastOrbitingPlanetIndexRef.current)) {
          triggerBoostRef.current = true;
        }
      }
      steeringPlanetIndexRef.current = nextState.steeringPlanetIndex;
      lastOrbitingPlanetIndexRef.current = nextState.orbitingPlanetIndex;

      // check for physical collisions
      const shipSunDist = currentPos.distanceTo(APP_SUN_POS);
      if (shipSunDist < sunRadius) {
        startDying(TEXT_REASON_SUN_CRASH);
      } else if (crashedIntoPlanetRef.current) {
        // use index detection to find which planet we hit
        for (let i = 1; i < planets.length; i++) {
          const p = planets[i];
          if (annihilatedPlanets.has(i)) {
            continue;
          }
          if (currentPos.distanceTo(p.position) < p.crashRadius) {
            disablePlanet(i);
            break;
          }
        }
        startDying(TEXT_REASON_PLANET_CRASH);
      }

      // check mission objective status
      if (isPortalInitialized && !isDying && !isFinishing && !levelFinished) {
        const portalPos = useGameStore.getState().portalPosition;
        const distToPortal = currentPos.distanceTo(portalPos);
        if (distToPortal < PORTALS_PORTAL_SIZE + 2) {
          startFinishing();
        } else {
          // lost in space check: ship wandered too far beyond the goal
          const shipDistToSun = currentPos.distanceTo(APP_SUN_POS);
          const portalDistToSun = portalPos.distanceTo(APP_SUN_POS);
          if (shipDistToSun > portalDistToSun * 3) {
            startDying(TEXT_REASON_LOST_IN_SPACE);
          }
        }
      }

      if (orbitingPlanetIndex === null && !isDying && !isFinishing) {
        const captureIndex = checkOrbitCapture(currentPos, currentVel, planets, annihilatedPlanets);
        if (captureIndex !== null) {
          setOrbitingPlanet(captureIndex, currentPos);
        }
      }

      setVelocity(currentVel.length());
      setDistToSun(currentPos.distanceTo(APP_SUN_POS));
      addDistance(currentVel.length() * dt, currentPos);
      tickTime(dt, currentPos);
    }
  }, -3);

  return {
    posRef,
    velRef,
    currentOrbitRadiusRef,
    crashedIntoPlanetRef,
    triggerBoostRef,
  };
}
