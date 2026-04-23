import { useMemo } from 'react';
import { Color } from 'three';
import chroma from 'chroma-js';

/**
 * Custom hook to bridge CSS variables and Three.js scene.
 * Reads computed values from the document root and returns them as Three.js Color objects.
 *
 * Performance: Uses useMemo to ensure colors are only read once or when level changes.
 * This avoids expensive getComputedStyle calls in useFrame.
 */
export function useThemeColors() {
  return useMemo(() => {
    // 1. Get the computed styles from the root element
    const rootStyle = getComputedStyle(document.documentElement);

    /**
     * Helper to read a CSS variable and convert to Three.js Color.
     * Fix: THREE.Color warns when alpha is present in rgba().
     * We strip the alpha part for THREE.Color usage.
     */
    const getColor = (varName: string) => {
      let val = rootStyle.getPropertyValue(varName).trim();

      // Convert rgba(r, g, b, a) to rgb(r, g, b) to suppress THREE.Color warnings
      if (val.startsWith('rgba')) {
        val = val.replace('rgba', 'rgb').replace(/,[^,]+\)$/, ')');
      }

      return new Color(val || 'rgb(255, 255, 255)');
    };

    /**
     * Helper to read an array of colors from CSS variables
     */
    const getPalette = (prefix: string, count: number) => {
      const palette = [];
      for (let i = 1; i <= count; i++) {
        palette.push(getColor(`--${prefix}-${i}`));
      }
      return palette;
    };

    const colors = {
      themePrimary: getColor('--theme-primary'),
      themePrimaryGlow: getColor('--theme-primary-glow'),
      themePrimaryDim: getColor('--theme-primary-dim'),
      themePrimarySoft: getColor('--theme-primary-soft'),
      themePrimaryBrightGlow: getColor('--theme-primary-bright-glow'),

      themeDanger: getColor('--theme-danger'),
      themeDangerDim: getColor('--theme-danger-dim'),
      themeDangerSoft: getColor('--theme-danger-soft'),
      themeDangerBg: getColor('--theme-danger-bg'),

      themeWarning: getColor('--theme-warning'),
      themeWarningDim: getColor('--theme-warning-dim'),

      themeHighlight: getColor('--theme-highlight'),

      themeSun0: getColor('--theme-sun-0'),
      themeSun50: getColor('--theme-sun-50'),
      themeSun100: getColor('--theme-sun-100'),

      themePortal: getColor('--theme-portal'),
      themePortalGlow: getColor('--theme-portal-glow'),

      bgApp: getColor('--bg-app'),
      bgOverlay: getColor('--bg-overlay'),
      bgPanelDark: getColor('--bg-panel-dark'),

      textMain: getColor('--text-main'),
      textInverse: getColor('--text-inverse'),

      envMilkyWay: getColor('--env-milky-way'),

      nebulaPalette: getPalette('env-nebula', 5),
      galaxyPalette: getPalette('env-galaxy', 5),
      planetPalette: getPalette('planet', 15),
    };

    // Pre-calculate sun color scale for performance (factory pattern)
    const sunColorScale = chroma.scale([
      colors.themeSun0.getStyle(),
      colors.themeSun50.getStyle(),
      colors.themeSun100.getStyle(),
    ]).mode('lch');

    return {
      ...colors,
      sunColorScale,
    };
  }, []);
}
