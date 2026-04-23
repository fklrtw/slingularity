import { useFrame, useThree } from '@react-three/fiber';
import type React from 'react';
import { useRef } from 'react';
import type { Mesh, PerspectiveCamera } from 'three';
import { Box3, Vector3 } from 'three';
import { APP_SUN_POS } from '../app.config';
import type { SystemRefData } from '../entities/solar-system';
import { useGameStore } from '../store';
import {
  CAMERA_DIST_FALLBACK,
  CAMERA_FOV,
  CAMERA_CONFIG_HELIOCENTRIC,
  CAMERA_CONFIG_ALIGNED,
  CAMERA_CONFIG_SHIP,
} from '../camera.config';

/**
 * Properties for the useCameraEffects hook.
 */
export interface UseCameraEffectsProps {
  /** ref to the main spaceship mesh for position tracking */
  spaceshipRef: React.RefObject<Mesh | null>
  /** shared mutable reference to the solar system state for planet tracking */
  systemRef: React.RefObject<SystemRefData>
}

// --- Scratchpad for framing (to avoid GC pressure) ---
const _box = new Box3();
const _size = new Vector3();
const _v1 = new Vector3();
const _v2 = new Vector3();
const _targetCenter = new Vector3();
const _vUp = new Vector3();

/**
 * Manages the dynamic framing and smooth movement of the main game camera
 *
 * It supports multiple modes:
 * - 'default': Adaptive framing of ship and next target.
 * - 'aligned': Fixed sun-portal vertical alignment with ship tracking.
 * - 'ship': Fixed zoom level strictly following the ship.
 * @param props - hook properties including refs to the spaceship and solar system
 */
export function useCameraEffects({ spaceshipRef, systemRef }: UseCameraEffectsProps) {
  const { camera } = useThree();
  const resetCounter = useGameStore(s => s.resetCounter);
  const settings = useGameStore(s => s.settings);

  // persistent refs for smooth interpolation across frames
  const smoothCenterRef = useRef(new Vector3());
  const smoothDistRef = useRef(CAMERA_DIST_FALLBACK);
  const smoothUpRef = useRef(new Vector3(0, 1, 0));
  const lastResetRef = useRef(resetCounter);

  useFrame(() => {
    // ensure refs are in sync with the current store state
    if (!systemRef.current || systemRef.current.counter !== resetCounter) {
      return;
    }
    if (!spaceshipRef.current || spaceshipRef.current.userData.resetCounter !== resetCounter) {
      return;
    }

    const { annihilatedPlanets, isFinishing, portalPosition } = useGameStore.getState();

    // snap immediately on level change to prevent panning from old position
    const isNewLevel = lastResetRef.current !== resetCounter;
    lastResetRef.current = resetCounter;

    const shipPos = spaceshipRef.current.position;
    const shipDist = shipPos.distanceTo(APP_SUN_POS);
    const planets = systemRef.current.planets;

    // determine active config based on current camera mode
    const config = settings.cameraMode === 'ship'
      ? CAMERA_CONFIG_SHIP
      : (settings.cameraMode === 'aligned' ? CAMERA_CONFIG_ALIGNED : CAMERA_CONFIG_HELIOCENTRIC);

    // identify the next target: either a planet or the end portal
    let nextTargetPos = portalPosition;

    if (!isFinishing) {
      const skipBuffer = 'skipBuffer' in config ? config.skipBuffer : CAMERA_CONFIG_HELIOCENTRIC.skipBuffer;
      for (let i = 0; i < planets.length; i++) {
        const p = planets[i];
        // skip sun, comets, and already cleared planets
        if (p.isSun || p.isComet || annihilatedPlanets.has(i)) {
          continue;
        }
        const planetDist = p.position.distanceTo(APP_SUN_POS);
        // find first planet that is beyond the spaceship's current radial progress
        if (planetDist > shipDist - skipBuffer) {
          nextTargetPos = p.position;
          break;
        }
      }
    }

    // calculate bounding box for current view (ship + target)
    _box.makeEmpty();
    // expand by spaceship and its immediate vicinity to ensure it's not clipped
    _box.expandByPoint(_v1.copy(shipPos).addScalar(5));
    _box.expandByPoint(_v1.copy(shipPos).subScalar(5));

    if (nextTargetPos) {
      // expand to include the target point for framing
      _box.expandByPoint(nextTargetPos);
    }

    // apply symmetric padding around the computed bounds
    const bufferVal = 'boxBuffer' in config ? config.boxBuffer : CAMERA_CONFIG_HELIOCENTRIC.boxBuffer;
    _box.min.x -= bufferVal;
    _box.min.y -= bufferVal;
    _box.max.x += bufferVal;
    _box.max.y += bufferVal;
    _box.min.z = 0;
    _box.max.z = 0;

    _box.getCenter(_targetCenter);
    _box.getSize(_size);

    let targetDistance: number;

    if (settings.cameraMode === 'ship') {
      // centered strictly on the ship
      _targetCenter.copy(shipPos);
      targetDistance = CAMERA_CONFIG_SHIP.dist;
    } else if (settings.cameraMode === 'aligned' && portalPosition) {
      // mode where sun-portal defines the 'North' axis
      const axis = _v1.copy(portalPosition).sub(APP_SUN_POS).normalize();

      // project ship onto the sun-portal axis relative to the sun
      const shipRel = _v2.copy(shipPos).sub(APP_SUN_POS);
      const projectionDist = shipRel.dot(axis);
      const posOnAxis = _v1.copy(axis).multiplyScalar(projectionDist).add(APP_SUN_POS);

      // determine deviation from the axis (the 'West-East' component)
      const perp = _v2.copy(shipPos).sub(posOnAxis);

      // damp the deviation so the camera stays mostly locked to the axis
      _targetCenter.copy(posOnAxis).add(perp.multiplyScalar(CAMERA_CONFIG_ALIGNED.deviationFactor));

      // calculate zoom distance required to fit the bounding box within FOV
      const cameraAspect = (camera as PerspectiveCamera).aspect || 1;
      const maxDim = Math.max(_size.x / cameraAspect, _size.y);
      const fovRad = CAMERA_FOV * (Math.PI / 180);
      targetDistance = maxDim / (2 * Math.tan(fovRad / 2));
    } else {
      // default behavior: adaptive zoom and centering on the midpoint
      const cameraAspect = (camera as PerspectiveCamera).aspect || 1;
      const maxDim = Math.max(_size.x / cameraAspect, _size.y);
      const fovRad = CAMERA_FOV * (Math.PI / 180);
      targetDistance = maxDim / (2 * Math.tan(fovRad / 2));
    }

    // sanity check for numerical stability
    if (isNaN(targetDistance) || !isFinite(targetDistance)) {
      targetDistance = CAMERA_DIST_FALLBACK;
    }

    // apply min/max constraints and additive buffer for non-ship modes
    if (settings.cameraMode !== 'ship' && 'minDist' in config && 'addDist' in config) {
      targetDistance = Math.max(targetDistance, config.minDist) + config.addDist;
    }

    // apply smoothing interpolations
    let lerpAlpha = config.smoothing;
    if (isNewLevel) {
      // snap immediately on level load
      lerpAlpha = 1.0;
    }

    smoothCenterRef.current.lerp(_targetCenter, lerpAlpha);
    smoothDistRef.current += (targetDistance - smoothDistRef.current) * lerpAlpha;

    // determine camera 'up' orientation
    const targetUp = _vUp.set(0, 1, 0);
    if (settings.cameraMode === 'aligned' && portalPosition) {
      // align 'up' with the portal direction
      targetUp.copy(portalPosition).sub(APP_SUN_POS).normalize();
      if (targetUp.lengthSq() < 0.01) {
        targetUp.set(0, 1, 0);
      }
    } else if (settings.cameraMode === 'ship' && spaceshipRef.current) {
      // align 'up' with the ship's own orientation (local 'up')
      targetUp.set(0, 1, 0).applyQuaternion(spaceshipRef.current.quaternion).normalize();
    }

    smoothUpRef.current.lerp(targetUp, lerpAlpha).normalize();

    // sync camera position and orientation (top-down perspective)
    camera.position.set(smoothCenterRef.current.x, smoothCenterRef.current.y, smoothDistRef.current);
    camera.up.copy(smoothUpRef.current);
    camera.lookAt(smoothCenterRef.current.x, smoothCenterRef.current.y, 0);
  }, -1);
}
