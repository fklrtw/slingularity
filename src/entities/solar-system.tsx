import React, { useEffect, useMemo, useRef } from 'react';
import type { Mesh } from 'three';
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  CircleGeometry,
  ShaderMaterial,
  SphereGeometry,
  DodecahedronGeometry,
  UniformsLib,
  UniformsUtils,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import { APP_SUN_POS } from '../app.config';
import { useSolarSystemEffects } from '../hooks/use-solar-system-effects';
import { useThemeColors } from '../hooks/use-theme-colors';
import { useGameStore } from '../store';
import {
  atmosphereFragmentShader,
  paintFragmentShader,
  type CelestialBodyData,
  planetFragmentShader,
  planetVertexShader,
  planeVertexShader,
  atmosphereVertexShader,
  ringFragmentShader,
} from './planet';
import {
  PLANETS_ATMOSPHERE_GLOW_INTENSITY,
  PLANETS_RING_OPACITY,
} from './planet.config';
import { CometTail } from './comet-tail';

/**
 * synchronized container for system-wide data used across physics and rendering.
 */
export interface SystemRefData {
  /** array of all active and Annihilated planets in the current level */
  planets: CelestialBodyData[]
  /** total distance from sun to level objective */
  portalDist: number
  /** world position of the level finish portal */
  portalPosition: Vector3
  /** launch parameters for the Spaceship in the current level */
  shipParams: { pos: Vector3, vel: Vector3, dir: number }
  /** counter used to detect mission restarts and sync object pools */
  counter: number
}

interface SolarSystemProps {
  systemData: SystemRefData
  systemRef: React.RefObject<SystemRefData>
}

/**
 * SolarSystem view component
 *
 * optimized with persistent material pools to prevent GC pressure during high-frequency updates.
 * @param props - includes initial system data and the physics reference
 */
export function SolarSystem({ systemData, systemRef }: SolarSystemProps) {
  const resetCounter = useGameStore(s => s.resetCounter);
  const annihilatedPlanets = useGameStore(s => s.annihilatedPlanets);
  const shaderQuality = useGameStore(s => s.settings.shaders);
  const detailLevel = useGameStore(s => s.settings.detailLevel);
  const themeColors = useThemeColors();

  const meshes = useRef<(Mesh | null)[]>([]);
  const rings = useRef<(Mesh | null)[]>([]);
  const bands = useRef<(Mesh | null)[]>([]);
  const annihilators = useRef<(Mesh | null)[]>([]);

  const segments = detailLevel === 'high' ? 32 : (detailLevel === 'medium' ? 24 : 16);
  const sharedSphereGeo = useMemo(() => new SphereGeometry(1, segments, segments), [segments]);
  const sharedCircleGeo = useMemo(() => new CircleGeometry(1, segments), [segments]);
  const sharedCometGeo = useMemo(() => new DodecahedronGeometry(1, detailLevel === 'high' ? 1 : 0), [detailLevel]);

  const materialPool = useMemo(() => {
    if (shaderQuality === 'off') {
      return {
        planet: new MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
        ring: new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: PLANETS_RING_OPACITY, toneMapped: false }),
        band: new MeshBasicMaterial({ color: themeColors.themePrimarySoft, transparent: true, blending: AdditiveBlending, opacity: 0.1, toneMapped: false }),
        annihilator: new MeshBasicMaterial({
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
          opacity: 0.5,
          visible: false,
          toneMapped: false,
        }),
      };
    }

    if (shaderQuality === 'basic') {
      return {
        planet: new MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.2, toneMapped: false }),
        ring: new MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: PLANETS_RING_OPACITY, roughness: 0.9, metalness: 0.1, side: DoubleSide, toneMapped: false }),
        band: new MeshBasicMaterial({ color: themeColors.themePrimarySoft, transparent: true, blending: AdditiveBlending, opacity: 0.2, toneMapped: false }),
        annihilator: new MeshBasicMaterial({
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
          opacity: 0.5,
          visible: false,
          toneMapped: false,
        }),
      };
    }

    return {
      planet: new ShaderMaterial({
        lights: true,
        toneMapped: false,
        uniforms: UniformsUtils.merge([
          UniformsLib.lights,
          {
            uColor: { value: new Color(0xffffff) },
            uSunPos: { value: APP_SUN_POS.clone() },
            uSunInfluence: { value: 0 },
            uRotation: { value: 0 },
            uLightRotation: { value: 0 },
            vViewDir: { value: new Vector3() },
          }
        ]),
        vertexShader: planetVertexShader,
        fragmentShader: planetFragmentShader,
      }),
      ring: new ShaderMaterial({
        lights: true,
        transparent: true,
        side: DoubleSide,
        depthWrite: false,
        toneMapped: false,
        uniforms: UniformsUtils.merge([
          UniformsLib.lights,
          {
            uColor: { value: new Color(0xffffff) },
            opacity: { value: 1.0 },
            uInnerFade: { value: 0.1 },
            uOuterFade: { value: 1.0 },
          }
        ]),
        vertexShader: atmosphereVertexShader,
        fragmentShader: ringFragmentShader,
      }),
      band: new ShaderMaterial({
        lights: true,
        transparent: true,
        blending: AdditiveBlending,
        side: DoubleSide,
        depthWrite: false,
        toneMapped: false,
        uniforms: UniformsUtils.merge([
          UniformsLib.lights,
          {
            uColor: { value: new Color(themeColors.themePrimarySoft) },
            uSunDir: { value: [1.0, 0.0] },
            uGlowAngle: { value: 90.0 },
            uGlowIntensity: { value: PLANETS_ATMOSPHERE_GLOW_INTENSITY },
          }
        ]),
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
      }),
      annihilator: new ShaderMaterial({
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uColor: { value: new Color(0xffffff) },
          uProgress: { value: 0 },
          uOpacity: { value: 1.0 },
        },
        vertexShader: planeVertexShader,
        fragmentShader: paintFragmentShader,
      }),
    };
  }, [themeColors.themePrimarySoft, shaderQuality]);

  // pre-allocate per-planet materials to avoid clone() in the render path
  const perPlanetMaterials = useMemo(() => {
    return systemData.planets.map((_, i) => {
      if (i === 0) {
        return null; // skip sun (index 0)
      }
      return {
        planet: materialPool.planet.clone(),
        ring: materialPool.ring.clone(),
        band: materialPool.band.clone(),
        annihilator: materialPool.annihilator.clone(),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemData.planets.length, materialPool]);

  // dispose old materials when the pool changes
  useEffect(() => {
    return () => {
      for (const m of perPlanetMaterials) {
        if (m) {
          m.planet.dispose();
          m.ring.dispose();
          m.band.dispose();
          m.annihilator.dispose();
        }
      }
    };
  }, [perPlanetMaterials]);

  // delegate all visual state management to the simulation hook
  useSolarSystemEffects({
    systemRef,
    meshes,
    rings,
    bands,
    annihilators,
  });

  const planets = (systemData && systemData.counter === resetCounter) ? systemData.planets : [];

  return (
    <group>
      {planets.map((p, i) => i > 0 && (
        <group key={`${resetCounter}-${p.id}`}>
          {p.isComet && (
            <>
              <mesh
                ref={(el) => {
                  meshes.current[i] = el;
                }}
                geometry={sharedCometGeo}
                material={perPlanetMaterials[i]!.planet}
                castShadow
                receiveShadow
              />
              <CometTail
                cometPosition={p.position}
                cometVelocity={p.velocity}
                cometRadius={p.radius}
                isAnnihilated={annihilatedPlanets.has(i)}
                color={themeColors.themePrimarySoft}
              />
            </>
          )}
          {!p.isComet && (
            <mesh
              ref={el => meshes.current[i] = el}
              geometry={sharedSphereGeo}
              material={perPlanetMaterials[i]!.planet}
              castShadow
              receiveShadow
            />
          )}
          {p.hasRings && (
            <mesh
              ref={el => rings.current[i] = el}
              geometry={sharedCircleGeo}
              material={perPlanetMaterials[i]!.ring}
              receiveShadow
            />
          )}
          <mesh ref={el => bands.current[i] = el} geometry={sharedCircleGeo} material={perPlanetMaterials[i]!.band} receiveShadow />
          <mesh
            ref={el => annihilators.current[i] = el}
            geometry={sharedCircleGeo}
            visible={false}
            material={perPlanetMaterials[i]!.annihilator}
          />
        </group>
      ))}
    </group>
  );
}
