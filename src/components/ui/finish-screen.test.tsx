import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FinishScreen } from './finish-screen';
import { useGameStore } from '../../store';
import '@testing-library/jest-dom/vitest';

describe('FinishScreen component', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('should NOT render when level is not finished', () => {
    useGameStore.setState({ levelFinished: false });
    const { container } = render(<FinishScreen />);
    expect(container).toBeEmptyDOMElement();
  });

  it('should render when level is finished', () => {
    useGameStore.setState({ levelFinished: true, gameOver: false });
    render(<FinishScreen />);
    expect(screen.getByText(/portal reached/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /travel to next level/i })).toBeTruthy();
  });

  it('should NOT render when game is over even if level finished', () => {
    useGameStore.setState({ levelFinished: true, gameOver: true });
    const { container } = render(<FinishScreen />);
    expect(container).toBeEmptyDOMElement();
  });

  it('should call startNextLevel when button is clicked', () => {
    const spy = vi.spyOn(useGameStore.getState(), 'startNextLevel');
    useGameStore.setState({ levelFinished: true, gameOver: false });
    render(<FinishScreen />);
    const nextBtn = screen.getByRole('button', { name: /travel to next level/i });
    fireEvent.click(nextBtn);
    expect(spy).toHaveBeenCalled();
  });
});
