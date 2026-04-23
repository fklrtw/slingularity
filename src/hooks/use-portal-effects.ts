import { useFrame } from '@react-three/fiber';
import type React from 'react';
import { useRef } from 'react';
import { Euler, type Group, type Mesh, Quaternion, Vector3 } from 'three';
import { PORTALS_PORTAL_ROTATION, PORTALS_PORTAL_ROTATION_SPEED, PORTALS_PORTAL_DIST_OFFSET, PORTALS_PORTAL_ROTATION_SMOOTHING, PORTALS_PORTAL_PULSE_SPEED, PORTALS_PORTAL_PULSE_STRENGTH, PORTALS_PORTAL_SWELL_DURATION, PORTALS_PORTAL_COLLAPSE_DURATION } from '../entities/portal.config';
import type { SystemRefData } from '../entities/solar-system';
import { useGameStore } from '../store';

/**
 * Properties for the usePortalEffects hook.
 */
export interface UsePortalEffectsProps {
  type: 'start' | 'end'
  initialPosition?: Vector3
  systemRef: React.RefObject<SystemRefData>
  meshRef: React.RefObject<Group | null>
  visualsRef: React.RefObject<Group | null>
  coreRef: React.RefObject<Mesh | null>
  resetCounter: number
}

// --- Scratchpad Vectors (to avoid GC allocations in hot paths) ---
const _v1 = new Vector3();
const _vShip = new Vector3();
const _q1 = new Quaternion();
const _q2 = new Quaternion();
const _e1 = new Euler();

/**
 * Manages the visual state and animations for the level portals (start/end)
 *
 * Handles portal positioning, rotation logic (tracking ship), and the
 * swelling/collapse animation sequence for transitions.
 * @param props - hook properties including portal type and geometry refs
 */
export function usePortalEffects({
  type,
  initialPosition,
  systemRef,
  meshRef,
  visualsRef,
  coreRef,
  resetCounter,
}: UsePortalEffectsProps) {
  const animTimerRef = useRef(0);
  const initialOffsetRef = useRef<Vector3 | null>(null);

  useFrame((state, delta) => {
    if (!systemRef.current || systemRef.current.counter !== resetCounter) {
      return;
    }

    // pause portal animations if menu is open
    const gameStoreState = useGameStore.getState();
    if (gameStoreState.settingsMenuOpen || gameStoreState.creditsMenuOpen) {
      return;
    }

    const { levelFinished, isFinishing, isStarting, gameStarted, isPortalAnnihilated, portalPosition } = gameStoreState;

    const planets = systemRef.current.planets;

    // --- End Portal Logic ---
    if (type === 'end' && portalPosition && meshRef.current) {
      meshRef.current.position.copy(portalPosition);
      meshRef.current.visible = !isPortalAnnihilated;

      const mockShip = state.scene.getObjectByName('spaceship-mesh');
      if (mockShip) {
        _vShip.copy(mockShip.position);
        const distToShip = _vShip.distanceTo(portalPosition);

        if (distToShip > PORTALS_PORTAL_DIST_OFFSET / 2) {
          // smoothly rotate towards the ship using slerp
          _q1.copy(meshRef.current.quaternion);
          meshRef.current.lookAt(_vShip);
          _q2.copy(meshRef.current.quaternion);
          meshRef.current.quaternion.copy(_q1).slerp(_q2, Math.min(1, delta * PORTALS_PORTAL_ROTATION_SMOOTHING));
        }
      } else if (!isFinishing && !levelFinished) {
        // fallback to default rotation if ship is missing or sequence has started
        _q1.copy(meshRef.current.quaternion);
        _q2.setFromEuler(_e1.set(PORTALS_PORTAL_ROTATION[0], PORTALS_PORTAL_ROTATION[1], meshRef.current.rotation.z));
        meshRef.current.quaternion.slerp(_q2, Math.min(1, delta * PORTALS_PORTAL_ROTATION_SMOOTHING));
      }

      if (visualsRef.current) {
        const time = performance.now() / 1000;
        visualsRef.current.rotation.z = time * PORTALS_PORTAL_ROTATION_SPEED;
      }

      // --- transition: swelling and collapse animation ---
      if (isFinishing && !levelFinished) {
        animTimerRef.current += delta;
        const t = animTimerRef.current;

        if (t < PORTALS_PORTAL_SWELL_DURATION) {
          const progress = t / PORTALS_PORTAL_SWELL_DURATION;
          const swell = 1.0 + progress * 2.0;
          meshRef.current.scale.set(swell, swell, swell);
        } else {
          const progress = Math.min(1.0, (t - PORTALS_PORTAL_SWELL_DURATION) / PORTALS_PORTAL_COLLAPSE_DURATION);
          const verticalScale = Math.max(0.001, 1.0 - progress);
          const horizontalScale = Math.max(0.001, 1.0 - Math.pow(progress, 3));
          meshRef.current.scale.set(horizontalScale, horizontalScale, verticalScale);
        }
      }
    }

    // --- Start Portal Logic ---
    if (type === 'start' && meshRef.current) {
      if (!isStarting) {
        meshRef.current.visible = false;
        return;
      }

      const firstPlanet = planets[1];
      if (!firstPlanet || !meshRef.current || !initialPosition) {
        return;
      }

      // calculate starting spatial offset relative to the first planet
      if (!initialOffsetRef.current) {
        initialOffsetRef.current = new Vector3().subVectors(initialPosition, firstPlanet.position);
      }

      // follow the first planet to stay aligned with spaceship emergence
      const portalPos = _v1.copy(firstPlanet.position).add(initialOffsetRef.current);
      meshRef.current.position.copy(portalPos);
      meshRef.current.visible = true;

      if (visualsRef.current) {
        const time = performance.now() / 1000;
        visualsRef.current.rotation.z = time * PORTALS_PORTAL_ROTATION_SPEED;
      }
      meshRef.current.rotation.x = PORTALS_PORTAL_ROTATION[0];
      meshRef.current.rotation.y = PORTALS_PORTAL_ROTATION[1];

      // --- transition: un-collapse animation ---
      if (isStarting) {
        if (gameStarted) {
          animTimerRef.current += delta;
        }

        const t = animTimerRef.current;
        const totalDuration = PORTALS_PORTAL_SWELL_DURATION + PORTALS_PORTAL_COLLAPSE_DURATION;

        if (t < PORTALS_PORTAL_COLLAPSE_DURATION) {
          const progress = 1.0 - (t / PORTALS_PORTAL_COLLAPSE_DURATION);
          const verticalScale = Math.max(0.001, 1.0 - progress);
          const horizontalScale = Math.max(0.001, 1.0 - Math.pow(progress, 3));
          meshRef.current.scale.set(horizontalScale, horizontalScale, verticalScale);
        } else if (t < totalDuration) {
          const progress = 1.0 - ((t - PORTALS_PORTAL_COLLAPSE_DURATION) / PORTALS_PORTAL_SWELL_DURATION);
          const swell = 1.0 + progress * 2.0;
          meshRef.current.scale.set(swell, swell, swell);
        } else {
          meshRef.current.scale.set(1, 1, 1);
          meshRef.current.visible = false;
          useGameStore.getState().finishStarting();
        }
      }
    }

    // common core pulsing effect
    if (coreRef.current && ((type === 'end' && (!isFinishing || levelFinished)) || (type === 'start' && isStarting))) {
      const pulse = 1 + Math.sin((performance.now() / 1000) * PORTALS_PORTAL_PULSE_SPEED) * PORTALS_PORTAL_PULSE_STRENGTH;
      coreRef.current.scale.set(pulse, pulse, pulse);
    }
  });
}
