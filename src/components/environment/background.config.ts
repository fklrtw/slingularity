/**
 * Global scale factor applied to the root background group
 */
export const BACKGROUND_GLOBAL_SCALE_FACTOR = 0.5;
/**
 * Speed at which the background continuously drifts towards the center
 */
export const BACKGROUND_MOTION_SPEED = 1.5;
/**
 * Range over which the background is randomly offset at the start of a level
 * Unit: game units.
 */
export const BACKGROUND_RANDOM_START_RANGE = 1000;

/**
 * Scale factor applied to the GeoJSON coordinates mapping stars and constellations
 */
export const BACKGROUND_CELESTIAL_DATA_SCALE = 20;
/**
 * Z-depth for procedural nebulae planes
 */
export const BACKGROUND_DEPTH_NEBULAE = -100;
/**
 * Z-depth for the Milky Way galactic band
 */
export const BACKGROUND_DEPTH_MILKYWAY = -300;
/**
 * Z-depth at which the star points and constellation lines are rendered
 */
export const BACKGROUND_DEPTH_STARS = -320;

/**
 * Z-depth for constellation line segments
 */
export const BACKGROUND_DEPTH_CONSTELLATIONS = -320;
/**
 * Z-depth for distant galaxies
 */
export const BACKGROUND_DEPTH_GALAXIES = -330;
/**
 * Base opacity of the star points
 */
export const BACKGROUND_STAR_ALPHA = 0.8;
/**
 * Amount of random variance applied to star sizes
 */
export const BACKGROUND_STAR_SIZE_VARIANCE = 5;

/**
 * Minimum allowed pixel size for a star
 */
export const BACKGROUND_STAR_MIN_SIZE = 1.5;

/**
 * Multiplier for constellation stars to make them bigger
 */
export const BACKGROUND_STAR_CONSTELLATION_MULT = 2;
/**
 * Base opacity of the constellation line segments
 */
export const BACKGROUND_CONSTELLATION_OPACITY = 0.15;
/**
 * Total number of procedural nebula planes to generate
 * Unit: count.
 */
export const BACKGROUND_NEBULA_COUNT = 5;
/**
 * Noise scale for the procedural nebula texture
 * Unit: multiplier.
 */
export const BACKGROUND_NEBULA_NOISE_SCALE = 6.0;
/**
 * Density offset applied to the noise to control cloud thickness
 */
export const BACKGROUND_NEBULA_DENSITY = 0.05;
/**
 * Exponent falloff applied to the noise to sharpen cloud edges
 * Unit: exponent.
 */
export const BACKGROUND_NEBULA_FALLOFF = 2.5;
/**
 * Physical width and height of each procedural nebula plane
 * Unit: game units.
 */
export const BACKGROUND_NEBULA_PLANE_SIZE = 2000;

/**
 * Range over which nebulae planes are randomly distributed across X/Y axes
 * Unit: game units.
 */
export const BACKGROUND_NEBULA_SPREAD = 2500;
/**
 * Global opacity multiplier applied to the rendered nebulae
 * Unit: opacity.
 */
export const BACKGROUND_NEBULA_OPACITY = {
  high: 0.15, // For post-processing enabled (bloom adds significant glow)
  low: 0.45, // For post-processing disabled (needs more base visibility)
};

// --- Galaxy Configuration ---
/**
 * Number of distant background galaxies
 * Unit: count.
 */
export const BACKGROUND_GALAXY_COUNT = 20;
/**
 * Radial spread of background galaxies
 * Unit: game units.
 */
export const BACKGROUND_GALAXY_SPREAD = 3000;

/**
 * Rotation angle applied to the galactic band
 */
export const BACKGROUND_MILKY_WAY_ROTATION = Math.random() * Math.PI;
/**
 * Overall scale multiplier for the galactic band
 */
export const BACKGROUND_MILKY_WAY_SCALE = 5;
