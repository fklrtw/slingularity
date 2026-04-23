import React from 'react';
import { useGameStore } from '../../store';
import { sfx } from '../../audio/sfx-proxy';

interface SettingToggleProps {
  value: boolean
  onChange: (value: boolean) => void
  className?: string
}

export function SettingToggle({ value, onChange, className = '' }: SettingToggleProps) {
  return (
    <button
      className={`setting-dropdown ${className}`.trim()}
      data-active={value}
      onClick={(e) => {
        e.stopPropagation();
        if (useGameStore.getState().settings.sfxEnabled) {
          sfx.playUIClick();
        }
        onChange(!value);
      }}
    >
      {value ? 'On' : 'Off'}
    </button>
  );
}
