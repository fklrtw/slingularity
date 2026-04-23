import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Galaxies } from './galaxies';
import { Vector3, Color } from 'three';

describe('Galaxies Component', () => {
  it('should return null if data is empty', () => {
    const { container } = render(<Galaxies data={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render galaxies based on data', () => {
    const data = [
      { position: new Vector3(0, 0, 0), color: new Color('#ff0000'), size: 10, type: 0 },
      { position: new Vector3(10, 0, 0), color: new Color('#00ff00'), size: 20, type: 1 }
    ];

    const { container } = render(<Galaxies data={data} />);
    const meshes = container.querySelectorAll('mesh');
    expect(meshes.length).toBe(2);
  });
});
