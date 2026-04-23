import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for React
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('@strudel')) {
              return 'audio-engine';
            }
            if (id.includes('three') || id.includes('@react-three')) {
              return 'three-vendor';
            }
            return 'vendor';
          }
          if (
            id.includes('hooks/use-audio-effects')
            || id.includes('hooks/use-procedural-music')
            || id.includes('audio.config.ts')
          ) {
            return 'audio-logic';
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ['@strudel/web'],
    // Attempt to silence the plugin deprecation warning
    rolldownOptions: {},
  },
  resolve: {
    dedupe: ['three'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    },
    onConsoleLog(log) {
      if (log.includes('Multiple instances of Three.js')) {
        return false;
      }
      if (log.includes('is using incorrect casing')) {
        return false;
      }
      if (log.includes('unrecognized in this browser')) {
        return false;
      }
      if (log.includes('React does not recognize the')) {
        return false;
      }
      if (log.includes('Received `true` for a non-boolean attribute')) {
        return false;
      }
      if (log.includes('Warning: Received `%s` for a non-boolean attribute `%s`')) {
        return false;
      }

      const r3fIntrinsics = [
        'mesh', 'group', 'pointLight', 'meshStandardMaterial', 'meshBasicMaterial',
        'sphereGeometry', 'torusGeometry', 'lineSegments', 'primitive', 'ambientLight',
        'directionalLight', 'spotLight', 'perspectiveCamera', 'orthographicCamera',
        'points', 'bufferGeometry', 'bufferAttribute', 'float32Array', 'torusGeometry',
        'sphereGeometry',
      ];
      if (r3fIntrinsics.some(tag => log.includes(`<${tag}>`) || log.includes(`<${tag} />`))) {
        return false;
      }
    },
  },
});
