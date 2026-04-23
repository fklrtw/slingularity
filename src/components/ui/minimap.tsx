import React, { useRef } from 'react';
import type { Mesh } from 'three';
import {
  MINIMAP_BG_OPACITY,
} from './minimap.config';
import { useThemeColors } from '../../hooks/use-theme-colors';
import { useMinimapEffects } from '../../hooks/use-minimap-effects';

/**
 * Minimap component
 *
 * renders a persistent background plane on the minimap layer.
 * delegates dual-camera management and dynamic framing to useMinimapEffects.
 */
export function Minimap() {
  const bgRef = useRef<Mesh>(null);
  const { bgApp } = useThemeColors();

  // delegate camera synchronization and system framing to the hook
  useMinimapEffects({ bgRef });

  return (
    <mesh ref={bgRef} layers={2}>
      <planeGeometry />
      <meshBasicMaterial color={bgApp} transparent opacity={MINIMAP_BG_OPACITY} depthWrite={false} />
    </mesh>
  );
}
