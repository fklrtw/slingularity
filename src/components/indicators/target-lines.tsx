/* eslint-disable react-hooks/immutability, @typescript-eslint/no-explicit-any */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import type { BufferGeometry } from 'three';
import type { SystemRefData } from '../../entities/solar-system';
import { useGameStore } from '../../store';
import { useThemeColors } from '../../hooks/use-theme-colors';

interface TargetLinesProps {
  systemData: SystemRefData
}

/**
 * TargetLines component
 *
 * Renders dashed lines connecting consecutive active elements in the system.
 * Guides the player through the mission sequence (Planet N -> Planet N+1 -> Portal).
 * Optimized with a pre-allocated Float32Array and zero react re-renders during active flight.
 */
export function TargetLines({ systemData }: TargetLinesProps) {
  const resetCounter = useGameStore(s => s.resetCounter);
  const { themePrimary } = useThemeColors();
  const geomRef = useRef<BufferGeometry>(null);

  const planets = systemData?.planets || [];
  const maxConnections = planets.length;

  // pre-allocate the position buffer once per level reset
  const positionArray = useMemo(() => {
    return new Float32Array(maxConnections * 2 * 3);
  }, [maxConnections]);

  useFrame(() => {
    if (!geomRef.current) {
      return;
    }
    if (!systemData || systemData.counter !== resetCounter) {
      return;
    }

    const { annihilatedPlanets, isPortalAnnihilated, portalPosition } = useGameStore.getState();

    let lastActivePlanet = null;
    let connectionCount = 0;

    // extract active planets and build line segment positions
    for (let i = 0; i < planets.length; i++) {
      const p = planets[i];
      if (p.isPlanet && !annihilatedPlanets.has(i)) {
        if (lastActivePlanet) {
          const idx = connectionCount * 6;
          positionArray[idx] = lastActivePlanet.position.x;
          positionArray[idx + 1] = lastActivePlanet.position.y;
          positionArray[idx + 2] = lastActivePlanet.position.z;
          positionArray[idx + 3] = p.position.x;
          positionArray[idx + 4] = p.position.y;
          positionArray[idx + 5] = p.position.z;
          connectionCount++;
        }
        lastActivePlanet = p;
      }
    }

    // connect final planet to portal
    if (lastActivePlanet && portalPosition && !isPortalAnnihilated) {
      const idx = connectionCount * 6;
      positionArray[idx] = lastActivePlanet.position.x;
      positionArray[idx + 1] = lastActivePlanet.position.y;
      positionArray[idx + 2] = lastActivePlanet.position.z;
      positionArray[idx + 3] = portalPosition.x;
      positionArray[idx + 4] = portalPosition.y;
      positionArray[idx + 5] = portalPosition.z;
      connectionCount++;
    }

    const geom = geomRef.current;
    if (!geom) {
      return;
    }

    // expose positions and counts for unit tests
    (geom as any)._testPositions = positionArray;
    (geom as any)._testConnectionCount = connectionCount;

    // defensive checks for testing and non-WebGL environments
    if (typeof geom.getAttribute === 'function') {
      const posAttr = geom.getAttribute('position');
      if (posAttr) {
        posAttr.needsUpdate = true;
      }
    }
    if (typeof geom.setDrawRange === 'function') {
      geom.setDrawRange(0, connectionCount * 2);
    }
    if (typeof (geom as any).computeLineDistances === 'function') {
      (geom as any).computeLineDistances();
    }
  });

  if (!systemData || systemData.counter !== resetCounter) {
    return null;
  }

  return (
    <lineSegments name="target-lines">
      <bufferGeometry ref={geomRef}>
        <bufferAttribute
          attach="attributes-position"
          args={[positionArray, 3]}
        />
      </bufferGeometry>
      <lineDashedMaterial
        color={themePrimary}
        dashSize={2}
        gapSize={2}
        transparent
        opacity={0.3}
        depthWrite={false}
      />
    </lineSegments>
  );
}
