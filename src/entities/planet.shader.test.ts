import { describe, expect, it } from 'vitest';
import { ShaderChunk } from 'three';
import { planetFragmentShader, planetVertexShader } from './planet';

/**
 * Utility to expand Three.js shader includes for analysis.
 */
function expandIncludes(source: string): string {
  return source.replace(/#include <([\w_]+)>/g, (_, name) => {
    const chunk = ShaderChunk[name as keyof typeof ShaderChunk];
    if (!chunk) {
      return `/* missing chunk: ${name} */`;
    }
    return expandIncludes(chunk);
  });
}

describe('Planet Shader Compilation (String Analysis)', () => {
  it('vertex shader should have required variables for shadow mapping', () => {
    const expanded = expandIncludes(planetVertexShader);

    // Check for variables expected by shadowmap_vertex
    expect(expanded).toContain('vec3 transformed');
    expect(expanded).toContain('vec3 transformedNormal');
    expect(expanded).toContain('vec4 mvPosition');
    expect(expanded).toContain('vec4 worldPosition');

    // Ensure shadowmap chunks are present
    expect(planetVertexShader).toContain('#include <shadowmap_pars_vertex>');
    expect(planetVertexShader).toContain('#include <shadowmap_vertex>');
  });

  it('fragment shader should have getShadowMask defined when USE_SHADOWMAP is active', () => {
    const expanded = expandIncludes(planetFragmentShader);

    // getShadowMask is defined in shadowmap_pars_fragment
    expect(expanded).toContain('float getShadowMask()');

    // Check for dependencies of getShadowMask for point lights
    expect(expanded).toContain('getPointShadow');
    expect(expanded).toContain('pointShadowMap');
    expect(expanded).toContain('vPointShadowCoord');
  });

  it('fragment shader should use correct preprocessor guards for getShadowMask', () => {
    // We need to ensure that if USE_SHADOWMAP is defined, the shader is syntactically correct
    // The previous error was 'no matching overloaded function found'
    // which happens if getShadowMask() is called but not defined in the current branch.

    expect(planetFragmentShader).toContain('#ifdef USE_SHADOWMAP');
    // Ensure it's called with ()
    expect(planetFragmentShader).toContain('getShadowMask()');
  });
});
