import { Sphere, Torus } from '@react-three/drei';
import React, { useRef } from 'react';
import type { Group, Mesh, Vector3 } from 'three';
import { AdditiveBlending } from 'three';
import { usePortalEffects } from '../hooks/use-portal-effects';
import { useThemeColors } from '../hooks/use-theme-colors';
import { useGameStore } from '../store';
import {
  PORTALS_PORTAL_CORE_SCALE,
  PORTALS_PORTAL_LIGHT,
  PORTALS_PORTAL_RIM_WIDTH,
  PORTALS_PORTAL_SEGMENTS,
  PORTALS_PORTAL_SIZE,
} from './portal.config';
import type { SystemRefData } from './solar-system';

/**
 * Properties for the Portal component
 */
interface PortalProps {
  /** Type of portal: 'start' for mission origin, 'end' for level goal */
  type: 'start' | 'end'
  /** Shared reference to current system physics data */
  systemRef: React.RefObject<SystemRefData>
  /** The specific world position where the portal should initially appear (only for start portals) */
  initialPosition?: Vector3
}

/**
 * Portal entity component
 *
 * The goal (end) or origin (start) of each level.
 * Handles emergence sequences and victory transitions with procedural animations.
 */
export function Portal({ type, systemRef, initialPosition }: PortalProps) {
  const meshRef = useRef<Group>(null);
  const visualsRef = useRef<Group>(null);
  const coreRef = useRef<Mesh>(null);
  const resetCounter = useGameStore(s => s.resetCounter);
  const { themePortal } = useThemeColors();
  const detailLevel = useGameStore(s => s.settings.detailLevel);

  // delegate visual logic and animations to the hook
  usePortalEffects({
    type,
    initialPosition,
    systemRef,
    meshRef,
    visualsRef,
    coreRef,
    resetCounter,
  });

  const tubularSegments = detailLevel === 'high' ? PORTALS_PORTAL_SEGMENTS[1] : (detailLevel === 'medium' ? 64 : 32);
  const radialSegments = detailLevel === 'high' ? PORTALS_PORTAL_SEGMENTS[0] : (detailLevel === 'medium' ? 12 : 8);
  const sphereSegments = detailLevel === 'high' ? 32 : (detailLevel === 'medium' ? 24 : 16);

  return (
    <group ref={meshRef} name={`${type}-portal-group`}>
      <group ref={visualsRef}>
        {/* Outer Ring */}
        <Torus
          args={[PORTALS_PORTAL_SIZE, PORTALS_PORTAL_RIM_WIDTH, radialSegments, tubularSegments]}
        >
          <meshStandardMaterial
            color={themePortal}
            emissive={themePortal}
            emissiveIntensity={2}
            toneMapped={false}
          />
        </Torus>

        {/* Inner Glow */}
        <Sphere ref={coreRef} args={[PORTALS_PORTAL_SIZE * PORTALS_PORTAL_CORE_SCALE, sphereSegments, sphereSegments]}>
          <meshBasicMaterial
            color={themePortal}
            transparent
            opacity={0.3}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </Sphere>
      </group>

      <pointLight
        intensity={PORTALS_PORTAL_LIGHT.intensity}
        distance={PORTALS_PORTAL_LIGHT.distance}
        color={themePortal}
      />
    </group>
  );
}
