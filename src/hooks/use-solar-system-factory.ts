import chroma from 'chroma-js';
import { useMemo } from 'react';
import { Vector3 } from 'three';
import { APP_SUN_POS } from '../app.config';
import {
  DIFFICULTY_ATMOSPHERE,
  DIFFICULTY_INITIAL_ORBIT_SPEED,
  DIFFICULTY_PLANET_COUNT_LEVEL_OFFSET,
  DIFFICULTY_PLANET_GAP,
  DIFFICULTY_PLANET_SIZE,
} from '../difficulty.config';
import type { CelestialBodyData } from '../entities/planet';
import {
  PLANETS_PLANET_CRASH_BUFFER,
  PLANETS_RING_COUNT_RANGE,
  PLANETS_RING_MAX_ATMOSPHERE_COVERAGE
} from '../entities/planet.config';
import { PORTALS_PORTAL_DIST_OFFSET } from '../entities/portal.config';
import type { SystemRefData } from '../entities/solar-system';
import {
  SOLAR_SYSTEM_COMET_CHANCE,
  SOLAR_SYSTEM_COMET_ECCENTRICITY_MAX,
  SOLAR_SYSTEM_COMET_ECCENTRICITY_MIN,
  SOLAR_SYSTEM_COMET_MIN_PERIAPSIS,
  SOLAR_SYSTEM_FIRST_PLANET_SIZE,
  SOLAR_SYSTEM_MIN_PLANET_SIZE,
  SOLAR_SYSTEM_PLANET_ANGLE_VARIANCE,
  SOLAR_SYSTEM_PLANET_ECCENTRICITY_RANGE_MAX,
  SOLAR_SYSTEM_PLANET_ECCENTRICITY_RANGE_MIN,
  SOLAR_SYSTEM_PLANET_MASS_RANGE_MAX,
  SOLAR_SYSTEM_PLANET_MASS_RANGE_MIN,
  SOLAR_SYSTEM_PLANET_RING_CHANCE,
  SOLAR_SYSTEM_PLANET_RING_ROTATION_MAX,
  SOLAR_SYSTEM_PLANET_RING_ROTATION_MIN,
  SOLAR_SYSTEM_PLANET_START_DIST,
} from '../entities/solar-system.config';
import { PHYSICS_SUN_MASS, SUN_CORE_SIZE } from '../entities/sun.config';
import { getPlanetOrbitState } from '../physics/solar-system-physics';
import { scaleAsymptotic } from '../utils/difficulty';
import { seededRandom } from '../utils/random';
import { useThemeColors } from './use-theme-colors';

/**
 * Fibonacci sequence generator
 *
 * @param n Number to get value of Fibonacci sequence for
 */
function fibonacci(n: number): number {
  if (n < 0) {
    throw new Error();
  }

  return n === 0 ? 0 : n === 1 ? 1 : fibonacci(n - 1) + fibonacci(n - 2);
}

/**
 * Get color for planet rings based on the planet's base color
 *
 * Maintains the same hue but adds some brightness variation.
 *
 * @param planetColor Color to base ring color on
 */
export function getRingColor(planetColor: string): string {
  // Keep the same hue, but make it slightly lighter and more vibrant
  return chroma(planetColor).set('hsl.l', 0.7).set('hsl.s', 0.8).hex();
}

/**
 * Get color for the atmosphere based on the planet's base color
 *
 * Maintains the same hue but is very desaturated.
 *
 * @param planetColor Color to base atmosphere color on
 */
export function getAtmosphereColor(planetColor: string): string {
  // Same hue, but very desaturated and bright for the atmosphere look
  return chroma(planetColor).set('hsl.s', 0.2).set('hsl.l', 0.9).hex();
}

/**
 * Returns a randomized atmosphere radius multiplier for a given level
 *
 * @param level Level to get atmosphere radius for
 * @param rng Random number generator function
 */
export function getRandomAtmosphereMultiplier(level: number, rng: () => number): number {
  const maxFactor = scaleAsymptotic(
    level,
    DIFFICULTY_ATMOSPHERE.maxFactorStart,
    DIFFICULTY_ATMOSPHERE.maxFactorLimit,
    DIFFICULTY_ATMOSPHERE.halfLife
  );

  return DIFFICULTY_ATMOSPHERE.minFactor + rng() * (maxFactor - DIFFICULTY_ATMOSPHERE.minFactor);
}

/**
 * Factory for a solar system
 *
 * Includes the sun and all orbiting planets with their physical and visual properties.
 *
 * @param level Level to create solar system for
 * @param resetCounter Reset counter to reinitialize random numbers with
 */
export function useSolarSystemFactory(level: number, resetCounter: number): SystemRefData {
  const { planetPalette } = useThemeColors();

  return useMemo<SystemRefData>(() => {
    const rng = seededRandom(level * 1000 + resetCounter);

    // initialize with the sun at the center
    const p: CelestialBodyData[] = [{
      id: 'sun', position: APP_SUN_POS.clone(), mass: PHYSICS_SUN_MASS,
      radius: SUN_CORE_SIZE, isSun: true, velocity: new Vector3(),
      atmosphereRadius: SUN_CORE_SIZE,
      atmosphereColor: getAtmosphereColor('#ffaa00'), // sun's default "atmosphere"
      crashRadius: SUN_CORE_SIZE, // Sun crash uses exact radius
    }];

    // convert palette to hex strings and randomize
    const colors = planetPalette.map(c => c.getStyle()).sort(() => rng() - 0.5);
    const count = fibonacci(level + DIFFICULTY_PLANET_COUNT_LEVEL_OFFSET); // planet count scales with level difficulty

    let currentDist = SOLAR_SYSTEM_PLANET_START_DIST;
    const maxAtmosphereFactor = scaleAsymptotic(
      level,
      DIFFICULTY_ATMOSPHERE.maxFactorStart,
      DIFFICULTY_ATMOSPHERE.maxFactorLimit,
      DIFFICULTY_ATMOSPHERE.halfLife
    );

    const minPlanetSize = scaleAsymptotic(
      level,
      DIFFICULTY_PLANET_SIZE.minStart,
      DIFFICULTY_PLANET_SIZE.minLimit,
      DIFFICULTY_PLANET_SIZE.halfLife
    );
    const maxPlanetSize = scaleAsymptotic(
      level,
      DIFFICULTY_PLANET_SIZE.maxStart,
      DIFFICULTY_PLANET_SIZE.maxLimit,
      DIFFICULTY_PLANET_SIZE.halfLife
    );

    for (let i = 0; i < count; i++) {
      // calculate orbital parameters based on position in the system
      const gap = scaleAsymptotic(
        level,
        DIFFICULTY_PLANET_GAP.start,
        DIFFICULTY_PLANET_GAP.limit,
        DIFFICULTY_PLANET_GAP.halfLife
      );
      currentDist += gap + (rng() - 0.5) * gap * 0.2; // some variance in gap

      const mass = SOLAR_SYSTEM_PLANET_MASS_RANGE_MIN + (i / (count - 1 || 1)) * (SOLAR_SYSTEM_PLANET_MASS_RANGE_MAX - SOLAR_SYSTEM_PLANET_MASS_RANGE_MIN);

      // planet size scales from first planet to system boundary
      const sizeWeight = count > 1 ? i / (count - 1) : 0;
      let radius = minPlanetSize + sizeWeight * (maxPlanetSize - minPlanetSize);
      if (i === 0) {
        radius = SOLAR_SYSTEM_FIRST_PLANET_SIZE;
      }

      // Overlap prevention: cap radius so atmosphere doesn't overlap previous planet
      const prevPlanet = p[i];
      const radialGap = currentDist - (prevPlanet.semiMajorAxis || 0);
      const maxAllowedAtmosphere = radialGap * 0.9 - prevPlanet.atmosphereRadius; // 10% safety margin
      radius = Math.min(radius, maxAllowedAtmosphere / maxAtmosphereFactor);
      radius = Math.max(radius, SOLAR_SYSTEM_MIN_PLANET_SIZE); // Don't go below absolute min

      const atmosphereRadius = radius * getRandomAtmosphereMultiplier(level, rng);

      // set up elliptical orbit (Keplerian)
      const initialAngle = Math.PI / 2 + (rng() - 0.5) * SOLAR_SYSTEM_PLANET_ANGLE_VARIANCE;
      const eccentricity = SOLAR_SYSTEM_PLANET_ECCENTRICITY_RANGE_MIN + rng() * (SOLAR_SYSTEM_PLANET_ECCENTRICITY_RANGE_MAX - SOLAR_SYSTEM_PLANET_ECCENTRICITY_RANGE_MIN);
      const semiMajorAxis = currentDist;
      const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
      const focusOffset = semiMajorAxis * eccentricity;

      // use shared physics helper for initial position and velocity
      const position = new Vector3();
      const velocity = new Vector3();
      getPlanetOrbitState(initialAngle, semiMajorAxis, semiMinorAxis, focusOffset, APP_SUN_POS, position, velocity);

      // handle visual properties like rings and color
      const hasRings = i > 0 && rng() < SOLAR_SYSTEM_PLANET_RING_CHANCE;
      const planetColor = colors[i % colors.length];

      p.push({
        atmosphereColor: getAtmosphereColor(planetColor),
        atmosphereRadius,
        crashRadius: radius + PLANETS_PLANET_CRASH_BUFFER,
        hasRings, ringColor: getRingColor(planetColor),
        id: `p${i + 1}`, position, mass, radius, color: planetColor,
        ringCount: Math.floor(rng() * (PLANETS_RING_COUNT_RANGE[1] - PLANETS_RING_COUNT_RANGE[0] + 1)) + PLANETS_RING_COUNT_RANGE[0],
        ringInnerRadius: radius + (atmosphereRadius - radius) * 0.1,
        ringOuterRadius: radius + (atmosphereRadius - radius) * (0.1 + rng() * PLANETS_RING_MAX_ATMOSPHERE_COVERAGE),
        ringRotation: [Math.PI / (SOLAR_SYSTEM_PLANET_RING_ROTATION_MIN + rng() * (SOLAR_SYSTEM_PLANET_RING_ROTATION_MAX - SOLAR_SYSTEM_PLANET_RING_ROTATION_MIN)), (rng() - 0.5) * 0.5, 0],
        rotationSpeed: (rng() - 0.5),
        initialRotation: rng() * Math.PI * 2,
        lightOrientation: (rng() - 0.5) * 2.0,
        velocity, currentAngle: initialAngle, semiMajorAxis, semiMinorAxis, focusOffset,
        isPlanet: true,
      });
    }

    const cometCount = Math.max(1, Math.round(count * SOLAR_SYSTEM_COMET_CHANCE));
    for (let c = 0; c < cometCount; c++) {
      const radius = SOLAR_SYSTEM_MIN_PLANET_SIZE * 0.5;
      const atmosphereRadius = radius * 2.0;
      const mass = SOLAR_SYSTEM_PLANET_MASS_RANGE_MIN * 0.2;

      // Comets orbit can be anywhere within the system distance bounds
      const semiMajorAxis = SOLAR_SYSTEM_PLANET_START_DIST + rng() * (currentDist - SOLAR_SYSTEM_PLANET_START_DIST);
      let eccentricity = SOLAR_SYSTEM_COMET_ECCENTRICITY_MIN + rng() * (SOLAR_SYSTEM_COMET_ECCENTRICITY_MAX - SOLAR_SYSTEM_COMET_ECCENTRICITY_MIN);

      // Enforce minimum periapsis distance (r_p = a * (1 - e))
      // a * (1 - e) >= r_min  =>  1 - e >= r_min / a  => e <= 1 - r_min / a
      const maxEcc = 1.0 - (SOLAR_SYSTEM_COMET_MIN_PERIAPSIS / semiMajorAxis);
      eccentricity = Math.min(eccentricity, maxEcc);
      eccentricity = Math.max(eccentricity, 0.1); // Ensure it stays elliptical

      const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
      const focusOffset = semiMajorAxis * eccentricity;
      const initialAngle = rng() * Math.PI * 2;

      const position = new Vector3();
      const velocity = new Vector3();
      getPlanetOrbitState(initialAngle, semiMajorAxis, semiMinorAxis, focusOffset, APP_SUN_POS, position, velocity);

      p.push({
        atmosphereColor: '#ffffff',
        atmosphereRadius,
        crashRadius: radius + PLANETS_PLANET_CRASH_BUFFER,
        id: `c${c + 1}`, position, mass, radius, color: '#ffffff',
        rotationSpeed: (rng() - 0.5) * 4.0,
        initialRotation: rng() * Math.PI * 2,
        lightOrientation: (rng() - 0.5) * 2.0,
        velocity, currentAngle: initialAngle, semiMajorAxis, semiMinorAxis, focusOffset,
        isComet: true,
      });
    }

    // --- Calculation of Start/End Points ---

    // 1. Initial ship state near the first planet
    const p1 = p[1];
    let shipParams = { pos: new Vector3(), vel: new Vector3(), dir: 1 };
    if (p1) {
      const r = p1.atmosphereRadius;
      const vOrbitMag = scaleAsymptotic(
        level,
        DIFFICULTY_INITIAL_ORBIT_SPEED.start,
        DIFFICULTY_INITIAL_ORBIT_SPEED.limit,
        DIFFICULTY_INITIAL_ORBIT_SPEED.halfLife
      );
      const dir = -1; // -1 for clockwise
      shipParams = {
        pos: p1.position.clone().add(new Vector3(r, 0, 0)),
        vel: p1.velocity.clone().add(new Vector3(0, vOrbitMag * dir, 0)),
        dir,
      };
    }

    // 2. End portal position outside the last planet
    const planetsOnly = p.filter(body => body.isPlanet);
    const lastPlanet = planetsOnly[planetsOnly.length - 1];
    const portalPosition = new Vector3();
    const portalDist = lastPlanet ? (lastPlanet.semiMajorAxis || 0) + PORTALS_PORTAL_DIST_OFFSET : 0;
    if (lastPlanet) {
      const dir = new Vector3().subVectors(lastPlanet.position, APP_SUN_POS).normalize();
      portalPosition.copy(dir).multiplyScalar(portalDist).add(APP_SUN_POS);
    }

    return {
      planets: p,
      counter: resetCounter,
      portalPosition,
      portalDist,
      shipParams,
    };
  }, [level, resetCounter, planetPalette]);
}
