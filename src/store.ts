/**
 * Game state management using Zustand.
 * Made with the help of Gemini.
 */
import BigNumber from 'bignumber.js';
import { Vector3 } from 'three';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { APP_MIN_LAST_PLANET_DIST } from './app.config';
import {
  DIFFICULTY_ENERGY_DIST,
  DIFFICULTY_ENERGY_TIME,
  DIFFICULTY_SCORING_INITIAL_SCORE_BASE,
  DIFFICULTY_SCORING_PORTAL_REACH_BONUS,
  DIFFICULTY_SCORING_SKIP_BONUS,
  DIFFICULTY_SCORING_TRAVEL_SCORE_FACTOR,
  DIFFICULTY_SUN_GROWTH,
} from './difficulty.config';
import { SUN_CORE_SIZE, SUN_REMNANT_PROBABILITIES, PHYSICS_SUN_MASS, SUN_SUPERNOVA_PROBABILITY_FACTOR } from './entities/sun.config';
import { TEXT_REASON_LOST_IN_SPACE, TEXT_REASON_NO_SCORE } from './text.config';
import { scaleAsymptotic } from './utils/difficulty';

export interface HighScores {
  allTime: number
  atLevelFinish: number
  inStableOrbit: number
}

export interface FloatingScore {
  id: number
  value: number
  multiplier?: number
  position: Vector3
  startTime: number
}

export interface LaserEvent {
  targetIndex: number
  timestamp: number
}

export type SunStatus = 'normal' | 'supernova_expanding' | 'supernova_flash' | 'collapsing' | 'remnant';

export interface GameState {
  /** current level number */
  level: number
  /** total number of planets orbited in the current level */
  planetsOrbited: number
  /** current player score (energy) */
  score: BigNumber
  /** total distance the Spaceship has traveled in units */
  distanceTraveled: number
  /** index of the planet currently being orbited, or null if in free flight */
  orbitingPlanetIndex: number | null
  /** index of the most recently orbited planet (for skip bonus tracking) */
  lastPlanetIndex: number
  /** set of indices for planets that have been annihilated */
  annihilatedPlanets: Set<number>
  /** set of indices for rings that have been annihilated */
  annihilatedRings: Set<number>
  /** index of the planet most recently annihilated, for one-time physics effects */
  lastAnnihilatedIndex: number | null
  /** whether the current level has been successfully completed */
  levelFinished: boolean
  /** whether the mission has failed */
  gameOver: boolean
  /** whether the initial start screen has been bypassed */
  gameStarted: boolean
  /** whether the audio prompt has been answered */
  audioPromptAnswered: boolean
  /** human-readable description of why the game ended */
  gameOverReason: string
  /** current physical radius of the expanding sun */
  sunRadius: number
  /** pre-calculated sun expansion rate for the current level */
  sunGrowthRate: number
  /** the current lifecycle state of the sun */
  sunStatus: SunStatus
  /** the target radius for the supernova expansion phase */
  sunSupernovaRadius: number
  /** current mass of the sun, can increase by swallowing planets */
  sunMass: number
  /** the type of stellar remnant the sun becomes after game over */
  sunRemnant: 'white-dwarf' | 'neutron-star' | 'black-hole' | null
  /** pre-calculated energy loss per distance traveled for the current level */
  distPenaltyFactor: number
  /** pre-calculated energy loss per second for the current level */
  timePenaltyFactor: number
  /** current absolute velocity of the Spaceship */
  velocity: number
  /** current distance from the Spaceship to the center of the sun */
  distToSun: number
  /** distance from the sun to the level's objective (portal) */
  lastPlanetDist: number
  /** world position of the level-finish portal */
  portalPosition: Vector3
  /** whether the portal position has been properly initialized */
  isPortalInitialized: boolean
  /** counter incremented on every level change or mission restart to sync systems */
  resetCounter: number
  /** total number of planets generated for the current level */
  totalPlanets: number
  /** distance traveled since the last planet was released */
  travelDistanceSinceOrbit: number
  /** persistent high score tracking across sessions */
  highScores: HighScores
  /** whether the Spaceship is currently in its annihilation sequence */
  isDying: boolean
  /** whether the Spaceship is currently in its victory orbit sequence */
  isFinishing: boolean
  /** whether the Spaceship is currently emerging from a starting portal */
  isStarting: boolean
  /** whether the game is currently loading the level and compiling shaders */
  isLoadingLevel: boolean
  /** whether GPU shaders have been compiled at least once via compileAsync */
  shadersCompiled: boolean
  /** whether the game is in debug mode (triggered by URL anchor) */
  isDebug: boolean
  /** whether the level-finish portal has been consumed/annihilated */
  isPortalAnnihilated: boolean
  /** active floating point numbers in the 3D scene */
  floatingScores: FloatingScore[]
  /** details of the most recent laser firing event */
  laserEvent: LaserEvent | null

  // --- Settings ---
  settings: {
    shadows: 'off' | 'basic' | 'advanced'
    shaders: 'off' | 'basic' | 'advanced'
    detailLevel: 'low' | 'medium' | 'high'
    antialiasing: 'low' | 'medium' | 'high'
    autoPerformance: boolean
    resolutionScale: 'low' | 'medium' | 'high'
    postProcessing: boolean
    cameraMode: 'heliocentric' | 'aligned' | 'ship'
    sfxEnabled: boolean
    musicEnabled: boolean
    sfxVolume: number
    musicVolume: number
    spaceshipDetail: 'low' | 'high'
  }

  /** whether the settings menu is currently open */
  settingsMenuOpen: boolean
  /** whether the privacy menu is currently open */
  privacyMenuOpen: boolean
  /** whether the credits menu is currently open */
  creditsMenuOpen: boolean

  /** updates current velocity in state */
  setVelocity: (val: number) => void
  /** updates current distance to sun in state */
  setDistToSun: (val: number) => void
  /** updates objective distance in state */
  setLastPlanetDist: (val: number) => void
  /** updates portal world position in state */
  setPortalPosition: (pos: Vector3) => void
  /** sets total planet count for the level */
  setTotalPlanets: (val: number) => void
  /** sets the debug mode state */
  setIsDebug: (val: boolean) => void
  /** updates game settings */
  updateSettings: (newSettings: Partial<GameState['settings']>) => void
  /** sets settings menu visibility */
  setSettingsMenuOpen: (isOpen: boolean) => void
  /** sets privacy menu visibility */
  setPrivacyMenuOpen: (isOpen: boolean) => void
  /** sets credits menu visibility */
  setCreditsMenuOpen: (isOpen: boolean) => void
  /** initializes state for a new level */
  initLevel: () => void
  /** updates the current orbiting planet index and handles capture logic */
  setOrbitingPlanet: (index: number | null, shipPos?: Vector3) => void
  /** marks a planet as annihilated by index */
  disablePlanet: (index: number) => void
  /** marks a planet's rings as annihilated by index */
  disableRings: (index: number) => void
  /** marks the portal as annihilated */
  disablePortal: () => void
  /** annihilates the next active planet in the sequence */
  annihilateNextPlanet: () => void
  /** clears the last annihilated planet index from state */
  clearLastAnnihilated: () => void
  /** adds to distance traveled and applies score penalty */
  addDistance: (dist: number, currentPos: Vector3) => void
  /** applies time-based score penalty */
  tickTime: (dt: number, currentPos: Vector3) => void
  /** calculates sun expansion for the frame */
  growSun: (dt: number) => void
  /** updates sun status */
  setSunStatus: (status: SunStatus) => void
  /** adds mass to the sun */
  addSunMass: (mass: number) => void
  /** triggers the collapse phase */
  triggerCollapse: () => void
  /** triggers the immediate game over state */
  triggerGameOver: (reason: string) => void
  /** triggers the start of the final sun sequence */
  triggerSupernova: (reason: string) => void
  /** finishes the game over state after the supernova */
  completeGameOver: (reason: string) => void
  /** starts the ship's annihilation sequence */
  startDying: (reason: string) => void
  /** starts the portal victory sequence */
  startFinishing: () => void
  /** ends the starting portal sequence */
  finishStarting: () => void
  /** ends the level loading sequence and triggers portal emergence */
  finishLoadingLevel: () => void
  /** marks that GPU shaders have been compiled, subsequent level loads will skip the loading screen */
  markShadersCompiled: () => void
  /** bypasses the start screen and begins simulation */
  startGame: () => void
  /** marks the level as finished and updates high scores */
  finishLevel: () => void
  /** advances to the next level and increments reset counter */
  startNextLevel: () => void
  /** resets mission state (optionally returning to start screen) */
  resetGame: (forceReset?: boolean) => void
  /** spawns a floating point indicator at a specific world position */
  addFloatingScore: (value: number, position: Vector3) => void
  /** removes a specific floating score by its ID */
  removeFloatingScore: (id: number) => void
  /** clears all persistent storage and resets the store without triggering immediate re-save */
  clearStoredData: () => void
}

// --- Action Logic Functions ---

/**
 * Initializes state for a new level.
 */
const initializeLevel = () => {
  const level = 1;
  return {
    orbitingPlanetIndex: 1 as number | null,
    lastPlanetIndex: 1,
    annihilatedPlanets: new Set<number>(),
    annihilatedRings: new Set<number>(),
    lastAnnihilatedIndex: null as number | null,
    levelFinished: false,
    distanceTraveled: 0,
    travelDistanceSinceOrbit: 0,
    sunRadius: SUN_CORE_SIZE,
    sunGrowthRate: scaleAsymptotic(level, DIFFICULTY_SUN_GROWTH.start, DIFFICULTY_SUN_GROWTH.limit, DIFFICULTY_SUN_GROWTH.halfLife),
    sunStatus: 'normal' as SunStatus,
    sunSupernovaRadius: 1000 * SUN_SUPERNOVA_PROBABILITY_FACTOR,
    sunMass: PHYSICS_SUN_MASS,
    distPenaltyFactor: scaleAsymptotic(level, DIFFICULTY_ENERGY_DIST.start, DIFFICULTY_ENERGY_DIST.limit, DIFFICULTY_ENERGY_DIST.halfLife),
    timePenaltyFactor: scaleAsymptotic(level, DIFFICULTY_ENERGY_TIME.start, DIFFICULTY_ENERGY_TIME.limit, DIFFICULTY_ENERGY_TIME.halfLife),
    velocity: 0,
    distToSun: 0,
    lastPlanetDist: 1000,
    portalPosition: new Vector3(),
    isPortalInitialized: false,
    gameOver: false,
    gameOverReason: '',
    isDying: false,
    isFinishing: false,
    isStarting: false,
    isLoadingLevel: true,
    isPortalAnnihilated: false,
    floatingScores: [] as FloatingScore[],
    laserEvent: null as LaserEvent | null,
  };
};

/**
 * Updates the current orbiting planet index and handles capture logic.
 */
const applyOrbitCapture = (state: GameState, index: number | null, shipPos?: Vector3): Partial<GameState> => {
  if (index === null) {
    return { orbitingPlanetIndex: null };
  }
  if (index !== state.orbitingPlanetIndex) {
    const currentIdx = state.lastPlanetIndex;
    const nextIdx = index;

    // automatically annihilate all planets closer to the sun than the captured one
    const newAnnihilated = new Set(state.annihilatedPlanets);
    let laserTarget: number | null = null;
    for (let i = 1; i < nextIdx; i++) {
      if (!newAnnihilated.has(i)) {
        newAnnihilated.add(i);
        laserTarget = i;
      }
    }

    if (state.isDebug) {
      return {
        orbitingPlanetIndex: index,
        lastPlanetIndex: index,
        planetsOrbited: state.planetsOrbited + 1,
        annihilatedPlanets: newAnnihilated,
        travelDistanceSinceOrbit: 0,
        ...(laserTarget !== null ? { laserEvent: { targetIndex: laserTarget, timestamp: performance.now() } } : {}),
      };
    }

    // calculate skip bonus: extra points for jumping over planets
    const numSkipped = Math.max(0, nextIdx - currentIdx - 1);
    const skipBonus = numSkipped * DIFFICULTY_SCORING_SKIP_BONUS;

    // exponential multiplier based on planets skipped since last capture
    const multiplier = Math.pow(2, numSkipped);
    const travelPoints = (state.travelDistanceSinceOrbit * DIFFICULTY_SCORING_TRAVEL_SCORE_FACTOR) * multiplier;
    const totalBonus = skipBonus + travelPoints;

    // update score and persistent high scores
    let newScore = state.score;
    const newHighScores = { ...state.highScores };
    if (!state.isDebug) {
      newScore = state.score.plus(totalBonus);
      const sNum = newScore.integerValue().toNumber();
      if (sNum > newHighScores.inStableOrbit) {
        newHighScores.inStableOrbit = sNum;
      }
      if (sNum > newHighScores.allTime) {
        newHighScores.allTime = sNum;
      }
    }

    // spawn a floating point indicator if points were awarded
    const newFloatingScores = [...state.floatingScores];
    if (!state.isDebug && totalBonus > 0 && shipPos) {
      newFloatingScores.push({
        id: Date.now() + Math.random(),
        value: Math.floor(totalBonus),
        multiplier: multiplier > 1 ? multiplier : undefined,
        position: shipPos.clone(),
        startTime: performance.now(),
      });
    }

    return {
      orbitingPlanetIndex: index,
      lastPlanetIndex: index,
      planetsOrbited: state.planetsOrbited + 1,
      annihilatedPlanets: newAnnihilated,
      score: newScore,
      highScores: newHighScores,
      floatingScores: newFloatingScores,
      travelDistanceSinceOrbit: 0,
      ...(laserTarget !== null ? { laserEvent: { targetIndex: laserTarget, timestamp: performance.now() } } : {}),
    };
  }
  return {};
};

/**
 * Marks a planet as annihilated by index.
 */
const annihilatePlanet = (state: GameState, index: number): Partial<GameState> => {
  if (state.annihilatedPlanets.has(index)) {
    return {};
  }
  const nextAnnihilated = new Set(state.annihilatedPlanets);
  nextAnnihilated.add(index);
  return {
    annihilatedPlanets: nextAnnihilated,
    lastAnnihilatedIndex: index,
    // if the current primary target is annihilated, return to free flight
    orbitingPlanetIndex: state.orbitingPlanetIndex === index ? null : state.orbitingPlanetIndex,
  };
};

/**
 * marks a planet's rings as annihilated by index
 */
const annihilateRings = (state: GameState, index: number): Partial<GameState> => {
  if (state.annihilatedRings.has(index)) {
    return {};
  }
  const nextAnnihilatedRings = new Set(state.annihilatedRings);
  nextAnnihilatedRings.add(index);
  return { annihilatedRings: nextAnnihilatedRings };
};

/**
 * annihilates the next active planet in the sequence
 */
const annihilateNext = (state: GameState): Partial<GameState> => {
  for (let i = 1; i <= state.totalPlanets; i++) {
    if (!state.annihilatedPlanets.has(i)) {
      const nextAnnihilated = new Set(state.annihilatedPlanets);
      nextAnnihilated.add(i);
      return {
        annihilatedPlanets: nextAnnihilated,
        lastAnnihilatedIndex: i,
        orbitingPlanetIndex: state.orbitingPlanetIndex === i ? null : state.orbitingPlanetIndex,
        laserEvent: { targetIndex: i, timestamp: performance.now() },
      };
    }
  }
  return {};
};

/**
 * adds to distance traveled and applies score penalty
 */
const applyDistance = (state: GameState, dist: number, currentPos: Vector3): Partial<GameState> => {
  if (state.gameOver || state.levelFinished || state.isStarting || state.isLoadingLevel || state.settingsMenuOpen || state.privacyMenuOpen || state.creditsMenuOpen) {
    return {};
  }

  const newTravelDist = state.orbitingPlanetIndex === null ? state.travelDistanceSinceOrbit + dist : state.travelDistanceSinceOrbit;

  if (state.isDebug) {
    return {
      distanceTraveled: state.distanceTraveled + dist,
      travelDistanceSinceOrbit: newTravelDist,
    };
  }

  const penalty = dist * state.distPenaltyFactor;
  const newScore = state.score.minus(penalty);
  if (newScore.lte(0) && !state.isDying && !state.isFinishing) {
    const isLost = currentPos.length() > state.portalPosition.length() + 50;
    const reason = isLost ? TEXT_REASON_LOST_IN_SPACE : TEXT_REASON_NO_SCORE;
    return {
      score: new BigNumber(0),
      isDying: true,
      gameOverReason: reason,
    };
  }

  return { distanceTraveled: state.distanceTraveled + dist, score: newScore, travelDistanceSinceOrbit: newTravelDist };
};

/**
 * applies time-based score penalty
 */
const applyTime = (state: GameState, dt: number, currentPos: Vector3): Partial<GameState> => {
  if (state.gameOver || state.levelFinished || state.isStarting || state.isLoadingLevel || state.settingsMenuOpen || state.privacyMenuOpen || state.creditsMenuOpen) {
    return {};
  }

  if (state.isDebug) {
    return {};
  }

  const penalty = dt * state.timePenaltyFactor;
  const newScore = state.score.minus(penalty);
  if (newScore.lte(0) && !state.isDying && !state.isFinishing) {
    const isLost = currentPos.length() > state.portalPosition.length() + 50;
    const reason = isLost ? TEXT_REASON_LOST_IN_SPACE : TEXT_REASON_NO_SCORE;
    return {
      score: new BigNumber(0),
      isDying: true,
      gameOverReason: reason,
    };
  }
  return { score: newScore };
};

/**
 * calculates sun expansion for the frame
 */
const applySunGrowth = (state: GameState, dt: number): Partial<GameState> => {
  if (state.isStarting || state.isLoadingLevel || state.settingsMenuOpen || state.privacyMenuOpen || state.creditsMenuOpen) {
    return {};
  }

  // Handle collapse phase (radius decreases in store too for physics)
  if (state.sunStatus === 'collapsing') {
    const collapseTarget = SUN_CORE_SIZE * 0.1;
    // Extremely fast exponential collapse: 1000x smaller every 0.2s game time
    const newRadius = state.sunRadius * Math.pow(0.001, dt * 50.0);
    if (newRadius <= collapseTarget) {
      return { sunRadius: collapseTarget, sunStatus: 'remnant' };
    }
    return { sunRadius: newRadius };
  }

  // Normal growth (continues even after game over/finish until it hits supernova boundary)
  if (state.sunStatus === 'normal' || state.sunStatus === 'supernova_expanding') {
    const newRadius = state.sunRadius * Math.pow(1 + state.sunGrowthRate, dt);

    // Check if it reached the supernova boundary
    if (newRadius >= state.sunSupernovaRadius) {
      return { sunRadius: state.sunSupernovaRadius, sunStatus: 'supernova_flash' };
    }

    return { sunRadius: newRadius };
  }

  return {};
};

/**
 * global state store for the game using Zustand
 */
export const useGameStore = create<GameState>()(
  persist(
    set => ({
      level: 1,
      planetsOrbited: 0,
      score: new BigNumber(DIFFICULTY_SCORING_INITIAL_SCORE_BASE),
      distanceTraveled: 0,
      orbitingPlanetIndex: null as number | null,
      lastPlanetIndex: 0,
      annihilatedPlanets: new Set<number>(),
      annihilatedRings: new Set<number>(),
      lastAnnihilatedIndex: null as number | null,
      levelFinished: false,
      gameOver: false,
      gameStarted: false,
      audioPromptAnswered: false,
      gameOverReason: '',
      sunRadius: SUN_CORE_SIZE,
      sunGrowthRate: scaleAsymptotic(1, DIFFICULTY_SUN_GROWTH.start, DIFFICULTY_SUN_GROWTH.limit, DIFFICULTY_SUN_GROWTH.halfLife),
      sunStatus: 'normal',
      sunSupernovaRadius: 0,
      sunMass: PHYSICS_SUN_MASS,
      distPenaltyFactor: scaleAsymptotic(1, DIFFICULTY_ENERGY_DIST.start, DIFFICULTY_ENERGY_DIST.limit, DIFFICULTY_ENERGY_DIST.halfLife),
      timePenaltyFactor: scaleAsymptotic(1, DIFFICULTY_ENERGY_TIME.start, DIFFICULTY_ENERGY_TIME.limit, DIFFICULTY_ENERGY_TIME.halfLife),
      velocity: 0,
      distToSun: 0,
      lastPlanetDist: APP_MIN_LAST_PLANET_DIST,
      portalPosition: new Vector3(),
      isPortalInitialized: false,
      totalPlanets: 0,
      travelDistanceSinceOrbit: 0,
      resetCounter: 0,
      isDying: false,
      isFinishing: false,
      isStarting: false,
      isLoadingLevel: true,
      shadersCompiled: false,
      isDebug: false,
      isPortalAnnihilated: false,
      floatingScores: [] as FloatingScore[],
      laserEvent: null as LaserEvent | null,
      sunRemnant: null,

      settingsMenuOpen: false,
      privacyMenuOpen: false,
      creditsMenuOpen: false,

      settings: {
        shadows: 'advanced',
        shaders: 'advanced',
        detailLevel: 'high',
        antialiasing: 'high',
        autoPerformance: true,
        resolutionScale: 'high',
        postProcessing: true,
        cameraMode: 'heliocentric',
        sfxEnabled: true,
        musicEnabled: true,
        sfxVolume: 1.0,
        musicVolume: 1.0,
        spaceshipDetail: 'high',
      },

      highScores: {
        allTime: 0,
        atLevelFinish: 0,
        inStableOrbit: 0,
      },

      setVelocity: val => set({ velocity: val }),
      setDistToSun: val => set({ distToSun: val }),
      setLastPlanetDist: val => set({
        lastPlanetDist: val,
        sunSupernovaRadius: val * (1 + (SUN_SUPERNOVA_PROBABILITY_FACTOR - 1) * Math.random()),
      }),
      setPortalPosition: pos => set((state) => {
        if (state.portalPosition.distanceToSquared(pos) < 0.01) {
          return {};
        }
        return { portalPosition: pos.clone(), isPortalInitialized: true };
      }),
      setTotalPlanets: val => set({ totalPlanets: val }),
      setIsDebug: val => set({ isDebug: val }),
      updateSettings: newSettings => set(state => ({
        settings: { ...state.settings, ...newSettings },
      })),
      setSettingsMenuOpen: isOpen => set({ settingsMenuOpen: isOpen }),
      setPrivacyMenuOpen: isOpen => set({ privacyMenuOpen: isOpen }),
      setCreditsMenuOpen: isOpen => set({ creditsMenuOpen: isOpen }),
      initLevel: () => set((state) => {
        const skipLoading = state.shadersCompiled;
        return {
          ...initializeLevel(),
          isLoadingLevel: !skipLoading,
          isStarting: skipLoading,
        };
      }),
      setOrbitingPlanet: (index, shipPos) => set(state => applyOrbitCapture(state, index, shipPos)),
      disablePlanet: index => set(state => annihilatePlanet(state, index)),
      disableRings: index => set(state => annihilateRings(state, index)),
      disablePortal: () => set({ isPortalAnnihilated: true }),
      annihilateNextPlanet: () => set(state => annihilateNext(state)),
      clearLastAnnihilated: () => set({ lastAnnihilatedIndex: null }),
      addDistance: (dist, currentPos) => set(state => applyDistance(state, dist, currentPos)),
      tickTime: (dt, currentPos) => set(state => applyTime(state, dt, currentPos)),
      growSun: dt => set(state => applySunGrowth(state, dt)),
      setSunStatus: status => set({ sunStatus: status }),
      addSunMass: mass => set(state => ({ sunMass: state.sunMass + mass })),
      triggerGameOver: reason => set({ gameOver: true, gameOverReason: reason, isDying: false }),
      triggerSupernova: reason => set((state) => {
        if (state.sunStatus !== 'normal') {
          return {};
        }
        return {
          sunStatus: 'supernova_expanding',
          sunSupernovaRadius: state.lastPlanetDist,
          gameOverReason: reason,
          gameOver: true,
          isDying: false,
        };
      }),
      triggerCollapse: () => set((state) => {
        if (state.sunStatus !== 'supernova_flash') {
          return {};
        }

        let remnant: 'white-dwarf' | 'neutron-star' | 'black-hole' = 'white-dwarf';
        const r = Math.random();
        if (r < SUN_REMNANT_PROBABILITIES.blackHole) {
          remnant = 'black-hole';
        } else if (r < SUN_REMNANT_PROBABILITIES.blackHole + SUN_REMNANT_PROBABILITIES.neutronStar) {
          remnant = 'neutron-star';
        }

        // mass change on collapse
        let newMass = state.sunMass;
        if (remnant === 'white-dwarf') {
          newMass = PHYSICS_SUN_MASS * 0.5;
        } else if (remnant === 'neutron-star') {
          newMass = PHYSICS_SUN_MASS * 0.8;
        }

        return {
          sunStatus: 'collapsing',
          sunRemnant: remnant,
          sunMass: newMass,
        };
      }),
      completeGameOver: (reason: string) => set({
        gameOver: true,
        gameOverReason: reason,
        isDying: false,
      }),
      startDying: reason => set((state) => {
        if (state.isDying || state.gameOver) {
          return {};
        }
        return {
          isDying: true,
          gameOverReason: reason,
        };
      }),
      startFinishing: () => set((state) => {
        if (state.isFinishing || state.levelFinished) {
          return {};
        }

        if (state.isDebug) {
          return { isFinishing: true, levelFinished: true };
        }

        const numSkipped = Math.max(0, state.totalPlanets - state.lastPlanetIndex);
        const multiplier = Math.pow(2, numSkipped);
        const bonus = DIFFICULTY_SCORING_PORTAL_REACH_BONUS * multiplier;

        let newScore = state.score;
        const newFloatingScores = [...state.floatingScores];

        if (!state.isDebug) {
          newScore = state.score.plus(bonus);
          newFloatingScores.push({
            id: Date.now() + Math.random(),
            value: Math.floor(bonus),
            multiplier: multiplier > 1 ? multiplier : undefined,
            position: state.portalPosition.clone(),
            startTime: performance.now(),
          });
        }

        return {
          isFinishing: true,
          score: newScore,
          floatingScores: newFloatingScores,
        };
      }),
      finishStarting: () => set({ isStarting: false }),
      finishLoadingLevel: () => set({ isLoadingLevel: false, isStarting: true }),
      markShadersCompiled: () => set({ shadersCompiled: true }),
      startGame: () => set({ gameStarted: true }),
      finishLevel: () => set((state) => {
        const sNum = state.score.integerValue().toNumber();
        const newHighScores = { ...state.highScores };
        if (sNum > newHighScores.atLevelFinish) {
          newHighScores.atLevelFinish = sNum;
        }
        if (sNum > newHighScores.allTime) {
          newHighScores.allTime = sNum;
        }
        return { levelFinished: true, highScores: newHighScores, isFinishing: false };
      }),
      startNextLevel: () => set((state) => {
        const nextLevel = state.level + 1;
        return {
          level: nextLevel,
          levelFinished: false,
          orbitingPlanetIndex: 1 as number | null,
          lastPlanetIndex: 1,
          annihilatedPlanets: new Set<number>(),
          annihilatedRings: new Set<number>(),
          lastAnnihilatedIndex: null,
          sunRadius: SUN_CORE_SIZE,
          sunGrowthRate: scaleAsymptotic(nextLevel, DIFFICULTY_SUN_GROWTH.start, DIFFICULTY_SUN_GROWTH.limit, DIFFICULTY_SUN_GROWTH.halfLife),
          sunStatus: 'normal',
          sunSupernovaRadius: APP_MIN_LAST_PLANET_DIST * SUN_SUPERNOVA_PROBABILITY_FACTOR,
          sunMass: PHYSICS_SUN_MASS,
          distPenaltyFactor: scaleAsymptotic(nextLevel, DIFFICULTY_ENERGY_DIST.start, DIFFICULTY_ENERGY_DIST.limit, DIFFICULTY_ENERGY_DIST.halfLife),
          timePenaltyFactor: scaleAsymptotic(nextLevel, DIFFICULTY_ENERGY_TIME.start, DIFFICULTY_ENERGY_TIME.limit, DIFFICULTY_ENERGY_TIME.halfLife),
          velocity: 0,
          distToSun: 0,
          lastPlanetDist: APP_MIN_LAST_PLANET_DIST,
          portalPosition: new Vector3(),
          isPortalInitialized: false,
          resetCounter: state.resetCounter + 1,
          isDying: false,
          isFinishing: false,
          isStarting: state.shadersCompiled,
          isLoadingLevel: !state.shadersCompiled,
          travelDistanceSinceOrbit: 0,
          laserEvent: null,
        };
      }),
      resetGame: (forceReset = false) => set((state) => {
        const level = 1;
        return {
          level,
          planetsOrbited: 0,
          distanceTraveled: 0,
          travelDistanceSinceOrbit: 0,
          score: new BigNumber(DIFFICULTY_SCORING_INITIAL_SCORE_BASE),
          orbitingPlanetIndex: 1 as number | null,
          lastPlanetIndex: 1,
          annihilatedPlanets: new Set<number>(),
          annihilatedRings: new Set<number>(),
          lastAnnihilatedIndex: null,
          levelFinished: false,
          gameOver: false,
          gameStarted: forceReset ? false : state.gameStarted,
          gameOverReason: '',
          sunRadius: SUN_CORE_SIZE,
          sunGrowthRate: scaleAsymptotic(level, DIFFICULTY_SUN_GROWTH.start, DIFFICULTY_SUN_GROWTH.limit, DIFFICULTY_SUN_GROWTH.halfLife),
          sunStatus: 'normal',
          sunSupernovaRadius: APP_MIN_LAST_PLANET_DIST * SUN_SUPERNOVA_PROBABILITY_FACTOR,
          sunMass: PHYSICS_SUN_MASS,
          distPenaltyFactor: scaleAsymptotic(level, DIFFICULTY_ENERGY_DIST.start, DIFFICULTY_ENERGY_DIST.limit, DIFFICULTY_ENERGY_DIST.halfLife),
          timePenaltyFactor: scaleAsymptotic(level, DIFFICULTY_ENERGY_TIME.start, DIFFICULTY_ENERGY_TIME.limit, DIFFICULTY_ENERGY_TIME.halfLife),
          velocity: 0,
          distToSun: 0,
          lastPlanetDist: APP_MIN_LAST_PLANET_DIST,
          portalPosition: new Vector3(),
          isPortalInitialized: false,
          resetCounter: state.resetCounter + 1,
          isDying: false,
          isFinishing: false,
          isStarting: state.shadersCompiled,
          isLoadingLevel: !state.shadersCompiled,
          floatingScores: [] as FloatingScore[],
          laserEvent: null,
        };
      }),
      addFloatingScore: (value, position) => set(state => ({
        floatingScores: [...state.floatingScores, {
          id: Date.now() + Math.random(),
          value,
          position: position.clone(),
          startTime: performance.now(),
        }],
      })),
      removeFloatingScore: id => set(state => ({
        floatingScores: state.floatingScores.filter(s => s.id !== id),
      })),
      clearStoredData: () => {
        // 1. clear the underlying storage first
        localStorage.removeItem('slingularity-storage');
        // 2. optionally reset the in-memory state to defaults (if needed before reload)
        // 3. we rely on window.location.href or reload to start fresh
      },
    }),
    {
      name: 'slingularity-storage',
      partialize: state => ({
        settings: state.settings,
        highScores: state.highScores,
      }),
      // Handle hydration for BigNumber and Set
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.score = new BigNumber(state.score || DIFFICULTY_SCORING_INITIAL_SCORE_BASE);
          state.annihilatedPlanets = new Set(state.annihilatedPlanets || []);
          state.annihilatedRings = new Set(state.annihilatedRings || []);
        }
      },
    }
  )
);
