/**
 * Configuration for the death shockwave effect
 */

/**
 * Physical geometry for the death shockwave effect
 * Unit: array [radius, widthSegments, heightSegments].
 */
export const SHOCKWAVE_MODEL: [number, number, number] = [1, 32, 32];

/**
 * Base radial expansion speed for the death shockwave
 * Unit: game units per second.
 */
export const SHOCKWAVE_EXPANSION_SPEED = 2.0;

/**
 * Maximum scale factor for the shockwave compared to its original radius
 * Unit: multiplier.
 */
export const SHOCKWAVE_MAX_SCALE = 15.0;

/**
 * Duration for the collapse phase of Annihilation
 * Unit: seconds.
 */
export const SHOCKWAVE_ANNIHILATION_PHASE1_DURATION = 0.4;

/**
 * Duration for the radial paint phase of Annihilation (the "shockwave" expansion)
 * Unit: seconds.
 */
export const SHOCKWAVE_ANNIHILATION_PHASE2_DURATION = 0.2;

/**
 * Duration for the final fade phase of Annihilation
 * Unit: seconds.
 */
export const SHOCKWAVE_ANNIHILATION_PHASE3_DURATION = 0.3;
