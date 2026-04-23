import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnnihilationBeam } from './annihilation-beam';
import { Vector3 } from 'three';

// Mock @react-three/drei
vi.mock('@react-three/drei', () => ({
  Line: (props: { points?: unknown[], color?: { getHexString?: () => string } | string }) => {
    let colorStr = props.color;
    if (props.color && typeof props.color === 'object' && typeof props.color.getHexString === 'function') {
      colorStr = '#' + props.color.getHexString();
    }
    return <div data-testid="drei-line" data-points={JSON.stringify(props.points)} data-color={colorStr as string} />;
  }
}));

vi.mock('../hooks/use-theme-colors', () => ({
  useThemeColors: () => ({ themeDanger: '#ff0000' })
}));

describe('AnnihilationBeam Component', () => {
  it('should render a line between two points with danger color', () => {
    const points: [Vector3, Vector3] = [new Vector3(0, 0, 0), new Vector3(10, 10, 10)];

    const { getByTestId } = render(<AnnihilationBeam points={points} />);
    const line = getByTestId('drei-line');

    expect(line).toBeDefined();

    const parsedPoints = JSON.parse(line.getAttribute('data-points') || '[]');
    expect(parsedPoints).toEqual([[0, 0, 0], [10, 10, 10]]);
    expect(line.getAttribute('data-color')).toBe('#ff0000');
  });
});
