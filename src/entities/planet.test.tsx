import { describe, expect, it } from 'vitest';
import { atmosphereFragmentShader, planetFragmentShader } from './planet';

describe('Planet Component Shaders', () => {
  it('should calculate light direction with a positive Z offset to illuminate the planet for the camera', () => {
    expect(planetFragmentShader).toContain('vec3 lightPos = uSunPos + vec3(0.0, 0.0, 100.0);');
    expect(planetFragmentShader).toContain('vec3 lightDir = normalize(lightPos - vWorldPos);');
  });

  it('should implement decoupled cel-shading orientation', () => {
    expect(planetFragmentShader).toContain('vec3 celOffset = vec3(sin(uLightRotation) * 40.0, cos(uLightRotation) * 40.0, 100.0);');
    expect(planetFragmentShader).toContain('vec3 celLightPos = uSunPos + celOffset;');
    expect(planetFragmentShader).toContain('float celDiff = max(dot(vNormal, celLightDir), 0.0);');
  });

  it('should scale lighting intensity based on distance from the sun', () => {
    expect(planetFragmentShader).toContain('float distToSun = length(uSunPos - vWorldPos);');
    expect(planetFragmentShader).toContain('float distanceIntensity = clamp(2000.0 / max(distToSun, 100.0), 0.3, 2.0);');
    expect(planetFragmentShader).toContain('float finalDiff = max(0.15, baseDiff * (0.6 + steps * 0.4) * distanceIntensity);');
  });
});

describe('Atmosphere Shader', () => {
  it('should include uGlowIntensity uniform', () => {
    expect(atmosphereFragmentShader).toContain('uniform float uGlowIntensity;');
  });

  it('should implement self-shadowing based on sun direction', () => {
    expect(atmosphereFragmentShader).toContain('float atmosphereShadow = smoothstep(-0.5, 0.5, dotProd);');
    expect(atmosphereFragmentShader).toContain('float baseAlpha = smoothstep(1.0, 0.0, dist) * 0.35 * (0.1 + 0.9 * atmosphereShadow);');
  });

  it('should use uGlowIntensity in finalAlpha calculation', () => {
    expect(atmosphereFragmentShader).toContain('float finalAlpha = baseAlpha + baseAlpha * glow * uGlowIntensity * realShadow;');
  });
});
