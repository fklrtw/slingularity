/**
 * Configuration for the sun's exponential growth.
 */
export const DIFFICULTY_SUN_GROWTH = {
  /** The base exponential growth rate at Level 1. */
  start: 2.0,
  /** The maximum growth rate the sun can reach. */
  limit: 6.0,
  /** Number of levels to reach 50% of the maximum growth increase. */
  halfLife: 10.0,
};

/**
 * Configuration for the planet's Atmosphere (gravity zone) ratio.
 * The physical Atmosphere radius is calculated as PlanetRadius * Multiplier.
 * Note: The visual glow includes an additional buffer equal to the spaceship's radius.
 */
export const DIFFICULTY_ATMOSPHERE = {
  /** The absolute minimum multiplier (floor) regardless of level. */
  minFactor: 4.5,
  /** The maximum multiplier available at Level 1. */
  maxFactorStart: 9.0,
  /** The limit that the maximum multiplier approaches at high levels. */
  maxFactorLimit: 6.0,
  /** Number of levels to reach 50% of the range reduction. */
  halfLife: 8.0,
};

/**
 * Configuration for planet visual radius.
 */
export const DIFFICULTY_PLANET_SIZE = {
  /** The minimum planet radius at Level 1. */
  minStart: 8.0,
  /** The limit for minimum planet radius as difficulty increases. */
  minLimit: 4.0,
  /** The maximum planet radius at Level 1. */
  maxStart: 11.0,
  /** The limit for maximum planet radius as difficulty increases. */
  maxLimit: 6.0,
  /** Number of levels to reach 50% of the size reduction. */
  halfLife: 12.0,
};

/**
 * Configuration for energy depletion based on distance traveled.
 */
export const DIFFICULTY_ENERGY_DIST = {
  /** Energy lost per game unit traveled at Level 1. */
  start: 5.0,
  /** The maximum possible energy loss per distance unit. */
  limit: 20.0,
  /** Number of levels to reach 50% of the penalty increase. */
  halfLife: 15.0,
};

/**
 * Configuration for energy depletion based on elapsed time.
 */
export const DIFFICULTY_ENERGY_TIME = {
  /** Energy lost per second at Level 1. */
  start: 25.0,
  /** The maximum possible energy loss per second. */
  limit: 120.0,
  /** Number of levels to reach 50% of the penalty increase. */
  halfLife: 15.0,
};

/**
 * Configuration for the radial gap between consecutive planets.
 */
export const DIFFICULTY_PLANET_GAP = {
  /** The average radial gap at Level 1. */
  start: 45.0,
  /** The maximum average radial gap allowed. */
  limit: 100.0,
  /** Number of levels to reach 50% of the gap expansion. */
  halfLife: 10.0,
};

/**
 * Configuration for the Spaceship's initial orbital speed when a mission starts.
 */
export const DIFFICULTY_INITIAL_ORBIT_SPEED = {
  /** Initial speed at Level 1. */
  start: 400.0,
  /** The maximum initial speed the ship can start with. */
  limit: 700.0,
  /** Number of levels to reach 50% of the speed increase. */
  halfLife: 15.0,
};

// --- Fixed Difficulty Parameters ---
/** Fibonacci offset: Level 1 has fib(1 + offset) planets. */
export const DIFFICULTY_PLANET_COUNT_LEVEL_OFFSET = 1;

/** The starting energy value (score) at the beginning of a mission. */
export const DIFFICULTY_SCORING_INITIAL_SCORE_BASE = 10000.0;

/** Score value below which the Hud indicator turns red to warn the player. */
export const DIFFICULTY_SCORING_SCORE_CRITICAL_THRESHOLD = 5000.0;

/** Base bonus score awarded for skipping a planet. */
export const DIFFICULTY_SCORING_SKIP_BONUS = 1000.0;

/** Multiplier for distance traveled between orbits to award score. */
export const DIFFICULTY_SCORING_TRAVEL_SCORE_FACTOR = 50.0;

/** Fixed bonus score awarded for reaching the end target portal. */
export const DIFFICULTY_SCORING_PORTAL_REACH_BONUS = 2500.0;
