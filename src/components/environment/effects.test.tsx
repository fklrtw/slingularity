import { render, act, type RenderResult } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Effects } from './effects';
import { useGameStore } from '../../store';

// mock postprocessing
vi.mock('@react-three/postprocessing', () => ({
  EffectComposer: ({ children, enabled }: { children: React.ReactNode, enabled?: boolean }) => <div data-testid="effect-composer" data-enabled={enabled}>{children}</div>,
  Bloom: () => <div data-testid="bloom" />,
}));

describe('Effects', () => {
  it('renders Bloom when shaderQuality is not off', async () => {
    useGameStore.getState().updateSettings({ shaders: 'advanced' });

    let result: RenderResult | undefined;
    await act(async () => {
      const rendered = render(<Effects />);
      result = rendered;
    });

    expect(result?.getByTestId('effect-composer')).toBeTruthy();
    expect(result?.getByTestId('effect-composer').getAttribute('data-enabled')).toBe('true');
    expect(result?.getByTestId('bloom')).toBeTruthy();
  });

  it('disables EffectComposer when shaderQuality is off', async () => {
    useGameStore.getState().updateSettings({ shaders: 'off' });

    let result: RenderResult | undefined;
    await act(async () => {
      const rendered = render(<Effects />);
      result = rendered;
    });

    expect(result?.getByTestId('effect-composer').getAttribute('data-enabled')).toBe('false');
  });
});
