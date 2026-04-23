import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { StartScreen } from './start-screen';
import { useGameStore } from '../../store';
import '@testing-library/jest-dom/vitest';

describe('StartScreen component', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame(true);
  });

  it('should render when game is not started', () => {
    useGameStore.setState({ gameStarted: false, gameOver: false });
    render(<StartScreen />);
    expect(screen.getByText(/SLINGULARITY/i)).toBeTruthy();
    expect(screen.getByText(/OBJECTIVE/i)).toBeTruthy();
    // Use getByRole to disambiguate from other text
    expect(screen.getByRole('button', { name: /Sling away/i })).toBeTruthy();
  });

  it('should NOT render when game has started', () => {
    useGameStore.setState({ gameStarted: true });
    const { container } = render(<StartScreen />);
    expect(container).toBeEmptyDOMElement();
  });

  it('should NOT render when game is over', () => {
    useGameStore.setState({ gameOver: true });
    const { container } = render(<StartScreen />);
    expect(container).toBeEmptyDOMElement();
  });
});
