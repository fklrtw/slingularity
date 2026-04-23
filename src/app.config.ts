import tiny5Font from '@fontsource/tiny5/files/tiny5-latin-400-normal.woff?url';
import { Vector3 } from 'three';

/**
 * Solar system center
 * Global reference coordinate for the center of the solar system in game units (Vector3).
 */
export const APP_SUN_POS = new Vector3(0, 0, 0);

/**
 * Custom font URL for 3D Text
 * URL to fetch the custom font used in the game scene.
 */
export const APP_FONT_URL = tiny5Font;

/**
 * Minimum sun gauge distance
 * Initial fallback distance for sun gauge in start screens in game units. Minimum 1.0.
 */
export const APP_MIN_LAST_PLANET_DIST = 1000.0;

/**
 * Interval between low-priority background collision checks
 * Unit: seconds. Constraints: must be positive.
 */
export const APP_COLLISION_CHECK_INTERVAL = 0.5;

/**
 * Standard segments for spherical celestial bodies (Planets, Sun)
 * Unit: array [width, height].
 */
export const APP_SPHERE_SEGMENTS: [number, number] = [32, 32];

/**
 * Minimum loading screen duration in milliseconds
 * Prevents the loading screen from flashing too briefly when shaders compile fast.
 */
export const APP_LOADING_MIN_DURATION_MS = 400;

/**
 * Mount delay before triggering async shader compilation in milliseconds
 * Allows all meshes to mount into the WebGL scene graph before compilation begins.
 */
export const APP_LOADING_MOUNT_DELAY_MS = 50;

/**
 * Fallback loading screen duration in milliseconds
 * Used when the browser does not support renderer.compileAsync().
 */
export const APP_LOADING_FALLBACK_DURATION_MS = 1200;
