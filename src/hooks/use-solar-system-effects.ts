import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { Color, type Mesh, ShaderMaterial, Vector3 } from 'three';
import { APP_SUN_POS } from '../app.config';
import {
  PLANETS_ATMOSPHERE_GLOW_ANGLE,
  PLANETS_ATMOSPHERE_GLOW_INTENSITY,
  PLANETS_RING_BASE_OPACITY,
  PLANETS_RING_INNER_RADIUS_FACTOR,
  PLANETS_RING_OUTER_RADIUS_FACTOR,
} from '../entities/planet.config';
import {
  SHOCKWAVE_ANNIHILATION_PHASE1_DURATION,
  SHOCKWAVE_ANNIHILATION_PHASE2_DURATION,
  SHOCKWAVE_ANNIHILATION_PHASE3_DURATION,
} from '../entities/shockwave.config';
import type { SystemRefData } from '../entities/solar-system';
import { useGameStore } from '../store';
import { useThemeColors } from './use-theme-colors';

/**
 * Properties for the useSolarSystemEffects hook.
 */
export interface UseSolarSystemEffectsProps {
  systemRef: React.RefObject<SystemRefData>
  meshes: React.RefObject<(Mesh | null)[]>
  rings: React.RefObject<(Mesh | null)[]>
  bands: React.RefObject<(Mesh | null)[]>
  annihilators: React.RefObject<(Mesh | null)[]>
}

// --- Scratchpad for framing (to avoid GC pressure) ---
const _v1 = new Vector3();
const _c1 = new Color();

/**
 * Manages the visual state and animations for the entire solar system
 *
 * Handles planet movement visualization, the complex three-phase annihilation
 * animation sequence, and dynamic material property updates.
 * @param props - hook properties including shared refs to system data and meshes
 */
export function useSolarSystemEffects({
  systemRef,
  meshes,
  rings,
  bands,
  annihilators,
}: UseSolarSystemEffectsProps) {
  const level = useGameStore(s => s.level);
  const resetCounter = useGameStore(s => s.resetCounter);
  const gameStarted = useGameStore(s => s.gameStarted);
  const shaderQuality = useGameStore(s => s.settings.shaders);
  const settingsMenuOpen = useGameStore(s => s.settingsMenuOpen);
  const themeColors = useThemeColors();

  // track annihilation state machine for each planet independently
  const activeAnnihilationsRef = useRef<Map<number, {
    startTime: number
    color: Color
    ringColor?: Color
    hasRings: boolean
    bandRadius: number
  }>>(new Map());

  // clear animation states on level transitions
  useEffect(() => {
    activeAnnihilationsRef.current.clear();
    annihilators.current.forEach((m) => {
      if (m) {
        m.visible = false;
      }
    });
  }, [level, resetCounter, annihilators]);

  useFrame(() => {
    if (!systemRef.current || systemRef.current.counter !== resetCounter) {
      return;
    }
    if (!gameStarted || settingsMenuOpen || useGameStore.getState().privacyMenuOpen || useGameStore.getState().creditsMenuOpen) {
      return;
    }

    const { annihilatedPlanets, annihilatedRings, sunRadius } = useGameStore.getState();

    const planets = systemRef.current.planets;
    const currentTime = performance.now() / 1000;

    planets.forEach((p, i) => {
      // skip the sun as it has its own specialized component and logic
      if (p.isSun) {
        return;
      }

      const isAnnihilated = annihilatedPlanets.has(i);

      // calculate sun influence for brightness (atmospheric heating effect)
      const distToSun = p.position.distanceTo(APP_SUN_POS);
      // influence goes from 0 to 1 as planet approaches sun surface
      const influence = Math.max(0, 1.0 - (distToSun - sunRadius) / (distToSun * 0.5));

      // --- Annihilation Trigger ---
      if (isAnnihilated && !activeAnnihilationsRef.current.has(i)) {
        const br = p.atmosphereRadius + (0.7 * 2.0);

        activeAnnihilationsRef.current.set(i, {
          startTime: currentTime,
          color: new Color(p.color),
          ringColor: p.hasRings ? new Color(p.ringColor || p.color) : undefined,
          hasRings: p.hasRings || false,
          bandRadius: br,
        });

        const m = annihilators.current[i];
        if (m) {
          m.visible = true;
          m.position.copy(p.position);
          m.scale.set(br, br, 0.01);
        }
      }

      const anim = activeAnnihilationsRef.current.get(i);
      if (anim) {
        const elapsed = currentTime - anim.startTime;
        const phase1Duration = SHOCKWAVE_ANNIHILATION_PHASE1_DURATION;
        const phase2Duration = SHOCKWAVE_ANNIHILATION_PHASE2_DURATION;
        const phase3Duration = SHOCKWAVE_ANNIHILATION_PHASE3_DURATION;

        const m = meshes.current[i];
        const r = rings.current[i];
        const a = annihilators.current[i];

        if (elapsed < phase1Duration) {
          // phase 1: collapse to core (implosion)
          const t = elapsed / phase1Duration;
          const easeIn = t * t;
          const scale = p.radius * (1.0 - easeIn);

          if (m) {
            m.scale.set(scale, scale, scale);
            if (shaderQuality === 'advanced' && m.material instanceof ShaderMaterial) {
              // mix colors and gradually increase saturation to "white hot"
              _c1.copy(anim.color);
              if (anim.ringColor) {
                _c1.lerp(anim.ringColor, 0.5);
              }
              m.material.uniforms.uColor.value.copy(_c1).offsetHSL(0, 0.6 * easeIn, 0);
            }
          }
          if (r) {
            r.scale.set(1.0 - easeIn, 1.0 - easeIn, 1);
            if (shaderQuality === 'advanced' && r.material instanceof ShaderMaterial) {
              r.material.uniforms.uColor.value.offsetHSL(0, 0.6 * easeIn, 0);
            }
          }
          if (a) {
            a.visible = false;
          }
        } else if (elapsed < phase1Duration + phase2Duration) {
          // phase 2: paint atmosphere outwards (shockwave rushing over)
          if (m) {
            m.visible = false;
          }
          if (r) {
            r.visible = false;
          }
          const t = (elapsed - phase1Duration) / phase2Duration;
          if (a) {
            a.visible = true;
            if (shaderQuality === 'advanced' && a.material instanceof ShaderMaterial) {
              a.material.uniforms.uProgress.value = t;
              _c1.copy(anim.color);
              if (anim.ringColor) {
                _c1.lerp(anim.ringColor, 0.5);
              }
              a.material.uniforms.uColor.value.copy(_c1);
              a.material.uniforms.uOpacity.value = 1.0;
            }
          }
        } else {
          // phase 3: fast fade (easing out of the plasma residue)
          const t = Math.min(1.0, (elapsed - phase1Duration - phase2Duration) / phase3Duration);
          const easeOut = 1.0 - Math.pow(1.0 - t, 3);
          if (a) {
            a.visible = true;
            if (shaderQuality === 'advanced' && a.material instanceof ShaderMaterial) {
              a.material.uniforms.uProgress.value = 1.0;
              a.material.uniforms.uOpacity.value = 1.0 - easeOut;
            }
          }
          if (t >= 1.0 && a) {
            a.visible = false;
          }
        }
        const band = bands.current[i];
        if (band) {
          band.visible = false;
        }
      } else {
        // --- Normal Rendering Mode ---
        const mesh = meshes.current[i];
        if (mesh) {
          mesh.position.copy(p.position);
          mesh.scale.set(p.radius, p.radius, p.radius);

          // combine initial starting rotation with ongoing movement
          const currentRot = (p.initialRotation || 0) + (p.rotationSpeed || 0) * currentTime;
          mesh.rotation.z = currentRot;

          mesh.visible = true;
          if (shaderQuality === 'advanced' && mesh.material instanceof ShaderMaterial) {
            const mat = mesh.material;
            mat.uniforms.uColor.value.set(p.color);
            mat.uniforms.uSunPos.value.copy(APP_SUN_POS);
            mat.uniforms.uSunInfluence.value = influence;
            mat.uniforms.uRotation.value = currentRot;
            mat.uniforms.uLightRotation.value = p.lightOrientation || 0;
          } else if ('color' in mesh.material) {
            (mesh.material as MeshBasicMaterial | MeshStandardMaterial).color.set(p.color as string);
          }
        }
        const ring = rings.current[i];
        if (ring) {
          ring.position.copy(p.position);
          if (p.ringRotation) {
            ring.rotation.set(p.ringRotation[0], p.ringRotation[1], p.ringRotation[2]);
          }
          const outerR = p.ringOuterRadius || p.radius * PLANETS_RING_OUTER_RADIUS_FACTOR;
          const innerR = p.ringInnerRadius || p.radius * PLANETS_RING_INNER_RADIUS_FACTOR;
          ring.scale.set(outerR, outerR, 1);
          ring.visible = !annihilatedRings.has(i) && p.hasRings === true;

          if (shaderQuality === 'advanced' && ring.material instanceof ShaderMaterial) {
            const rMat = ring.material;
            rMat.uniforms.uColor.value.set(p.ringColor || p.color);
            rMat.uniforms.opacity.value = PLANETS_RING_BASE_OPACITY;

            rMat.uniforms.uInnerFade.value = innerR / outerR;
            rMat.uniforms.uOuterFade.value = 1.0;
          } else if ('color' in ring.material) {
            (ring.material as MeshBasicMaterial | MeshStandardMaterial).color.set((p.ringColor || p.color) as string);
          }
        }
        const band = bands.current[i];
        if (band) {
          band.position.copy(p.position);
          const rSize = p.atmosphereRadius + (0.7 * 2.0);
          band.scale.set(rSize, rSize, 1);
          band.visible = true;

          if (shaderQuality === 'advanced' && band.material instanceof ShaderMaterial) {
            const bMat = band.material;
            bMat.uniforms.uColor.value.set(p.atmosphereColor || themeColors.textMain.getStyle());
            _v1.subVectors(APP_SUN_POS, p.position).normalize();
            bMat.uniforms.uSunDir.value = [_v1.x, _v1.y];
            bMat.uniforms.uGlowAngle.value = PLANETS_ATMOSPHERE_GLOW_ANGLE;
            bMat.uniforms.uGlowIntensity.value = PLANETS_ATMOSPHERE_GLOW_INTENSITY;
          } else if ('color' in band.material) {
            (band.material as MeshBasicMaterial | MeshStandardMaterial).color.set(p.atmosphereColor || themeColors.textMain.getStyle());
          }
        }
      }
    });
  });
}
