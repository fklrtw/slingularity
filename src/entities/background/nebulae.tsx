import React, { useMemo } from 'react';
import { Vector3, AdditiveBlending, Color, DataTexture, RGBAFormat, RepeatWrapping, LinearFilter, DoubleSide, Vector2 } from 'three';
import {
  BACKGROUND_NEBULA_COUNT,
  BACKGROUND_NEBULA_SPREAD,
  BACKGROUND_NEBULA_NOISE_SCALE,
  BACKGROUND_NEBULA_PLANE_SIZE,
  BACKGROUND_NEBULA_DENSITY,
  BACKGROUND_NEBULA_FALLOFF,
  BACKGROUND_NEBULA_OPACITY,
} from '../../components/environment/background.config';
import { useGameStore } from '../../store';
import { seededRandom } from '../../utils/random';
import { useThemeColors } from '../../hooks/use-theme-colors';

/**
 * Generates a procedural noise texture for nebula rendering.
 */
export function generateNoiseTexture(size: number, rng: () => number) {
  const l = size * size;
  const array = new Uint8Array(l * 4);
  for (let i = 0; i < l; i++) {
    const angle = rng() * Math.PI * 2;
    const rx = Math.cos(angle);
    const ry = Math.sin(angle);
    array[i * 4 + 0] = Math.round(0.5 * (1.0 + rx) * 255);
    array[i * 4 + 1] = Math.round(0.5 * (1.0 + ry) * 255);
    array[i * 4 + 2] = 0;
    array[i * 4 + 3] = 255;
  }
  const texture = new DataTexture(array, size, size, RGBAFormat);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Nebula vertex shader
 */
const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

/**
 * Nebula fragment shader
 */
const fragmentShader = `
    uniform sampler2D tNoise;
    uniform vec3 color;
    uniform vec2 offset;
    uniform float scale;
    uniform float density;
    uniform float falloff;
    uniform float tNoiseSize;
    uniform float opacity;
    uniform int steps;
    varying vec2 vUv;

    float smootherstep(float a, float b, float r) {
        r = clamp(r, 0.0, 1.0);
        r = r * r * r * (r * (6.0 * r - 15.0) + 10.0);
        return mix(a, b, r);
    }

    float perlin_2d(vec2 p) {
        vec2 p0 = floor(p);
        vec2 p1 = p0 + vec2(1.0, 0.0);
        vec2 p2 = p0 + vec2(1.0, 1.0);
        vec2 p3 = p0 + vec2(0.0, 1.0);
        vec2 d0 = texture2D(tNoise, p0/tNoiseSize).rg;
        vec2 d1 = texture2D(tNoise, p1/tNoiseSize).rg;
        vec2 d2 = texture2D(tNoise, p2/tNoiseSize).rg;
        vec2 d3 = texture2D(tNoise, p3/tNoiseSize).rg;
        d0 = 2.0 * d0 - 1.0;
        d1 = 2.0 * d1 - 1.0;
        d2 = 2.0 * d2 - 1.0;
        d3 = 2.0 * d3 - 1.0;
        vec2 p0p = p - p0;
        vec2 p1p = p - p1;
        vec2 p2p = p - p2;
        vec2 p3p = p - p3;
        float dp0 = dot(d0, p0p);
        float dp1 = dot(d1, p1p);
        float dp2 = dot(d2, p2p);
        float dp3 = dot(d3, p3p);
        float fx = p.x - p0.x;
        float fy = p.y - p0.y;
        float m01 = smootherstep(dp0, dp1, fx);
        float m32 = smootherstep(dp3, dp2, fx);
        float m01m32 = smootherstep(m01, m32, fy);
        return m01m32;
    }

    float normalnoise(vec2 p) {
        return perlin_2d(p) * 0.5 + 0.5;
    }

    float noise(vec2 p) {
        p += offset;
        float s = pow(2.0, float(steps));
        float displace = 0.0;
        for (int i = 0; i < 5; i++) {
            if (i >= steps) break;
            displace = normalnoise(p * s + displace);
            s *= 0.5;
        }
        return normalnoise(p + displace);
    }

    void main() {
        float n = noise(vUv * scale);
        n = pow(max(n + density, 0.0), falloff);
        float dist = distance(vUv, vec2(0.5));
        float edgeFade = smoothstep(0.5, 0.3, dist);
        gl_FragColor = vec4(color, n * opacity * edgeFade);
    }
`;

/**
 * Nebulae component
 */
export function Nebulae({ depth = 0 }: { depth?: number }) {
  const resetCounter = useGameStore(s => s.resetCounter);
  const detailLevel = useGameStore(s => s.settings.detailLevel);
  const postProcessing = useGameStore(s => s.settings.postProcessing);
  const { nebulaPalette } = useThemeColors();

  const currentOpacity = postProcessing ? BACKGROUND_NEBULA_OPACITY.high : BACKGROUND_NEBULA_OPACITY.low;

  const { noiseTexture, nebulaeData } = useMemo(() => {
    const rng = seededRandom(resetCounter + 777);
    const texSize = detailLevel === 'high' ? 1024 : 512;
    const tex = generateNoiseTexture(texSize, rng);
    const data = [];

    const colors = nebulaPalette;
    const targetCount = detailLevel === 'high' ? BACKGROUND_NEBULA_COUNT : (detailLevel === 'medium' ? 2 : 0);

    for (let i = 0; i < targetCount; i++) {
      const x = (rng() - 0.5) * BACKGROUND_NEBULA_SPREAD;
      const y = (rng() - 0.5) * BACKGROUND_NEBULA_SPREAD;
      const z = (rng() - 0.5) * 50 + depth;

      const baseColor = colors[Math.floor(rng() * colors.length)];
      const col = new Color(baseColor);

      data.push({
        position: new Vector3(x, y, z),
        color: col,
        offset: new Vector2(rng() * 1000.0, rng() * 1000.0),
        scale: BACKGROUND_NEBULA_NOISE_SCALE,
      });
    }

    return { noiseTexture: tex, nebulaeData: data, texSize };
  }, [resetCounter, depth, nebulaPalette, detailLevel]);

  const noiseSteps = detailLevel === 'high' ? 5 : 3;

  return (
    <group layers={1}>
      {nebulaeData.map((data, i) => (
        <mesh key={i} position={data.position} layers={1} frustumCulled={false}>
          <planeGeometry args={[BACKGROUND_NEBULA_PLANE_SIZE, BACKGROUND_NEBULA_PLANE_SIZE]} />
          <shaderMaterial
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            side={DoubleSide}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={{
              tNoise: { value: noiseTexture },
              tNoiseSize: { value: noiseTexture.image.width },
              color: { value: data.color },
              offset: { value: data.offset },
              scale: { value: data.scale },
              density: { value: BACKGROUND_NEBULA_DENSITY },
              falloff: { value: BACKGROUND_NEBULA_FALLOFF },
              opacity: { value: currentOpacity },
              steps: { value: noiseSteps },
            }}
          />
        </mesh>
      ))}
    </group>
  );
}
