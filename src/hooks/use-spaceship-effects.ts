import { useFrame } from '@react-three/fiber';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Quaternion, type Group, type Mesh, MeshStandardMaterial, ShaderMaterial, type Object3D, Vector3 } from 'three';
import { GAME_OVER_SCREEN_TRANSITION_DIE_DELAY } from '../components/ui/game-over-screen.config';
import { SHOCKWAVE_MAX_SCALE, SHOCKWAVE_EXPANSION_SPEED } from '../entities/shockwave.config';
import type { SystemRefData } from '../entities/solar-system';
import { SOLAR_SYSTEM_DT_MAX } from '../entities/solar-system.config';
import {
  SPACESHIP_SPEED_MULTIPLIER,
  SPACESHIP_BOOST_EFFECT_DURATION,
  SPACESHIP_BOOST_EMISSIVE_MULT,
  SPACESHIP_BOOST_SCALE_MULT,
  SPACESHIP_EMISSIVE_INTENSITY,
  SPACESHIP_ORIENTATION_THRESHOLD,
  SPACESHIP_ORBIT_ROTATION_SMOOTHING,
  SPACESHIP_STEER_ROTATION_SPEED,
} from '../entities/spaceship.config';
import { useGameStore } from '../store';
import { APP_SUN_POS } from '../app.config';

/**
 * Properties for the useSpaceshipEffects hook.
 */
export interface UseSpaceshipEffectsProps {
  posRef: React.RefObject<Vector3>
  velRef: React.RefObject<Vector3>
  systemRef: React.RefObject<SystemRefData>
  spaceshipRef: React.RefObject<Mesh | null>
  currentOrbitRadiusRef: React.RefObject<number | null>
  triggerBoostRef: React.RefObject<boolean>
  resetCounter: number
}

interface CachedMaterialItem {
  material: ShaderMaterial | MeshStandardMaterial
  isShader: boolean
}

// --- Scratchpad Vectors (to avoid GC allocations in hot paths) ---
const _v1 = new Vector3();
const _vDir = new Vector3();
const tempQuat = new Quaternion();
const upVec = new Vector3(0, 1, 0);

/**
 * Manages the transient visual indicators and presentation logic for the spaceship
 *
 * This includes managing annihilation beams, death shockwaves, trail layers,
 * and dynamic transform (position/rotation/scale) updates for the spaceship model.
 * @param props - hook properties including physical refs and store selectors
 */
export function useSpaceshipEffects({
  posRef,
  velRef,
  systemRef,
  spaceshipRef,
  currentOrbitRadiusRef,
  triggerBoostRef,
  resetCounter,
}: UseSpaceshipEffectsProps) {
  const shockwaveRef = useRef<Mesh>(null);
  const spaceshipMeshRef = useRef<Mesh | null>(null);
  const trailRef = useRef<Group>(null);
  const boostTimerRef = useRef(0);

  const cachedMaterialsRef = useRef<CachedMaterialItem[]>([]);
  const lastProcessedMeshRef = useRef<Mesh | null>(null);

  const [laserPoints, setLaserPoints] = useState<[Vector3, Vector3] | null>(null);

  const gameStarted = useGameStore(s => s.gameStarted);
  const isDying = useGameStore(s => s.isDying);
  const isFinishing = useGameStore(s => s.isFinishing);
  const gameOver = useGameStore(s => s.gameOver);
  const levelFinished = useGameStore(s => s.levelFinished);
  const laserEvent = useGameStore(s => s.laserEvent);

  const lastLaserEventRef = useRef(laserEvent);
  const prevGameStartedRef = useRef(gameStarted);

  // trigger boost visual on mission start
  useEffect(() => {
    if (gameStarted && !prevGameStartedRef.current && !isDying && !isFinishing) {
      boostTimerRef.current = SPACESHIP_BOOST_EFFECT_DURATION;
    }
    prevGameStartedRef.current = gameStarted;
  }, [gameStarted, isDying, isFinishing]);

  // manage laser beam visualization
  useEffect(() => {
    if (laserEvent && laserEvent !== lastLaserEventRef.current) {
      lastLaserEventRef.current = laserEvent;
      const targetPlanet = systemRef.current.planets[laserEvent.targetIndex];
      if (targetPlanet && spaceshipRef.current) {
        setLaserPoints([spaceshipRef.current.position.clone(), targetPlanet.position.clone()]);
        const timer = setTimeout(() => setLaserPoints(null), 150);
        return () => clearTimeout(timer);
      }
    }
  }, [laserEvent, systemRef, spaceshipRef]);

  // ensure trail is on the correct layer for rendering
  useEffect(() => {
    if (trailRef.current) {
      trailRef.current.traverse((obj: Object3D) => {
        if (obj.layers) {
          obj.layers.set(1);
        }
      });
    }
  }, [resetCounter]);

  // reset shockwave visuals
  useEffect(() => {
    if (!gameOver && !isDying && shockwaveRef.current) {
      shockwaveRef.current.visible = false;
      const mat = shockwaveRef.current.material as MeshStandardMaterial;
      if (mat && mat.opacity !== undefined) {
        mat.opacity = 1.0;
      }
      shockwaveRef.current.scale.set(1, 1, 1);
    }
  }, [gameOver, levelFinished, isDying]);

  useFrame((state, delta) => {
    if (!systemRef.current || systemRef.current.counter !== resetCounter) {
      return;
    }

    // pause visual effects if menu is open
    const gameStoreState = useGameStore.getState();
    if (gameStoreState.settingsMenuOpen || gameStoreState.privacyMenuOpen || gameStoreState.creditsMenuOpen) {
      return;
    }

    const { isStarting, orbitingPlanetIndex, sunRadius } = gameStoreState;

    const currentPos = posRef.current;
    const currentVel = velRef.current;
    const planets = systemRef.current.planets;

    // handle death sequence visuals
    if ((isDying || gameOver) && shockwaveRef.current) {
      const actualDelta = Math.min(delta, SOLAR_SYSTEM_DT_MAX);
      const dt = actualDelta * SPACESHIP_SPEED_MULTIPLIER;
      const sw = shockwaveRef.current;

      if (!sw.visible) {
        sw.position.copy(currentPos);
        sw.visible = true;
      }
      sw.scale.addScaledVector(_v1.set(1, 1, 1), dt * SHOCKWAVE_MAX_SCALE * SHOCKWAVE_EXPANSION_SPEED);
      const mat = sw.material as MeshStandardMaterial;
      if (mat && mat.opacity !== undefined) {
        mat.opacity = Math.max(0, mat.opacity - actualDelta / GAME_OVER_SCREEN_TRANSITION_DIE_DELAY);
      }
      if (spaceshipRef.current) {
        spaceshipRef.current.visible = false;
      }
    } else if (spaceshipRef.current) {
      // manage ship visibility
      if (levelFinished || isFinishing) {
        spaceshipRef.current.visible = false;
      } else if (isStarting) {
        spaceshipRef.current.visible = gameStarted;
      } else {
        spaceshipRef.current.visible = true;
      }
    }

    // handle presentation effects during active gameplay
    if (!((levelFinished && !isFinishing) || (gameOver && !isDying) || !gameStarted || isDying)) {
      if (triggerBoostRef.current) {
        boostTimerRef.current = SPACESHIP_BOOST_EFFECT_DURATION;
        triggerBoostRef.current = false;
      }

      if (spaceshipRef.current) {
        // sync physical position to the 3d model
        spaceshipRef.current.position.copy(currentPos);

        // update orientation based on velocity direction
        if (currentVel.lengthSq() > SPACESHIP_ORIENTATION_THRESHOLD) {
          if (orbitingPlanetIndex !== null && planets[orbitingPlanetIndex]) {
            // point forward relative to orbiting body motion
            _vDir.copy(currentVel).sub(planets[orbitingPlanetIndex].velocity).normalize();
          } else {
            _vDir.copy(currentVel).normalize();
          }
          tempQuat.setFromUnitVectors(upVec, _vDir);
          const rotationSmoothing = orbitingPlanetIndex !== null ? SPACESHIP_ORBIT_ROTATION_SMOOTHING : SPACESHIP_STEER_ROTATION_SPEED;
          spaceshipRef.current.quaternion.slerp(tempQuat, rotationSmoothing);
        }

        // update boost and atmosphere presentation (scale/glow)
        let emissiveValue: number;

        if (boostTimerRef.current > 0) {
          boostTimerRef.current -= delta;
          const progress = boostTimerRef.current / SPACESHIP_BOOST_EFFECT_DURATION;
          const scale = 1.0 + Math.sin(progress * Math.PI) * (SPACESHIP_BOOST_SCALE_MULT - 1.0);
          spaceshipRef.current.scale.set(scale, scale, scale);
          emissiveValue = SPACESHIP_EMISSIVE_INTENSITY + progress * SPACESHIP_BOOST_EMISSIVE_MULT;
        } else {
          spaceshipRef.current.scale.set(1, 1, 1);

          let warmingGlow = 0;
          if (orbitingPlanetIndex !== null && currentOrbitRadiusRef.current !== null) {
            const p = planets[orbitingPlanetIndex];
            if (p) {
              const bandDist = p.atmosphereRadius;
              const crashDist = p.crashRadius;
              const depthFactor = Math.max(0, Math.min(1, (bandDist - currentOrbitRadiusRef.current) / (bandDist - crashDist)));
              warmingGlow = depthFactor * 2.0;
            }
          }
          emissiveValue = SPACESHIP_EMISSIVE_INTENSITY + warmingGlow;
        }

        // Apply visual updates to the model's materials
        if (spaceshipMeshRef.current) {
          // rebuild cache if spaceship mesh reference has changed
          if (spaceshipMeshRef.current !== lastProcessedMeshRef.current) {
            lastProcessedMeshRef.current = spaceshipMeshRef.current;
            const newCache: CachedMaterialItem[] = [];
            spaceshipMeshRef.current.traverse((child) => {
              const mesh = child as Mesh;
              if (mesh.isMesh && mesh.material) {
                const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                for (const mat of materials) {
                  if (mat instanceof ShaderMaterial) {
                    newCache.push({ material: mat, isShader: true });
                  } else if (mat instanceof MeshStandardMaterial) {
                    newCache.push({ material: mat, isShader: false });
                  }
                }
              }
            });
            cachedMaterialsRef.current = newCache;
          }

          // calculate sun influence for brightness (atmospheric heating effect)
          const distToSun = currentPos.distanceTo(APP_SUN_POS);
          const influence = Math.max(0, 1.0 - (distToSun - sunRadius) / (distToSun * 0.5));

          // apply dynamic uniform updates to cached materials
          const cached = cachedMaterialsRef.current;
          for (let i = 0; i < cached.length; i++) {
            const item = cached[i];
            if (item.isShader) {
              const mat = item.material as ShaderMaterial;
              mat.uniforms.uEmissiveIntensity.value = emissiveValue;
              mat.uniforms.uSunInfluence.value = influence;
              mat.uniforms.uSunPos.value.copy(APP_SUN_POS);
              mat.uniforms.uCameraPos.value.copy(state.camera.position);
            } else {
              const mat = item.material as MeshStandardMaterial;
              mat.emissiveIntensity = emissiveValue;
            }
          }
        }
      }
    }
  }, -2);

  return {
    shockwaveRef,
    spaceshipMeshRef,
    trailRef,
    laserPoints,
  };
}
