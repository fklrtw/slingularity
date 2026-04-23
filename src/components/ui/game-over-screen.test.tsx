import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameOverScreen } from './game-over-screen';
import { useGameStore } from '../../store';
import '@testing-library/jest-dom/vitest';
import {
  TEXT_GAME_OVER_HEADER,
  TEXT_RESTART_BTN,
} from '../../text.config';

describe('GameOverScreen component', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('should not render when gameOver is false', () => {
    useGameStore.setState({ gameOver: false });
    const { container } = render(<GameOverScreen />);
    expect(container.firstChild).toBeNull();
  });

  it('should show game over screen when gameOver is true', () => {
    useGameStore.setState({ gameOver: true, gameOverReason: 'TEST REASON' });
    render(<GameOverScreen />);
    expect(screen.getByText(TEXT_GAME_OVER_HEADER, { exact: false })).toBeTruthy();
    expect(screen.getByText(/TEST REASON/i)).toBeTruthy();
  });

  it('should call resetGame when restart button is clicked', () => {
    const spy = vi.spyOn(useGameStore.getState(), 'resetGame');
    useGameStore.setState({ gameOver: true });
    render(<GameOverScreen />);
    const restartBtn = screen.getByText(TEXT_RESTART_BTN, { exact: false });
    fireEvent.click(restartBtn);
    expect(spy).toHaveBeenCalled();
  });
});
