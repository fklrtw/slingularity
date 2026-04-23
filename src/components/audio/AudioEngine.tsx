import type React from 'react';
import type { Mesh } from 'three';
import type { SystemRefData } from '../../entities/solar-system';
import { useAudioEffects } from '../../hooks/use-audio-effects';
import { useProceduralMusic } from '../../hooks/use-procedural-music';

interface AudioEngineProps {
  systemRef: React.RefObject<SystemRefData>
  spaceshipRef: React.RefObject<Mesh | null>
}

/**
 * Encapsulates the audio hooks so they can be dynamically imported
 * by React.lazy, satisfying the requirement that audio bundles
 * are only loaded when the game has started.
 */
export default function AudioEngine({ systemRef, spaceshipRef }: AudioEngineProps) {
  useAudioEffects(systemRef, spaceshipRef);
  useProceduralMusic();

  return null;
}
