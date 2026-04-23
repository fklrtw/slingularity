import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import type { ShaderMaterial } from 'three';
import { AdditiveBlending, DoubleSide } from 'three';
import { BACKGROUND_MILKY_WAY_ROTATION, BACKGROUND_MILKY_WAY_SCALE } from '../../components/environment/background.config';
import { useThemeColors } from '../../hooks/use-theme-colors';

/**
 * MilkyWay vertex shader
 */
const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

/**
 * MilkyWay fragment shader
 */
const fragmentShader = `
    uniform float opacity;
    uniform vec3 color;
    uniform float time;
    varying vec2 vUv;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.71, 311.7))) * 43758.5453123);
    }

    void main() {
        vec2 uv = vUv;
        float d = distance(uv, vec2(0.5));
        float cloudMask = smoothstep(0.5, 0.2, d * vec2(1.5, 3.0).x + abs(uv.y - 0.5) * 2.2);
        
        vec2 starUv = uv * vec2(800.0, 400.0);
        vec2 ipos = floor(starUv);
        vec2 fpos = fract(starUv);
        
        float h = hash(ipos);
        float star = 0.0;
        
        if (h > 0.95) {
            vec2 center = vec2(hash(ipos + 0.1), hash(ipos + 0.2));
            float dist = distance(fpos, center);
            star = smoothstep(0.15, 0.05, dist);
            star *= (0.7 + 0.3 * sin(time * 2.0 + h * 10.0));
        }

        vec2 starUv2 = uv * vec2(1600.0, 800.0);
        vec2 ipos2 = floor(starUv2);
        vec2 fpos2 = fract(starUv2);
        if (hash(ipos2 + 0.5) > 0.97) {
            vec2 center2 = vec2(hash(ipos2 + 0.3), hash(ipos2 + 0.4));
            star += smoothstep(0.2, 0.1, distance(fpos2, center2)) * 0.4;
        }
        
        float glow = exp(-abs(uv.y - 0.5) * 9.0) * 0.25;
        float finalAlpha = (glow + star) * cloudMask * opacity;
        vec3 finalColor = color + star * 0.5;
        
        gl_FragColor = vec4(finalColor, finalAlpha);
    }
`;

/**
 * MilkyWayBand internal component
 */
function MilkyWayBand({ rotation, offset, opacity, depth }: { rotation: number, offset: [number, number, number], opacity: number, depth: number }) {
  const matRef = useRef<ShaderMaterial>(null);
  const { envMilkyWay } = useThemeColors();

  const uniforms = useMemo(() => ({
    opacity: { value: opacity },
    color: { value: envMilkyWay },
    time: { value: 0 },
  }), [opacity, envMilkyWay]);

  useFrame(() => {
    if (matRef.current) {
      matRef.current.uniforms.time.value = performance.now() / 1000;
    }
  });

  return (
    <group rotation={[0, 0, rotation]} position={[offset[0], offset[1], offset[2] + depth]} scale={BACKGROUND_MILKY_WAY_SCALE} layers={1}>
      <mesh scale={[2000, 1000, 1]} layers={1} frustumCulled={false}>
        <planeGeometry />
        <shaderMaterial
          ref={matRef}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
        />
      </mesh>
    </group>
  );
}

/**
 * MilkyWay component
 */
export function MilkyWay({ depth = 0 }: { depth?: number }) {
  return (
    <group>
      <MilkyWayBand depth={depth} rotation={BACKGROUND_MILKY_WAY_ROTATION} offset={[0, 0, 0]} opacity={0.4} />
    </group>
  );
}
