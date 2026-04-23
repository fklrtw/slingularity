/**
 * Spaceship movement integration and orbital capture logic.
 * Made with the help of Gemini.
 */
import { Vector3 } from 'three';
import type { CelestialBodyData } from '../entities/planet';
import {
  PLANETS_ATMOSPHERIC_DRAG_FACTOR,
  PLANETS_ORBIT_RADIUS_COUPLING_FACTOR
} from '../entities/planet.config';
import {
  SOLAR_SYSTEM_SUN_GRAVITY_FACTOR,
  SOLAR_SYSTEM_GRAVITATIONAL_CONSTANT,
  SOLAR_SYSTEM_GRAVITY_FALLOFF_EXPONENT, SOLAR_SYSTEM_VELOCITY_MAX, SOLAR_SYSTEM_ANNIHILATION_BOOST_MULTIPLIER
} from '../entities/solar-system.config';
import {
  SPACESHIP_ARTIFICIAL_HOOK_FACTOR,
  SPACESHIP_PRE_ENTRY_STEPS,
  SPACESHIP_STEER_SHALLOW_FACTOR,
  SPACESHIP_STEER_STEEP_HOOK_FACTOR,
  SPACESHIP_STEER_STEEP_THRESHOLD,
} from '../entities/spaceship.config';

/**
 * Result of Spaceship movement functions.
 * Position and Velocity are mutated in place.
 */
export interface SpaceshipMovementResult {
  orbitAngle: number | null
  orbitDirection: number
  capturedSpeed: number | null
  currentOrbitRadius: number | null
  steeringPlanetIndex: number | null
  orbitingPlanetIndex: number | null
  crashedIntoPlanet: boolean
  entryPhase?: 'shallow' | 'steep' | 'orbiting' | null
  entrySpeed?: number | null
  entryRadius?: number | null
}

/**
 * Parameters for Spaceship movement functions
 */
export interface SpaceshipPhysicsParams {
  currentPos: Vector3
  currentVel: Vector3
  dt: number
  planets: CelestialBodyData[]
  orbitingPlanetIndex: number | null
  annihilatedPlanets?: Set<number>
  lastAnnihilatedPlanetIndex?: number | null
  level: number
  orbitAngle: number | null
  orbitDirection: number
  capturedSpeed: number | null
  currentOrbitRadius?: number | null
  steeringPlanetIndex: number | null
  entryPhase?: 'shallow' | 'steep' | 'orbiting' | null
  entrySpeed?: number | null
  entryRadius?: number | null
}

// --- Scratchpad Vectors (to avoid GC allocations in hot paths) ---
const _v3 = new Vector3();
const _v4 = new Vector3();
const _totalAcc = new Vector3();

/**
 * Discards planet velocity influence and applies a scalar multiplier boost to the absolute velocity.
 * The spaceship maintains its current absolute heading.
 * Mutates pos and vel in place.
 */
export function applyAnnihilationBoost(pos: Vector3, vel: Vector3, dt: number): SpaceshipMovementResult {
  // Apply scalar boost multiplier to the absolute velocity
  const speed = vel.length();

  // Use _v3 as temporary for normalized direction to avoid allocation
  _v3.copy(vel).normalize();

  const boostedSpeed = speed * SOLAR_SYSTEM_ANNIHILATION_BOOST_MULTIPLIER;
  vel.copy(_v3).multiplyScalar(boostedSpeed);

  // Enforce velocity cap during boost
  if (vel.length() > SOLAR_SYSTEM_VELOCITY_MAX) {
    vel.normalize().multiplyScalar(SOLAR_SYSTEM_VELOCITY_MAX);
  }

  pos.addScaledVector(vel, dt);

  return {
    orbitAngle: null, orbitDirection: 1, capturedSpeed: null, currentOrbitRadius: null,
    steeringPlanetIndex: null, crashedIntoPlanet: false, orbitingPlanetIndex: null,
    entryPhase: null, entrySpeed: null, entryRadius: null,
  };
}

/**
 * NEWTONIAN PHYSICS (Free Flight / Gravity Steering)
 * Handles multi-body gravity and steering guided by planet proximity.
 * Mutates currentPos and currentVel in place.
 */
export function calculateNewtonianNextState(params: SpaceshipPhysicsParams): SpaceshipMovementResult {
  const { currentPos, currentVel, dt, planets, annihilatedPlanets = new Set(), lastAnnihilatedPlanetIndex } = params;

  let crashedIntoPlanet = false;

  // 1. Priority Annihilation Check (One-time Atmosphere Boost)
  if (lastAnnihilatedPlanetIndex !== null && lastAnnihilatedPlanetIndex !== undefined) {
    const p = planets[lastAnnihilatedPlanetIndex];
    if (p && !p.isSun) {
      const distSq = p.position.distanceToSquared(currentPos);
      const bandDist = p.atmosphereRadius;
      if (distSq <= bandDist * bandDist) {
        return applyAnnihilationBoost(currentPos, currentVel, dt);
      }
    }
  }

  // 2. Physics Simulation
  _totalAcc.set(0, 0, 0);

  for (let i = 0; i < planets.length; i++) {
    const p = planets[i];
    if (annihilatedPlanets.has(i)) {
      continue;
    }

    const rVec = _v3.subVectors(p.position, currentPos);
    const distSq = rVec.lengthSq();
    const dist = Math.sqrt(distSq);
    const dir = _v4.copy(rVec).multiplyScalar(1 / (dist || 1));

    // Multi-body Newtonian Gravity
    const distPow = Math.max(SOLAR_SYSTEM_GRAVITY_FALLOFF_EXPONENT === 2 ? distSq : Math.pow(dist, SOLAR_SYSTEM_GRAVITY_FALLOFF_EXPONENT), 0.5);
    const accMag = (SOLAR_SYSTEM_GRAVITATIONAL_CONSTANT * p.mass * (p.isSun ? SOLAR_SYSTEM_SUN_GRAVITY_FACTOR : 1.0)) / distPow;
    _totalAcc.addScaledVector(dir, accMag);

    if (!p.isSun) {
      if (distSq < p.crashRadius * p.crashRadius) {
        crashedIntoPlanet = true;
      }
    }
  }

  currentVel.addScaledVector(_totalAcc, dt);

  // 3. Pre-Entry Shallow Turn Check (Forward Simulation)
  for (let i = 0; i < planets.length; i++) {
    const p = planets[i];
    if (p.isSun || annihilatedPlanets.has(i)) {
      continue;
    }

    const bandDist = p.atmosphereRadius;

    // Ray-circle intersection
    const dX = currentPos.x - p.position.x;
    const dY = currentPos.y - p.position.y;
    const vX = currentVel.x;
    const vY = currentVel.y;

    const a = vX * vX + vY * vY;
    const b = 2 * (dX * vX + dY * vY);
    const c = dX * dX + dY * dY - bandDist * bandDist;

    const delta = b * b - 4 * a * c;

    if (delta >= 0 && a > 0.0001) {
      const t1 = (-b - Math.sqrt(delta)) / (2 * a);
      // Check if intersection happens within our forward simulation window
      if (t1 > 0 && t1 < dt * SPACESHIP_PRE_ENTRY_STEPS) {
        const intersectX = currentPos.x + vX * t1;
        const intersectY = currentPos.y + vY * t1;

        // Normal vector at the point of intersection
        const nx = intersectX - p.position.x;
        const ny = intersectY - p.position.y;
        const nLen = Math.sqrt(nx * nx + ny * ny);

        // Tangent vector
        let tx = -ny / nLen;
        let ty = nx / nLen;

        // Align tangent to follow the ship's general heading
        if (vX * tx + vY * ty < 0) {
          tx = -tx;
          ty = -ty;
        }

        const vLen = Math.sqrt(vX * vX + vY * vY);
        const dot = (vX * tx + vY * ty) / vLen;
        const angleDeg = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);

        // If it's a shallow entry, smoothly bend the velocity toward the tangent
        if (angleDeg <= SPACESHIP_STEER_STEEP_THRESHOLD) {
          // Strength increases as we get closer
          const lerpFactor = (1.0 - t1 / (dt * SPACESHIP_PRE_ENTRY_STEPS)) * SPACESHIP_STEER_SHALLOW_FACTOR * dt;
          const clampedLerp = Math.min(1.0, Math.max(0, lerpFactor));

          currentVel.x = currentVel.x * (1 - clampedLerp) + tx * vLen * clampedLerp;
          currentVel.y = currentVel.y * (1 - clampedLerp) + ty * vLen * clampedLerp;
        }
      }
    }
  }

  // Velocity Cap
  if (currentVel.length() > SOLAR_SYSTEM_VELOCITY_MAX) {
    currentVel.normalize().multiplyScalar(SOLAR_SYSTEM_VELOCITY_MAX);
  }

  currentPos.addScaledVector(currentVel, dt);

  return {
    orbitAngle: null, orbitDirection: 1, capturedSpeed: null, currentOrbitRadius: null,
    steeringPlanetIndex: null, orbitingPlanetIndex: null,
    crashedIntoPlanet, entryPhase: null, entrySpeed: null, entryRadius: null,
  };
}

/**
 * SIMPLIFIED PHYSICS (Hook and Orbit Model)
 * Handles circular/spiraling motion relative to an active planet.
 * Mutates currentPos and currentVel in place.
 */
export function calculateSimplifiedNextState(params: SpaceshipPhysicsParams): SpaceshipMovementResult {
  const { currentPos, currentVel, dt, planets, orbitingPlanetIndex, annihilatedPlanets = new Set() } = params;
  let { orbitAngle, orbitDirection, capturedSpeed, currentOrbitRadius, entryPhase, entrySpeed, entryRadius } = params;

  const p = planets[orbitingPlanetIndex!];
  if (!p || annihilatedPlanets.has(orbitingPlanetIndex!)) {
    return applyAnnihilationBoost(currentPos, currentVel, dt);
  }

  const bandDist = p.atmosphereRadius;
  const crashDist = p.crashRadius;

  // 1. Initial State Sync
  if (capturedSpeed === null || entryPhase === null || entryPhase === undefined) {
    capturedSpeed = currentVel.length();
    entrySpeed = capturedSpeed; // Store initial entry speed
    const rVec = _v3.subVectors(currentPos, p.position);
    orbitDirection = (rVec.x * currentVel.y - rVec.y * currentVel.x) >= 0 ? 1 : -1;

    // Tangent to atmosphere
    const rLen = rVec.length();
    let tx = -rVec.y / rLen;
    let ty = rVec.x / rLen;
    if (orbitDirection < 0) {
      tx = -tx;
      ty = -ty;
    }

    const dot = (currentVel.x * tx + currentVel.y * ty) / capturedSpeed;
    const angleDeg = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);

    if (angleDeg > SPACESHIP_STEER_STEEP_THRESHOLD) {
      entryPhase = 'steep';
    } else {
      entryPhase = 'orbiting';
      orbitAngle = Math.atan2(rVec.y, rVec.x);
    }
    currentOrbitRadius = rLen;
  }

  let crashedIntoPlanet = false;

  if (entryPhase === 'steep') {
    // --- STEEP ENTRY (Parabolic Arc) ---

    // 1. Newtonian Gravity Pull + Artificial Slingshot Hook
    _totalAcc.set(0, 0, 0);
    const rVec = _v3.subVectors(p.position, currentPos);
    const distSq = rVec.lengthSq();
    const dist = Math.sqrt(distSq);
    const dir = _v4.copy(rVec).multiplyScalar(1 / (dist || 1));

    const distPow = Math.max(SOLAR_SYSTEM_GRAVITY_FALLOFF_EXPONENT === 2 ? distSq : Math.pow(dist, SOLAR_SYSTEM_GRAVITY_FALLOFF_EXPONENT), 0.5);
    const baseGravity = (SOLAR_SYSTEM_GRAVITATIONAL_CONSTANT * p.mass * (p.isSun ? SOLAR_SYSTEM_SUN_GRAVITY_FACTOR : 1.0)) / distPow;

    const currentSpeed = currentVel.length();

    const radialDot = (currentPos.x - p.position.x) * currentVel.x + (currentPos.y - p.position.y) * currentVel.y;
    const isAscendingInitial = radialDot > 0;

    if (isAscendingInitial) {
      const depthFactor = Math.max(0, Math.min(1, (bandDist - dist) / (bandDist - crashDist)));
      const requiredCentripetal = (currentSpeed * currentSpeed) / Math.max(0.1, dist);
      const hookGravity = requiredCentripetal * depthFactor * SPACESHIP_ARTIFICIAL_HOOK_FACTOR;

      // Find the normal vector perpendicular to velocity that points towards the planet
      let nx = -currentVel.y;
      let ny = currentVel.x;
      // Normalize
      const nLen = Math.sqrt(nx * nx + ny * ny);
      if (nLen > 0.0001) {
        nx /= nLen;
        ny /= nLen;
        // Check if it points towards the planet
        if (nx * dir.x + ny * dir.y < 0) {
          nx = -nx;
          ny = -ny;
        }
        _totalAcc.x += nx * hookGravity;
        _totalAcc.y += ny * hookGravity;
      }
    }

    _totalAcc.addScaledVector(dir, baseGravity);

    currentVel.addScaledVector(_totalAcc, dt);

    // 2. Atmospheric Drag
    const rMaxMinusR = Math.max(0, bandDist - dist);
    const dragDrop = (Math.pow(rMaxMinusR, 2) + PLANETS_ATMOSPHERIC_DRAG_FACTOR) * dt;

    if (currentSpeed > 0) {
      const dragMag = Math.max(0, currentSpeed - dragDrop);
      currentVel.normalize().multiplyScalar(dragMag);
    }

    // 3. Update Position
    if (currentVel.length() > SOLAR_SYSTEM_VELOCITY_MAX) {
      currentVel.normalize().multiplyScalar(SOLAR_SYSTEM_VELOCITY_MAX);
    }
    currentPos.addScaledVector(currentVel, dt);

    const newDist = currentPos.distanceTo(p.position);
    currentOrbitRadius = newDist;

    // 4. Smooth Turn into Orbit
    const dotProd = (currentPos.x - p.position.x) * currentVel.x + (currentPos.y - p.position.y) * currentVel.y;
    const isAscending = dotProd > 0;

    const halfwayDist = crashDist + (bandDist - crashDist) * 0.5;
    if (isAscending && currentOrbitRadius > halfwayDist) {
      const rVecNorm = _v3.subVectors(currentPos, p.position).normalize();
      let tx = -rVecNorm.y;
      let ty = rVecNorm.x;
      if (orbitDirection < 0) {
        tx = -tx;
        ty = -ty;
      }

      const vR = currentVel.x * rVecNorm.x + currentVel.y * rVecNorm.y;
      const vT = currentVel.x * tx + currentVel.y * ty;

      const currentAngle = Math.atan2(vR, Math.max(0.001, vT));
      const distFraction = Math.max(0, (bandDist - currentOrbitRadius) / (bandDist - halfwayDist));
      const maxTargetAngle = (Math.PI / 3) * Math.sqrt(distFraction);
      const targetAngle = Math.min(currentAngle, maxTargetAngle);

      const angleDiff = targetAngle - currentAngle;
      const pullStrength = SPACESHIP_STEER_STEEP_HOOK_FACTOR * dt / Math.max(0.01, distFraction);
      const newAngle = currentAngle + angleDiff * Math.min(1.0, pullStrength);

      const speed = currentVel.length();
      const newVr = speed * Math.sin(newAngle);
      const newVt = speed * Math.cos(newAngle);

      currentVel.x = rVecNorm.x * newVr + tx * newVt;
      currentVel.y = rVecNorm.y * newVr + ty * newVt;

      if (currentOrbitRadius >= bandDist - speed * dt) {
        entryPhase = 'orbiting';
        orbitAngle = Math.atan2(rVecNorm.y, rVecNorm.x);
        capturedSpeed = speed;
        entrySpeed = speed;
        entryRadius = bandDist;
      }
    } else if (currentOrbitRadius > bandDist + 0.5) {
      return {
        orbitAngle: null, orbitDirection, capturedSpeed: null, currentOrbitRadius: null,
        steeringPlanetIndex: null, orbitingPlanetIndex: null, crashedIntoPlanet, entryPhase: null, entrySpeed: null,
      };
    }
  } else {
    // --- SHALLOW ENTRY / ORBITING (Hook and Orbit Model) ---
    const rMaxMinusR = Math.max(0, bandDist - (currentOrbitRadius || bandDist));
    const drag = (Math.pow(rMaxMinusR, 2) + PLANETS_ATMOSPHERIC_DRAG_FACTOR) * dt;
    capturedSpeed = Math.max(0, (capturedSpeed ?? currentVel.length()) - drag);

    const vRatio = entrySpeed && entrySpeed > 0 ? Math.max(0, Math.min(1.0, capturedSpeed / entrySpeed)) : 1.0;
    const targetRadius = vRatio * (entryRadius || bandDist);

    if (currentOrbitRadius === null || currentOrbitRadius === undefined) {
      currentOrbitRadius = currentPos.distanceTo(p.position);
    }

    currentOrbitRadius = currentOrbitRadius + (targetRadius - currentOrbitRadius) * Math.min(1.0, PLANETS_ORBIT_RADIUS_COUPLING_FACTOR * 5.0 * dt);

    const omega = currentOrbitRadius > 0.001 ? (capturedSpeed / currentOrbitRadius) * orbitDirection : 0;
    orbitAngle = (orbitAngle || 0) + omega * dt;

    currentPos.set(
      p.position.x + Math.cos(orbitAngle) * currentOrbitRadius,
      p.position.y + Math.sin(orbitAngle) * currentOrbitRadius,
      0,
    );

    const rVec = _v3.subVectors(currentPos, p.position);
    const radius = Math.max(0.001, currentOrbitRadius);
    const tangent = _v4.set(-rVec.y / radius * orbitDirection, rVec.x / radius * orbitDirection, 0);
    currentVel.copy(tangent).multiplyScalar(capturedSpeed);
  }

  for (let i = 0; i < planets.length; i++) {
    if (annihilatedPlanets.has(i)) {
      continue;
    }
    const planet = planets[i];
    const distSqToPlanet = currentPos.distanceToSquared(planet.position);
    if (distSqToPlanet < planet.crashRadius * planet.crashRadius) {
      crashedIntoPlanet = true;
      break;
    }
  }

  return {
    orbitAngle,
    orbitDirection,
    capturedSpeed,
    currentOrbitRadius,
    steeringPlanetIndex: null,
    orbitingPlanetIndex: crashedIntoPlanet ? null : orbitingPlanetIndex,
    crashedIntoPlanet,
    entryPhase,
    entrySpeed,
    entryRadius,
  };
}

/**
 * main orchestrator for Spaceship movement.
 * Mutates currentPos and currentVel in place.
 */
export function calculateNextState(params: SpaceshipPhysicsParams): SpaceshipMovementResult {
  if (params.orbitingPlanetIndex !== null) {
    return calculateSimplifiedNextState(params);
  }
  return calculateNewtonianNextState(params);
}

/**
 * check if the Spaceship has collided with the sun.
 */
export function checkSunCollision(shipPos: Vector3, sunPos: Vector3, sunRadius: number): boolean {
  return shipPos.distanceToSquared(sunPos) < sunRadius * sunRadius;
}

/**
 * check if the Spaceship should enter orbit around a nearby planet.
 */
export function checkOrbitCapture(shipPos: Vector3, shipVel: Vector3, planets: CelestialBodyData[], annihilatedPlanets: Set<number>): number | null {
  for (let i = 0; i < planets.length; i++) {
    const p = planets[i];
    if (p.isSun || annihilatedPlanets.has(i)) {
      continue;
    }

    const distSq = p.position.distanceToSquared(shipPos);
    const bandDist = p.atmosphereRadius;

    if (distSq <= bandDist * bandDist) {
      return i;
    }
  }
  return null;
}
