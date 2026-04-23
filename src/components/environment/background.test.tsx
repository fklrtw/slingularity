import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, act, type RenderResult } from '@testing-library/react';
import { Background } from './background';

// mock r3f
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: () => ({ size: { width: 1000, height: 1000 } }),
  useMemo: (fn: () => unknown) => fn(),
}));

// mock drei
vi.mock('@react-three/drei', () => ({
  Points: ({ children }: { children: React.ReactNode }) => <div data-testid="points">{children}</div>,
  Line: () => <div data-testid="line" />,
}));

// mock entities
vi.mock('../../entities/background/nebulae', () => ({
  Nebulae: () => <div data-testid="nebulae" />,
}));
vi.mock('../../entities/background/milky-way', () => ({
  MilkyWay: () => <div data-testid="milkyway" />,
}));
vi.mock('../../entities/background/galaxies', () => ({
  Galaxies: () => <div data-testid="galaxies" />,
}));

// mock global fetch
vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
  Promise.resolve({
    json: () => Promise.resolve({ features: [] }),
  }),
));

describe('Background', () => {
  it('renders without crashing', async () => {
    let result: RenderResult | undefined;
    await act(async () => {
      result = render(<Background />);
    });

    expect(result?.getByTestId('nebulae')).toBeTruthy();
    expect(result?.getByTestId('milkyway')).toBeTruthy();
    expect(result?.getByTestId('galaxies')).toBeTruthy();
  });
});
