import type { Vector3 } from 'three';
import {
  PLANETS_ATMOSPHERE_OPACITY,
  PLANETS_PLANET_AMBIENT_LIGHT,
  PLANETS_PLANET_LIGHT_Z_OFFSET,
  PLANETS_PLANET_SHADER,
  PLANETS_RING_SHADER,
} from './planet.config';

/**
 * Data structure representing a celestial body (planet, sun, or moon)
 */
export interface CelestialBodyData {
  id: string
  position: Vector3
  velocity: Vector3
  mass: number
  radius: number
  color?: string
  semiMajorAxis?: number
  semiMinorAxis?: number
  focusOffset?: number
  currentAngle?: number
  isSun?: boolean
  isPlanet?: boolean
  isComet?: boolean
  atmosphereRadius: number
  atmosphereColor?: string
  /** pre-calculated radius for collision detection (radius + buffer) */
  crashRadius: number
  hasRings?: boolean
  ringColor?: string
  ringInnerRadius?: number
  ringOuterRadius?: number
  ringRotationSpeed?: number
  ringRotation?: [number, number, number]
  ringCount?: number
  rotationSpeed?: number
  initialRotation?: number
  /** independent orientation for the cel-shading light in radians */
  lightOrientation?: number
}

/**
 * Planet vertex shader
 */
export const planetVertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vWorldPos;
    #include <common>
    #include <shadowmap_pars_vertex>

    void main() {
        vUv = uv;

        // define variables expected by shadowmap_vertex
        vec3 transformed = vec3(position);
        vec3 transformedNormal = normalMatrix * normal;
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
        
        // transform normal to world space for consistent lighting calculations
        vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        
        // cameraPosition is a built-in uniform in Three.js ShaderMaterial
        vViewDir = normalize(cameraPosition - worldPosition.xyz);
        vWorldPos = worldPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;

        #include <shadowmap_vertex>
    }
`;

/**
 * Atmosphere and Annihilation vertex shader (2D)
 */
export const planeVertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

/**
 * Planet fragment shader
 */
export const planetFragmentShader = `
    uniform vec3 uColor;
    uniform float time;
    uniform vec3 uSunPos;
    uniform float uSunInfluence;
    uniform float uRotation;
    uniform float uLightRotation;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vWorldPos;

    #include <common>
    #include <packing>
    #include <lights_pars_begin>
    #include <shadowmap_pars_fragment>

    #ifdef USE_SHADOWMAP
    float getShadowMask() {
        float shadow = 1.0;
        #if NUM_DIR_LIGHT_SHADOWS > 0
        #pragma unroll_loop_start
        for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
            shadow *= getShadow( directionalShadowMap[ i ], directionalLightShadows[ i ].shadowMapSize, directionalLightShadows[ i ].shadowIntensity, directionalLightShadows[ i ].shadowBias, directionalLightShadows[ i ].shadowRadius, vDirectionalShadowCoord[ i ] );
        }
        #pragma unroll_loop_end
        #endif
        #if NUM_SPOT_LIGHT_SHADOWS > 0
        #pragma unroll_loop_start
        for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
            shadow *= getShadow( spotShadowMap[ i ], spotLightShadows[ i ].shadowMapSize, spotLightShadows[ i ].shadowIntensity, spotLightShadows[ i ].shadowBias, spotLightShadows[ i ].shadowRadius, vSpotLightCoord[ i ] );
        }
        #pragma unroll_loop_end
        #endif
        #if NUM_POINT_LIGHT_SHADOWS > 0
        #pragma unroll_loop_start
        for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
            shadow *= getPointShadow( pointShadowMap[ i ], pointLightShadows[ i ].shadowMapSize, pointLightShadows[ i ].shadowIntensity, pointLightShadows[ i ].shadowBias, pointLightShadows[ i ].shadowRadius, vPointShadowCoord[ i ], pointLightShadows[ i ].shadowCameraNear, pointLightShadows[ i ].shadowCameraFar );
        }
        #pragma unroll_loop_end
        #endif
        return shadow;
    }
    #endif

    void main() {
        // use uRotation for texture bands
        vec2 rotatedUv = vUv;
        float s = sin(uRotation);
        float c = cos(uRotation);
        rotatedUv = vec2(c * (vUv.x - 0.5) - s * (vUv.y - 0.5) + 0.5, s * (vUv.x - 0.5) + c * (vUv.y - 0.5) + 0.5);

        float bands = sin(rotatedUv.y * ${PLANETS_PLANET_SHADER.bands_count.toFixed(1)}) * 0.5 + 0.5;
        bands = step(${PLANETS_PLANET_SHADER.bands_sharpness.toFixed(2)}, bands);
        vec3 finalColor = mix(uColor, uColor * ${PLANETS_PLANET_SHADER.shade_mult.toFixed(2)}, bands);
        
        // 1. base lighting from "above" the sun (pleasing primary light)
        vec3 lightPos = uSunPos + vec3(0.0, 0.0, ${PLANETS_PLANET_LIGHT_Z_OFFSET.toFixed(1)});
        vec3 lightDir = normalize(lightPos - vWorldPos); 
        float baseDiff = max(dot(vNormal, lightDir), 0.0);
        
        // 2. independent cel-shading orientation (decoupled from shadows)
        vec3 celOffset = vec3(sin(uLightRotation) * 40.0, cos(uLightRotation) * 40.0, ${PLANETS_PLANET_LIGHT_Z_OFFSET.toFixed(1)});
        vec3 celLightPos = uSunPos + celOffset;
        vec3 celLightDir = normalize(celLightPos - vWorldPos);
        float celDiff = max(dot(vNormal, celLightDir), 0.0);
        
        // calculate cel-steps using the decoupled light direction
        float steps = step(0.05, celDiff) * 0.4 + step(0.5, celDiff) * 0.6;
        
        // distance attenuation based on Sun proximity
        float distToSun = length(uSunPos - vWorldPos);
        float distanceIntensity = clamp(2000.0 / max(distToSun, 100.0), 0.3, 2.0);
        
        // combine pleasing base light with independent cel-shading highlights
        float finalDiff = max(${PLANETS_PLANET_AMBIENT_LIGHT.toFixed(2)}, baseDiff * (0.6 + steps * 0.4) * distanceIntensity);

        // 3. specular highlight (Blinn-Phong)
        vec3 halfDir = normalize(lightDir + vViewDir);
        float spec = pow(max(dot(vNormal, halfDir), 0.0), ${PLANETS_PLANET_SHADER.specular_pow.toFixed(1)});
        float specSteps = step(0.8, spec) * 0.4 + step(0.95, spec) * 0.6; // double-stepped cel specular
        vec3 specular = vec3(1.0) * specSteps * ${PLANETS_PLANET_SHADER.specular_mult.toFixed(2)} * distanceIntensity;

        // Shadow calculation
        float shadow = 1.0;
        #ifdef USE_SHADOWMAP
            #if NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SPOT_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0
                shadow = getShadowMask();
            #endif
        #endif

        float fresnel = pow(1.0 - max(0.0, dot(vNormal, vViewDir)), ${PLANETS_PLANET_SHADER.rim_pow.toFixed(1)});
        vec3 rim = vec3(1.0) * step(${PLANETS_PLANET_SHADER.rim_step.toFixed(1)}, fresnel) * ${PLANETS_PLANET_SHADER.rim_mult.toFixed(2)};
        
        // apply shadow to lighting components
        vec3 col = finalColor * finalDiff * (0.1 + 0.9 * shadow) + (rim + specular) * shadow;
        
        // Annihilate coloring: brighten based on sun influence (dynamic heating)
        col = mix(col, col * 2.0, uSunInfluence);

        gl_FragColor = vec4(col, 1.0);
    }
`;

/**
 * Ring fragment shader
 */
export const ringFragmentShader = `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    uniform vec3 uColor;
    uniform float time;
    uniform float opacity;
    uniform float uInnerFade;
    uniform float uOuterFade;

    #include <common>
    #include <packing>
    #include <lights_pars_begin>
    #include <shadowmap_pars_fragment>

    #ifdef USE_SHADOWMAP
    float getShadowMask() {
        float shadow = 1.0;
        #if NUM_DIR_LIGHT_SHADOWS > 0
        #pragma unroll_loop_start
        for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
            shadow *= getShadow( directionalShadowMap[ i ], directionalLightShadows[ i ].shadowMapSize, directionalLightShadows[ i ].shadowIntensity, directionalLightShadows[ i ].shadowBias, directionalLightShadows[ i ].shadowRadius, vDirectionalShadowCoord[ i ] );
        }
        #pragma unroll_loop_end
        #endif
        #if NUM_SPOT_LIGHT_SHADOWS > 0
        #pragma unroll_loop_start
        for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
            shadow *= getShadow( spotShadowMap[ i ], spotLightShadows[ i ].shadowMapSize, spotLightShadows[ i ].shadowIntensity, spotLightShadows[ i ].shadowBias, spotLightShadows[ i ].shadowRadius, vSpotLightCoord[ i ] );
        }
        #pragma unroll_loop_end
        #endif
        #if NUM_POINT_LIGHT_SHADOWS > 0
        #pragma unroll_loop_start
        for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
            shadow *= getPointShadow( pointShadowMap[ i ], pointLightShadows[ i ].shadowMapSize, pointLightShadows[ i ].shadowIntensity, pointLightShadows[ i ].shadowBias, pointLightShadows[ i ].shadowRadius, vPointShadowCoord[ i ], pointLightShadows[ i ].shadowCameraNear, pointLightShadows[ i ].shadowCameraFar );
        }
        #pragma unroll_loop_end
        #endif
        return shadow;
    }
    #endif

    void main() {
        vec2 uv = vUv - 0.5;
        float r = length(uv) * 2.0;
        
        float shadow = 1.0;
        #ifdef USE_SHADOWMAP
            shadow = getShadowMask();
        #endif
        
        float ring = sin(r * ${PLANETS_RING_SHADER.bands_count.toFixed(1)}) * 0.5 + 0.5;
        ring = step(${PLANETS_RING_SHADER.bands_sharpness.toFixed(2)}, ring);
        float alpha = opacity * (${PLANETS_RING_SHADER.opacity_base.toFixed(2)} + ${PLANETS_RING_SHADER.opacity_mult.toFixed(2)} * ring);
        alpha *= smoothstep(uOuterFade, uOuterFade - 0.03, r) * smoothstep(uInnerFade - 0.03, uInnerFade, r);
        gl_FragColor = vec4(uColor, alpha * shadow);
    }
`;

/**
 * Annihilation shader - Radial Paint
 *
 * Expands from center outwards while desaturating.
 */
export const paintFragmentShader = `
    varying vec2 vUv;
    uniform vec3 uColor;
    uniform float uProgress; // 0.0 to 1.0
    uniform float uOpacity;

    void main() {
        float dist = length(vUv - 0.5) * 2.0;
        // Paint expands from center outwards
        float paint = smoothstep(uProgress, uProgress - 0.1, dist);
        // radially desaturate as it moves out (mix with white/grey)
        vec3 desaturatedColor = mix(uColor, vec3(0.9, 0.9, 1.0), dist * 0.7);
        gl_FragColor = vec4(desaturatedColor, paint * uOpacity);
    }
`;

export const atmosphereVertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vWorldPos;
    #include <common>
    #include <shadowmap_pars_vertex>

    void main() {
        vUv = uv;

        // define variables expected by shadowmap_vertex
        vec3 transformed = vec3(position);
        vec3 transformedNormal = normalMatrix * normal;
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
        
        vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        vViewDir = normalize(cameraPosition - worldPosition.xyz);
        vWorldPos = worldPosition.xyz;
        
        gl_Position = projectionMatrix * mvPosition;

        #include <shadowmap_vertex>
    }
`;
export const atmosphereFragmentShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vWorldPos;
    uniform vec3 uColor;
    uniform vec2 uSunDir;
    uniform float uGlowAngle;
    uniform float uGlowIntensity;

    #include <common>
    #include <packing>
    #include <lights_pars_begin>
    #include <shadowmap_pars_fragment>

    #ifdef USE_SHADOWMAP
    float getShadowMask() {
        float shadow = 1.0;
        #if NUM_DIR_LIGHT_SHADOWS > 0
        #pragma unroll_loop_start
        for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
            shadow *= getShadow( directionalShadowMap[ i ], directionalLightShadows[ i ].shadowMapSize, directionalLightShadows[ i ].shadowIntensity, directionalLightShadows[ i ].shadowBias, directionalLightShadows[ i ].shadowRadius, vDirectionalShadowCoord[ i ] );
        }
        #pragma unroll_loop_end
        #endif
        #if NUM_SPOT_LIGHT_SHADOWS > 0
        #pragma unroll_loop_start
        for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
            shadow *= getShadow( spotShadowMap[ i ], spotLightShadows[ i ].shadowMapSize, spotLightShadows[ i ].shadowIntensity, spotLightShadows[ i ].shadowBias, spotLightShadows[ i ].shadowRadius, vSpotLightCoord[ i ] );
        }
        #pragma unroll_loop_end
        #endif
        #if NUM_POINT_LIGHT_SHADOWS > 0
        #pragma unroll_loop_start
        for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
            shadow *= getPointShadow( pointShadowMap[ i ], pointLightShadows[ i ].shadowMapSize, pointLightShadows[ i ].shadowIntensity, pointLightShadows[ i ].shadowBias, pointLightShadows[ i ].shadowRadius, vPointShadowCoord[ i ], pointLightShadows[ i ].shadowCameraNear, pointLightShadows[ i ].shadowCameraFar );
        }
        #pragma unroll_loop_end
        #endif
        return shadow;
    }
    #endif

    void main() {
        vec2 offset = vUv - 0.5;
        float dist = length(offset) * 2.0;

        vec2 dir = normalize(offset);
        float dotProd = dot(dir, uSunDir);

        // Atmosphere on the dark side should receive shadow from its own planet.
        // dotProd > 0 means sun side, < 0 means dark side.
        // We fade the atmosphere on the dark side to simulate the planet blocking the light.
        float atmosphereShadow = smoothstep(-0.5, 0.5, dotProd);
        float baseAlpha = smoothstep(1.0, 0.0, dist) * ${PLANETS_ATMOSPHERE_OPACITY.toFixed(2)} * (0.1 + 0.9 * atmosphereShadow);

        float angle = acos(clamp(dotProd, -1.0, 1.0));

        float halfAngle = radians(uGlowAngle) / 2.0;
        float glow = smoothstep(halfAngle, halfAngle * 0.5, angle);

        float realShadow = 1.0;
        #ifdef USE_SHADOWMAP
            #if NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SPOT_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0
                realShadow = getShadowMask();
            #endif
        #endif

        float finalAlpha = baseAlpha + baseAlpha * glow * uGlowIntensity * realShadow;
        gl_FragColor = vec4(uColor, finalAlpha);
    }
`;

/**
 * Basic Atmosphere fragment shader (no lighting/shadows)
 */
export const basicAtmosphereFragmentShader = `
    varying vec2 vUv;
    uniform vec3 uColor;
    void main() {
        float dist = length(vUv - 0.5) * 2.0;
        float alpha = smoothstep(1.0, 0.0, dist) * ${PLANETS_ATMOSPHERE_OPACITY.toFixed(2)};
        gl_FragColor = vec4(uColor, alpha);
    }
`;

/**
 * Basic Ring fragment shader (no lighting/shadows)
 */
export const basicRingFragmentShader = `
    varying vec2 vUv;
    uniform vec3 uColor;
    uniform float opacity;
    uniform float uInnerFade;
    uniform float uOuterFade;
    void main() {
        float r = length(vUv - 0.5) * 2.0;
        float alpha = opacity * smoothstep(uOuterFade, uOuterFade - 0.03, r) * smoothstep(uInnerFade - 0.03, uInnerFade, r);
        gl_FragColor = vec4(uColor, alpha);
    }
`;
