import React, { useMemo, useRef } from 'react';
import type { Mesh, PointLight } from 'three';
import { AdditiveBlending, Color, DoubleSide, SphereGeometry, CircleGeometry } from 'three';
import { APP_SUN_POS } from '../app.config';
import { useSunEffects } from '../hooks/use-sun-effects';
import { useThemeColors } from '../hooks/use-theme-colors';
import { useGameStore } from '../store';
import {
  SUN_GLOW_LAYERS,
  SUN_GLOW_SHADER,
  SUN_LIGHT,
  SUN_SHADER,
} from './sun.config';

/**
 * Sun vertex shader
 */
export const sunVertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
        vUv = uv;
        vPosition = position;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

/**
 * Sun fragment shader
 */
export const sunFragmentShader = `
    uniform vec3 uColor;
    uniform float time;
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vViewDir;

    void main() {
        // Create a more organic, fluid pattern by mixing coordinates
        float noise1 = sin(vPosition.y * ${SUN_SHADER.band1_freq.toFixed(1)} + time * ${SUN_SHADER.band1_speed.toFixed(1)});
        float noise2 = sin(vPosition.x * ${SUN_SHADER.band2_freq.toFixed(1)} + vPosition.y * 0.5 - time * ${SUN_SHADER.band2_speed.toFixed(2)});
        
        float pattern1 = noise1 * 0.5 + 0.5;
        float pattern2 = noise2 * 0.5 + 0.5;
        
        float s1 = smoothstep(${SUN_SHADER.step1.toFixed(2)} - 0.2, ${SUN_SHADER.step1.toFixed(2)} + 0.2, pattern1);
        float s2 = smoothstep(${SUN_SHADER.step2.toFixed(2)} - 0.15, ${SUN_SHADER.step2.toFixed(2)} + 0.15, pattern2);
        
        vec3 finalColor = mix(uColor, uColor * ${SUN_SHADER.shade1.toFixed(2)}, s1);
        finalColor = mix(finalColor, vec3(1.0, 1.0, 0.7) * uColor, s2 * ${SUN_SHADER.shade2.toFixed(1)});
        
        float fresnel = pow(1.0 - max(0.0, dot(vNormal, vViewDir)), ${SUN_SHADER.rim_pow.toFixed(1)});
        vec3 rimColor = mix(uColor, vec3(1.0), 0.4);
        vec3 rim = rimColor * smoothstep(${SUN_SHADER.rim_step.toFixed(2)} - 0.15, ${SUN_SHADER.rim_step.toFixed(2)} + 0.15, fresnel) * ${SUN_SHADER.rim_mult.toFixed(1)};
        
        gl_FragColor = vec4(finalColor + rim, 1.0);
    }
`;

/**
 * Sun glow fragment shader
 */
export const glowFragmentShader = `
    uniform vec3 uColor;
    uniform float time;
    uniform float opacity;
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
        float pulse = sin(time * ${SUN_GLOW_SHADER.pulse_speed.toFixed(1)}) * ${SUN_GLOW_SHADER.pulse_intensity.toFixed(2)} + ${SUN_GLOW_SHADER.pulse_base.toFixed(2)};
        
        // Radial falloff for 2D circles
        float dist = length(vPosition.xy);
        float falloff = smoothstep(1.0, 0.0, dist);
        
        // Higher power for smoother, more atmospheric glow transition
        float glow = pow(falloff, 1.5);

        gl_FragColor = vec4(uColor * ${SUN_GLOW_SHADER.bloom_multiplier.toFixed(1)}, opacity * glow * pulse);
    }
`;

/**
 * Sun entity component
 *
 * Manages the central celestial body's visuals, including its expanding core and luminance rings (glow layers).
 */
export function Sun() {
  const lightRef = useRef<PointLight>(null);
  const coreRef = useRef<Mesh>(null);
  const glowRefs = useRef<(Mesh | null)[]>([]);
  const themeColors = useThemeColors();
  const shaderQuality = useGameStore(s => s.settings.shaders);
  const detailLevel = useGameStore(s => s.settings.detailLevel);
  const sunRemnant = useGameStore(s => s.sunRemnant);
  const sunStatus = useGameStore(s => s.sunStatus);

  const sharedSphereGeo = useMemo(() => {
    const segments = detailLevel === 'high' ? 128 : (detailLevel === 'medium' ? 64 : 32);
    const geo = new SphereGeometry(1, segments, segments);
    geo.computeBoundingSphere();
    if (geo.boundingSphere) {
      geo.boundingSphere.radius = 10000;
    }
    return geo;
  }, [detailLevel]);

  const sharedCircleGeo = useMemo(() => {
    const segments = detailLevel === 'high' ? 128 : (detailLevel === 'medium' ? 64 : 32);
    const geo = new CircleGeometry(1, segments);
    geo.computeBoundingSphere();
    if (geo.boundingSphere) {
      geo.boundingSphere.radius = 10000;
    }
    return geo;
  }, [detailLevel]);

  // pre-calculate uniforms to avoid object re-creation
  const coreUniforms = useMemo(() => {
    let color: string | Color = themeColors.themeHighlight;
    if (sunRemnant === 'white-dwarf') {
      color = '#ffffff';
    } else if (sunRemnant === 'neutron-star') {
      color = '#cc00ff';
    } else if (sunRemnant === 'black-hole') {
      color = '#000000';
    }

    return {
      uColor: { value: new Color(color) },
      time: { value: 0 },
    };
  }, [themeColors.themeHighlight, sunRemnant]);

  const glowUniformsList = useMemo(() => SUN_GLOW_LAYERS.map((layer) => {
    let color: string | Color = themeColors.themeHighlight;
    if (sunRemnant === 'white-dwarf') {
      color = '#aaddff';
    } else if (sunRemnant === 'neutron-star') {
      color = '#aa00ff';
    } else if (sunRemnant === 'black-hole') {
      color = '#330055'; // Dark purple/black hole accretion disk
    }

    return {
      uColor: { value: new Color(color) },
      time: { value: 0 },
      opacity: { value: layer.opacity },
    };
  }), [themeColors.themeHighlight, sunRemnant]);

  // delegate visual logic to hook
  useSunEffects({
    lightRef,
    coreRef,
    glowRefs,
    sunColorScale: themeColors.sunColorScale,
  });

  return (
    <group position={APP_SUN_POS}>
      <pointLight
        ref={lightRef}
        intensity={SUN_LIGHT.intensity}
        color={themeColors.themeHighlight}
        decay={SUN_LIGHT.decay}
        distance={SUN_LIGHT.distance}
        castShadow
        shadow-mapSize={[SUN_LIGHT.shadowMapSize, SUN_LIGHT.shadowMapSize]}
        shadow-camera-near={SUN_LIGHT.shadowCameraNear}
        shadow-camera-far={SUN_LIGHT.shadowCameraFar}
        shadow-bias={SUN_LIGHT.shadowBias}
      />

      <mesh
        ref={coreRef}
        geometry={sharedSphereGeo}
      >
        {(() => {
          if (shaderQuality !== 'off') {
            return (
              <shaderMaterial
                uniforms={coreUniforms}
                vertexShader={sunVertexShader}
                fragmentShader={sunFragmentShader}
                precision={detailLevel === 'high' ? 'highp' : 'mediump'}
                toneMapped={false}
              />
            );
          }
          return <meshBasicMaterial color={themeColors.themeHighlight} toneMapped={false} />;
        })()}
      </mesh>

      {/* luminance rings (atmospheric glow layers) */}
      {SUN_GLOW_LAYERS.map((layer, i) => {
        return (
          <mesh
            key={i}
            ref={el => glowRefs.current[i] = el}
            geometry={sharedCircleGeo}
          >
            {/* eslint-disable-next-line @stylistic/multiline-ternary */}
            {shaderQuality === 'advanced' ? (
              <shaderMaterial
                transparent
                depthWrite={false}
                blending={AdditiveBlending}
                side={DoubleSide}
                uniforms={glowUniformsList[i]}
                vertexShader={sunVertexShader}
                fragmentShader={glowFragmentShader}
                precision={detailLevel === 'high' ? 'highp' : 'mediump'}
                toneMapped={false}
              />
            ) : (
              <meshBasicMaterial
                color={themeColors.themeHighlight}
                transparent
                opacity={layer.opacity}
                blending={AdditiveBlending}
                depthWrite={false}
                side={DoubleSide}
                toneMapped={false}
              />
            )}
          </mesh>
        );
      })}

      {/* Brilliant system-wide flash overlay for supernova */}
      {sunStatus === 'supernova_flash' && (
        <mesh renderOrder={10000}>
          <circleGeometry args={[10000, 32]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={1}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}
