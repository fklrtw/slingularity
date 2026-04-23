import React from 'react';
import type { Vector3, Color } from 'three';
import { AdditiveBlending, DoubleSide, Euler } from 'three';

/**
 * Galaxy vertex shader
 *
 * Simple pass-through for UV coordinates.
 */
const galaxyVertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

/**
 * Galaxy fragment shader
 *
 * Generates different galaxy shapes (spiral, elliptical, edge-on) using procedural math.
 */
const galaxyFragmentShader = `
    varying vec2 vUv;
    uniform vec3 uColor;
    uniform float opacity;
    uniform int uType; // 0: spiral, 1: elliptical, 2: edge-on

    void main() {
        vec2 uv = vUv - 0.5;
        float r = length(uv);
        float theta = atan(uv.y, uv.x);
        
        float finalGlow = 0.0;
        vec3 finalColor = uColor;

        if (uType == 0) {
            // Spiral arms generation using logarithmic spiral math
            float core = exp(-r * 15.0);
            float spiral = theta + r * 15.0;
            float arms = pow(max(0.0, cos(spiral)), 8.0);
            float falloff = smoothstep(0.5, 0.05, r);
            arms *= falloff;
            arms *= (1.0 - r * 1.8);
            finalGlow = core * 3.0 + arms * 1.2;
            finalColor = mix(uColor, vec3(1.0, 1.0, 1.0), core);
        } 
        else if (uType == 1) {
            // Elliptical/Uniform galaxy core and disk
            float core = exp(-r * 12.0);
            float disk = exp(-r * 5.0);
            finalGlow = core * 2.5 + disk * 0.8;
            finalGlow *= smoothstep(0.5, 0.1, r);
            finalColor = mix(uColor, vec3(1.0, 1.0, 1.0), core);
        }
        else {
            // Edge-on view with a bulbous center and thin disk
            // Squeeze Y coordinate for the disk
            float squeezedR = length(uv * vec2(1.0, 5.0));
            float disk = exp(-squeezedR * 4.0);
            // Bulbous center
            float bulb = exp(-length(uv * vec2(2.5, 2.5)) * 12.0);
            finalGlow = bulb * 3.0 + disk * 1.0;
            finalGlow *= smoothstep(0.5, 0.1, abs(uv.x));
            finalColor = mix(uColor, vec3(1.0, 1.0, 1.0), bulb);
        }
        
        if (finalGlow < 0.01) discard;
        
        gl_FragColor = vec4(finalColor, finalGlow * opacity);
    }
`;

/**
 * Data structure defining a single galaxy instance
 */
export interface GalaxyData {
  position: Vector3
  color: Color
  size: number
  rotation?: Euler
  type: number // 0: spiral, 1: elliptical, 2: edge-on
}

/**
 * Galaxies component
 *
 * Renders a collection of procedurally generated distant galaxies.
 *
 * @param props - Component properties containing an array of galaxy data
 */
export function Galaxies({ data }: { data: GalaxyData[] }) {
  if (!data || data.length === 0) {
    return null;
  }

  return (
    <group layers={1}>
      {data.map((g, i) => (
        <mesh key={i} position={g.position} layers={1} rotation={g.rotation || new Euler(0, 0, 0)}>
          <planeGeometry args={[g.size, g.size]} />
          <shaderMaterial
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            side={DoubleSide}
            vertexShader={galaxyVertexShader}
            fragmentShader={galaxyFragmentShader}
            uniforms={{
              opacity: { value: 0.4 }, // reduced luminance
              uColor: { value: g.color },
              uType: { value: g.type },
            }}
          />
        </mesh>
      ))}
    </group>
  );
}
