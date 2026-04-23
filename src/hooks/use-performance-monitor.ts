import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useGameStore } from '../store';

/**
 * Performance monitor hook
 *
 * Tracks framerate and automatically disables performance hogs if it falls below 45 FPS.
 * Only active while the document has focus.
 */
export function usePerformanceMonitor() {
  const settings = useGameStore(s => s.settings);
  const updateSettings = useGameStore(s => s.updateSettings);

  const frameTimes = useRef<number[]>([]);
  const lastTime = useRef<number | null>(null);

  useFrame(() => {
    if (!settings.autoPerformance || !document.hasFocus() || document.visibilityState !== 'visible') {
      lastTime.current = null; // reset to avoid dt spike on return
      return;
    }

    const now = performance.now();
    if (lastTime.current === null) {
      lastTime.current = now;
      return;
    }
    const dt = now - lastTime.current;
    lastTime.current = now;

    frameTimes.current.push(dt);
    if (frameTimes.current.length > 60) {
      frameTimes.current.shift();
      const avgDt = frameTimes.current.reduce((a, b) => a + b, 0) / 60;
      const fps = 1000 / avgDt;

      if (fps < 45) {
        if (settings.shadows !== 'off') {
          updateSettings({ shadows: 'off' });
          frameTimes.current = [];
          console.warn('Auto-performance: Disabling shadows');
        } else if (settings.shaders) {
          updateSettings({ shaders: 'off' });
          frameTimes.current = [];
          console.warn('Auto-performance: Disabling advanced shaders');
        } else if (settings.detailLevel === 'high') {
          updateSettings({ detailLevel: 'medium' });
          frameTimes.current = [];
          console.warn('Auto-performance: Detail Level -> Medium');
        } else if (settings.detailLevel === 'medium') {
          updateSettings({ detailLevel: 'low' });
          frameTimes.current = [];
          console.warn('Auto-performance: Detail Level -> Low');
        } else if (settings.resolutionScale === 'high') {
          updateSettings({ resolutionScale: 'medium' });
          frameTimes.current = [];
          console.warn('Auto-performance: Resolution Scale -> Medium');
        } else if (settings.resolutionScale === 'medium') {
          updateSettings({ resolutionScale: 'low' });
          frameTimes.current = [];
          console.warn('Auto-performance: Resolution Scale -> Low');
        } else if (settings.antialiasing === 'high') {
          updateSettings({ antialiasing: 'medium' });
          frameTimes.current = [];
          console.warn('Auto-performance: Antialiasing -> Medium');
        } else if (settings.antialiasing === 'medium') {
          updateSettings({ antialiasing: 'low' });
          frameTimes.current = [];
          console.warn('Auto-performance: Antialiasing -> Low');
        }
      }
    }
  });
}
