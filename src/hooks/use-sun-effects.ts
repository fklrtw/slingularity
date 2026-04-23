import { useFrame } from '@react-three/fiber';
import type React from 'react';
import { useRef } from 'react';
import type { MeshBasicMaterial } from 'three';
import { Color, type Mesh, type PointLight, ShaderMaterial, MathUtils } from 'three';
import { SUN_CORE_SIZE, SUN_LIGHT, SUN_GLOW_LAYERS } from '../entities/sun.config';
import { useGameStore } from '../store';
import type { Scale } from 'chroma-js';

/**
 * Returns the color of the sun based on its expansion percentage (0-100)
 */
export function getSunColor(percent: number, sunColorScale: Scale): string {
  return sunColorScale(Math.min(100, Math.max(0, percent)) / 100).hex();
}

/**
 * Properties for the useSunEffects hook.
 */
export interface UseSunEffectsProps {
  lightRef: React.RefObject<PointLight | null>
  coreRef: React.RefObject<Mesh | null>
  glowRefs: React.RefObject<(Mesh | null)[]>
  sunColorScale: Scale
}

/**
 * Manages the visual state and growth presentation of the central sun
 *
 * It syncs the store's sunRadius to the 3d model scale and point light distance,
 * updates procedural shader uniforms (time/color), and handles expansion-based
 * color transitions.
 * @param props - hook properties including geometry refs and color scale
 */
export function useSunEffects({
  lightRef,
  coreRef,
  glowRefs,
  sunColorScale,
}: UseSunEffectsProps) {
  const visualRadiusRef = useRef<number>(0);
  const resetCounter = useGameStore(s => s.resetCounter);
  const prevResetCounterRef = useRef(resetCounter);

  useFrame((state, delta) => {
    // pause sun visuals if menu is open
    if (useGameStore.getState().settingsMenuOpen || useGameStore.getState().creditsMenuOpen) {
      return;
    }

    // Access store directly to avoid re-renders
    const { sunRadius, lastPlanetDist, sunRemnant, sunStatus } = useGameStore.getState();

    // Reset visual radius instantly on level change or game reset
    if (resetCounter !== prevResetCounterRef.current) {
      visualRadiusRef.current = sunRadius;
      prevResetCounterRef.current = resetCounter;
    }

    let targetRadius = sunRadius;
    if (sunStatus === 'remnant' && sunRemnant) {
      if (sunRemnant === 'white-dwarf') {
        targetRadius = SUN_CORE_SIZE * 0.2;
      } else if (sunRemnant === 'neutron-star') {
        targetRadius = SUN_CORE_SIZE * 0.05;
      } else if (sunRemnant === 'black-hole') {
        targetRadius = SUN_CORE_SIZE * 0.1;
      }
    }

    if (visualRadiusRef.current === 0) {
      visualRadiusRef.current = targetRadius;
    } else if (sunStatus === 'collapsing' || sunStatus === 'remnant' || sunStatus === 'supernova_flash') {
      const isSupernova = sunStatus === 'supernova_flash';
      const lerpSpeed = isSupernova ? 15.0 : (sunStatus === 'remnant' ? 5.0 : 15.0);
      visualRadiusRef.current = MathUtils.lerp(visualRadiusRef.current, targetRadius, delta * lerpSpeed);
    } else {
      // Direct sync for expansion phases to prevent visual lag
      visualRadiusRef.current = targetRadius;
    }

    const displayRadius = visualRadiusRef.current;

    // calculate current sun color based on expansion percentage
    const percent = Math.min(100, (sunRadius / lastPlanetDist) * 100);
    let colorHex = getSunColor(percent, sunColorScale);

    if (sunStatus === 'supernova_flash') {
      colorHex = '#ffffff';
    } else if (sunStatus === 'remnant' && sunRemnant) {
      if (sunRemnant === 'white-dwarf') {
        colorHex = '#ffffff';
      } else if (sunRemnant === 'neutron-star') {
        colorHex = '#cc00ff';
      } else if (sunRemnant === 'black-hole') {
        colorHex = '#000000';
      }
    }

    const threeColor = new Color(colorHex);
    const time = performance.now() / 1000;

    // update point light
    if (lightRef.current) {
      lightRef.current.color.copy(threeColor);
      lightRef.current.distance = SUN_LIGHT.distance;

      let intensity = SUN_LIGHT.intensity;
      if (sunStatus === 'supernova_flash') {
        intensity = SUN_LIGHT.intensity * 10.0;
      } else if (sunStatus === 'remnant') {
        intensity = SUN_LIGHT.intensity * 0.05;
        if (sunRemnant === 'black-hole') {
          intensity = SUN_LIGHT.intensity * 0.01;
        }
      }
      lightRef.current.intensity = intensity;

      if (lightRef.current.shadow) {
        lightRef.current.shadow.radius = displayRadius;
      }
    }

    // update central core mesh
    if (coreRef.current) {
      coreRef.current.scale.set(displayRadius, displayRadius, displayRadius);
      if (coreRef.current.material instanceof ShaderMaterial) {
        coreRef.current.material.uniforms.uColor.value.copy(threeColor);
        coreRef.current.material.uniforms.time.value = time;
      }
    }

    // update outer glow layers
    const layers = glowRefs.current;
    layers.forEach((mesh, i) => {
      if (!mesh) {
        return;
      }
      const layerConfig = SUN_GLOW_LAYERS[i] || SUN_GLOW_LAYERS[0];
      const scale = displayRadius * (layerConfig.size / SUN_CORE_SIZE);
      mesh.scale.set(scale, scale, scale);

      let glowColor = threeColor;
      if (sunStatus === 'supernova_flash') {
        glowColor = new Color('#ffffff');
      } else if (sunStatus === 'remnant' && sunRemnant) {
        if (sunRemnant === 'white-dwarf') {
          glowColor = new Color('#aaddff');
        } else if (sunRemnant === 'neutron-star') {
          glowColor = new Color('#aa00ff');
        } else if (sunRemnant === 'black-hole') {
          glowColor = new Color('#330055');
        }
      }

      if (mesh.material instanceof ShaderMaterial) {
        mesh.material.uniforms.uColor.value.copy(glowColor);
        mesh.material.uniforms.time.value = time;
      } else if ('color' in mesh.material) {
        (mesh.material as MeshBasicMaterial).color.copy(glowColor);
      }
    });
  });
}
