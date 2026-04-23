import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import { AdditiveBlending, Color, Matrix4, Vector3, CircleGeometry, type InstancedMesh } from 'three';
import { APP_SUN_POS } from '../app.config';
import { SOLAR_SYSTEM_COMET_TAIL } from './solar-system.config';
import { useGameStore } from '../store';

interface CometTailProps {
  cometPosition: Vector3
  cometVelocity: Vector3
  cometRadius: number
  isAnnihilated: boolean
  color: Color
}

/**
 * CometTail component
 *
 * Renders a dynamic tail that follows the comet, spreads out, fades,
 * and is pushed away from the sun by "solar wind".
 * Moves to layer 1 to be invisible on the minimap.
 */
export function CometTail({ cometPosition, cometVelocity, cometRadius, isAnnihilated, color }: CometTailProps) {
  const count = SOLAR_SYSTEM_COMET_TAIL.length;
  const meshRef = useRef<InstancedMesh>(null);
  const sunStatus = useGameStore(s => s.sunStatus);

  // History of segments stored in a ref for performance
  const segmentsRef = useRef(Array.from({ length: count }, () => ({
    position: new Vector3().copy(cometPosition),
    velocity: new Vector3(),
    scale: 1,
    alpha: 0,
    active: false,
  })));

  const headRef = useRef(0);
  const lastUpdateRef = useRef(0);
  const sharedCircleGeo = useMemo(() => {
    const geo = new CircleGeometry(1, 8);
    geo.computeBoundingSphere();
    if (geo.boundingSphere) {
      geo.boundingSphere.radius = 10000;
    }
    return geo;
  }, []);

  const _matrix = useMemo(() => new Matrix4(), []);
  const _color = useMemo(() => new Color(), []);
  const _v1 = useMemo(() => new Vector3(), []);

  useFrame((state, delta) => {
    if (!meshRef.current) {
      return;
    }

    const time = state.clock.getElapsedTime();
    const dt = Math.min(delta, 0.1);
    const segments = segmentsRef.current;

    // Adjust wind speed based on sun status
    let windSpeed = SOLAR_SYSTEM_COMET_TAIL.windSpeed;
    if (sunStatus === 'supernova_expanding' || sunStatus === 'supernova_flash') {
      windSpeed *= 3.0;
    } else if (sunStatus === 'remnant') {
      windSpeed *= 0.1;
    }

    // 1. Update existing segments
    let anyActive = false;
    for (let i = 0; i < count; i++) {
      const seg = segments[i];
      if (!seg.active) {
        continue;
      }

      anyActive = true;

      // Inherit initial momentum (with decay)
      seg.position.add(_v1.copy(seg.velocity).multiplyScalar(dt));
      seg.velocity.multiplyScalar(Math.max(0, 1.0 - dt * 3.0));

      // Move away from sun (solar wind force)
      _v1.subVectors(seg.position, APP_SUN_POS).normalize();
      seg.position.add(_v1.multiplyScalar(windSpeed * dt));

      // Spread out
      seg.scale += SOLAR_SYSTEM_COMET_TAIL.spreadRate * dt * 10.0;

      // Fade out based on age
      seg.alpha -= dt * 1.5;

      if (seg.alpha <= 0) {
        seg.active = false;
      }
    }

    // 2. Add new segment at comet position (ring buffer)
    if (!isAnnihilated && time - lastUpdateRef.current > 0.012) {
      const idx = headRef.current;
      const newSeg = segments[idx];

      newSeg.position.copy(cometPosition);
      newSeg.velocity.copy(cometVelocity).multiplyScalar(SOLAR_SYSTEM_COMET_TAIL.momentumFactor);

      newSeg.scale = 1.0;
      newSeg.alpha = 1.0;
      newSeg.active = true;

      headRef.current = (idx + 1) % count;
      lastUpdateRef.current = time;
      anyActive = true;
    }

    // 3. Update InstancedMesh
    for (let i = 0; i < count; i++) {
      const seg = segments[i];
      if (seg.active) {
        const s = cometRadius * SOLAR_SYSTEM_COMET_TAIL.startWidth * seg.scale;
        _matrix.makeTranslation(seg.position.x, seg.position.y, seg.position.z);
        _matrix.scale(_v1.set(s, s, s));
        meshRef.current.setMatrixAt(i, _matrix);

        meshRef.current.setColorAt(i, _color.copy(color).multiplyScalar(seg.alpha * SOLAR_SYSTEM_COMET_TAIL.opacity));
      } else {
        _matrix.makeScale(0, 0, 0);
        meshRef.current.setMatrixAt(i, _matrix);
      }
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }

    meshRef.current.visible = anyActive;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[sharedCircleGeo, undefined, count]}
      layers={1}
    >
      <meshBasicMaterial
        transparent
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
