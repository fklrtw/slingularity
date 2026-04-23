import React, { useRef } from 'react';
import { Text } from '@react-three/drei';
import type { Group } from 'three';
import { useGameStore, type FloatingScore } from '../../store';
import { APP_FONT_URL } from '../../app.config';
import { useThemeColors } from '../../hooks/use-theme-colors';
import { useFloatingScoreEffects, type TextRef } from '../../hooks/use-floating-score-effects';

/**
 * Individual animated score item
 *
 * renders a 3D text group.
 * delegates animation and lifecycle management to useFloatingScoreEffects.
 */
function FloatingScoreItem({ score, onComplete }: { score: FloatingScore, onComplete: (id: number) => void }) {
  const groupRef = useRef<Group>(null);
  const mainTextRef = useRef<TextRef>(null);
  const multTextRef = useRef<TextRef>(null);
  const { themePrimary, themeHighlight } = useThemeColors();

  // delegate animated drift and fade-out to the hook
  useFloatingScoreEffects({
    score,
    onComplete,
    groupRef,
    mainTextRef,
    multTextRef,
  });

  return (
    <group ref={groupRef}>
      {/* main point value text */}
      <Text
        ref={mainTextRef as unknown as React.Ref<null>}
        font={APP_FONT_URL}
        fontSize={4}
        color={themeHighlight}
        anchorX="center"
        anchorY="middle"
        material-depthTest={false}
      >
        {`+${score.value}`}
      </Text>

      {/* bonus multiplier text (rendered slightly lower if present) */}
      {score.multiplier && (
        <Text
          ref={multTextRef as unknown as React.Ref<null>}
          position={[0, -4, 0]}
          font={APP_FONT_URL}
          fontSize={3}
          color={themePrimary}
          anchorX="center"
          anchorY="middle"
          material-depthTest={false}
        >
          {`x${score.multiplier}`}
        </Text>
      )}
    </group>
  );
}

/**
 * FloatingScores component
 *
 * Renders 3D text indicators in world space whenever points are awarded.
 */
export function FloatingScores() {
  const floatingScores = useGameStore(s => s.floatingScores);
  const removeFloatingScore = useGameStore(s => s.removeFloatingScore);

  return (
    <group>
      {/* PRE-WARM: Force shader compilation early to prevent frame drops */}
      <Text
        visible={false}
        font={APP_FONT_URL}
        fontSize={0.01}
        position={[0, 0, -1000]}
      >
        WARMUP
      </Text>

      {floatingScores.map(s => (
        <FloatingScoreItem key={s.id} score={s} onComplete={removeFloatingScore} />
      ))}
    </group>
  );
}
