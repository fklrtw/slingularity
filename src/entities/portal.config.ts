/**
 * Radial offset from the last planet's orbit to place the portal
 * Unit: game units. Constraints: must be positive.
 */
export const PORTALS_PORTAL_DIST_OFFSET = 60.0;
/**
 * Visual radius of the portal entity
 * Unit: game units. Constraints: must be positive.
 */
export const PORTALS_PORTAL_SIZE = 8.0;
/**
 * Speed of portal rotation effect
 * Unit: angular velocity (radians per second).
 */
export const PORTALS_PORTAL_ROTATION_SPEED = 2.0;
/**
 * Smoothing factor for portal rotation when tracking the spaceship
 * Unit: factor (lower is smoother). Range [0.1, 20].
 */
export const PORTALS_PORTAL_ROTATION_SMOOTHING = 5.0;
/**
 * Speed of portal pulse effect
 * Unit: frequency (cycles per second).
 */
export const PORTALS_PORTAL_PULSE_SPEED = 3.0;
/**
 * Strength of the portal's visual pulse
 * Unit: amplitude multiplier.
 */
export const PORTALS_PORTAL_PULSE_STRENGTH = 0.2;
/**
 * Orientation of the portal in 3D space
 * Unit: array [x, y] (radians).
 */
export const PORTALS_PORTAL_ROTATION: [number, number] = [Math.PI / 4, Math.PI / 4];
/**
 * Duration for the portal's "swelling" animation phase
 * Unit: seconds. Constraints: must be non-negative.
 */
export const PORTALS_PORTAL_SWELL_DURATION = 0.4;
/**
 * Duration for the portal's "collapse" (CRT) animation phase
 * Unit: seconds. Constraints: must be non-negative.
 */
export const PORTALS_PORTAL_COLLAPSE_DURATION = 0.3;
/**
 * Multiplier for the portal core size relative to its main radius
 * Unit: multiplier. Constraints: range [0, 1].
 */
export const PORTALS_PORTAL_CORE_SCALE = 0.7;
/**
 * Tube radius of the portal's torus rim
 * Unit: game units. Constraints: must be positive.
 */
export const PORTALS_PORTAL_RIM_WIDTH = 0.5;
/**
 * Radial and tubular segments for portal torus geometry
 * Unit: array [radial, tubular].
 */
export const PORTALS_PORTAL_SEGMENTS: [number, number] = [16, 100];
/**
 * Point light properties for the portal
 * Includes intensity and distance.
 */
export const PORTALS_PORTAL_LIGHT = {
  /**
   * Brightness intensity of the portal light
   * Unit: intensity.
   */
  intensity: 100,
  /**
   * Maximum distance the portal light reaches
   * Unit: game units.
   */
  distance: 100,
};
