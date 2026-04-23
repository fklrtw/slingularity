import { Line } from '@react-three/drei';
import React, { useMemo } from 'react';
import type { Vector3 } from 'three';
import { AdditiveBlending, Color } from 'three';
import { useThemeColors } from '../hooks/use-theme-colors';
import { useGameStore } from '../store';

interface AnnihilationBeamProps {
  points: [Vector3, Vector3]
}

export function AnnihilationBeam({ points }: AnnihilationBeamProps) {
  const { themeDanger } = useThemeColors();
  const postProcessingEnabled = useGameStore(s => s.settings.postProcessing);

  const beamColor = useMemo(() => {
    const color = new Color(themeDanger);
    if (postProcessingEnabled) {
      color.multiplyScalar(40.0);
    }
    return color;
  }, [themeDanger, postProcessingEnabled]);

  return (
    <Line
      points={[points[0].toArray(), points[1].toArray()]}
      color={beamColor}
      lineWidth={3}
      transparent
      opacity={0.8}
      blending={AdditiveBlending}
      toneMapped={false}
    />
  );
}
