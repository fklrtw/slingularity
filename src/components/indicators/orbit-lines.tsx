import { Line } from '@react-three/drei';
import React, { useRef, useMemo } from 'react';
import { Vector3 } from 'three';
import { APP_SUN_POS } from '../../app.config';
import {
  PLANETS_ORBIT_LINE_OPACITY,
  PLANETS_ORBIT_LINE_WIDTH,
} from '../../entities/planet.config';
import type { SystemRefData } from '../../entities/solar-system';
import { useGameStore } from '../../store';
import { useThemeColors } from '../../hooks/use-theme-colors';
import { useOrbitLinesEffects } from '../../hooks/use-orbit-lines-effects';

interface OrbitLinesProps {
  systemData: SystemRefData
}

/**
 * OrbitLines component
 *
 * Renders the elliptical paths followed by all active planets.
 * Delegates high-frequency visibility management to useOrbitLinesEffects.
 */
export function OrbitLines({ systemData }: OrbitLinesProps) {
  const resetCounter = useGameStore(s => s.resetCounter);
  const { themePrimaryDim } = useThemeColors();
  const lineRefs = useRef<(React.ElementRef<typeof Line> | null)[]>([]);

  // delegate visibility state synchronization to the hook
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useOrbitLinesEffects({ systemData, lineRefs: lineRefs as unknown as React.RefObject<(any | null)[]> });

  // generate static elliptical points once per level reset
  const planetPaths = useMemo(() => {
    if (!systemData || systemData.counter !== resetCounter) {
      return [];
    }

    return systemData.planets.map((p, i) => {
      if (p.isSun) {
        return null;
      }

      const points = [];
      const segments = 128;
      const semiMajor = p.semiMajorAxis || 0;
      const semiMinor = p.semiMinorAxis || 0;
      const focusOffset = p.focusOffset || 0;

      for (let j = 0; j <= segments; j++) {
        const angle = (j / segments) * Math.PI * 2;
        points.push(new Vector3(
          Math.cos(angle) * semiMajor - focusOffset,
          Math.sin(angle) * semiMinor,
          0,
        ));
      }

      return {
        id: p.id,
        index: i,
        points,
        color: p.color || themePrimaryDim,
      };
    });
  }, [systemData, resetCounter, themePrimaryDim]);

  return (
    <group position={APP_SUN_POS}>
      {planetPaths.map((path) => {
        if (!path) {
          return null;
        }

        return (
          <Line
            key={path.id}
            ref={(el) => {
              lineRefs.current[path.index] = el;
            }}
            points={path.points}
            color={path.color}
            lineWidth={PLANETS_ORBIT_LINE_WIDTH}
            transparent
            opacity={PLANETS_ORBIT_LINE_OPACITY}
            dashed
            dashScale={2}
            dashSize={1}
          />
        );
      })}
    </group>
  );
}
