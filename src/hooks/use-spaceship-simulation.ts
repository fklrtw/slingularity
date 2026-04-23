import type React from 'react';
import type { Mesh } from 'three';
import type { Vector3 } from 'three';
import type { SystemRefData } from '../entities/solar-system';
import { useSpaceshipEffects } from './use-spaceship-effects';
import { useSpaceshipPhysics } from './use-spaceship-physics';

/**
 * Properties for the useSpaceshipSimulation hook.
 */
export interface UseSpaceshipSimulationProps {
  initialPosition: Vector3
  initialVelocity: Vector3
  initialOrbitDirection: number
  systemRef: React.RefObject<SystemRefData>
  spaceshipRef: React.RefObject<Mesh | null>
  resetCounter: number
}

/**
 * Custom hook to handle spaceship physics, state synchronization, and simulation.
 * Delegates to specialized hooks for physics and visual effects.
 */
export function useSpaceshipSimulation(props: UseSpaceshipSimulationProps) {
  const {
    posRef,
    velRef,
    currentOrbitRadiusRef,
    triggerBoostRef,
  } = useSpaceshipPhysics(props);

  const {
    shockwaveRef,
    spaceshipMeshRef,
    trailRef,
    laserPoints,
  } = useSpaceshipEffects({
    posRef,
    velRef,
    systemRef: props.systemRef,
    spaceshipRef: props.spaceshipRef,
    currentOrbitRadiusRef,
    triggerBoostRef,
    resetCounter: props.resetCounter,
  });

  return {
    shockwaveRef,
    spaceshipMeshRef,
    laserPoints,
    trailRef,
  };
}
