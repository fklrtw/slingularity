import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { type CelestialBodyData } from '../entities/planet';
import { SOLAR_SYSTEM_PLANET_OMEGA } from '../entities/solar-system.config';
import { calculatePlanetNextState, checkAnnihilationCollisions, type AnnihilationResult } from './solar-system-physics';

function checkAnnihilationCollisionsHelper(planets: CelestialBodyData[], annihilatedPlanets: Set<number>, annihilatedRings: Set<number>) {
  const result: AnnihilationResult = { annihilatedPlanets: [], annihilatedRings: [] };
  checkAnnihilationCollisions(planets, annihilatedPlanets, annihilatedRings, result);
  return result;
}
describe('Celestial Physics (via solar-system-physics)', () => {
  describe('calculatePlanetNextState', () => {
    it('should follow elliptical parameters and use simplified constant speed', () => {
      const expectedOmega = SOLAR_SYSTEM_PLANET_OMEGA;
      const planet: CelestialBodyData = {
        id: 'p1',
        position: new Vector3(),
        velocity: new Vector3(),
        currentAngle: 0,
        semiMajorAxis: 100,
        semiMinorAxis: 100,
        focusOffset: 0,
        radius: 10,
        mass: 1,
        atmosphereRadius: 30,
        crashRadius: 10
      };

      const nextAngle = calculatePlanetNextState(planet, new Vector3(0, 0, 0), 1.0);
      expect(nextAngle).toBeCloseTo(expectedOmega, 5);
    });

    it('should correctly handle focusOffset in elliptical orbits', () => {
      const planet: CelestialBodyData = {
        id: 'p1',
        position: new Vector3(),
        velocity: new Vector3(),
        currentAngle: 0,
        semiMajorAxis: 100,
        semiMinorAxis: 100,
        focusOffset: 20,
        radius: 10,
        mass: 1,
        atmosphereRadius: 30,
        crashRadius: 10
      };
      calculatePlanetNextState(planet, new Vector3(0, 0, 0), 0);
      expect(planet.position.x).toBe(80);
    });
  });

  describe('checkAnnihilationCollisions', () => {
    it('should detect planet-planet collisions', () => {
      const p1: CelestialBodyData = {
        id: 'p1',
        position: new Vector3(0, 0, 0),
        radius: 10,
        mass: 1,
        velocity: new Vector3(),
        atmosphereRadius: 10,
        crashRadius: 10,
      };
      const p2: CelestialBodyData = {
        id: 'p2',
        position: new Vector3(15, 0, 0),
        radius: 10,
        mass: 1,
        velocity: new Vector3(),
        atmosphereRadius: 10,
        crashRadius: 10,
      };
      const result = checkAnnihilationCollisionsHelper([p1, p2], new Set(), new Set());
      expect(result.annihilatedPlanets).toContain(0);
      expect(result.annihilatedPlanets).toContain(1);
    });

    it('should allow sun to disintegrate planets', () => {
      const sun: CelestialBodyData = {
        id: 'sun',
        position: new Vector3(0, 0, 0),
        radius: 100, // Sync sun radius directly
        mass: 1,
        isSun: true,
        velocity: new Vector3(),
        atmosphereRadius: 10,
        crashRadius: 100,
      };
      const p1: CelestialBodyData = {
        id: 'p1',
        position: new Vector3(15, 0, 0),
        radius: 10,
        mass: 1,
        velocity: new Vector3(),
        atmosphereRadius: 10,
        crashRadius: 12,
      };
      const result = checkAnnihilationCollisionsHelper([sun, p1], new Set(), new Set());
      expect(result.annihilatedPlanets).toContain(1);
      expect(result.annihilatedPlanets).not.toContain(0);
    });

    it('should respect sun growth in planet-sun collisions', () => {
      const sun: CelestialBodyData = {
        id: 'sun',
        position: new Vector3(0, 0, 0),
        radius: 10,
        mass: 1,
        isSun: true,
        velocity: new Vector3(),
        atmosphereRadius: 10,
        crashRadius: 10,
      };
      const p1: CelestialBodyData = {
        id: 'p1',
        position: new Vector3(50, 0, 0),
        radius: 5,
        mass: 1,
        velocity: new Vector3(),
        atmosphereRadius: 5,
        crashRadius: 5,
      };

      // No collision yet
      let result = checkAnnihilationCollisionsHelper([sun, p1], new Set(), new Set());
      expect(result.annihilatedPlanets).not.toContain(1);

      // Grow sun
      sun.radius = 46;
      result = checkAnnihilationCollisionsHelper([sun, p1], new Set(), new Set());
      expect(result.annihilatedPlanets).toContain(1);
    });

    it('should detect planet-ring collisions', () => {
      const p1: CelestialBodyData = {
        id: 'p1',
        position: new Vector3(0, 0, 0),
        radius: 10,
        mass: 1,
        velocity: new Vector3(),
        atmosphereRadius: 10,
        crashRadius: 10,
      };
      const p2: CelestialBodyData = {
        id: 'p2', position: new Vector3(30, 0, 0), radius: 10, mass: 1, velocity: new Vector3(),
        hasRings: true, ringOuterRadius: 25, atmosphereRadius: 10,
        crashRadius: 10,
      };
      const result = checkAnnihilationCollisionsHelper([p1, p2], new Set(), new Set());
      expect(result.annihilatedRings).toContain(1);
      expect(result.annihilatedPlanets).toContain(0);
    });
  });
});
