/**
 * Field of view for the main perspective camera
 * Unit: degrees.
 */
export const CAMERA_FOV = 45;
/**
 * Initial world position of the camera at session start
 * Unit: array [x, y, z] (game units).
 */
export const CAMERA_INITIAL_POS: [number, number, number] = [0, 0, 100];
/**
 * Near clipping plane for the main camera
 * Unit: game units. Constraints: must be positive.
 */
export const CAMERA_NEAR = 1;
/**
 * Far clipping plane for the main camera
 * Unit: game units. Constraints: must be greater than CAMERA_NEAR.
 */
export const CAMERA_FAR = 5000;

/**
 * Fallback camera distance used when target bounds cannot be computed
 * Unit: game units.
 */
export const CAMERA_DIST_FALLBACK = 200;

/**
 * Camera parameters for Heliocentric mode
 *
 * adaptive framing that encompasses the spaceship and its current target.
 */
export const CAMERA_CONFIG_HELIOCENTRIC = {
  /** base smoothing factor for position interpolation */
  smoothing: 0.0125,
  /** absolute minimum distance from the focus plane */
  minDist: 100,
  /** extra distance added to calculated framing zoom */
  addDist: 150,
  /** symmetric padding around computed target bounds */
  boxBuffer: 10,
  /** radial offset used to widen the view when skipping targets */
  skipBuffer: 20,
};

/**
 * Camera parameters for Aligned mode
 *
 * vertical alignment with the sun-portal axis.
 */
export const CAMERA_CONFIG_ALIGNED = {
  /** base smoothing factor for position interpolation */
  smoothing: 0.05,
  /** dampening factor for lateral (East-West) movement relative to axis */
  deviationFactor: 0.15,
  /** absolute minimum distance from the focus plane */
  minDist: 100,
  /** extra distance added to calculated framing zoom */
  addDist: 150,
  /** symmetric padding around computed target bounds */
  boxBuffer: 10,
  /** radial offset used to widen the view when skipping targets */
  skipBuffer: 20,
};

/**
 * Camera parameters for Ship Follow mode
 *
 * fixed zoom level centered strictly on the spaceship.
 */
export const CAMERA_CONFIG_SHIP = {
  /** high-responsiveness smoothing factor for tight tracking */
  smoothing: 0.2,
  /** fixed distance from the focus plane */
  dist: 350,
};
