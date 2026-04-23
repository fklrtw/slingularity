import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  useSolarSystemFactory,
  getRandomAtmosphereMultiplier,
  getRingColor,
  getAtmosphereColor
} from './use-solar-system-factory';
import { PLANETS_RING_MAX_ATMOSPHERE_COVERAGE, PLANETS_PLANET_CRASH_BUFFER } from '../entities/planet.config';
import { SUN_CORE_SIZE } from '../entities/sun.config';
import { APP_SUN_POS } from '../app.config';

describe('useSolarSystemFactory', () => {
  describe('Utility Functions', () => {
    it('getRingColor should return a hex color string based on input color', () => {
      const color = '#ff0000';
      const ringColor = getRingColor(color);
      expect(ringColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(ringColor).not.toBe(color);
    });

    it('getAtmosphereColor should return a hex color string based on input color', () => {
      const color = '#00ff00';
      const atmosphereColor = getAtmosphereColor(color);
      expect(atmosphereColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(atmosphereColor).not.toBe(color);
    });

    it('getRandomAtmosphereMultiplier should return a multiplier within expected range', () => {
      const mult = getRandomAtmosphereMultiplier(1, () => 0.5);
      // DIFFICULTY_ATMOSPHERE.minFactor = 4.5
      // DIFFICULTY_ATMOSPHERE.maxFactorStart = 9.0
      expect(mult).toBeGreaterThanOrEqual(4.5);
      expect(mult).toBeLessThanOrEqual(9.0);
    });

    it('getRandomAtmosphereMultiplier should return lower max multipliers at high levels', () => {
      // At very high levels, max factor approaches maxFactorLimit (6.0)
      const mult = getRandomAtmosphereMultiplier(100, () => 0.5);
      expect(mult).toBeGreaterThanOrEqual(4.5);
      expect(mult).toBeLessThanOrEqual(6.0); // Rough upper bound for level 100
    });
  });

  describe('useSolarSystemFactory Hook', () => {
    it('should initialize with the sun as the first element', () => {
      const { result } = renderHook(() => useSolarSystemFactory(1, 0));
      const { planets } = result.current;

      expect(planets[0].id).toBe('sun');
      expect(planets[0].isSun).toBe(true);
      expect(planets[0].radius).toBe(SUN_CORE_SIZE);
      expect(planets[0].position.equals(APP_SUN_POS)).toBe(true);
      expect(planets[0].crashRadius).toBe(SUN_CORE_SIZE);
    });

    it('should generate a deterministic set of planets for the same level and counter', () => {
      const { result: res1 } = renderHook(() => useSolarSystemFactory(1, 10));
      const { result: res2 } = renderHook(() => useSolarSystemFactory(1, 10));

      expect(res1.current.planets.length).toBe(res2.current.planets.length);

      res1.current.planets.forEach((p, i) => {
        expect(p.id).toBe(res2.current.planets[i].id);
        expect(p.position.distanceTo(res2.current.planets[i].position)).toBe(0);
      });

      expect(res1.current.portalPosition.distanceTo(res2.current.portalPosition)).toBe(0);
      expect(res1.current.shipParams.pos.distanceTo(res2.current.shipParams.pos)).toBe(0);
    });

    it('should generate different systems for different reset counters', () => {
      const { result: res1 } = renderHook(() => useSolarSystemFactory(1, 10));
      const { result: res2 } = renderHook(() => useSolarSystemFactory(1, 11));

      // They might have same length (Fibonacci), but properties should differ
      const p1 = res1.current.planets[1];
      const p2 = res2.current.planets[1];

      expect(p1.position.distanceTo(p2.position)).toBeGreaterThan(0);
    });

    it('should increase planet count for higher levels (Fibonacci)', () => {
      const { result: resL1 } = renderHook(() => useSolarSystemFactory(1, 0));
      const { result: resL5 } = renderHook(() => useSolarSystemFactory(5, 0));

      const planetsL1 = resL1.current.planets.filter(p => p.isPlanet || p.isSun);
      const planetsL5 = resL5.current.planets.filter(p => p.isPlanet || p.isSun);

      // Level 1: fib(1 + 1) = 1 planet + sun = 2 total
      // Level 5: fib(5 + 1) = 8 planets + sun = 9 total
      expect(planetsL1.length).toBe(2);
      expect(planetsL5.length).toBe(9);

      // Also ensure at least one comet is added
      expect(resL1.current.planets.some(p => p.isComet)).toBe(true);
    });

    it('should enforce ring constraints relative to atmosphere', () => {
      const { result } = renderHook(() => useSolarSystemFactory(3, 123));
      const { planets } = result.current;

      planets.forEach((p) => {
        if (p.hasRings && !p.isSun) {
          const atmosphereWidth = p.atmosphereRadius - p.radius;
          const ringWidth = (p.ringOuterRadius || 0) - (p.ringInnerRadius || 0);

          // Epsilon for float math
          expect(ringWidth / atmosphereWidth).toBeLessThanOrEqual(PLANETS_RING_MAX_ATMOSPHERE_COVERAGE + 0.001);
          expect(p.ringInnerRadius).toBeGreaterThan(p.radius);
          expect(p.ringOuterRadius).toBeLessThanOrEqual(p.atmosphereRadius);
        }
      });
    });

    it('should correctly calculate crashRadius for all bodies', () => {
      const { result } = renderHook(() => useSolarSystemFactory(1, 0));
      const { planets } = result.current;

      planets.forEach((p) => {
        if (p.isSun) {
          expect(p.crashRadius).toBe(p.radius);
        } else {
          expect(p.crashRadius).toBe(p.radius + PLANETS_PLANET_CRASH_BUFFER);
        }
      });
    });

    it('should calculate valid shipParams', () => {
      const { result } = renderHook(() => useSolarSystemFactory(1, 0));
      const { shipParams, planets } = result.current;
      // p[0] is sun, p[1] is first planet
      const p1 = planets.find(p => p.isPlanet)!;

      expect(shipParams.pos).toBeInstanceOf(Vector3);
      expect(shipParams.vel).toBeInstanceOf(Vector3);
      expect(Math.abs(shipParams.dir)).toBe(1);

      // Ship should start at the edge of the first planet's atmosphere
      const distToP1 = shipParams.pos.distanceTo(p1.position);
      expect(distToP1).toBeCloseTo(p1.atmosphereRadius, 2);
    });

    it('should calculate valid portalPosition outside the last planet', () => {
      const { result } = renderHook(() => useSolarSystemFactory(1, 0));
      const { portalPosition, planets } = result.current;
      const lastP = planets.filter(p => p.isPlanet).pop()!;

      expect(portalPosition).toBeInstanceOf(Vector3);

      const distToSun = portalPosition.distanceTo(APP_SUN_POS);
      const lastPMaxDist = lastP.semiMajorAxis || 0;

      expect(distToSun).toBeGreaterThan(lastPMaxDist);
    });

    it('should prevent atmospheric overlap between consecutive planets', () => {
      const { result } = renderHook(() => useSolarSystemFactory(10, 0));
      const planetsOnly = result.current.planets.filter(p => p.isPlanet);

      for (let i = 0; i < planetsOnly.length - 1; i++) {
        const pCurrent = planetsOnly[i];
        const pNext = planetsOnly[i + 1];

        // We check semi-major axis distance since that's what's used for layout
        const radialGap = (pNext.semiMajorAxis || 0) - (pCurrent.semiMajorAxis || 0);

        // The atmosphere of the next planet shouldn't touch the previous planet's atmosphere
        // We use the overlap prevention logic from the hook:
        // radialGap * 0.9 - prevPlanet.atmosphereRadius should be the max allowed atmosphere
        expect(pNext.atmosphereRadius).toBeLessThan(radialGap);
      }
    });
  });
});
