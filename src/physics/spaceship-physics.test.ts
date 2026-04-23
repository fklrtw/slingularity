import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { type CelestialBodyData } from '../entities/planet';
import {
  SOLAR_SYSTEM_SUN_GRAVITY_FACTOR,
  SOLAR_SYSTEM_GRAVITATIONAL_CONSTANT,
  SOLAR_SYSTEM_GRAVITY_FALLOFF_EXPONENT, SOLAR_SYSTEM_VELOCITY_MAX, SOLAR_SYSTEM_ANNIHILATION_BOOST_MULTIPLIER
} from '../entities/solar-system.config';
import { calculateNextState, calculateSimplifiedNextState, checkOrbitCapture } from './spaceship-physics';

describe('Spaceship Physics', () => {
  const mockPlanet: CelestialBodyData = {
    id: 'p1',
    position: new Vector3(0, 0, 0),
    velocity: new Vector3(0, 0, 0),
    radius: 10,
    mass: 1000,
    isSun: false,
    atmosphereRadius: 40,
    crashRadius: 11,
  };

  const dt = 0.1;

  describe('calculateNextState (spacecraft - Hook and Orbit)', () => {
    it('should use gravity parameters from config', () => {
      const currentPos = new Vector3(100, 0, 0);
      const currentVel = new Vector3(0, 0, 0);
      const dt = 1.0;

      const distPow = Math.pow(100, SOLAR_SYSTEM_GRAVITY_FALLOFF_EXPONENT);
      const expectedAcc = (SOLAR_SYSTEM_GRAVITATIONAL_CONSTANT * 1) / distPow;
      const expectedVelChange = expectedAcc * dt;

      calculateNextState({
        currentPos,
        currentVel,
        dt,
        planets: [{
          id: 'p1',
          position: new Vector3(0, 0, 0),
          mass: 1,
          radius: 1,
          velocity: new Vector3(),
          atmosphereRadius: 5,
          crashRadius: 1.1,
        }],
        orbitingPlanetIndex: null,
        level: 1,
        orbitAngle: null,
        orbitDirection: 1,
        capturedSpeed: null,
        currentOrbitRadius: null,
        steeringPlanetIndex: null,
      });

      expect(Math.abs(currentVel.x)).toBeCloseTo(expectedVelChange, 5);
    });

    it('should apply sun factor to sun gravity', () => {
      const currentPos = new Vector3(100, 0, 0);
      const currentVel = new Vector3(0, 0, 0);
      const dt = 1.0;

      const distPow = Math.pow(100, SOLAR_SYSTEM_GRAVITY_FALLOFF_EXPONENT);
      const expectedAcc = (SOLAR_SYSTEM_GRAVITATIONAL_CONSTANT * 1 * SOLAR_SYSTEM_SUN_GRAVITY_FACTOR) / distPow;
      const expectedVelChange = expectedAcc * dt;

      calculateNextState({
        currentPos,
        currentVel,
        dt,
        planets: [{
          id: 'sun',
          position: new Vector3(0, 0, 0),
          mass: 1,
          radius: 1,
          isSun: true,
          velocity: new Vector3(),
          atmosphereRadius: 1,
          crashRadius: 1,
        }],
        orbitingPlanetIndex: null,
        level: 1,
        orbitAngle: null,
        orbitDirection: 1,
        capturedSpeed: null,
        currentOrbitRadius: null,
        steeringPlanetIndex: null,
      });

      expect(Math.abs(currentVel.x)).toBeCloseTo(expectedVelChange, 5);
    });

    it('should apply drag and reduce radius in orbit', () => {
      const currentPos = new Vector3(40, 0, 0);
      const currentVel = new Vector3(0, 100, 0);
      const orbitRadius = 40;

      const state = calculateNextState({
        currentPos,
        currentVel,
        dt,
        planets: [mockPlanet],
        orbitingPlanetIndex: 0,
        level: 1,
        orbitAngle: 0,
        orbitDirection: 1,
        capturedSpeed: 100,
        currentOrbitRadius: orbitRadius,
        steeringPlanetIndex: null,
        entrySpeed: 100,
        entryRadius: 40,
        entryPhase: 'orbiting',
      });

      expect(state.capturedSpeed).toBeLessThan(100);
      expect(state.currentOrbitRadius).toBeLessThan(orbitRadius);
    });

    it('should strictly coupling radius to velocity', () => {
      const p: CelestialBodyData = { ...mockPlanet, mass: 1000 };
      const v1 = 100;
      const v2 = 50;

      const cPos1 = new Vector3(40, 0, 0);
      const cVel1 = new Vector3(0, v1, 0);
      const state1 = calculateNextState({
        currentPos: cPos1,
        currentVel: cVel1,
        dt: 0.01,
        planets: [p],
        orbitingPlanetIndex: 0,
        level: 1,
        orbitAngle: 0,
        orbitDirection: 1,
        capturedSpeed: v1,
        currentOrbitRadius: 40,
        steeringPlanetIndex: null,
        entrySpeed: v1,
        entryRadius: 40,
        entryPhase: 'orbiting',
      });

      const cPos2 = new Vector3(20, 0, 0);
      const cVel2 = new Vector3(0, v2, 0);
      const state2 = calculateNextState({
        currentPos: cPos2,
        currentVel: cVel2,
        dt: 0.01,
        planets: [p],
        orbitingPlanetIndex: 0,
        level: 1,
        orbitAngle: 0,
        orbitDirection: 1,
        capturedSpeed: v2,
        currentOrbitRadius: 20,
        steeringPlanetIndex: null,
        entrySpeed: v1,
        entryRadius: 40,
        entryPhase: 'orbiting',
      });

      expect(state2.currentOrbitRadius).toBeLessThan(state1.currentOrbitRadius!);
    });

    it('should apply annihilation boost and discard planet velocity', () => {
      const pVel = new Vector3(10, 0, 0);
      const relVel = new Vector3(0, 20, 0);
      const currentVel = new Vector3().addVectors(pVel, relVel);
      const p: CelestialBodyData = { ...mockPlanet, velocity: pVel };

      calculateNextState({
        currentPos: new Vector3(40, 0, 0),
        currentVel,
        dt,
        planets: [p],
        orbitingPlanetIndex: 0,
        annihilatedPlanets: new Set([0]),
        lastAnnihilatedPlanetIndex: 0,
        level: 1,
        orbitAngle: 0,
        orbitDirection: 1,
        capturedSpeed: 20,
        currentOrbitRadius: 40,
        steeringPlanetIndex: null,
      });

      expect(currentVel.x).toBeCloseTo(10 * SOLAR_SYSTEM_ANNIHILATION_BOOST_MULTIPLIER, 5);
      expect(currentVel.y).toBeCloseTo(20 * SOLAR_SYSTEM_ANNIHILATION_BOOST_MULTIPLIER, 5);
    });

    it('should cap annihilation boost at SOLAR_SYSTEM_VELOCITY_MAX', () => {
      const currentVel = new Vector3(0, 1000, 0);
      const p: CelestialBodyData = { ...mockPlanet, velocity: new Vector3() };

      calculateNextState({
        currentPos: new Vector3(40, 0, 0),
        currentVel,
        dt,
        planets: [p],
        orbitingPlanetIndex: 0,
        annihilatedPlanets: new Set([0]),
        lastAnnihilatedPlanetIndex: 0,
        level: 1,
        orbitAngle: 0,
        orbitDirection: 1,
        capturedSpeed: 1000,
        currentOrbitRadius: 40,
        steeringPlanetIndex: null,
      });

      expect(currentVel.length()).toBe(1000);
    });

    it('should maintain velocity across multiple frames after the initial annihilation pulse', () => {
      const currentPos = new Vector3(0, 20, 0);
      const currentVel = new Vector3(0, 100, 0);
      const p: CelestialBodyData = { ...mockPlanet, position: new Vector3(0, 0, 0), velocity: new Vector3() };

      // Frame 1: Pulse triggered
      calculateNextState({
        currentPos,
        currentVel,
        dt,
        planets: [p],
        orbitingPlanetIndex: 0,
        annihilatedPlanets: new Set([0]),
        lastAnnihilatedPlanetIndex: 0,
        level: 1,
        orbitAngle: 0,
        orbitDirection: 1,
        capturedSpeed: 100,
        currentOrbitRadius: 20,
        steeringPlanetIndex: null,
      });

      const speedAfterPulse = currentVel.length();
      expect(speedAfterPulse).toBeCloseTo(100 * SOLAR_SYSTEM_ANNIHILATION_BOOST_MULTIPLIER, 0);

      // Frame 2: Pulse NO LONGER triggered (lastAnnihilatedPlanetIndex is null)
      calculateNextState({
        currentPos,
        currentVel,
        dt,
        planets: [p],
        orbitingPlanetIndex: null, // We are now in free flight
        annihilatedPlanets: new Set([0]),
        lastAnnihilatedPlanetIndex: null,
        level: 1,
        orbitAngle: null,
        orbitDirection: 1,
        capturedSpeed: null,
        currentOrbitRadius: null,
        steeringPlanetIndex: null,
      });

      expect(currentVel.length()).toBeCloseTo(speedAfterPulse, 0);
    });

    it('should NOT apply annihilation boost if lastAnnihilatedPlanetIndex is null (preventing repeat boosts)', () => {
      const p: CelestialBodyData = { ...mockPlanet, position: new Vector3(0, 0, 0) };
      const currentVel = new Vector3(0, 100, 0);

      calculateNextState({
        currentPos: new Vector3(0, 20, 0),
        currentVel,
        dt,
        planets: [p],
        orbitingPlanetIndex: null,
        annihilatedPlanets: new Set([0]),
        lastAnnihilatedPlanetIndex: null,
        level: 1,
        orbitAngle: null,
        orbitDirection: 1,
        capturedSpeed: null,
        currentOrbitRadius: null,
        steeringPlanetIndex: null,
      });

      expect(currentVel.length()).toBeLessThan(101);
      expect(currentVel.length()).not.toBe(150);
    });

    it('should apply multi-body newtonian gravity in free space', () => {
      const currentPos = new Vector3(30, 30, 0);
      const currentVel = new Vector3(0, -50, 0);

      const state = calculateNextState({
        currentPos,
        currentVel,
        dt,
        planets: [mockPlanet],
        orbitingPlanetIndex: null,
        level: 1,
        orbitAngle: null,
        orbitDirection: 1,
        capturedSpeed: null,
        currentOrbitRadius: null,
        steeringPlanetIndex: null,
      });

      expect(state.steeringPlanetIndex).toBeNull();
      expect(currentVel.x).toBeLessThan(0);
    });

    it('should immediately capture at any angle when touching atmosphere (via checkOrbitCapture)', () => {
      const currentPos = new Vector3(20, 0, 0);
      const currentVel = new Vector3(-100, 0, 0);

      const capturedIndex = checkOrbitCapture(
        currentPos,
        currentVel,
        [mockPlanet],
        new Set(),
      );

      expect(capturedIndex).toBe(0);
    });

    it('should capture absolute velocity and ignore planet velocity upon first frame of orbit', () => {
      const pVel = new Vector3(0, 100, 0);
      const currentPos = new Vector3(0, 40, 0);
      const currentVel = new Vector3(50, 0, 0);
      const p: CelestialBodyData = { ...mockPlanet, position: new Vector3(0, 0, 0), velocity: pVel, atmosphereRadius: 40 };

      const state = calculateSimplifiedNextState({
        currentPos,
        currentVel,
        dt: 0.01,
        planets: [p],
        orbitingPlanetIndex: 0,
        lastAnnihilatedPlanetIndex: null,
        level: 1,
        orbitAngle: null,
        orbitDirection: 1,
        capturedSpeed: null,
        currentOrbitRadius: null,
        steeringPlanetIndex: null,
      });

      expect(state.capturedSpeed).toBeCloseTo(49.5, 1);
      expect(currentVel.length()).toBeCloseTo(49.5, 1);
    });

    it('should crash if too close to planet', () => {
      const p1: CelestialBodyData = {
        id: 'p1',
        position: new Vector3(0, 0, 0),
        radius: 10,
        mass: 1000,
        velocity: new Vector3(),
        atmosphereRadius: 40,
        crashRadius: 11,
      };
      const state = calculateSimplifiedNextState({
        currentPos: new Vector3(1, 0, 0),
        currentVel: new Vector3(0, 10, 0),
        dt: 0.1,
        planets: [p1],
        orbitingPlanetIndex: 0,
        level: 1,
        capturedSpeed: 10,
        currentOrbitRadius: 1,
        orbitAngle: 0,
        orbitDirection: 1,
        steeringPlanetIndex: null,
        entryPhase: 'orbiting',
        entrySpeed: 10,
        entryRadius: 40,
      });
      expect(state.crashedIntoPlanet).toBe(true);
    });

    it('should detect collision with OTHER planets while in orbit', () => {
      const p1: CelestialBodyData = {
        id: 'p1',
        position: new Vector3(0, 0, 0),
        radius: 10,
        mass: 1000,
        velocity: new Vector3(),
        atmosphereRadius: 40,
        crashRadius: 11,
      };
      const p2: CelestialBodyData = {
        id: 'p2',
        position: new Vector3(12, 0, 0),
        radius: 5,
        mass: 100,
        velocity: new Vector3(),
        atmosphereRadius: 10,
        crashRadius: 6,
      };

      const state = calculateSimplifiedNextState({
        currentPos: new Vector3(12, 0, 0),
        currentVel: new Vector3(0, 100, 0),
        dt: 0.01,
        planets: [p1, p2],
        orbitingPlanetIndex: 0,
        level: 1,
        capturedSpeed: 100,
        currentOrbitRadius: 12,
        orbitAngle: 0,
        orbitDirection: 1,
        steeringPlanetIndex: null,
        entryPhase: 'orbiting',
        entrySpeed: 100,
        entryRadius: 40,
      });

      expect(state.crashedIntoPlanet).toBe(true);
    });

    it('should respect velocity cap', () => {
      const currentPos = new Vector3(500, 500, 0);
      const currentVel = new Vector3(2000, 0, 0);
      calculateNextState({
        currentPos,
        currentVel,
        dt: 0.1,
        planets: [],
        orbitingPlanetIndex: null,
        level: 1,
        orbitAngle: null,
        orbitDirection: 1,
        capturedSpeed: null,
        currentOrbitRadius: null,
        steeringPlanetIndex: null,
      });
      expect(currentVel.length()).toBeLessThanOrEqual(SOLAR_SYSTEM_VELOCITY_MAX);
    });

    it('should handle gravity from multiple planets', () => {
      const p1: CelestialBodyData = {
        id: 'p1',
        position: new Vector3(-100, 0, 0),
        radius: 10,
        mass: 1000,
        velocity: new Vector3(),
        atmosphereRadius: 40,
        crashRadius: 11,
      };
      const p2: CelestialBodyData = {
        id: 'p2',
        position: new Vector3(100, 0, 0),
        radius: 10,
        mass: 1000,
        velocity: new Vector3(),
        atmosphereRadius: 40,
        crashRadius: 11,
      };
      const currentPos = new Vector3(0, 0, 0);
      const currentVel = new Vector3(0, 0, 0);
      calculateNextState({
        currentPos,
        currentVel,
        dt: 1.0,
        planets: [p1, p2],
        orbitingPlanetIndex: null,
        level: 1,
        orbitAngle: null,
        orbitDirection: 1,
        capturedSpeed: null,
        currentOrbitRadius: null,
        steeringPlanetIndex: null,
      });
      expect(currentVel.x).toBe(0);
      expect(currentVel.y).toBe(0);
    });

    it('should use entrySpeed to proportionally scale the target radius', () => {
      const currentPos = new Vector3(20, 0, 0);
      const currentVel = new Vector3(0, 100, 0);

      const state = calculateSimplifiedNextState({
        currentPos,
        currentVel,
        dt: 0.1,
        planets: [mockPlanet],
        orbitingPlanetIndex: 0,
        level: 1,
        orbitAngle: 0,
        orbitDirection: 1,
        capturedSpeed: 100,
        entrySpeed: 200,
        entryRadius: 40,
        currentOrbitRadius: 20,
        entryPhase: 'orbiting',
        steeringPlanetIndex: null,
      });

      expect(state.currentOrbitRadius).toBeLessThan(20);
    });

    it('should NOT teleport to R_max if captured deep in atmosphere (entryRadius fix)', () => {
      const entryRadius = 10;
      const currentPos = new Vector3(10, 0, 0);
      const currentVel = new Vector3(0, 100, 0);

      const state = calculateSimplifiedNextState({
        currentPos,
        currentVel,
        dt: 0.001,
        planets: [mockPlanet],
        orbitingPlanetIndex: 0,
        level: 1,
        orbitAngle: 0,
        orbitDirection: 1,
        capturedSpeed: 100,
        entrySpeed: 100,
        entryRadius: entryRadius,
        currentOrbitRadius: 10,
        entryPhase: 'orbiting',
        steeringPlanetIndex: null,
      });

      expect(state.currentOrbitRadius).toBeCloseTo(10, 1);
    });

    it('should apply an artificial slingshot hook on steep entries', () => {
      const currentPos = new Vector3(15, 0, 0);
      const currentVel = new Vector3(-600, 0, 0);

      const standardGravityAcc = (SOLAR_SYSTEM_GRAVITATIONAL_CONSTANT * mockPlanet.mass) / Math.max(Math.pow(15, SOLAR_SYSTEM_GRAVITY_FALLOFF_EXPONENT), 0.5);

      calculateSimplifiedNextState({
        currentPos,
        currentVel,
        dt: 0.1,
        planets: [mockPlanet],
        orbitingPlanetIndex: 0,
        level: 1,
        orbitAngle: null,
        orbitDirection: 1,
        capturedSpeed: null,
        entrySpeed: null,
        currentOrbitRadius: null,
        entryPhase: null,
        steeringPlanetIndex: null,
      });

      const expectedNewtonianChange = standardGravityAcc * 0.1;
      const velocityChange = Math.abs(-600 - currentVel.x);
      expect(velocityChange).toBeGreaterThan(expectedNewtonianChange * 1.1);
    });
  });
});
