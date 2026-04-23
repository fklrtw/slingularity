import { useGLTF, Trail, type MeshLineGeometry, Cone, useTexture } from '@react-three/drei';
import React, { useMemo } from 'react';
import {
  type Mesh,
  type Object3D,
  Vector3,
  MeshStandardMaterial,
  RepeatWrapping,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Color,
} from 'three';
import { useSpaceshipSimulation } from '../hooks/use-spaceship-simulation';
import { AnnihilationBeam } from './annihilation-beam';
import { Shockwave } from './shockwave';
import type { SystemRefData } from './solar-system';
import {
  SPACESHIP_EMISSIVE_INTENSITY,
  SPACESHIP_TRAIL_DECAY,
  SPACESHIP_TRAIL_LENGTH,
  SPACESHIP_TRAIL_WIDTH,
  SPACESHIP_THRUSTERS,
  SPACESHIP_NAV_LIGHTS,
  SPACESHIP_COCKPIT_LIGHT,
  SPACESHIP_ROTATION,
  SPACESHIP_SCALE,
} from './spaceship.config';
import { useThemeColors } from '../hooks/use-theme-colors';
import { useGameStore } from '../store';
import { APP_SUN_POS } from '../app.config';
import {
  PLANETS_PLANET_SHADER,
} from './planet.config';

/**
 * Spaceship vertex shader
 */
export const spaceshipVertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vWorldPos;
    varying vec3 vLocalPos;
    #include <common>
    #include <shadowmap_pars_vertex>

    void main() {
        vUv = uv;
        vLocalPos = position;
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

/**
 * Spaceship fragment shader
 */
export const spaceshipFragmentShader = `
    uniform vec3 uColor;
    uniform sampler2D uMap;
    uniform vec3 uSunPos;
    uniform float uSunInfluence;
    uniform float uLightRotation;
    uniform float uEmissiveIntensity;
    uniform vec3 uCameraPos;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vWorldPos;
    varying vec3 vLocalPos;

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
        vec4 texColor = texture2D(uMap, vUv);
        vec3 baseColor = texColor.rgb * uColor;
        
        // 1. Light "above" the solar system, between sun and camera
        vec3 lightPos = mix(uSunPos, uCameraPos, 0.4) + vec3(0.0, 0.0, 80.0);
        vec3 lightDir = normalize(lightPos - vWorldPos); 
        float baseDiff = max(dot(vNormal, lightDir), 0.0);
        
        // 2. independent cel-shading orientation
        vec3 celOffset = vec3(sin(uLightRotation) * 40.0, cos(uLightRotation) * 40.0, 100.0);
        vec3 celLightPos = uSunPos + celOffset;
        vec3 celLightDir = normalize(celLightPos - vWorldPos);
        float celDiff = max(dot(vNormal, celLightDir), 0.0);
        
        float steps = step(0.05, celDiff) * 0.4 + step(0.5, celDiff) * 0.6;
        
        float distToSun = length(uSunPos - vWorldPos);
        float distanceIntensity = clamp(2000.0 / max(distToSun, 100.0), 0.3, 2.0);
        
        float finalDiff = max(0.15, baseDiff * (0.6 + steps * 0.4) * distanceIntensity);

        float shadow = 1.0;
        #ifdef USE_SHADOWMAP
            #if NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SPOT_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0
                shadow = getShadowMask();
            #endif
        #endif

        float fresnel = pow(1.0 - max(0.0, dot(vNormal, vViewDir)), ${PLANETS_PLANET_SHADER.rim_pow.toFixed(1)});
        vec3 rim = vec3(1.0) * step(${PLANETS_PLANET_SHADER.rim_step.toFixed(1)}, fresnel) * ${PLANETS_PLANET_SHADER.rim_mult.toFixed(2)};
        
        vec3 col = baseColor * finalDiff * (0.1 + 0.9 * shadow) + rim * shadow;

        col += baseColor * uEmissiveIntensity * 0.05;
        col = mix(col, col * 2.0, uSunInfluence);

        // Cockpit transparency logic
        float alpha = 1.0;
        float isCockpitArea = smoothstep(0.4, 0.6, vLocalPos.y) * (1.0 - smoothstep(1.1, 1.3, vLocalPos.y));
        if (isCockpitArea > 0.5 && length(texColor.rgb) < 1.2) {
            alpha = 0.7;
        }

        gl_FragColor = vec4(col, alpha);
    }
`;

/**
 * Properties for the Spaceship component
 */
interface SpaceshipProps {
  initialPosition: Vector3
  initialVelocity: Vector3
  initialOrbitDirection: number
  systemRef: React.RefObject<SystemRefData>
  spaceshipRef: React.RefObject<Mesh | null>
  resetCounter: number
}

function SpaceshipModel(props: {
  position: Vector3
  resetCounter: number
  spaceshipRef: React.RefObject<Mesh | null>
  spaceshipMeshRef: React.RefObject<Mesh | null>
}) {
  // resolve model and texture paths relative to Vite base URL for subpath hosting
  const modelUrl = `${import.meta.env.BASE_URL}models/low_poly_space_ship.glb`;
  const textureUrl = `${import.meta.env.BASE_URL}models/textures/Material_baseColor.png`;
  const { scene } = useGLTF(modelUrl);
  const texture = useTexture(textureUrl);

  const spaceshipTexture = useMemo(() => {
    const t = texture.clone();
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    return t;
  }, [texture]);

  const spaceshipDetail = useGameStore(s => s.settings.spaceshipDetail);
  const shaderQuality = useGameStore(s => s.settings.shaders);
  const { themePrimary } = useThemeColors();

  const model = useMemo(() => {
    const clone = scene.clone();

    clone.traverse((child) => {
      const mesh = child as Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (shaderQuality === 'advanced') {
          mesh.material = new ShaderMaterial({
            lights: true,
            transparent: true,
            toneMapped: false,
            uniforms: UniformsUtils.merge([
              UniformsLib.lights,
              {
                uColor: { value: new Color(1, 1, 1) }, // White to keep original texture colors
                uMap: { value: spaceshipTexture },
                uSunPos: { value: APP_SUN_POS.clone() },
                uSunInfluence: { value: 0 },
                uLightRotation: { value: -0.5 },
                uEmissiveIntensity: { value: SPACESHIP_EMISSIVE_INTENSITY },
                uCameraPos: { value: new Vector3(0, 0, 100) },
              }
            ]),
            vertexShader: spaceshipVertexShader,
            fragmentShader: spaceshipFragmentShader,
          });
        } else {
          mesh.material = new MeshStandardMaterial({
            color: 0xffffff,
            map: spaceshipTexture,
          });
        }
      }
    });
    return clone;
  }, [scene, shaderQuality, spaceshipTexture]);

  const renderThrusters = () => {
    const thrusterColor = new Color(SPACESHIP_THRUSTERS.color || '#00ffff');
    return Array.from({ length: SPACESHIP_THRUSTERS.count }).map((_, i) => {
      const offset = (i - (SPACESHIP_THRUSTERS.count - 1) / 2) * SPACESHIP_THRUSTERS.spacing;
      return (
        <group
          key={i}
          position={[
            SPACESHIP_THRUSTERS.position.x + offset,
            SPACESHIP_THRUSTERS.position.y,
            SPACESHIP_THRUSTERS.position.z,
          ]}
        >
          <pointLight
            intensity={SPACESHIP_THRUSTERS.intensity}
            distance={SPACESHIP_THRUSTERS.distance}
            color={thrusterColor}
          />
          {/* Outer cyan glow */}
          <mesh>
            <sphereGeometry args={[SPACESHIP_THRUSTERS.coreRadius, 16, 16]} />
            <meshStandardMaterial
              color={thrusterColor}
              emissive={thrusterColor}
              emissiveIntensity={SPACESHIP_THRUSTERS.coreEmissiveIntensity}
              toneMapped={false}
              transparent
              opacity={0.8}
            />
          </mesh>
          {/* Inner white-ish center */}
          <mesh scale={[0.4, 0.4, 0.4]}>
            <sphereGeometry args={[SPACESHIP_THRUSTERS.coreRadius, 16, 16]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={SPACESHIP_THRUSTERS.coreEmissiveIntensity * 2.0}
              toneMapped={false}
            />
          </mesh>
        </group>
      );
    });
  };

  const groupRef = (el: Object3D | null) => {
    const { spaceshipRef, spaceshipMeshRef } = props;
    if (spaceshipRef) {
      spaceshipRef.current = el as Mesh;
    }
    if (spaceshipMeshRef && el) {
      spaceshipMeshRef.current = el as Mesh;
    }
  };

  if (spaceshipDetail === 'low') {
    return (
      <group
        position={props.position}
        rotation={SPACESHIP_ROTATION}
        ref={groupRef}
        userData={{ resetCounter: props.resetCounter }}
      >
        <Cone args={[0.7, 1.6, 3]}>
          <meshStandardMaterial
            color={themePrimary}
            emissive={themePrimary}
            emissiveIntensity={SPACESHIP_EMISSIVE_INTENSITY}
            toneMapped={false}
          />
        </Cone>
        {renderThrusters()}
      </group>
    );
  }

  return (
    <group
      position={props.position}
      rotation={SPACESHIP_ROTATION}
      ref={groupRef}
      name="spaceship-mesh"
      userData={{ resetCounter: props.resetCounter }}
    >
      <primitive object={model} rotation={[Math.PI / 2, Math.PI, Math.PI]} scale={SPACESHIP_SCALE} />
      {renderThrusters()}

      {/* Navigation lights (Yellow) */}
      <group position={[-SPACESHIP_NAV_LIGHTS.position.x, SPACESHIP_NAV_LIGHTS.position.y, SPACESHIP_NAV_LIGHTS.position.z]}>
        <pointLight intensity={SPACESHIP_NAV_LIGHTS.intensity} distance={SPACESHIP_NAV_LIGHTS.distance} color={SPACESHIP_NAV_LIGHTS.portColor} />
        <mesh>
          <sphereGeometry args={[SPACESHIP_NAV_LIGHTS.size, 32, 32]} />
          <meshStandardMaterial color={SPACESHIP_NAV_LIGHTS.portColor} emissive={SPACESHIP_NAV_LIGHTS.portColor} emissiveIntensity={SPACESHIP_NAV_LIGHTS.emissiveIntensity} toneMapped={false} />
        </mesh>
      </group>

      <group position={[SPACESHIP_NAV_LIGHTS.position.x, SPACESHIP_NAV_LIGHTS.position.y, SPACESHIP_NAV_LIGHTS.position.z]}>
        <pointLight intensity={SPACESHIP_NAV_LIGHTS.intensity} distance={SPACESHIP_NAV_LIGHTS.distance} color={SPACESHIP_NAV_LIGHTS.starboardColor} />
        <mesh>
          <sphereGeometry args={[SPACESHIP_NAV_LIGHTS.size, 32, 32]} />
          <meshStandardMaterial color={SPACESHIP_NAV_LIGHTS.starboardColor} emissive={SPACESHIP_NAV_LIGHTS.starboardColor} emissiveIntensity={SPACESHIP_NAV_LIGHTS.emissiveIntensity} toneMapped={false} />
        </mesh>
      </group>

      {/* Cockpit internal glow */}
      <pointLight
        position={[SPACESHIP_COCKPIT_LIGHT.position.x, SPACESHIP_COCKPIT_LIGHT.position.y, SPACESHIP_COCKPIT_LIGHT.position.z]}
        intensity={SPACESHIP_COCKPIT_LIGHT.intensity}
        distance={SPACESHIP_COCKPIT_LIGHT.distance}
        color={SPACESHIP_COCKPIT_LIGHT.color}
      />
    </group>
  );
}

export function Spaceship(props: SpaceshipProps) {
  const {
    shockwaveRef,
    spaceshipMeshRef,
    laserPoints,
    trailRef,
  } = useSpaceshipSimulation(props);

  const { initialPosition, spaceshipRef, resetCounter } = props;
  const { themePrimary } = useThemeColors();
  const debugEnabled = useGameStore(s => s.isDebug);
  const shaderQuality = useGameStore(s => s.settings.shaders);
  const detailLevel = useGameStore(s => s.settings.detailLevel);

  return (
    <group position={[0, 0, 0]}>
      <SpaceshipModel
        position={initialPosition}
        resetCounter={resetCounter}
        spaceshipRef={spaceshipRef}
        spaceshipMeshRef={spaceshipMeshRef}
      />

      {(debugEnabled || shaderQuality === 'advanced') && (
        <Trail
          key={`${detailLevel}-${shaderQuality}`}
          ref={trailRef as unknown as React.LegacyRef<MeshLineGeometry>}
          target={spaceshipRef as React.RefObject<Object3D>}
          width={SPACESHIP_TRAIL_WIDTH}
          length={SPACESHIP_TRAIL_LENGTH}
          color={themePrimary}
          decay={SPACESHIP_TRAIL_DECAY}
          attenuation={t => t * t}
        />
      )}

      <Shockwave ref={shockwaveRef} />

      {laserPoints && <AnnihilationBeam points={laserPoints} />}
    </group>
  );
}
