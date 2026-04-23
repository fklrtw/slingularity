import { Sphere } from '@react-three/drei';
import React, { forwardRef } from 'react';
import { AdditiveBlending, type Mesh } from 'three';
import { SHOCKWAVE_MODEL } from './shockwave.config';
import { useThemeColors } from '../hooks/use-theme-colors';

export const Shockwave = forwardRef<Mesh>((props, ref) => {
  const { themePrimary } = useThemeColors();

  return (
    <Sphere ref={ref} args={SHOCKWAVE_MODEL} visible={false}>
      <meshBasicMaterial
        color={themePrimary}
        transparent
        opacity={1.0}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </Sphere>
  );
});
Shockwave.displayName = 'Shockwave';
