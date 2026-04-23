/**
 * Solar system's gravitational constant
 * Gravitational constant used in the physics simulation in mass-distance units. Must be positive.
 */
export const SOLAR_SYSTEM_GRAVITATIONAL_CONSTANT = 800.0;
/**
 * Gravity falloff exponent
 * Exponent used to calculate gravitational falloff distance. Must be positive.
 */
export const SOLAR_SYSTEM_GRAVITY_FALLOFF_EXPONENT = 2;
/**
 * Solar system's sun gravity factor
 * Multiplier to increase the sun's gravitational pull on the player. Applied relative to planet gravity.
 */
export const SOLAR_SYSTEM_SUN_GRAVITY_FACTOR = 2.5;
/**
 * Distance from the sun to the first spawned planet
 * Unit: game units. Constraints: must be positive.
 */
export const SOLAR_SYSTEM_PLANET_START_DIST = 100.0;
/**
 * Variance applied to the angle offset between consecutive planets
 * Unit: radians. Constraints: must be non-negative.
 */
export const SOLAR_SYSTEM_PLANET_ANGLE_VARIANCE = 0.4;
/**
 * Min eccentricity range for elliptical planet orbits
 * Unit: ratio. Constraints: range [0, 1].
 */
export const SOLAR_SYSTEM_PLANET_ECCENTRICITY_RANGE_MIN = 0.1;
/**
 * Max eccentricity range for elliptical planet orbits
 * Unit: ratio. Constraints: range [0, 1], must be >= min.
 */
export const SOLAR_SYSTEM_PLANET_ECCENTRICITY_RANGE_MAX = 0.25;
/**
 * Minimum visual radius of a generated planet
 * Unit: game units. Constraints: must be positive.
 */
export const SOLAR_SYSTEM_MIN_PLANET_SIZE = 5;
/**
 * Fixed visual radius of the first planet in every level
 * Unit: game units. Constraints: must be positive.
 */
export const SOLAR_SYSTEM_FIRST_PLANET_SIZE = 6.0;
/**
 * Percentage chance that a generated planet will have visual rings
 * Unit: probability. Constraints: range [0.0, 1.0].
 */
export const SOLAR_SYSTEM_PLANET_RING_CHANCE = 0.3;
/**
 * Multiplier range min for randomized ring rotation
 * Unit: multiplier.
 */
export const SOLAR_SYSTEM_PLANET_RING_ROTATION_MIN = 2;
/**
 * Multiplier range max for randomized ring rotation
 * Unit: multiplier.
 */
export const SOLAR_SYSTEM_PLANET_RING_ROTATION_MAX = 3;
/**
 * Constant angular velocity for all orbiting planets
 * Unit: radians per second.
 */
export const SOLAR_SYSTEM_PLANET_OMEGA = 0.25;
/**
 * Constant angular velocity for comets
 * Unit: radians per second.
 */
export const SOLAR_SYSTEM_COMET_OMEGA = 2.0;
/**
 * Minimum distance a comet's orbit can pass from the sun center
 */
export const SOLAR_SYSTEM_COMET_MIN_PERIAPSIS = 70.0;
/**
 * Minimum planet mass
 * Minimum mass range for generated planets in mass units. Must be positive.
 */
export const SOLAR_SYSTEM_PLANET_MASS_RANGE_MIN = 1000.0;
/**
 * Maximum planet mass
 * Maximum mass range for generated planets in mass units. Must be greater than or equal to min mass.
 */
export const SOLAR_SYSTEM_PLANET_MASS_RANGE_MAX = 3000.0;
/**
 * Maximum physics delta time
 * Maximum allowed delta time per physics frame in seconds. Approx 30fps clamp to prevent instability.
 */
export const SOLAR_SYSTEM_DT_MAX = 0.033;
/**
 * Maximum spacecraft speed
 * Maximum absolute speed the spacecraft can reach in game units per second.
 */
export const SOLAR_SYSTEM_VELOCITY_MAX = 1000;
/**
 * Annihilation velocity boost
 * Multiplier applied to velocity when a planet is annihilated.
 */
export const SOLAR_SYSTEM_ANNIHILATION_BOOST_MULTIPLIER = 1.125;
/**
 * Chance that a generated celestial body will be a comet instead of a planet
 * Unit: probability. Constraints: range [0.0, 1.0].
 */
export const SOLAR_SYSTEM_COMET_CHANCE = 0.15;
/**
 * Min eccentricity range for comet orbits
 * Unit: ratio. Constraints: range [0, 1].
 */
export const SOLAR_SYSTEM_COMET_ECCENTRICITY_MIN = 0.94;
/**
 * Max eccentricity range for comet orbits
 * Unit: ratio. Constraints: range [0, 1], must be >= min.
 */
export const SOLAR_SYSTEM_COMET_ECCENTRICITY_MAX = 0.99;

// --- Comet Tail Configuration ---
export const SOLAR_SYSTEM_COMET_TAIL = {
  /** Number of segments in the tail history */
  length: 50,
  /** Speed at which the tail moves away from the sun (solar wind) */
  windSpeed: 25.0,
  /** How much of the comet's velocity the tail segments inherit */
  momentumFactor: -0.125,
  /** How much the tail spreads out over time */
  spreadRate: 0.1,
  /** Base opacity of the tail */
  opacity: 0.06,
  /** Width of the tail at the comet head */
  startWidth: 1.0,
  /** Width multiplier at the end of the tail */
  endWidthFactor: 4.0,
};
