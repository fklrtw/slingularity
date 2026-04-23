import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sfx } from './use-audio-effects';

// Mock AudioContext and its nodes
class MockGainNode {
  gain = {
    value: 1,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };

  connect = vi.fn();
  disconnect = vi.fn();
}

class MockAnalyserNode {
  fftSize = 0;
  connect = vi.fn();
}

class MockAudioContext {
  currentTime = 0;
  state = 'suspended';

  createGain = vi.fn(() => new MockGainNode());
  createAnalyser = vi.fn(() => new MockAnalyserNode());

  resume = vi.fn().mockResolvedValue(undefined);

  destination = {};
}

describe('SFXEngine Volume Mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error Mocking global window
    global.window = {
      AudioContext: MockAudioContext,
    };
    // Re-initialize sfx to pick up the mocked AudioContext
    sfx.init();
  });

  it('should map 100% (1.0) to unity gain (1.0)', () => {
    sfx.setVolume(1.0);
    const masterGain = (sfx as unknown as { masterGain: MockGainNode }).masterGain;
    expect(masterGain.gain.setValueAtTime).toHaveBeenCalledWith(1.0, 0);
  });

  it('should apply a quadratic curve for perceived linearity', () => {
    // 50% slider value
    sfx.setVolume(0.5);
    const masterGain = (sfx as unknown as { masterGain: MockGainNode }).masterGain;
    // gain = 0.5^2 = 0.25
    expect(masterGain.gain.setValueAtTime).toHaveBeenCalledWith(0.25, 0);
  });

  it('should map 0% to 0 gain', () => {
    sfx.setVolume(0);
    const masterGain = (sfx as unknown as { masterGain: MockGainNode }).masterGain;
    expect(masterGain.gain.setValueAtTime).toHaveBeenCalledWith(0, 0);
  });

  it('should map 25% slider to 0.0625 gain', () => {
    sfx.setVolume(0.25);
    const masterGain = (sfx as unknown as { masterGain: MockGainNode }).masterGain;
    // gain = 0.25^2 = 0.0625
    expect(masterGain.gain.setValueAtTime).toHaveBeenCalledWith(0.0625, 0);
  });
});

describe('SFXEngine Fade and Reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error Mocking global window
    global.window = {
      AudioContext: MockAudioContext,
    };
    sfx.init();
  });

  it('fadeOut should use exponential ramp to a low value', () => {
    sfx.fadeOut(2.0);
    const mixer = (sfx as unknown as { mixer: MockGainNode }).mixer;
    expect(mixer.gain.setValueAtTime).toHaveBeenCalled();
    expect(mixer.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, 2.0);
  });

  it('resetMixer should set gain back to 1.0', () => {
    sfx.resetMixer();
    const mixer = (sfx as unknown as { mixer: MockGainNode }).mixer;
    expect(mixer.gain.setValueAtTime).toHaveBeenCalledWith(1.0, 0);
  });
});
