import { renderHook } from '@testing-library/react';
import { useFrame, useThree, type RenderCallback, type RootState } from '@react-three/fiber';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useMinimapEffects } from './use-minimap-effects';
import { useGameStore, type GameState } from '../store';
import type { WebGLRenderer } from 'three';
import { Vector3, Mesh, PerspectiveCamera, OrthographicCamera, ArrayCamera } from 'three';

// Mock @react-three/fiber
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: vi.fn(),
}));

// Mock Store
vi.mock('../store', () => {
  const storeFn = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (storeFn as any).getState = vi.fn(() => (storeFn as any).__mockState || {});
  return { useGameStore: storeFn };
});

describe('useMinimapEffects', () => {
  let frameCallback: RenderCallback;
  const mockSet = vi.fn();
  const defaultCamera = new PerspectiveCamera();
  const mockGl = {
    autoClear: false,
    getPixelRatio: vi.fn(() => 1),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFrame).mockImplementation((cb: RenderCallback) => {
      frameCallback = cb;
      return null;
    });

    vi.mocked(useThree).mockReturnValue({
      size: { width: 1000, height: 800 },
      set: mockSet,
      camera: defaultCamera,
      gl: mockGl as unknown as WebGLRenderer,
    } as unknown as ReturnType<typeof useThree>);

    const __state = {
      portalPosition: new Vector3(500, 500, 0),
    } as unknown as GameState;
    vi.mocked(useGameStore).mockImplementation((selector: (s: GameState) => unknown) => selector(__state));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useGameStore as any).__mockState = __state;
  });

  it('should setup the array camera and restore on unmount', () => {
    const bgRef = { current: new Mesh() };
    const { unmount } = renderHook(() => useMinimapEffects({ bgRef }));

    expect(mockSet).toHaveBeenCalled();
    const calledArgs = mockSet.mock.calls[0][0];
    expect(calledArgs.camera).toBeInstanceOf(ArrayCamera);

    const arrayCam = calledArgs.camera as ArrayCamera;
    expect(arrayCam.cameras.length).toBe(2);
    expect(arrayCam.cameras[0]).toBeInstanceOf(PerspectiveCamera);
    expect(arrayCam.cameras[1]).toBeInstanceOf(OrthographicCamera);

    expect(mockGl.autoClear).toBe(true);

    unmount();
    expect(mockSet).toHaveBeenLastCalledWith({ camera: defaultCamera });
    expect(mockGl.autoClear).toBe(false);
  });

  it('should update camera viewports and frame the system within useFrame', () => {
    const bgRef = { current: new Mesh() };
    renderHook(() => useMinimapEffects({ bgRef }));

    // Execute the frame callback twice to pass the 30Hz throttle
    frameCallback({} as unknown as RootState, 0.016);
    frameCallback({} as unknown as RootState, 0.016);

    const arrayCam = mockSet.mock.calls[0][0].camera as ArrayCamera;
    const mainCam = arrayCam.cameras[0] as unknown as PerspectiveCamera & { viewport: { z: number, w: number } };
    const miniCam = arrayCam.cameras[1] as unknown as OrthographicCamera & { viewport: { z: number, w: number } };

    // Check main camera viewport
    expect(mainCam.viewport.z).toBe(1000); // width
    expect(mainCam.viewport.w).toBe(800); // height

    // Check minimap framing logic (should have expanded to include Sun at 0,0 and Portal at 500,500)
    // The center should be around 250, 250
    expect(miniCam.position.x).toBeCloseTo(250);
    expect(miniCam.position.y).toBeCloseTo(250);

    // Ensure the bg plane was moved and scaled
    expect(bgRef.current.position.x).toBeCloseTo(250);
    expect(bgRef.current.position.y).toBeCloseTo(250);
    expect(bgRef.current.scale.x).toBeGreaterThan(500); // Since portal is at 500, scale must enclose it
  });
});
