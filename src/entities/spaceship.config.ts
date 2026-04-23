/**
 * Default emissive intensity for the Spaceship's material
 * Unit: intensity. Constraints: must be non-negative.
 */
export const SPACESHIP_EMISSIVE_INTENSITY = 1.0;
/**
 * Properties for the engine thrusters attached to the player Spaceship
 * Includes intensity (brightness), distance (reach), core size, emissive power, and count.
 */
export const SPACESHIP_THRUSTERS = {
  /**
   * Brightness intensity of the thruster light
   * Unit: intensity.
   */
  intensity: 150.0,
  /**
   * Maximum distance the thruster light reaches
   * Unit: game units.
   */
  distance: 40,
  /**
   * Number of engine thrusters
   */
  count: 2,
  /**
   * Spacing between thrusters
   */
  spacing: 1.2,
  /**
   * Position of the thrusters group relative to the spaceship center
   */
  position: { x: 0, y: -2.0, z: 0.8 },
  /**
   * Visual radius of the glowing thruster core
   */
  coreRadius: 0.25,
  /**
   * Emissive intensity for the core mesh (for post-processing bloom)
   */
  coreEmissiveIntensity: 40.0,
  color: '#00ffff', // Cyan
};
/**
 * Navigation lights configuration
 */
export const SPACESHIP_NAV_LIGHTS = {
  intensity: 20,
  distance: 25,
  size: 0.15,
  emissiveIntensity: 60,
  position: { x: 2.35, y: -0.2, z: 0.8 },
  segments: 8,
  portColor: '#ff0000', // Red
  starboardColor: '#00ff00', // Green
};
/**
 * Spaceship orientation
 * Euler rotation [x, y, z]
 */
export const SPACESHIP_ROTATION: [number, number, number] = [0, 0, Math.PI / 2];
/**
 * Cockpit internal light configuration
 */
export const SPACESHIP_COCKPIT_LIGHT = {
  intensity: 15,
  distance: 10,
  color: '#aaddff',
  position: { x: 0, y: 0.8, z: 0.8 },
};
/**
 * Speed at which the Spaceship model visually rotates to align with velocity
 * Unit: lerp factor (0-1).
 */
export const SPACESHIP_STEER_ROTATION_SPEED = 0.1;
/**
 * Angle above which an approach is considered a "steep entry"
 * Unit: degrees. Constraints: range [0, 90].
 */
export const SPACESHIP_STEER_STEEP_THRESHOLD = 35.0;
/**
 * Multiplier for steering force when entering from a shallow angle
 * Unit: multiplier.
 */
export const SPACESHIP_STEER_SHALLOW_FACTOR = 5.0;
/**
 * Multiplier for steering force after passing a planet for steep entries
 * Unit: multiplier. Constraints: higher = tighter spiral.
 */
export const SPACESHIP_STEER_STEEP_HOOK_FACTOR = 8.0;
/**
 * Artificial centripetal multiplier for the steep entry dive
 * Unit: multiplier. Constraints: higher = sharper U-turn deeper in atmosphere.
 */
export const SPACESHIP_ARTIFICIAL_HOOK_FACTOR = 1.0;
/**
 * Number of frames ahead to look for atmospheric intersection
 * Unit: frames. Constraints: must be positive.
 */
export const SPACESHIP_PRE_ENTRY_STEPS = 50;
/**
 * Velocity magnitude squared below which orientation updates are skipped
 * Unit: units squared.
 */
export const SPACESHIP_ORIENTATION_THRESHOLD = 0.001;
/**
 * Smoothing factor for orientation during locked orbit
 * Unit: smoothing factor. Constraints: 1.0 = instant.
 */
export const SPACESHIP_ORBIT_ROTATION_SMOOTHING = 1.0;
/**
 * Duration for the visual boost effect when receiving an Annihilation speed boost
 * Unit: seconds. Constraints: must be non-negative.
 */
export const SPACESHIP_BOOST_EFFECT_DURATION = 0.8;
/**
 * Peak scale multiplier for the boost effect
 * Unit: multiplier. Constraints: must be greater than 1.
 */
export const SPACESHIP_BOOST_SCALE_MULT = 3.0;
/**
 * Peak emissive intensity for the boost effect
 * Unit: intensity. Constraints: must be positive.
 */
export const SPACESHIP_BOOST_EMISSIVE_MULT = 40.0;

// --- Trail Configuration ---
/**
 * Width of the Spaceship engine trail
 * Unit: pixels/game units. Constraints: must be positive.
 */
export const SPACESHIP_TRAIL_WIDTH = 5;
/**
 * Scale factor for the spaceship model
 */
export const SPACESHIP_SCALE = 1.0;
/**
 * Number of segments in the trail
 * Unit: count. Constraints: higher = smoother/longer.
 */
export const SPACESHIP_TRAIL_LENGTH = 100;
/**
 * Rate at which the trail fades out
 * Unit: decay rate. Constraints: higher = shorter-lived.
 */
export const SPACESHIP_TRAIL_DECAY = 1.0;
/**
 * Ship speed master multiplier
 * Master speed multiplier for the physics simulation. Must be positive.
 */
export const SPACESHIP_SPEED_MULTIPLIER = 0.1;
