import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MilkyWay } from './milky-way';

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn()
}));

vi.mock('../../hooks/use-theme-colors', () => ({
  useThemeColors: () => ({ envMilkyWay: '#ffffff' })
}));

describe('MilkyWay Component', () => {
  it('should render a milky way band', () => {
    const { container } = render(<MilkyWay depth={10} />);
    const groups = container.querySelectorAll('group');
    const meshes = container.querySelectorAll('mesh');

    expect(groups.length).toBeGreaterThan(0);
    expect(meshes.length).toBe(1);
  });
});
