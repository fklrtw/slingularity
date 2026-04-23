/**
 * Radius of the sun's physical collision core
 * Unit: game units. Constraints: must be positive.
 */
export const SUN_CORE_SIZE = 15.0;
/**
 * Configurations for the layered semi-transparent spheres that create the sun's glow
 * Unit: array of objects {size: game units, opacity: 0-1}.
 */
export const SUN_GLOW_LAYERS = [
  { size: 20, opacity: 0.8 },
  { size: 30, opacity: 0.4 },
  { size: 50, opacity: 0.15 },
];
/**
 * Properties for the massive point light source emitting from the sun
 * Includes intensity, decay, distance, and color.
 */
export const SUN_LIGHT = {
  /**
   * Brightness intensity of the sun's light
   * Unit: intensity.
   */
  intensity: 30000,
  /**
   * Physical decay rate of the sun's light
   * Unit: decay rate factor.
   */
  decay: 1.2,
  /**
   * Maximum distance the sun's light reaches
   * Unit: game units.
   */
  distance: 4000,
  /**
   * Shadow map resolution
   */
  shadowMapSize: 1024,
  /**
   * Shadow camera near plane
   */
  shadowCameraNear: 1,
  /**
   * Shadow camera far plane
   */
  shadowCameraFar: 2000,
  /**
   * Shadow bias to prevent self-shadowing/acne
   */
  shadowBias: -0.0001,
};
/**
 * Shader parameters for the sun core
 * Controls bands, rim light, and shading intensities.
 */
export const SUN_SHADER = {
  band1_freq: 2.5,
  band1_speed: 0.4,
  band2_freq: 1.5,
  band2_speed: 0.25,
  step1: 0.7,
  step2: 0.8,
  shade1: 1.15,
  shade2: 0.4,
  rim_pow: 1.5,
  rim_step: 0.45,
  rim_mult: 0.7,
  bloom_multiplier: 3.5,
};
/**
 * Shader parameters for the sun's atmospheric glow
 * Controls pulse speed, intensity, and edge fading.
 */
export const SUN_GLOW_SHADER = {
  pulse_speed: 1.8,
  pulse_intensity: 0.12,
  pulse_base: 0.88,
  edge_fade_min: 0.0,
  edge_fade_max: 0.4,
  bloom_multiplier: 40.0,
};
export const SUN_REMNANT_PROBABILITIES = {
  neutronStar: 0.007,
  blackHole: 0.001,
};
/**
 * The factor by which the sun can grow beyond the last planet before a supernova is guaranteed.
 * At 1.0 (portal distance), probability is 0.
 * At 1.5, probability is 100%.
 */
export const SUN_SUPERNOVA_PROBABILITY_FACTOR = 1.5;
/**
 * Sun mass
 * The mass of the central sun entity in mass units. Must be positive.
 */
export const PHYSICS_SUN_MASS = 20000.0;
