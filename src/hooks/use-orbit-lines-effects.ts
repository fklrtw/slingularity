import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type React from 'react';
import type { SystemRefData } from '../entities/solar-system';
import { useGameStore } from '../store';

/**
 * Properties for the useOrbitLinesEffects hook.
 */
export interface UseOrbitLinesEffectsProps {
  systemData: SystemRefData
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lineRefs: React.RefObject<(any | null)[]>
}

/**
 * Manages the visibility and spatial synchronization of planetary orbital paths
 *
 * It monitors the annihilation state of planets and hides their corresponding
 * orbit lines when they are removed from the system.
 * @param props - hook properties including system data and line refs
 */
export function useOrbitLinesEffects({ systemData, lineRefs }: UseOrbitLinesEffectsProps) {
  const resetCounter = useGameStore(s => s.resetCounter);

  const frameCountRef = useRef(0);

  useFrame(() => {
    frameCountRef.current++;
    if (frameCountRef.current % 4 !== 0) {
      return; // ~15Hz
    }

    if (!systemData || systemData.counter !== resetCounter) {
      return;
    }

    const planets = systemData.planets;

    planets.forEach((p, i) => {
      // skip the sun as it doesn't have an orbit line
      if (p.isSun) {
        return;
      }

      const line = lineRefs.current[i];
      if (line) {
        // hide path immediately if the planet is Annihilated
        line.visible = !useGameStore.getState().annihilatedPlanets.has(i);
      }
    });
  });
}
