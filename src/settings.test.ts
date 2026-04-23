import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './store';

describe('Game Settings Defaults', () => {
  beforeEach(() => {
    // Reset the store to its initial state before each test
    useGameStore.getState().resetGame(true);
  });

  it('should start with the highest visual fidelity preset', () => {
    const settings = useGameStore.getState().settings;

    expect(settings.shaders).toBe('advanced');
    expect(settings.shadows).toBe('advanced');
    expect(settings.detailLevel).toBe('high');
    expect(settings.antialiasing).toBe('high');
    expect(settings.resolutionScale).toBe('high');
    expect(settings.postProcessing).toBe(true);
  });

  it('should have audio enabled by default', () => {
    const settings = useGameStore.getState().settings;

    expect(settings.sfxEnabled).toBe(true);
    expect(settings.musicEnabled).toBe(true);
  });

  it('should have autoPerformance enabled by default', () => {
    const settings = useGameStore.getState().settings;
    expect(settings.autoPerformance).toBe(true);
  });
});
