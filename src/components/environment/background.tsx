import React, { useRef } from 'react';
import type { Group, ShaderMaterial } from 'three';
import { AdditiveBlending } from 'three';
import {
  BACKGROUND_DEPTH_NEBULAE,
  BACKGROUND_DEPTH_MILKYWAY,
  BACKGROUND_CONSTELLATION_OPACITY,
  BACKGROUND_GLOBAL_SCALE_FACTOR,
} from './background.config';

import { Nebulae } from '../../entities/background/nebulae';
import { MilkyWay } from '../../entities/background/milky-way';
import { Galaxies } from '../../entities/background/galaxies';
import { useGameStore } from '../../store';
import { useThemeColors } from '../../hooks/use-theme-colors';
import { useBackgroundEffects } from '../../hooks/use-background-effects';

/**
 * Star point cloud vertex shader
 */
const starVertexShader = `
    attribute float size;
    attribute float sparkle;
    varying vec3 vColor;
    varying float vSparkle;
    uniform float viewportHeight;
    void main() {
        vColor = color;
        vSparkle = sparkle;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        // Size attenuation based on distance and viewport height
        gl_PointSize = max(0.5, size * (viewportHeight / 1080.0) * (300.0 / -mvPosition.z));
        gl_Position = projectionMatrix * mvPosition;
    }
`;

/**
 * Star point cloud fragment shader
 */
const starFragmentShader = `
    varying vec3 vColor;
    varying float vSparkle;
    uniform float opacity;
    uniform float time;
    void main() {
        float r = length(gl_PointCoord - vec2(0.5));
        if (r > 0.5) discard;
        
        // Time-based twinkling for stars with sparkle attribute > 0
        float twinkle = 1.0;
        if (vSparkle > 0.0) {
            twinkle = 0.6 + 0.4 * sin(time * 3.0 + vSparkle * 10.0);
        }
        
        float alpha = smoothstep(0.5, 0.1, r) * opacity * twinkle;
        gl_FragColor = vec4(vColor, alpha);
    }
`;

/**
 * Background component
 *
 * renders distant celestial elements and manages parallax drift by delegating to hooks.
 */
export function Background() {
  const groupRef = useRef<Group>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const { themePrimary } = useThemeColors();
  const shaderQuality = useGameStore(s => s.settings.shaders);
  const detailLevel = useGameStore(s => s.settings.detailLevel);

  // delegate data loading and parallax motion to the hook
  const {
    starGeometry,
    constellationGeometry,
    galaxyData,
    starUniforms
  } = useBackgroundEffects({ groupRef, materialRef });

  return (
    <group ref={groupRef} scale={[BACKGROUND_GLOBAL_SCALE_FACTOR, BACKGROUND_GLOBAL_SCALE_FACTOR, 1]}>
      {shaderQuality === 'advanced' && detailLevel !== 'low' && (
        <>
          <group position={[0, 0, BACKGROUND_DEPTH_MILKYWAY]}>
            <MilkyWay />
          </group>
          <group position={[0, 0, BACKGROUND_DEPTH_NEBULAE]}>
            <Nebulae />
          </group>
          {detailLevel === 'high' && <Galaxies data={galaxyData} />}
        </>
      )}

      {starGeometry && (
        <points geometry={starGeometry} frustumCulled={false} layers={1}>
          <shaderMaterial
            ref={materialRef}
            transparent
            vertexColors
            depthWrite={false}
            blending={AdditiveBlending}
            vertexShader={starVertexShader}
            fragmentShader={starFragmentShader}
            uniforms={starUniforms}
          />
        </points>
      )}

      {constellationGeometry && (
        <lineSegments geometry={constellationGeometry} frustumCulled={false} layers={1}>
          <lineBasicMaterial
            color={themePrimary}
            transparent
            opacity={BACKGROUND_CONSTELLATION_OPACITY}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </lineSegments>
      )}
    </group>
  );
}
