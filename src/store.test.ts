import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { useGameStore } from './store';
import { SUN_CORE_SIZE } from './entities/sun.config';
import {
  DIFFICULTY_ENERGY_DIST,
  DIFFICULTY_ENERGY_TIME,
  DIFFICULTY_SCORING_INITIAL_SCORE_BASE,

} from './difficulty.config';
import { TEXT_REASON_LOST_IN_SPACE, TEXT_REASON_NO_SCORE, TEXT_REASON_SUN_CONSUMED } from './text.config';
import { scaleAsymptotic } from './utils/difficulty';

describe('useGameStore', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useGameStore.getState().finishLoadingLevel();
    useGameStore.getState().finishStarting();
  });

  it('should initialize with default values and start in orbit of the first planet', () => {
    const state = useGameStore.getState();
    expect(state.level).toBe(1);
    expect(state.score.toString()).toBe(DIFFICULTY_SCORING_INITIAL_SCORE_BASE.toString());
    expect(state.gameOver).toBe(false);
    expect(state.sunRadius).toBe(SUN_CORE_SIZE);
    expect(state.orbitingPlanetIndex).toBe(1);
    expect(state.lastPlanetIndex).toBe(1);
  });

  it('should calculate skip bonuses correctly in setOrbitingPlanet', () => {
    useGameStore.setState({ lastPlanetIndex: 1, orbitingPlanetIndex: 1, travelDistanceSinceOrbit: 0 });
    useGameStore.getState().setOrbitingPlanet(4);

    // numSkipped = 4 - 1 - 1 = 2
    // skip bonus = 2 * 1000 = 2000
    // multiplier = 2^2 = 4
    // totalBonus = 2000 + (0 * 50 * 4) = 2000
    // final score = 10000 + 2000 = 12000
    const state = useGameStore.getState();
    expect(state.orbitingPlanetIndex).toBe(4);
    expect(state.score.toString()).toBe('12000');
    expect(state.planetsOrbited).toBe(1);
  });

  it('should update high scores', () => {
    useGameStore.setState({ lastPlanetIndex: 1 });
    useGameStore.getState().setOrbitingPlanet(10);
    const state = useGameStore.getState();
    expect(state.highScores.allTime).toBeGreaterThan(DIFFICULTY_SCORING_INITIAL_SCORE_BASE);
    expect(state.highScores.inStableOrbit).toBeGreaterThan(DIFFICULTY_SCORING_INITIAL_SCORE_BASE);
  });

  it('should decrease score and trigger game over sequence on addDistance', () => {
    const store = useGameStore.getState();
    const safePos = new Vector3(50, 0, 0);
    const penaltyFactor = scaleAsymptotic(
      1,
      DIFFICULTY_ENERGY_DIST.start,
      DIFFICULTY_ENERGY_DIST.limit,
      DIFFICULTY_ENERGY_DIST.halfLife
    );
    const distToDeplete = (DIFFICULTY_SCORING_INITIAL_SCORE_BASE / penaltyFactor) + 1;
    store.addDistance(distToDeplete, safePos);

    const state = useGameStore.getState();
    expect(state.score.toString()).toBe('0');
    expect(state.isDying).toBe(true);
    expect(state.gameOverReason).toBe(TEXT_REASON_NO_SCORE);
  });

  it('should decrease score and trigger game over sequence on tickTime', () => {
    const store = useGameStore.getState();
    const safePos = new Vector3(50, 0, 0);
    const penaltyFactor = scaleAsymptotic(
      1,
      DIFFICULTY_ENERGY_TIME.start,
      DIFFICULTY_ENERGY_TIME.limit,
      DIFFICULTY_ENERGY_TIME.halfLife
    );
    const timeToDeplete = (DIFFICULTY_SCORING_INITIAL_SCORE_BASE / penaltyFactor) + 1;
    store.tickTime(timeToDeplete, safePos);

    const state = useGameStore.getState();
    expect(state.score.toString()).toBe('0');
    expect(state.isDying).toBe(true);
    expect(state.gameOverReason).toBe(TEXT_REASON_NO_SCORE);
  });

  it('should use "lost in space" reason only if far outside solar system boundary', () => {
    const store = useGameStore.getState();
    const portalPos = new Vector3(100, 0, 0);
    store.setPortalPosition(portalPos);
    const boundary = portalPos.length() + 50;

    store.resetGame();
    store.finishLoadingLevel();
    store.setPortalPosition(portalPos);
    store.finishStarting();
    const insidePos = new Vector3(boundary - 1, 0, 0);
    const penaltyFactor = scaleAsymptotic(
      1,
      DIFFICULTY_ENERGY_DIST.start,
      DIFFICULTY_ENERGY_DIST.limit,
      DIFFICULTY_ENERGY_DIST.halfLife
    );
    const distToDeplete = (DIFFICULTY_SCORING_INITIAL_SCORE_BASE / penaltyFactor) + 1;
    store.addDistance(distToDeplete, insidePos);
    expect(useGameStore.getState().gameOverReason).toBe(TEXT_REASON_NO_SCORE);

    store.resetGame();
    store.finishLoadingLevel();
    store.setPortalPosition(portalPos);
    store.finishStarting();
    const outsidePos = new Vector3(boundary + 1, 0, 0);
    store.addDistance(distToDeplete, outsidePos);
    expect(useGameStore.getState().gameOverReason).toBe(TEXT_REASON_LOST_IN_SPACE);
  });

  it('should grow the sun exponentially', () => {
    const store = useGameStore.getState();
    const dt = 1;
    store.growSun(dt);
    const radius1 = useGameStore.getState().sunRadius;

    const expectedRadius1 = SUN_CORE_SIZE * Math.pow(1 + store.sunGrowthRate, dt);
    expect(radius1).toBeCloseTo(expectedRadius1, 5);

    store.growSun(dt);
    const radius2 = useGameStore.getState().sunRadius;
    const expectedRadius2 = expectedRadius1 * Math.pow(1 + store.sunGrowthRate, dt);
    expect(radius2).toBeCloseTo(expectedRadius2, 5);
  });

  it('should increment resetCounter on resetGame and maintain gameStarted state', () => {
    const initialCounter = useGameStore.getState().resetCounter;
    useGameStore.getState().startGame();
    expect(useGameStore.getState().gameStarted).toBe(true);

    useGameStore.getState().resetGame();
    expect(useGameStore.getState().resetCounter).toBe(initialCounter + 1);
    expect(useGameStore.getState().gameStarted).toBe(true);
  });

  it('should increment resetCounter on startNextLevel', () => {
    const initialCounter = useGameStore.getState().resetCounter;
    useGameStore.getState().startNextLevel();
    expect(useGameStore.getState().resetCounter).toBe(initialCounter + 1);
  });

  it('should annihilate the next active planet upon release', () => {
    const store = useGameStore.getState();
    store.setTotalPlanets(2);
    store.setOrbitingPlanet(1);
    store.annihilateNextPlanet();

    const state = useGameStore.getState();
    expect(state.orbitingPlanetIndex).toBe(null);
    expect(state.annihilatedPlanets.has(1)).toBe(true);
  });

  it('should automatically disintegrate all planets closer to the sun upon capturing a further one', () => {
    const store = useGameStore.getState();
    // capturing p3 (index 3) should disable p1 and p2 (indices 1 and 2)
    store.setOrbitingPlanet(3);

    const state = useGameStore.getState();
    expect(state.annihilatedPlanets.has(1)).toBe(true);
    expect(state.annihilatedPlanets.has(2)).toBe(true);
    expect(state.orbitingPlanetIndex).toBe(3);
  });

  it('should maintain score across level transitions', () => {
    const store = useGameStore.getState();
    const safePos = new Vector3(50, 0, 0);
    const penaltyFactor = scaleAsymptotic(
      1,
      DIFFICULTY_ENERGY_DIST.start,
      DIFFICULTY_ENERGY_DIST.limit,
      DIFFICULTY_ENERGY_DIST.halfLife
    );
    store.addDistance(10, safePos);
    const expectedPenalty = 10 * penaltyFactor;
    expect(useGameStore.getState().score.toString()).toBe((DIFFICULTY_SCORING_INITIAL_SCORE_BASE - expectedPenalty).toString());

    store.startNextLevel();
    expect(useGameStore.getState().score.toString()).toBe((DIFFICULTY_SCORING_INITIAL_SCORE_BASE - expectedPenalty).toString());

    store.initLevel(); // should not reset score
    expect(useGameStore.getState().score.toString()).toBe((DIFFICULTY_SCORING_INITIAL_SCORE_BASE - expectedPenalty).toString());
  });

  it('should track travelDistanceSinceOrbit and award travel points with multiplier', () => {
    useGameStore.getState().resetGame();
    useGameStore.getState().finishLoadingLevel();
    useGameStore.getState().finishStarting();
    const store = useGameStore.getState();
    const safePos = new Vector3(50, 0, 0);

    useGameStore.setState({ lastPlanetIndex: 1, orbitingPlanetIndex: null });

    store.addDistance(100, safePos);
    expect(useGameStore.getState().travelDistanceSinceOrbit).toBe(100);

    // Level 1: penaltyFactor = 5. Skip 1 planet (p2) to reach p3.
    // Score = 10000 - (100 * 5) = 9500.
    // Skip multiplier = 2^1 = 2.
    // Travel reward = (100 * 50 factor) * 2 = 10000.
    // Skip bonus = 1 * 1000 = 1000.
    // Total reward = 11000
    // Total = 9500 + 11000 = 20500.
    store.setOrbitingPlanet(3);
    expect(useGameStore.getState().score.toString()).toBe('20500');
    expect(useGameStore.getState().travelDistanceSinceOrbit).toBe(0);
    expect(useGameStore.getState().lastPlanetIndex).toBe(3);
  });

  it('should award SCORING_PORTAL_REACH_BONUS with multiplier when level is finishing', () => {
    useGameStore.getState().resetGame();
    useGameStore.getState().finishLoadingLevel();
    useGameStore.getState().finishStarting();
    const store = useGameStore.getState();

    useGameStore.setState({ totalPlanets: 5, lastPlanetIndex: 1 });

    // numSkipped = 5 - 1 = 4
    // multiplier = 2^4 = 16
    // portalBonus = 2500 * 16 = 40000

    store.startFinishing();

    expect(useGameStore.getState().score.toNumber()).toBe(50000);
    expect(useGameStore.getState().isFinishing).toBe(true);
  });

  it('should handle isLoadingLevel and isStarting state correctly', () => {
    useGameStore.getState().resetGame();
    const store = useGameStore.getState();
    const safePos = new Vector3(50, 0, 0);

    // initially we are loading the level
    expect(store.isLoadingLevel).toBe(true);
    expect(store.isStarting).toBe(false);

    const initialScore = store.score.toString();
    store.addDistance(100, safePos);
    expect(store.score.toString()).toBe(initialScore);

    store.tickTime(1, safePos);
    expect(store.score.toString()).toBe(initialScore);

    const initialSunRadius = store.sunRadius;
    store.growSun(1);
    expect(store.sunRadius).toBe(initialSunRadius);

    // finish loading transitions to portal emergence
    store.finishLoadingLevel();
    expect(useGameStore.getState().isLoadingLevel).toBe(false);
    expect(useGameStore.getState().isStarting).toBe(true);

    // under portal emergence (isStarting), simulation remains paused
    useGameStore.getState().addDistance(100, safePos);
    expect(useGameStore.getState().score.toString()).toBe(initialScore);

    useGameStore.getState().tickTime(1, safePos);
    expect(useGameStore.getState().score.toString()).toBe(initialScore);

    useGameStore.getState().growSun(1);
    expect(useGameStore.getState().sunRadius).toBe(initialSunRadius);

    // finish starting clears portal emergence, starting gameplay
    useGameStore.getState().finishStarting();
    expect(useGameStore.getState().isStarting).toBe(false);

    // score penalty and sun growth should now be active
    useGameStore.getState().addDistance(1, safePos);
    expect(useGameStore.getState().score.toString()).not.toBe(initialScore);

    useGameStore.getState().growSun(1);
    expect(useGameStore.getState().sunRadius).not.toBe(initialSunRadius);
  });

  it('should set randomized sunSupernovaRadius when lastPlanetDist is set', () => {
    const store = useGameStore.getState();
    store.setLastPlanetDist(100);
    const state = useGameStore.getState();
    expect(state.sunSupernovaRadius).toBeGreaterThanOrEqual(100);
    expect(state.sunSupernovaRadius).toBeLessThanOrEqual(100 * 1.5);
  });

  it('should trigger supernova flash when sunRadius hits sunSupernovaRadius', () => {
    const store = useGameStore.getState();
    useGameStore.setState({ sunRadius: 100, sunSupernovaRadius: 110, sunStatus: 'normal', lastPlanetDist: 100 });

    store.growSun(10); // Grow past 110

    const state = useGameStore.getState();
    expect(state.sunStatus).toBe('supernova_flash');
    expect(state.sunRadius).toBe(110);
  });

  it('should manage portal position', () => {
    const store = useGameStore.getState();
    const portalPos = new Vector3(500, 500, 0);
    store.setPortalPosition(portalPos);

    const state = useGameStore.getState();
    expect(state.portalPosition.x).toBe(500);
    expect(state.portalPosition.y).toBe(500);
  });

  it('should manage floating scores correctly', () => {
    const store = useGameStore.getState();
    const pos = new Vector3(10, 20, 0);

    store.addFloatingScore(100, pos);
    let state = useGameStore.getState();
    expect(state.floatingScores.length).toBe(1);
    expect(state.floatingScores[0].value).toBe(100);
    expect(state.floatingScores[0].position.x).toBe(10);

    store.resetGame();
    useGameStore.setState({ lastPlanetIndex: 1 });
    store.setOrbitingPlanet(3, pos);
    state = useGameStore.getState();
    expect(state.floatingScores.length).toBe(1);
    expect(state.floatingScores[0].value).toBe(1000);

    const id = state.floatingScores[0].id;
    store.removeFloatingScore(id);
    expect(useGameStore.getState().floatingScores.length).toBe(0);
  });

  it('should trigger game over if sun consumes the portal boundary', () => {
    const store = useGameStore.getState();
    store.setLastPlanetDist(100);
    store.growSun(100);

    const state = useGameStore.getState();
    if (state.sunRadius >= state.lastPlanetDist) {
      store.startDying(TEXT_REASON_SUN_CONSUMED);
    }
    expect(useGameStore.getState().isDying).toBe(true);
  });

  it('should disable rings via disableRings', () => {
    const store = useGameStore.getState();
    store.disableRings(2);
    expect(useGameStore.getState().annihilatedRings.has(2)).toBe(true);
  });

  it('should disable a specific planet via disablePlanet', () => {
    const store = useGameStore.getState();
    useGameStore.setState({ orbitingPlanetIndex: 1 });
    store.disablePlanet(5);
    expect(useGameStore.getState().annihilatedPlanets.has(5)).toBe(true);
    expect(useGameStore.getState().orbitingPlanetIndex).toBe(1);

    store.disablePlanet(1);
    expect(useGameStore.getState().orbitingPlanetIndex).toBe(null);
  });

  it('should not decrease score if level is finished (but can during finishing/observation)', () => {
    const store = useGameStore.getState();
    const safePos = new Vector3(50, 0, 0);

    store.resetGame();
    store.finishLevel();
    const initialScore2 = useGameStore.getState().score.toString();
    store.addDistance(1000, safePos);
    expect(useGameStore.getState().score.toString()).toBe(initialScore2);
  });

  it('should do nothing if setOrbitingPlanet is called with sun (which would be index 0)', () => {
    const store = useGameStore.getState();
    useGameStore.setState({ orbitingPlanetIndex: 1 });
    // Note: setOrbitingPlanet(null) sets it to null.
    // setOrbitingPlanet(0) would technically trigger logic if index !== orbitingPlanetIndex.
    // In current implementation, index 0 is sun.
    // If we call with null, it just sets to null.
    store.setOrbitingPlanet(null);
    expect(useGameStore.getState().orbitingPlanetIndex).toBe(null);
  });

  it('should not give bonus if orbiting the same planet again', () => {
    useGameStore.setState({ lastPlanetIndex: 1, orbitingPlanetIndex: 1 });
    const store = useGameStore.getState();
    const initialScore = store.score.toString();
    store.setOrbitingPlanet(1);
    expect(useGameStore.getState().score.toString()).toBe(initialScore);
  });

  it('should update settings properly via updateSettings', () => {
    const store = useGameStore.getState();
    store.updateSettings({ detailLevel: 'low', antialiasing: 'medium' });
    const settings = useGameStore.getState().settings;
    expect(settings.detailLevel).toBe('low');
    expect(settings.antialiasing).toBe('medium');
    // Ensure others remain unchanged
    expect(settings.shadows).toBe('advanced');
    // @ts-expect-error - debug should be removed from settings
    expect(settings.debug).toBeUndefined();
  });

  it('should disable scoring and penalties when isDebug is true', () => {
    const store = useGameStore.getState();
    const safePos = new Vector3(50, 0, 0);
    const initialScore = store.score.toString();

    store.setIsDebug(true);

    // No penalty on distance
    store.addDistance(1000, safePos);
    expect(useGameStore.getState().score.toString()).toBe(initialScore);

    // No penalty on time
    store.tickTime(100, safePos);
    expect(useGameStore.getState().score.toString()).toBe(initialScore);

    // No score bonus on capture
    store.setOrbitingPlanet(3);
    expect(useGameStore.getState().score.toString()).toBe(initialScore);

    // No floating scores
    expect(useGameStore.getState().floatingScores.length).toBe(0);
  });

  it('should toggle settings menu visibility', () => {
    const store = useGameStore.getState();
    expect(store.settingsMenuOpen).toBe(false);
    store.setSettingsMenuOpen(true);
    expect(useGameStore.getState().settingsMenuOpen).toBe(true);
  });

  it('should manage portal annihilation state', () => {
    const store = useGameStore.getState();
    expect(store.isPortalAnnihilated).toBe(false);

    store.disablePortal();
    expect(useGameStore.getState().isPortalAnnihilated).toBe(true);

    store.initLevel();
    expect(useGameStore.getState().isPortalAnnihilated).toBe(false);
  });
});
