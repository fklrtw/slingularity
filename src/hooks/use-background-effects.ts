import { useFrame, useThree } from '@react-three/fiber';
import type React from 'react';
import { useEffect, useState, useRef, useMemo } from 'react';
import type { Group, ShaderMaterial, BufferGeometry } from 'three';
import { Vector3, Color, Euler, BufferGeometry as THREE_BufferGeometry, Float32BufferAttribute } from 'three';
import { useGameStore } from '../store';
import {
  BACKGROUND_CELESTIAL_DATA_SCALE,
  BACKGROUND_DEPTH_STARS,
  BACKGROUND_DEPTH_CONSTELLATIONS,
  BACKGROUND_DEPTH_GALAXIES,
  BACKGROUND_STAR_ALPHA,
  BACKGROUND_STAR_SIZE_VARIANCE,
  BACKGROUND_STAR_MIN_SIZE,
  BACKGROUND_STAR_CONSTELLATION_MULT,
  BACKGROUND_MOTION_SPEED,
  BACKGROUND_RANDOM_START_RANGE,
  BACKGROUND_GALAXY_COUNT,
  BACKGROUND_GALAXY_SPREAD,
} from '../components/environment/background.config';
import { type GalaxyData } from '../entities/background/galaxies';
import { seededRandom } from '../utils/random';
import { useThemeColors } from './use-theme-colors';

/**
 * Interface for remote GeoJSON celestial data features
 */
interface CelestialFeature {
  geometry: {
    type: 'Point' | 'LineString' | 'MultiLineString'
    coordinates: number[] | number[][] | number[][][]
  }
  properties?: {
    mag?: number
  }
}

/**
 * Properties for the useBackgroundEffects hook.
 */
export interface UseBackgroundEffectsProps {
  groupRef: React.RefObject<Group | null>
  materialRef: React.RefObject<ShaderMaterial | null>
}

/**
 * Manages procedural background data and parallax motion
 *
 * It handles:
 * 1. Remote celestial GeoJSON loading and processing.
 * 2. Dynamic galaxy distribution.
 * 3. Parallax drift motion relative to camera.
 * 4. High-frequency shader uniform updates (time, viewport).
 * @param props - hook properties including refs to the background group and star material
 */
export function useBackgroundEffects({ groupRef, materialRef }: UseBackgroundEffectsProps) {
  const { size: viewportSize } = useThree();
  const resetCounter = useGameStore(s => s.resetCounter);
  const { galaxyPalette, textMain } = useThemeColors();

  const [starGeometry, setStarGeometry] = useState<BufferGeometry | null>(null);
  const [constellationGeometry, setConstellationGeometry] = useState<BufferGeometry | null>(null);

  const driftRef = useRef(new Vector3());

  const detailLevel = useGameStore(s => s.settings.detailLevel);

  // procedural galaxy generation
  const galaxyData = useMemo(() => {
    const rng = seededRandom(resetCounter + 999);
    const galaxies: GalaxyData[] = [];

    const targetCount = detailLevel === 'high' ? BACKGROUND_GALAXY_COUNT : (detailLevel === 'medium' ? 10 : 0);

    for (let i = 0; i < targetCount; i++) {
      const pos = new Vector3(
        (rng() - 0.5) * (BACKGROUND_GALAXY_SPREAD * 2.5),
        (rng() - 0.5) * (BACKGROUND_GALAXY_SPREAD * 2.5),
        BACKGROUND_DEPTH_GALAXIES - rng() * 100,
      );
      const rand = rng();
      const type = rand < 0.4 ? 0 : rand < 0.7 ? 1 : 2;
      galaxies.push({
        position: pos,
        color: new Color(galaxyPalette[Math.floor(rng() * galaxyPalette.length)]).lerp(textMain, rng() * 0.5),
        size: 20 + rng() * 80,
        type,
        rotation: new Euler(
          type === 2 ? Math.PI * 0.45 : rng() * 0.5,
          type === 2 ? Math.PI * 0.45 : rng() * 0.5,
          rng() * Math.PI * 2,
        ),
      });
    }
    return galaxies;
  }, [resetCounter, galaxyPalette, textMain, detailLevel]);

  // randomize start position for drift per level
  useEffect(() => {
    const rng = seededRandom(resetCounter + 888);
    driftRef.current.set(
      (rng() - 0.5) * BACKGROUND_RANDOM_START_RANGE,
      (rng() - 0.5) * BACKGROUND_RANDOM_START_RANGE,
      0,
    );
  }, [resetCounter]);

  // load remote star and constellation data
  useEffect(() => {
    Promise.all([
      fetch('https://raw.githubusercontent.com/dieghernan/celestial_data/main/data/stars.6.min.geojson').then(r => r.json()),
      fetch('https://raw.githubusercontent.com/dieghernan/celestial_data/main/data/constellations.lines.min.geojson').then(r => r.json()),
    ]).then(([stars, constellations]) => {
      if (!stars?.features || !constellations?.features) {
        return;
      }

      const scale = BACKGROUND_CELESTIAL_DATA_SCALE;
      const getPos = (lon: number, lat: number, depth: number) => [lon * scale, lat * scale, depth];

      // 1. Process Constellations
      const constellationPoints: number[] = [];
      const constellationStarIds = new Set<string>();

      constellations.features.forEach((f: CelestialFeature) => {
        const type = f.geometry.type;
        if (type === 'LineString' || type === 'MultiLineString') {
          const lineCoords = type === 'MultiLineString'
            ? (f.geometry.coordinates as number[][][])
            : [f.geometry.coordinates as number[][]];

          lineCoords.forEach((coords: number[][]) => {
            for (let i = 0; i < coords.length - 1; i++) {
              const p1 = coords[i];
              const p2 = coords[i + 1];
              constKey(p1, constellationStarIds);
              constKey(p2, constellationStarIds);
              const v1 = getPos(p1[0], p1[1], BACKGROUND_DEPTH_CONSTELLATIONS);
              const v2 = getPos(p2[0], p2[1], BACKGROUND_DEPTH_CONSTELLATIONS);
              constellationPoints.push(v1[0], v1[1], v1[2]);
              constellationPoints.push(v2[0], v2[1], v2[2]);
            }
          });
        }
      });

      const constGeo = new THREE_BufferGeometry();
      constGeo.setAttribute('position', new Float32BufferAttribute(constellationPoints, 3));
      setConstellationGeometry(constGeo);

      // 2. Process Stars
      const starPos: number[] = [];
      const starCol: number[] = [];
      const starSize: number[] = [];
      const starSparkle: number[] = [];
      const c = new Color();

      stars.features.forEach((f: CelestialFeature) => {
        if (f.geometry.type !== 'Point') {
          return;
        }
        const [lon, lat] = f.geometry.coordinates as number[];
        const mag = f.properties?.mag ?? 6;

        const isConstellation = constellationStarIds.has(`${lon.toFixed(2)},${lat.toFixed(2)}`);

        // Performance Optimization: filter stars by magnitude based on detail level
        if (detailLevel === 'low' && mag > 4.5 && !isConstellation) {
          return;
        }
        if (detailLevel === 'medium' && mag > 5.5 && !isConstellation) {
          return;
        }

        const p = getPos(lon, lat, BACKGROUND_DEPTH_STARS);
        starPos.push(p[0], p[1], p[2]);

        const brightness = Math.max(0.3, 1.0 - (mag / 10));
        c.setRGB(brightness, brightness, brightness + 0.05);
        starCol.push(c.r, c.g, c.b);

        let s = (BACKGROUND_STAR_MIN_SIZE + Math.random() * (BACKGROUND_STAR_SIZE_VARIANCE * 1.5));
        if (isConstellation) {
          s = (s + 2.0) * BACKGROUND_STAR_CONSTELLATION_MULT;
        }
        if (mag < 2.0) {
          s *= 1.5;
        }
        starSize.push(s);
        starSparkle.push(Math.random() < 0.2 ? Math.random() * 100.0 : 0.0);
      });

      const starGeo = new THREE_BufferGeometry();
      starGeo.setAttribute('position', new Float32BufferAttribute(starPos, 3));
      starGeo.setAttribute('color', new Float32BufferAttribute(starCol, 3));
      starGeo.setAttribute('size', new Float32BufferAttribute(starSize, 1));
      starGeo.setAttribute('sparkle', new Float32BufferAttribute(starSparkle, 1));
      setStarGeometry(starGeo);
    });

    function constKey(coord: number[], set: Set<string>) {
      set.add(`${coord[0].toFixed(2)},${coord[1].toFixed(2)}`);
    }
  }, [resetCounter, detailLevel]);

  const starUniforms = useMemo(() => ({
    opacity: { value: BACKGROUND_STAR_ALPHA },
    viewportHeight: { value: 1080 },
    time: { value: 0 },
  }), []);

  // Scratchpad vectors to avoid per-frame allocations
  const tempDir = useMemo(() => new Vector3(), []);

  const frameCountRef = useRef(0);
  const deltaAccumulatorRef = useRef(0);

  useFrame((state, delta) => {
    // pause background movement if menu is open
    if (useGameStore.getState().settingsMenuOpen || useGameStore.getState().creditsMenuOpen) {
      return;
    }

    deltaAccumulatorRef.current += delta;
    frameCountRef.current++;

    // update drift position relative to camera
    if (groupRef.current) {
      if (frameCountRef.current % 2 === 0) {
        const accumulatedDelta = deltaAccumulatorRef.current;
        deltaAccumulatorRef.current = 0;
        const driftSpeed = BACKGROUND_MOTION_SPEED * accumulatedDelta;

        // Calculate normalized direction vector in-place
        tempDir.copy(driftRef.current).negate().normalize();

        // Mutate drift position
        driftRef.current.addScaledVector(tempDir, driftSpeed);
      }

      groupRef.current.position.set(
        state.camera.position.x + driftRef.current.x,
        state.camera.position.y + driftRef.current.y,
        0,
      );
    }

    // sync time and resolution uniforms
    if (materialRef.current) {
      const uniforms = materialRef.current.uniforms;
      if (uniforms.viewportHeight.value !== viewportSize.height) {
        uniforms.viewportHeight.value = viewportSize.height;
      }
      uniforms.time.value = performance.now() / 1000;
    }
  });

  return {
    starGeometry,
    constellationGeometry,
    galaxyData,
    starUniforms,
  };
}
