import type { SFXEngine } from '../hooks/use-audio-effects';

let engine: SFXEngine | null = null;

/**
 * Binds the actual SFXEngine instance to the proxy.
 * This is called by use-audio-effects.ts when it is loaded.
 */
export function setSfxEngine(sfxEngine: SFXEngine) {
  engine = sfxEngine;
}

/**
 * A proxy object that safely forwards calls to the actual SFXEngine.
 * If the SFXEngine has not been loaded yet, all method calls act as safe no-ops.
 */
export const sfx = new Proxy({} as unknown as SFXEngine, {
  get(target, prop) {
    if (typeof prop === 'symbol') {
      return undefined;
    }
    if (engine && typeof (engine as unknown as Record<string, unknown>)[prop] === 'function') {
      return ((engine as unknown as Record<string, unknown>)[prop] as (...args: unknown[]) => unknown).bind(engine);
    }
    // Return a no-op function for any missing method
    return () => {};
  }
});
