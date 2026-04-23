import { useFrame } from '@react-three/fiber';
import type React from 'react';
import type { Group } from 'three';
import { type FloatingScore } from '../store';

/**
 * Interface for the Text component ref from @react-three/drei
 */
export interface TextRef {
  fillOpacity: number
}

/**
 * Properties for the useFloatingScoreEffects hook.
 */
export interface UseFloatingScoreEffectsProps {
  score: FloatingScore
  onComplete: (id: number) => void
  groupRef: React.RefObject<Group | null>
  mainTextRef: React.RefObject<TextRef | null>
  multTextRef: React.RefObject<TextRef | null>
}

/**
 * Manages the upward drift and fade-out animation for a floating score indicator
 *
 * It mutates the group position and text opacity over a 2-second duration,
 * then triggers a cleanup callback.
 * @param props - hook properties including score data and visual refs
 */
export function useFloatingScoreEffects({
  score,
  onComplete,
  groupRef,
  mainTextRef,
  multTextRef,
}: UseFloatingScoreEffectsProps) {
  useFrame(() => {
    const now = performance.now();
    const elapsed = (now - score.startTime) / 1000;

    // trigger completion callback after 2 seconds
    if (elapsed > 2.0) {
      onComplete(score.id);
      return;
    }

    if (groupRef.current) {
      // combine upward drift with a linear fade
      const opacity = Math.max(0, 1 - elapsed / 2);
      const yOffset = elapsed * 5;

      // set world position (at score origin + animated offset)
      groupRef.current.position.set(score.position.x, score.position.y + yOffset, score.position.z + 5);

      // sync opacity to the drei Text components
      if (mainTextRef.current) {
        mainTextRef.current.fillOpacity = opacity;
      }
      if (multTextRef.current) {
        multTextRef.current.fillOpacity = opacity;
      }
    }
  });
}
