import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { useThree } from '@react-three/fiber';
import { PerspectiveCamera, type WebGLRenderer } from 'three';

// mock @react-three/fiber
vi.mock('@react-three/fiber', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@react-three/fiber');
  return {
    ...actual,
    useThree: vi.fn(),
    useFrame: vi.fn(),
  };
});

// Import after mocks
import { Minimap } from './minimap';

describe('Minimap Component', () => {
  const mockSet = vi.fn();
  const mockDefaultCamera = new PerspectiveCamera();
  const mockGl = { autoClear: false };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useThree).mockReturnValue({
      size: { width: 1000, height: 800 },
      set: mockSet,
      camera: mockDefaultCamera,
      gl: mockGl as unknown as WebGLRenderer,
      scene: { traverse: vi.fn() },
    } as unknown as ReturnType<typeof useThree>);
  });

  it('should render successfully', () => {
    const { container } = render(<Minimap />);
    expect(container).toBeDefined();
  });
});
