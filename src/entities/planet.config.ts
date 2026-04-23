/**
 * Buffer distance added to planet radius for surface collision detection
 * Unit: game units. Constraints: must be non-negative.
 */
export const PLANETS_PLANET_CRASH_BUFFER = 0.5;

/**
 * Opacity of the atmosphere glow mesh
 * Unit: opacity. Constraints: range [0, 1].
 */
export const PLANETS_ATMOSPHERE_OPACITY = 0.35;

/**
 * Angle of the glowing section on the side of the planet facing the sun
 * Unit: degrees. Constraints: range [0, 360].
 */
export const PLANETS_ATMOSPHERE_GLOW_ANGLE = 160.0;

/**
 * Intensity of the atmosphere glow
 * Unit: intensity. Constraints: must be positive.
 */
export const PLANETS_ATMOSPHERE_GLOW_INTENSITY = 1.8;

// --- Rings Generation ---
/**
 * Range for the number of rings generated per planet
 * Unit: array [min, max]. Constraints: must be positive integers.
 */
export const PLANETS_RING_COUNT_RANGE: [number, number] = [2, 6];

/**
 * Maximum coverage of the atmosphere area by rings
 * Unit: ratio. Constraints: range [0.0, 1.0].
 */
export const PLANETS_RING_MAX_ATMOSPHERE_COVERAGE = 0.5;

/**
 * Base opacity for rings
 * Unit: opacity. Constraints: range [0, 1].
 */
export const PLANETS_RING_BASE_OPACITY = 0.6;

// --- Orbit Lines ---
/**
 * Base opacity for the planetary orbit paths
 * Unit: opacity. Constraints: range [0, 1].
 */
export const PLANETS_ORBIT_LINE_OPACITY = 0.75;

/**
 * Width of the planetary orbit paths
 * Unit: game units. Constraints: must be positive.
 */
export const PLANETS_ORBIT_LINE_WIDTH = 1.5;

/**
 * Configuration for the cel-shaded planet surface shader
 * Controls color bands, sharpness, shading, and rim light effects.
 */
export const PLANETS_PLANET_SHADER = {
  /**
   * Number of color bands for the cel effect
   * Unit: count.
   */
  bands_count: 5.0,
  /**
   * Edge sharpness between bands
   * Unit: ratio. Constraints: range [0, 1].
   */
  bands_sharpness: 0.1,
  /**
   * Darkness multiplier for the shaded side of the planet
   * Unit: multiplier.
   */
  shade_mult: 0.45,
  /**
   * Rim light falloff power
   * Unit: exponent.
   */
  rim_pow: 3.0,
  /**
   * Rim light threshold
   * Unit: threshold.
   */
  rim_step: 0.5,
  /**
   * Rim light intensity multiplier
   * Unit: multiplier.
   */
  rim_mult: 0.2,
  /**
   * Specular highlight sharpness
   * Unit: exponent.
   */
  specular_pow: 64.0,
  /**
   * Specular highlight intensity multiplier
   * Unit: multiplier.
   */
  specular_mult: 0.6,
};

/**
 * Z offset for the light source relative to the sun's position
 * Units: game units.
 */
export const PLANETS_PLANET_LIGHT_Z_OFFSET = 100.0;

/**
 * Minimum ambient brightness for planets to prevent them from being too dark
 * Range: 0-1.
 */
export const PLANETS_PLANET_AMBIENT_LIGHT = 0.15;

/**
 * Configuration for planetary rings shader
 * Controls bands, opacity, and radial falloff for ring textures.
 */
export const PLANETS_RING_SHADER = {
  /**
   * Number of rings in the band
   * Unit: count.
   */
  bands_count: 50.0,
  /**
   * Ring edge sharpness
   * Unit: ratio.
   */
  bands_sharpness: 0.3,
  /**
   * Opacity base for rings
   * Unit: opacity.
   */
  opacity_base: 0.4,
  /**
   * Opacity multiplier for ring texture
   * Unit: multiplier.
   */
  opacity_mult: 0.6,
  /**
   * Radial falloff for the outer edge of the rings
   * Unit: ratio.
   */
  outer_fade: 0.45,
  /**
   * Radial falloff for the inner edge of the rings
   * Unit: ratio.
   */
  inner_fade: 0.1,
};

/**
 * Default opacity for planetary rings
 * Unit: opacity. Constraints: range [0, 1].
 */
export const PLANETS_RING_OPACITY = 0.8;

/**
 * Fallback inner radius factor for rings if not randomized
 * Unit: multiplier. Constraints: relative to planet radius.
 */
export const PLANETS_RING_INNER_RADIUS_FACTOR = 1.3;

/**
 * Fallback outer radius factor for rings if not randomized
 * Unit: multiplier. Constraints: relative to planet radius.
 */
export const PLANETS_RING_OUTER_RADIUS_FACTOR = 2.0;

/**
 * Orbital drag factor
 * Multiplier for relative velocity reduction while in orbit. Causes atmospheric drag.
 */
export const PLANETS_ATMOSPHERIC_DRAG_FACTOR = 50;

/**
 * Velocity-radius coupling factor
 * Coupling factor between velocity and orbital radius as a ratio (R = f(V)).
 */
export const PLANETS_ORBIT_RADIUS_COUPLING_FACTOR = 2.5;
