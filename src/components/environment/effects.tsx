import { Bloom, EffectComposer } from '@react-three/postprocessing';
import React from 'react';
import { useGameStore } from '../../store';
import { EFFECTS_BLOOM } from './effects.config';

/**
 * Effects component
 *
 * Manages post-processing effects like Bloom.
 * Bloom is gated by the shader quality setting.
 */
export function Effects() {
  const shaderQuality = useGameStore(s => s.settings.shaders);
  const postProcessingEnabled = useGameStore(s => s.settings.postProcessing);
  const isEnabled = shaderQuality !== 'off' && postProcessingEnabled;

  return (
    <EffectComposer enabled={isEnabled}>
      <Bloom
        luminanceThreshold={EFFECTS_BLOOM.threshold}
        mipmapBlur={EFFECTS_BLOOM.mipmapBlur}
        intensity={EFFECTS_BLOOM.intensity}
        luminanceSmoothing={EFFECTS_BLOOM.smoothing}
      />
    </EffectComposer>
  );
}
