/**
 * Size of the minimap relative to the smallest screen dimension
 * Unit: ratio. Constraints: range [0, 1].
 */
export const MINIMAP_SCREEN_RATIO = 0.25;
/**
 * Padding from the edge of the screen
 * Unit: pixels. Constraints: must be non-negative.
 */
export const MINIMAP_PADDING = 40;
/**
 * Margin multiplier applied to the bounding box of tracked entities
 * Unit: multiplier. Constraints: minimum 1.0.
 */
export const MINIMAP_MARGIN = 1.5;
/**
 * Minimum world units the minimap will show
 * Unit: game units. Constraints: prevents excessive zoom.
 */
export const MINIMAP_MIN_SIZE = 50;
/**
 * Opacity of the minimap's dark background plate
 * Unit: opacity. Constraints: range [0, 1].
 */
export const MINIMAP_BG_OPACITY = 0.75;
/**
 * Z-depth for the minimap camera
 * Unit: game units.
 */
export const MINIMAP_CAMERA_Z = 1000;
/**
 * Z-depth for the minimap background plate
 * Unit: game units.
 */
export const MINIMAP_BG_Z = 0;
/**
 * Near clipping plane for the minimap orthographic camera
 * Unit: game units.
 */
export const MINIMAP_NEAR = 0.1;
/**
 * Far clipping plane for the minimap orthographic camera
 * Unit: game units.
 */
export const MINIMAP_FAR = 2000;
