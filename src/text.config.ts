/**
 * Main game title
 * Displayed on the start screen.
 */
export const TEXT_GAME_TITLE = 'Slingularity';
/**
 * Header for the audio prompt
 * Displayed in the start screen before the game starts.
 */
export const TEXT_AUDIO_PROMPT_HEADER = 'Enable Audio?';
/**
 * Text for the audio prompt
 * Displayed in the start screen before the game starts.
 */
export const TEXT_AUDIO_PROMPT_TEXT = 'This game features procedural music and sound effects. Would you like to enable audio? (This will load additional assets).';
/**
 * Label for the audio prompt yes button
 */
export const TEXT_AUDIO_PROMPT_YES = 'Yes, enable audio';
/**
 * Label for the audio prompt no button
 */
export const TEXT_AUDIO_PROMPT_NO = 'No, play silently';

/**
 * Header for the objective section
 * Displayed in the start screen.
 */
export const TEXT_OBJECTIVE_HEADER = 'Objective';
/**
 * Detailed game objective text
 * Explains mechanics and goals to the player.
 */
export const TEXT_OBJECTIVE_TEXT = 'Slingshot between planets to reach the end of the level.\n\nEnter the portal at the solar system boundary to advance.\n\nAvoid the expanding sun, it will consume everything.\n\nDon\'t run out of score!';
/**
 * Header for the controls section
 * Displayed in the start screen.
 */
export const TEXT_CONTROLS_HEADER = 'Controls';
/**
 * Label for the primary action control
 * Space key or mouse click.
 */
export const TEXT_CONTROL_SPACE = '[Space / Click]';
/**
 * Description for the primary action
 * Releasing orbit or annihilating.
 */
export const TEXT_CONTROL_SPACE_DESC = 'Release orbit / Annihilate';
/**
 * Label for the restart control
 * R key.
 */
export const TEXT_CONTROL_R = '[R]';
/**
 * Description for the restart action
 * Restarting the current mission.
 */
export const TEXT_CONTROL_R_DESC = 'Restart mission';
/**
 * Label for the start mission button
 * Primary CTA on the start screen.
 */
export const TEXT_START_BTN = 'Sling away';
/**
 * Hint text for starting the game
 * Encourages the player to perform the start action.
 */
export const TEXT_START_HINT = 'Press space to start';
/**
 * Header for the game over screen
 * Displayed when the player loses.
 */
export const TEXT_GAME_OVER_HEADER = 'Game over';
/**
 * Label for the mission restart button
 * Shown on the game over screen.
 */
export const TEXT_RESTART_BTN = 'Restart mission';
/**
 * Hint text for restarting from the game over screen
 * Lists available shortcuts for restart.
 */
export const TEXT_RESTART_HINT = 'Restart [R]';
/**
 * Header for the level completion screen
 * Displayed when reaching the portal.
 */
export const TEXT_LAST_PLANET_HEADER = 'Portal reached';
/**
 * Label for the next level button
 * Shown on the level completion screen.
 */
export const TEXT_NEXT_LEVEL_BTN = 'Travel to next level [Space]';
/**
 * Failure reason: lost in space
 * Displayed when player drifts away from all planets.
 */
export const TEXT_REASON_LOST_IN_SPACE = 'Lost in space';
/**
 * Failure reason: no score
 * Displayed when score reaches zero.
 */
export const TEXT_REASON_NO_SCORE = 'No score left';
/**
 * Failure reason: portal consumed
 * Displayed when the sun reaches the portal before the player.
 */
export const TEXT_REASON_SUN_CONSUMED = 'The portal was consumed by the sun.';
/**
 * Failure reason: sun collision
 * Displayed when player hits the sun.
 */
export const TEXT_REASON_SUN_CRASH = 'You fell into the sun.';
/**
 * Failure reason: planet collision
 * Displayed when player hits a planet too fast.
 */
export const TEXT_REASON_PLANET_CRASH = 'You crashed into a planet.';
/**
 * HUD label for the current level
 * Displayed in the top UI bar.
 */
export const TEXT_HUD_LEVEL = 'Level';
/**
 * HUD label for the planets count
 * Displayed in the top UI bar.
 */
export const TEXT_HUD_PLANETS = 'Planets';
/**
 * HUD label for the player score
 * Displayed in the top UI bar.
 */
export const TEXT_HUD_SCORE = 'Score';
/**
 * HUD label for distance to target
 * Displayed in the top UI bar.
 */
export const TEXT_HUD_DISTANCE = 'Distance';
/**
 * HUD label for sun expansion progress
 * Displayed in the top UI bar.
 */
export const TEXT_HUD_SUN_EXPANSION = 'Sun expansion';
/**
 * HUD label for current velocity
 * Displayed in the top UI bar.
 */
export const TEXT_HUD_VELOCITY = 'Velocity';
/**
 * Attribution prefix for data sources
 * Used in the footer or credits.
 */
export const TEXT_ATTRIBUTION = 'Celestial data by';

/**
 * Standardized gameplay tips displayed on the level loading screen
 */
export const TEXT_LOADING_TIPS = [
  'Tip: Annihilating an orbited planet launches you tangentially with a velocity boost!',
  'Tip: Skip planets and capture further ones to trigger massive skip score multipliers!',
  'Tip: Atmospheric drag slows you down and pulls you inward. Do not spiral too deep!',
  'Tip: The sun expands constantly. Plan your route quickly before it reaches the portal!',
  'Tip: Comets move extremely fast in eccentric orbits. Target them for high-value captures!',
  'Tip: Entering portals at shallow angles provides smoother circular orbital captures.'
];
