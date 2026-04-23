/**
 * Configuration for post-processing effects.
 */
export const EFFECTS_BLOOM = {
  /**
   * Luminance threshold for bloom effect.
   * Colors brighter than this will bloom.
   */
  threshold: 1.0,
  /**
   * Intensity of the bloom effect.
   */
  intensity: 1.5,
  /**
   * Smoothing of the luminance threshold.
   */
  smoothing: 0.9,
  /**
   * Mipmap blur kernel size.
   */
  mipmapBlur: true,
};
