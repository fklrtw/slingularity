/**
 * Solar system orbital mechanics and collision physics.
 * Made with the help of Gemini.
 */
import type { Vector3 } from 'three';
import type { CelestialBodyData } from '../entities/planet';
import { SOLAR_SYSTEM_PLANET_OMEGA, SOLAR_SYSTEM_COMET_OMEGA } from '../entities/solar-system.config';

/**
 * Result of an Annihilation check between celestial bodies
 */
export interface AnnihilationResult {
  annihilatedPlanets: number[]
  annihilatedRings: number[]
}

/**
 * calculates the position and velocity of a planet at a specific orbital angle.
 * Position is calculated using an elliptical path centered on the sun with a focal offset.
 * Performance: Mutates outPosition and outVelocity to avoid allocations in useFrame.
 */
export function getPlanetOrbitState(
  angle: number,
  semiMajorAxis: number,
  semiMinorAxis: number,
  focusOffset: number,
  sunPos: Vector3,
  outPosition: Vector3,
  outVelocity: Vector3,
  omega: number = SOLAR_SYSTEM_PLANET_OMEGA
) {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  // Position relative to sun: center is at -focusOffset on X axis
  const x = cosA * semiMajorAxis - focusOffset;
  const y = sinA * semiMinorAxis;
  outPosition.set(x, y, 0).add(sunPos);

  // Analytical velocity: v = d/dt (pos)
  const vx = -semiMajorAxis * sinA * omega;
  const vy = semiMinorAxis * cosA * omega;
  outVelocity.set(vx, vy, 0);
}

/**
 * detects collisions between celestial bodies.
 */
export function checkAnnihilationCollisions(
  planets: CelestialBodyData[],
  annihilatedPlanets: Set<number>,
  annihilatedRings: Set<number>,
  outResult: AnnihilationResult
): void {
  outResult.annihilatedPlanets.length = 0;
  outResult.annihilatedRings.length = 0;

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i];
      const p2 = planets[j];
      const distSq = p1.position.distanceToSquared(p2.position);

      const p1Active = !annihilatedPlanets.has(i) && !outResult.annihilatedPlanets.includes(i);
      const p2Active = !annihilatedPlanets.has(j) && !outResult.annihilatedPlanets.includes(j);
      const p1RingActive = p1.hasRings && !annihilatedRings.has(i) && !outResult.annihilatedRings.includes(i);
      const p2RingActive = p2.hasRings && !annihilatedRings.has(j) && !outResult.annihilatedRings.includes(j);

      const p1Radius = p1.radius;
      const p2Radius = p2.radius;

      if (p1Active && p2Active && distSq < (p1Radius + p2Radius) * (p1Radius + p2Radius)) {
        if (!p1.isSun && !outResult.annihilatedPlanets.includes(i)) {
          outResult.annihilatedPlanets.push(i);
        }
        if (!p2.isSun && !outResult.annihilatedPlanets.includes(j)) {
          outResult.annihilatedPlanets.push(j);
        }
      }

      if (p1Active && p2RingActive && distSq < (p1Radius + (p2.ringOuterRadius || 0)) * (p1Radius + (p2.ringOuterRadius || 0))) {
        if (!outResult.annihilatedRings.includes(j)) {
          outResult.annihilatedRings.push(j);
        }
        if (!p1.isSun && !outResult.annihilatedPlanets.includes(i)) {
          outResult.annihilatedPlanets.push(i);
        }
      }
      if (p2Active && p1RingActive && distSq < (p2Radius + (p1.ringOuterRadius || 0)) * (p2Radius + (p1.ringOuterRadius || 0))) {
        if (!outResult.annihilatedRings.includes(i)) {
          outResult.annihilatedRings.push(i);
        }
        if (!p2.isSun && !outResult.annihilatedPlanets.includes(j)) {
          outResult.annihilatedPlanets.push(j);
        }
      }

      if (p1RingActive && p2RingActive && distSq < ((p1.ringOuterRadius || 0) + (p2.ringOuterRadius || 0)) * ((p1.ringOuterRadius || 0) + (p2.ringOuterRadius || 0))) {
        if (!outResult.annihilatedRings.includes(i)) {
          outResult.annihilatedRings.push(i);
        }
        if (!outResult.annihilatedRings.includes(j)) {
          outResult.annihilatedRings.push(j);
        }
      }
    }
  }
}

/**
 * updates planet position and velocity using analytical elliptical formulas.
 * Performance: Mutates outPosition and outVelocity to avoid allocations.
 */
export function calculatePlanetNextState(
  planet: CelestialBodyData,
  sunPos: Vector3,
  dt: number,
  isAnnihilated: boolean = false
) {
  if (isAnnihilated) {
    return planet.currentAngle || 0;
  }
  const omega = planet.isComet ? SOLAR_SYSTEM_COMET_OMEGA : SOLAR_SYSTEM_PLANET_OMEGA;
  const nextAngle = (planet.currentAngle || 0) + (dt * omega);

  getPlanetOrbitState(
    nextAngle,
    planet.semiMajorAxis || 0,
    planet.semiMinorAxis || 0,
    planet.focusOffset || 0,
    sunPos,
    planet.position,
    planet.velocity,
    omega
  );

  return nextAngle;
}
