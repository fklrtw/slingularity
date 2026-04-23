/* eslint-disable react-hooks/immutability */
import { useFrame, useThree } from '@react-three/fiber';
import type React from 'react';
import { useMemo, useEffect, useRef } from 'react';
import { PerspectiveCamera, OrthographicCamera, ArrayCamera, Vector4, Vector3, Box3, type Mesh } from 'three';
import {
  MINIMAP_BG_Z,
  MINIMAP_CAMERA_Z,
  MINIMAP_FAR, MINIMAP_MARGIN, MINIMAP_MIN_SIZE,
  MINIMAP_NEAR, MINIMAP_PADDING, MINIMAP_SCREEN_RATIO,
} from '../components/ui/minimap.config';
import { CAMERA_FOV, CAMERA_NEAR, CAMERA_FAR, CAMERA_INITIAL_POS } from '../camera.config';
import { APP_SUN_POS } from '../app.config';
import { useGameStore } from '../store';

// --- Scratchpad for framing (to avoid GC pressure) ---
const _box = new Box3();
const _center = new Vector3();
const _size = new Vector3();

/**
 * Properties for the useMinimapEffects hook.
 */
export interface UseMinimapEffectsProps {
  bgRef: React.RefObject<Mesh | null>
}

/**
 * Manages the dual-viewport camera system for the main game and minimap
 *
 * Configures an ArrayCamera with a full-screen perspective view and a
 * top-right orthographic overlay. Dynamically frames the minimap to
 * encompass the Sun and the Target Portal.
 * @param props - hook properties including ref to the minimap background mesh
 */
export function useMinimapEffects({ bgRef }: UseMinimapEffectsProps) {
  const { size, set, camera: defaultCamera, gl } = useThree();

  // sub-cameras managed via useMemo for stable mutable objects
  const mainCamera = useMemo(() => {
    const cam = new PerspectiveCamera(CAMERA_FOV, size.width / size.height, CAMERA_NEAR, CAMERA_FAR) as PerspectiveCamera & { viewport: Vector4 };
    cam.position.fromArray(CAMERA_INITIAL_POS);
    cam.layers.enable(1); // main camera sees objects (0) and background (1)
    cam.viewport = new Vector4();
    return cam;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const minimapCamera = useMemo(() => {
    const cam = new OrthographicCamera(-1, 1, 1, -1, MINIMAP_NEAR, MINIMAP_FAR) as OrthographicCamera & { viewport: Vector4 };
    cam.position.set(0, 0, MINIMAP_CAMERA_Z);
    cam.layers.set(0); // minimap sees objects (0)
    cam.layers.enable(2); // minimap also sees its own background (2)
    cam.viewport = new Vector4();
    return cam;
  }, []);

  const arrayCamera = useMemo(() => {
    const arrayCam = new ArrayCamera([mainCamera, minimapCamera] as unknown as PerspectiveCamera[]);
    arrayCam.layers.enable(1);
    arrayCam.layers.enable(2);
    return arrayCam;
  }, [mainCamera, minimapCamera]);

  useEffect(() => {
    // override the default canvas camera
    set({ camera: arrayCamera });

    const renderer = gl as unknown as { autoClear: boolean };
    const originalAutoClear = renderer.autoClear;
    renderer.autoClear = true;

    return () => {
      set({ camera: defaultCamera });
      renderer.autoClear = originalAutoClear;
    };
  }, [arrayCamera, set, defaultCamera, gl]);

  const frameCountRef = useRef(0);
  const layoutCacheRef = useRef({ top: MINIMAP_PADDING, right: MINIMAP_PADDING });

  useFrame(() => {
    frameCountRef.current++;
    const dpr = gl.getPixelRatio();

    // --- 1. Update Main Camera ---
    // Viewport coordinates must be in physical pixels
    mainCamera.viewport.set(0, 0, size.width * dpr, size.height * dpr);
    mainCamera.aspect = size.width / size.height;
    mainCamera.updateProjectionMatrix();

    // sync with the ArrayCamera's global transform (set by CameraManager)
    mainCamera.position.copy(arrayCamera.position);
    mainCamera.quaternion.copy(arrayCamera.quaternion);
    mainCamera.updateMatrixWorld();

    // --- 2. Update Minimap Camera ---
    const mapSize = Math.min(size.width, size.height) * MINIMAP_SCREEN_RATIO;

    // Only update minimap layout and framing every 2 frames (30Hz)
    if (frameCountRef.current % 2 !== 0) {
      return;
    }

    // Throttle expensive DOM lookups to ~once per second
    if (frameCountRef.current % 60 === 0) {
      const borderEl = document.querySelector('.hud-minimap-border');
      if (borderEl) {
        const style = window.getComputedStyle(borderEl);
        layoutCacheRef.current.top = parseFloat(style.top) || MINIMAP_PADDING;
        layoutCacheRef.current.right = parseFloat(style.right) || MINIMAP_PADDING;
      }
    }
    const { top, right } = layoutCacheRef.current;

    minimapCamera.viewport.set(
      (size.width - mapSize - right) * dpr,
      (size.height - mapSize - top) * dpr,
      mapSize * dpr,
      mapSize * dpr,
    );

    // frame the system: Sun to Portal
    const { portalPosition } = useGameStore.getState();
    _box.makeEmpty();
    _box.expandByPoint(APP_SUN_POS);
    _box.expandByPoint(portalPosition);

    if (!_box.isEmpty()) {
      _box.getCenter(_center);
      _box.getSize(_size);

      const margin = MINIMAP_MARGIN;
      const halfSize = Math.max(_size.x, _size.y, MINIMAP_MIN_SIZE) * margin / 2;

      minimapCamera.left = -halfSize;
      minimapCamera.right = halfSize;
      minimapCamera.top = halfSize;
      minimapCamera.bottom = -halfSize;

      minimapCamera.position.set(_center.x, _center.y, MINIMAP_CAMERA_Z);
      minimapCamera.lookAt(_center);
      minimapCamera.updateProjectionMatrix();
      minimapCamera.updateMatrixWorld();

      // sync the local background plane to the view
      if (bgRef.current) {
        bgRef.current.position.set(_center.x, _center.y, MINIMAP_BG_Z);
        bgRef.current.scale.set(halfSize * 2, halfSize * 2, 1);
      }
    }
  });
}
