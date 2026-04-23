/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook } from '@testing-library/react';
import type * as FiberType from '@react-three/fiber';
import { useFrame, type RenderCallback } from '@react-three/fiber';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { type RefObject } from 'react';
import { type Group, type Mesh, type MeshBasicMaterial, Vector3, Quaternion, Object3D } from 'three';
import { usePortalEffects } from './use-portal-effects';
import { type GameState, useGameStore } from '../store';
import {
  PORTALS_PORTAL_SWELL_DURATION,
  PORTALS_PORTAL_COLLAPSE_DURATION,
  PORTALS_PORTAL_DIST_OFFSET,
} from '../entities/portal.config';
import type { SystemRefData } from '../entities/solar-system';

// Mock @react-three/fiber
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));

// Mock Store
vi.mock('../store', () => {
  const storeFn = vi.fn();

  (storeFn as any).getState = vi.fn(() => (storeFn as any).__mockState || {});
  return { useGameStore: storeFn };
});

describe('usePortalEffects', () => {
  let frameCallback: RenderCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFrame).mockImplementation((cb: RenderCallback) => {
      frameCallback = cb;
      return null;
    });

    // Default store state
    const __stateDef = {
      resetCounter: 0,
      isFinishing: false,
      isStarting: false,
      levelFinished: false,
      gameStarted: true,
      settingsMenuOpen: false,
      setPortalPosition: vi.fn(),
      finishStarting: vi.fn(),
      portalPosition: new Vector3(200, 0, 0),
    } as unknown as GameState;
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(__stateDef));

    (useGameStore as any).__mockState = __stateDef;
  });

  const createMockGroup = () => ({
    position: new Vector3(),
    scale: new Vector3(1, 1, 1),
    rotation: { z: 0, x: 0, y: 0 },
    quaternion: new Quaternion(),
    lookAt: vi.fn(),
    visible: true,
  }) as unknown as Group;

  const createMockMesh = () => ({
    scale: new Vector3(1, 1, 1),
    material: { opacity: 1 } as unknown as MeshBasicMaterial,
  }) as unknown as Mesh;

  const systemRef = {
    current: {
      planets: [
        { isSun: true, position: new Vector3() },
        { id: 'p1', position: new Vector3(100, 0, 0) }
      ],
      counter: 0,
    }
  } as unknown as RefObject<SystemRefData>;

  const mockDefaultState = {
    scene: {
      getObjectByName: vi.fn().mockReturnValue(null),
    },
    timer: {},
  };
  vi.spyOn(performance, 'now').mockReturnValue(0);

  it('should sync end portal position', () => {
    const meshRef = { current: createMockGroup() } as RefObject<Group>;
    const visualsRef = { current: createMockGroup() } as RefObject<Group>;
    const coreRef = { current: createMockMesh() } as RefObject<Mesh>;
    const portalPosition = new Vector3(200, 0, 0);
    (useGameStore as any).__mockState.portalPosition = portalPosition;

    renderHook(() => usePortalEffects({
      type: 'end',
      systemRef,
      meshRef,
      visualsRef,
      coreRef,
      resetCounter: 0,
    }));

    frameCallback(mockDefaultState as unknown as FiberType.RootState, 0.016);

    expect(meshRef.current?.position.x).toBe(200);
  });

  it('should rotate visualsRef over time', () => {
    const meshRef = { current: createMockGroup() } as RefObject<Group>;
    const visualsRef = { current: createMockGroup() } as RefObject<Group>;
    const coreRef = { current: createMockMesh() } as RefObject<Mesh>;
    const portalPosition = new Vector3(200, 0, 0);
    (useGameStore as any).__mockState.portalPosition = portalPosition;

    renderHook(() => usePortalEffects({
      type: 'end',
      systemRef,
      meshRef,
      visualsRef,
      coreRef,
      resetCounter: 0,
    }));

    // Initial rotation
    visualsRef.current.rotation.z = 0;

    // Move time forward
    vi.spyOn(performance, 'now').mockReturnValue(1000); // 1 second
    frameCallback(mockDefaultState as unknown as FiberType.RootState, 0.016);

    expect(visualsRef.current.rotation.z).toBeGreaterThan(0);
  });

  it('should call lookAt when spaceship is far away', () => {
    const meshRef = { current: createMockGroup() } as RefObject<Group>;
    const visualsRef = { current: createMockGroup() } as RefObject<Group>;
    const coreRef = { current: createMockMesh() } as RefObject<Mesh>;
    const portalPosition = new Vector3(200, 0, 0);
    (useGameStore as any).__mockState.portalPosition = portalPosition;

    const mockSpaceship = new Object3D();
    mockSpaceship.name = 'spaceship-mesh';
    mockSpaceship.position.set(0, 0, 0);
    mockSpaceship.updateMatrixWorld();

    const mockState = {
      scene: {
        getObjectByName: vi.fn().mockReturnValue(mockSpaceship),
      },
      timer: {},
    };
    vi.spyOn(performance, 'now').mockReturnValue(0);

    renderHook(() => usePortalEffects({
      type: 'end',
      systemRef,
      meshRef,
      visualsRef,
      coreRef,
      resetCounter: 0,
    }));

    frameCallback(mockState as unknown as FiberType.RootState, 0.016);

    expect(meshRef.current?.lookAt).toHaveBeenCalled();
  });

  it('should NOT call lookAt when spaceship is close', () => {
    const meshRef = { current: createMockGroup() } as RefObject<Group>;
    const visualsRef = { current: createMockGroup() } as RefObject<Group>;
    const coreRef = { current: createMockMesh() } as RefObject<Mesh>;
    const portalPosition = new Vector3(200, 0, 0);
    (useGameStore as any).__mockState.portalPosition = portalPosition;

    const mockSpaceship = new Object3D();
    mockSpaceship.name = 'spaceship-mesh';
    mockSpaceship.position.set(200 - (PORTALS_PORTAL_DIST_OFFSET / 4), 0, 0); // close to 200
    mockSpaceship.updateMatrixWorld();

    const mockState = {
      scene: {
        getObjectByName: vi.fn().mockReturnValue(mockSpaceship),
      },
      timer: {},
    };
    vi.spyOn(performance, 'now').mockReturnValue(0);

    renderHook(() => usePortalEffects({
      type: 'end',
      systemRef,
      meshRef,
      visualsRef,
      coreRef,
      resetCounter: 0,
    }));

    frameCallback(mockState as unknown as FiberType.RootState, 0.016);

    expect(meshRef.current?.lookAt).not.toHaveBeenCalled();
  });

  it('should handle start portal sequence (un-collapse)', () => {
    const meshRef = { current: createMockGroup() } as RefObject<Group>;
    const visualsRef = { current: createMockGroup() } as RefObject<Group>;
    const coreRef = { current: createMockMesh() } as RefObject<Mesh>;
    const initialPosition = new Vector3(120, 0, 0);

    const __state1 = {
      resetCounter: 0,
      isStarting: true,
      gameStarted: true,
      finishStarting: vi.fn(),
    } as unknown as GameState;
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(__state1));

    (useGameStore as any).__mockState = __state1;

    renderHook(() => usePortalEffects({
      type: 'start',
      initialPosition,
      systemRef,
      meshRef,
      visualsRef,
      coreRef,
      resetCounter: 0,
    }));

    // Simulate start of un-collapse
    frameCallback(mockDefaultState as unknown as FiberType.RootState, 0.016);

    // Scale should be small (starting phase 1 of start sequence)
    expect(meshRef.current?.scale.x).toBeLessThan(3.0);
  });

  it('should handle end portal transition (swell and collapse)', () => {
    const meshRef = { current: createMockGroup() } as RefObject<Group>;
    const visualsRef = { current: createMockGroup() } as RefObject<Group>;
    const coreRef = { current: createMockMesh() } as RefObject<Mesh>;
    const portalPosition = new Vector3(200, 0, 0);

    const __state2 = {
      resetCounter: 0,
      isFinishing: true,
      levelFinished: false,
      gameStarted: true,
      setPortalPosition: vi.fn(),
      portalPosition,
    } as unknown as GameState;
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(__state2));

    (useGameStore as any).__mockState = __state2;

    renderHook(() => usePortalEffects({
      type: 'end',
      systemRef,
      meshRef,
      visualsRef,
      coreRef,
      resetCounter: 0,
    }));

    // Phase 1: Swell
    frameCallback(mockDefaultState as unknown as FiberType.RootState, PORTALS_PORTAL_SWELL_DURATION * 0.5);
    expect(meshRef.current?.scale.x).toBeGreaterThan(1.0);

    // Phase 2: Collapse
    frameCallback(mockDefaultState as unknown as FiberType.RootState, PORTALS_PORTAL_SWELL_DURATION + PORTALS_PORTAL_COLLAPSE_DURATION * 0.5);
    expect(meshRef.current?.scale.z).toBe(0.001); // Collapsed to 2D-like scale in Z
  });

  it('should finish starting sequence and hide start portal', () => {
    const meshRef = { current: createMockGroup() } as RefObject<Group>;
    const visualsRef = { current: createMockGroup() } as RefObject<Group>;
    const coreRef = { current: createMockMesh() } as RefObject<Mesh>;
    const initialPosition = new Vector3(120, 0, 0);
    const mockFinishStarting = vi.fn();

    const state = {
      resetCounter: 0,
      isStarting: true,
      gameStarted: true,
      settingsMenuOpen: false,
      finishStarting: mockFinishStarting,
    } as unknown as GameState;

    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(state));

    (useGameStore as any).__mockState = state;

    renderHook(() => usePortalEffects({
      type: 'start',
      initialPosition,
      systemRef,
      meshRef,
      visualsRef,
      coreRef,
      resetCounter: 0,
    }));

    // Pass total duration
    frameCallback(mockDefaultState as unknown as FiberType.RootState, PORTALS_PORTAL_SWELL_DURATION + PORTALS_PORTAL_COLLAPSE_DURATION + 0.1);

    expect(mockFinishStarting).toHaveBeenCalled();
    expect(meshRef.current?.visible).toBe(false);
  });

  it('should hide start portal if isStarting is false', () => {
    const meshRef = { current: createMockGroup() } as RefObject<Group>;
    const visualsRef = { current: createMockGroup() } as RefObject<Group>;
    const coreRef = { current: createMockMesh() } as RefObject<Mesh>;
    const initialPosition = new Vector3(120, 0, 0);

    const __state3 = {
      resetCounter: 0,
      isStarting: false,
    } as unknown as GameState;
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(__state3));

    (useGameStore as any).__mockState = __state3;

    renderHook(() => usePortalEffects({
      type: 'start',
      initialPosition,
      systemRef,
      meshRef,
      visualsRef,
      coreRef,
      resetCounter: 0,
    }));

    frameCallback(mockDefaultState as unknown as FiberType.RootState, 0.016);
    expect(meshRef.current?.visible).toBe(false);
  });
});
