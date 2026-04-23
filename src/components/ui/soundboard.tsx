import React, { useState, useEffect, useRef } from 'react';
import { sfx } from '../../audio/sfx-proxy';
import { music } from '../../hooks/use-procedural-music';
import './soundboard.css';

interface SoundEntry {
  name: string
  description: string
  play: () => void
  isContinuous?: boolean
  update?: (active: boolean, value: number) => void
}

interface NoteParticle {
  id: number
  x: number
  y: number
  size: number
  color: string
  note: string
  life: number
  velocity: { x: number, y: number }
}

function WaveformVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    let rafId: number;
    const draw = () => {
      rafId = requestAnimationFrame(draw);
      const analyzer = sfx.getAnalyzer();
      if (!analyzer) {
        return;
      }

      const bufferLength = analyzer.fftSize;
      const dataArray = new Uint8Array(bufferLength);
      analyzer.getByteTimeDomainData(dataArray);

      ctx.fillStyle = '#05050f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid & Labels
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.font = '10px "Tiny5"';
      ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';

      for (let i = 1; i < 4; i++) {
        const y = (canvas.height * i) / 4;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      ctx.fillText('+1.0', 5, 12);
      ctx.fillText('0.0', 5, canvas.height / 2 + 4);
      ctx.fillText('-1.0', 5, canvas.height - 5);

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="visualizer-variant waveform">
      <canvas ref={canvasRef} width={800} height={100} className="visualizer-canvas" />
      <div className="visualizer-label">Time Domain (Waveform)</div>
    </div>
  );
}

function SpectrogramVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    let rafId: number;
    const draw = () => {
      rafId = requestAnimationFrame(draw);
      const analyzer = sfx.getAnalyzer();
      if (!analyzer) {
        return;
      }

      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyzer.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#05050f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Logarithmic bin distribution (more detail in low frequencies)
      const displayBins = 128; // Fewer, wider bars for better visibility
      const barWidth = canvas.width / displayBins;

      // Calculate frequency per bin based on sample rate and buffer length
      const nyquist = analyzer.context.sampleRate / 2;

      for (let i = 0; i < displayBins; i++) {
        const minFreq = 20;
        const maxFreq = nyquist;
        const freq = minFreq * Math.pow(maxFreq / minFreq, i / displayBins);

        const dataIndex = Math.floor((freq / nyquist) * bufferLength);
        const val = dataArray[dataIndex] || 0;
        const barHeight = (val / 255) * canvas.height;

        const hue = 240 - (i / displayBins) * 240;
        ctx.fillStyle = `hsla(${hue}, 80%, 50%, 0.8)`;
        ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1, barHeight);

        // Draw frequency labels at specific intervals
        if (i % 32 === 0 || i === displayBins - 1) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.font = '9px "Tiny5"';
          const label = freq > 1000 ? `${(freq / 1000).toFixed(1)}k` : `${Math.round(freq)}`;
          ctx.fillText(label, i * barWidth, canvas.height - 5);
        }
      }
    };

    draw();
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="visualizer-variant spectrogram">
      <canvas ref={canvasRef} width={800} height={100} className="visualizer-canvas" />
      <div className="visualizer-label">Frequency Domain (Spectrogram)</div>
    </div>
  );
}

function EnergyHistoryVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[]>(new Array(200).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    let rafId: number;
    const draw = () => {
      rafId = requestAnimationFrame(draw);
      const analyzer = sfx.getAnalyzer();
      if (!analyzer) {
        return;
      }

      const bufferLength = analyzer.fftSize;
      const dataArray = new Uint8Array(bufferLength);
      analyzer.getByteTimeDomainData(dataArray);

      // Calculate RMS (Loudness)
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const val = (dataArray[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / bufferLength);

      historyRef.current.push(rms);
      if (historyRef.current.length > 200) {
        historyRef.current.shift();
      }

      ctx.fillStyle = '#05050f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const y = (canvas.height * i) / 4;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      ctx.font = '9px "Tiny5"';
      ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
      ctx.fillText('PEAK', 5, 12);
      ctx.fillText('MID', 5, canvas.height / 2 + 4);
      ctx.fillText('SILENCE', 5, canvas.height - 5);

      ctx.beginPath();
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      const step = canvas.width / 200;

      historyRef.current.forEach((val, i) => {
        const x = i * step;
        const y = canvas.height - (val * canvas.height * 2.5); // Scaled for visibility
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Fill area under the curve
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
      ctx.fill();
    };

    draw();
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="visualizer-variant energy">
      <canvas ref={canvasRef} width={800} height={100} className="visualizer-canvas" />
      <div className="visualizer-label">Loudness History (RMS)</div>
    </div>
  );
}

function ParticleVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<NoteParticle[]>([]);
  const nextIdRef = useRef(0);

  useEffect(() => {
    // 1. Listen for real-time music note events from Strudel
    const removeMusicListener = music.addHapListener((hap) => {
      let noteValue = '';
      if (hap.value && typeof hap.value === 'object') {
        noteValue = String(hap.value.note || hap.value.n || hap.value.s || hap.value.v || '');
      } else if (typeof hap.value === 'string' || typeof hap.value === 'number') {
        noteValue = String(hap.value);
      }

      if (!noteValue || noteValue === 'undefined' || noteValue === 'null') {
        return;
      }

      const pitchMatch = noteValue.match(/(-?\d+)/);
      const octave = pitchMatch ? parseInt(pitchMatch[1]) : 4;
      const baseNote = noteValue.charAt(0).toLowerCase();
      const noteOrder = 'cdefgab'.indexOf(baseNote);
      const pitchValue = (octave * 7) + (noteOrder !== -1 ? noteOrder : 0);

      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const minP = 14;
      const maxP = 56;
      const normalizedPitch = (pitchValue - minP) / (maxP - minP);
      const x = (0.1 + Math.max(0, Math.min(1, normalizedPitch)) * 0.8) * canvas.width;

      for (let i = 0; i < 5; i++) {
        particlesRef.current.push({
          id: nextIdRef.current++,
          x,
          y: canvas.height / 2,
          size: 8 + Math.random() * 12,
          color: `rgba(0, 255, 255, ${0.5 + Math.random() * 0.4})`, // Cyan for music
          note: noteValue,
          life: 1.0,
          velocity: {
            x: (Math.random() - 0.5) * 6,
            y: (Math.random() - 0.5) * 6
          }
        });
      }
    });

    // 2. Listen for SFX events from the audio effects engine
    const removeSfxListener = sfx.addSfxListener((event: { type: string, label: string }) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      // Color mapping based on SFX type
      let color = 'rgba(255, 255, 255, 0.6)'; // Default white
      let x = canvas.width / 2; // Default center

      if (event.type === 'laser') {
        color = 'rgba(255, 255, 0, 0.7)'; // Yellow
        x = canvas.width * 0.3;
      } else if (event.type === 'explosion' || event.type === 'sun') {
        color = 'rgba(255, 120, 0, 0.8)'; // Orange
        x = canvas.width * 0.7;
      } else if (event.type === 'crash') {
        color = 'rgba(255, 50, 50, 0.9)'; // Red
        x = canvas.width * 0.9;
      } else if (event.type === 'portal') {
        color = 'rgba(255, 0, 255, 0.8)'; // Pink/Purple
        x = canvas.width * 0.1;
      } else if (event.type === 'ui') {
        color = 'rgba(0, 255, 150, 0.7)'; // Spring Green
        x = canvas.width * 0.5;
      }

      // Spawn more aggressive particles for SFX
      for (let i = 0; i < 10; i++) {
        particlesRef.current.push({
          id: nextIdRef.current++,
          x,
          y: canvas.height / 2,
          size: 15 + Math.random() * 20,
          color,
          note: event.label,
          life: 1.2,
          velocity: {
            x: (Math.random() - 0.5) * 12,
            y: (Math.random() - 0.5) * 12
          }
        });
      }
    });

    if (!canvasRef.current) {
      return () => {
        removeMusicListener();
        removeSfxListener();
      };
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      return () => {
        removeMusicListener();
        removeSfxListener();
      };
    }

    let rafId: number;
    let lastTime = performance.now();

    const render = () => {
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      ctx.fillStyle = '#05050f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const gx = (canvas.width * i) / 10;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, canvas.height);
        ctx.stroke();
        const gy = (canvas.height * i) / 10;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(canvas.width, gy);
        ctx.stroke();
      }

      ctx.font = '12px "Tiny5"';
      ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('PITCH / ENGINE SINK', canvas.width / 2, canvas.height - 10);
      ctx.textAlign = 'left';
      ctx.fillText('LOW', 40, canvas.height - 10);
      ctx.textAlign = 'right';
      ctx.fillText('HIGH', canvas.width - 40, canvas.height - 10);

      ctx.save();
      ctx.translate(15, canvas.height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText('ACTIVITY', 0, 0);
      ctx.restore();

      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      particlesRef.current.forEach((p) => {
        p.life -= dt * 0.6;
        p.x += p.velocity.x * dt * 50;
        p.y += p.velocity.y * dt * 50;

        ctx.beginPath();
        const radius = Math.max(0, p.size * p.life);
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        const baseOpacity = p.color.includes('0.5') ? 0.8 : 1.0;
        ctx.fillStyle = p.color.replace(/0\.\d+\)/, `${Math.max(0, p.life * baseOpacity)})`);
        ctx.fill();

        if (p.id % 5 === 0 || (p.life > 0.8 && p.size > 20)) {
          ctx.font = `${Math.floor(16 + p.life * 8)}px "Tiny5"`;
          ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
          ctx.textAlign = 'center';
          ctx.fillText(p.note, p.x, p.y - 15);
        }
      });

      rafId = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(rafId);
      removeMusicListener();
      removeSfxListener();
    };
  }, []);

  return (
    <div className="visualizer-variant particles">
      <canvas
        ref={canvasRef}
        width={800}
        height={100}
        className="visualizer-canvas"
      />
      <div className="visualizer-label">Event Particles (Unified)</div>
    </div>
  );
}
const SOUNDS: SoundEntry[] = [
  {
    name: 'Mission Start',
    description: 'When starting a level or advancing from the finish screen',
    play: () => sfx.playStartMission(),
  },
  {
    name: 'Mission Restart',
    description: 'When clicking restart after a game over',
    play: () => sfx.playRestart(),
  },
  {
    name: 'Portal Emergence',
    description: 'When the spaceship enters the level through the starting portal',
    play: () => sfx.playPortalEmerge(),
  },
  {
    name: 'Portal Entry',
    description: 'When the spaceship successfully reaches the target portal',
    play: () => sfx.playPortalEnter(),
  },
  {
    name: 'UI Click',
    description: 'When interacting with menu buttons and settings',
    play: () => sfx.playUIClick(),
  },
  {
    name: 'Game Over',
    description: 'When the game over screen is displayed',
    play: () => sfx.playGameOver(),
  },
  {
    name: 'Annihilation Laser',
    description: 'When the player fires the laser to annihilate a planet or comet',
    play: () => sfx.playLaser(),
  },
  {
    name: 'Planet Annihilation',
    description: 'When a planet is annihilated (includes resonant explosion reverb)',
    play: () => sfx.playPlanetAnnihilation(),
  },
  {
    name: 'Comet Annihilation',
    description: 'When a comet is manually annihilated (includes lite explosion reverb)',
    play: () => sfx.playCometAnnihilation(),
  },
  {
    name: 'Core Crash',
    description: 'When the spaceship crashes into a surface (includes long cinematic reverb)',
    play: () => sfx.playCrash(),
  },
  {
    name: 'Solar Gulp',
    description: 'When the spaceship is swallowed by the sun',
    play: () => sfx.playSunFall(),
  },
  {
    name: 'Low Energy Warning',
    description: 'When the energy score is low (triggers every 100pts below critical threshold)',
    play: () => sfx.playLowEnergyWarning(),
  },
  {
    name: 'Atmospheric Drag',
    description: 'When inside a planet atmosphere (scales with depth)',
    isContinuous: true,
    play: () => {},
    update: (active, val) => sfx.updateAtmosphericDrag(active, val),
  },
  {
    name: 'Sun Proximity',
    description: 'When flying close to the sun surface (scales with distance)',
    isContinuous: true,
    play: () => {},
    update: (active, val) => sfx.updateSunProximity(active, 1000 / (val + 0.1)),
  },
  {
    name: 'Comet Proximity',
    description: 'When flying close to a comet (scales with distance)',
    isContinuous: true,
    play: () => {},
    update: (active, val) => sfx.updateCometProximity(active, 100 / (val + 0.1)),
  },
];

export function Soundboard() {
  const [continuousStates, setContinuousStates] = useState<Record<string, { active: boolean, value: number }>>({
    'Atmospheric Drag': { active: false, value: 0.5 },
    'Sun Proximity': { active: false, value: 0.5 },
    'Comet Proximity': { active: false, value: 0.5 },
  });

  useEffect(() => {
    sfx.init();
    sfx.setVolume(1.0);
  }, []);

  const handleContinuousToggle = (name: string, updateFn?: (active: boolean, val: number) => void) => {
    if (!updateFn) {
      return;
    }
    const newState = { ...continuousStates[name], active: !continuousStates[name].active };
    setContinuousStates({ ...continuousStates, [name]: newState });
    updateFn(newState.active, newState.value);
  };

  const handleSliderChange = (name: string, val: number, updateFn?: (active: boolean, val: number) => void) => {
    if (!updateFn) {
      return;
    }
    const newState = { ...continuousStates[name], value: val };
    setContinuousStates({ ...continuousStates, [name]: newState });
    if (newState.active) {
      updateFn(true, val);
    }
  };

  return (
    <div className="soundboard-container">
      <header className="soundboard-header">
        <h1>Slingularity Soundboard</h1>
        <p>Real-time procedural audio audit tool</p>
        <button className="soundboard-back-button" onClick={() => window.location.hash = ''}>
          Back to Game
        </button>
      </header>

      <div className="visualizers-container">
        <WaveformVisualizer />
        <SpectrogramVisualizer />
        <EnergyHistoryVisualizer />
        <ParticleVisualizer />
      </div>

      <div className="soundboard-grid">
        <div className="sound-card music-card">
          <div className="sound-info">
            <div className="music-header">
              <h3>Procedural Music Engine</h3>
            </div>
            <p className="sound-description">Control the dynamic Strudel.js background music.</p>
          </div>
          <div className="music-actions">
            <button
              className="play-button btn-normal"
              onClick={() => {
                music.init().then(() => music.playEvent('normal'));
              }}
            >
              Start
            </button>
            <button
              className="play-button btn-orbit"
              onClick={() => {
                music.init().then(() => music.playEvent('orbit'));
              }}
            >
              Orbit
            </button>
            <button
              className="play-button btn-skip"
              onClick={() => {
                music.init().then(() => music.playEvent('skip', 3));
              }}
            >
              Skip
            </button>
            <button
              className="play-button btn-victory"
              onClick={() => {
                music.init().then(() => music.playEvent('victory'));
              }}
            >
              Victory
            </button>
            <button
              className="play-button btn-gameover"
              onClick={() => {
                music.init().then(() => music.playEvent('gameover'));
              }}
            >
              Game Over
            </button>
            <button className="play-button stop-button" onClick={() => music.hush()}>Stop</button>
          </div>
        </div>

        {SOUNDS.map(sound => (
          <div key={sound.name} className={`sound-card ${sound.isContinuous ? 'continuous' : ''}`}>
            <div className="sound-info">
              <h3>{sound.name}</h3>
              <p className="sound-description">{sound.description}</p>

              {sound.isContinuous && (
                <div className="slider-container">
                  <label>Intensity / Proximity</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={continuousStates[sound.name].value}
                    onChange={e => handleSliderChange(sound.name, parseFloat(e.target.value), sound.update)}
                  />
                </div>
              )}
            </div>

            <div className="sound-actions">
              {sound.isContinuous && (
                <button
                  className={`play-button ${continuousStates[sound.name].active ? 'active' : ''}`}
                  onClick={() => handleContinuousToggle(sound.name, sound.update)}
                >
                  {continuousStates[sound.name].active ? 'Stop' : 'Start'}
                </button>
              )}
              {!sound.isContinuous && (
                <button className="play-button" onClick={sound.play}>
                  Play
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
