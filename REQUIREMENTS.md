# Slingularity Requirements

## Overview
A 3D browser-based gravity slingshot simulator exploring orbital mechanics through a capture-and-release "slingshot" mechanic.

**Note:** This application was developed with the assistance of AI (Google Antigravity & Gemini).

## Core Mechanics

### Mission Lifecycle & Level Generation
*   **Start Screen:** 
    *   Appears only once at session start.
    *   Bypassed on mission restarts.
    *   Physics and sun growth paused until mission start (Spacebar/Click).
*   **Level Generation (Planet Count):** The number of planets in a level is determined by the Fibonacci sequence, offset to start with the 3rd value (1).
    *   Level 1: 1 planet + target portal.
    *   Level 2: 2 planets + target portal.
    *   Level 3: 3 planets + target portal.
    *   Level 4: 5 planets + target portal, and so on.
*   **Level Generation (Difficulty Scaling):** To ensure a smooth, unbounded, but fair difficulty curve, system parameters follow an **Asymptotic Scaling** model:
    $Value(L) = Start + (Limit - Start) \times \frac{Level - 1}{Level - 1 + HalfLife}$
    *   **Sun Growth Rate:** Increases from $Start$ to $Limit$.
    *   **Energy Depletion:** Score loss for distance and time increases from $Start$ to $Limit$.
    *   **Planet Spacing:** The radial gap between planets increases from $Start$ to $Limit$, ensuring the solar system expands without becoming infinitely sparse.
    *   **Planet Size:** The min/max range for planet radii **decreases** from $Start$ to $Limit$ as levels increase, making targets smaller and harder to hit.
    *   **Atmosphere Radius:** The range for the atmosphere multiplier $[Min, Max]$ narrows; $Max$ decreases asymptotically towards $Min$ as the level increases.
    *   **Overlap Prevention:** To prevent "jumpy" gameplay, the system calculates the orbital gap for a new planet *first*, then caps the planet's radius such that its maximum possible atmosphere does not overlap with the previous or next planet's atmosphere.
*   **Emergence (Starting Portal):**
    *   Portal opens at the edge of the innermost planet's Atmosphere.
    *   Portal spits out the Spaceship into an initial circular orbit (always clockwise) and closes immediately with a satisfying animation and shimmery teleportation sound. The emergence speed scales with the current level.
    *   Score depletion and sun growth paused during sequence.
*   **Target Portal:** The target portal orbits the sun just like the planets, positioned outside the outermost planet. Its position is dynamically tied to the direction of the outermost planet to ensure a consistent progression. Entering the portal triggers a deep teleportation "woosh" sound.
*   **Gameplay:**
    *   Slingshot between planets to reach the end.
    *   Avoid the expanding sun.
*   **Level Completion:**
    *   Reach the celestial portal orbiting outside the outermost planet.
    *   **Observation Mode & Victory:**
        *   Reaching the portal triggers the "Level Finished" UI, but the solar system simulation continues at its normal pace.
        *   The player can observe the sun's natural growth, planet movements, and eventual supernova while the finish screen is displayed.
*   **Game Over:**
    *   Crashes (planet surface/sun) or score depletion.
    *   **Observation Mode & Failure:**
        *   Mission failure triggers the "Game Over" UI, but the solar system simulation continues at its normal pace.
        *   The spaceship remains destroyed/inactive, but the sun continues growing until it naturally reaches its supernova milestone.
    *   Rapid restart (Space/Click/R).

### Stellar Evolution Lifecycle
*   **Supernova Sequence:** Triggered naturally when the sun's radius reaches the orbital boundary of the target portal.
*   **Phase 1: Supernova Flash:** A system-wide brilliant white flash signals the explosion, accompanied by a 10x boost in light intensity.
*   **Phase 2: Collapse:** The sun violently implodes from its expanded state down to its final remnant size.
*   **Phase 3: Stellar Remnants:** The sun becomes one of three remnants: White Dwarf, Neutron Star, or Black Hole, based on specific probability distributions. Each remnant has unique visual properties (colors, light intensity) and reduced mass.
*   **Mass Accumulation:** As the sun expands and swallows planets or comets, their mass is added to the sun's total mass. This dynamic mass increases the sun's gravitational pull on any remaining objects (like comets) in the system. The sun's mass is reset at the start of every level.
*   **Elliptical Orbits:** All planets and comets follow precisely defined elliptical paths centered on the system's sun. The orbital paths are visible as faint lines in the background. Orbital lines follow the color of their respective bodies.
*   **Orbit Direction:** All planets and the target portal orbit counter-clockwise.
*   **Initial Alignment:** At the start of a level, all planets and the target portal spawn roughly along a single line pointing straight up (12:00 position) from the sun, with a slight random offset (both clockwise and counter-clockwise) along their orbits.
*   **Stable Speed:** To maintain a cartoony and playable experience, planets move at a simplified constant angular velocity (`omega`), rather than varying based on Keplerian distance laws. Comets move at a significantly higher `omega` to create a more dynamic challenge.
*   **Analytical Velocity:** Planet velocity vectors are calculated analytically to ensure the Spaceship's relative orbital mechanics remain jitter-free and stable.

### Spaceship Movement (Hook and Orbit Model)
*   **Initial State:** The Spaceship starts in a circular orbit around the first planet, at the very edge of its Atmosphere (signified by a faint white glow). The Atmosphere MUST be highly visible as it is the primary target for navigation. The starting absolute velocity of the Spaceship scales up depending on the current level. All Spaceship movement MUST always be continuous, smooth, and curved; there should be no wonky snapping or instant angular changes to its path.
*   **Orbital Mechanics:**
    *   **Atmospheric Drag:** While inside the Atmosphere, drag reduces the Spaceship's velocity. The drag force is calculated as: $\text{drag} = (R_{max} - R)^2 + \text{base\_drag}$, where $R$ is the current orbital radius and $R_{max}$ is the atmosphere's stored outer boundary. This causes the Spaceship to spiral inwards.
    *   **Warming Effect:** As the Spaceship sinks deeper and drag increases, it visually glows to indicate warming and warn the player of the danger.
    *   **Velocity-Radius Coupling:** The orbital radius $R$ is a linear function of the current orbital velocity $V$: $R = (V / V_{entry}) \times R_{entry}$, where $V_{entry}$ and $R_{entry}$ are the exact velocity and radius recorded at the moment of atmospheric capture. As drag slows the Spaceship, it sinks closer to the planet. The system is tuned for roughly 3 orbits maximum before a surface crash.
    *   **Orientation:** The Spaceship always points parallel to the orbital tangent (perpendicular to the radius). Orientation transitions use a tunable smoothing factor.
*   **Navigation & Capture:**
    *   **Global Gravity:** The Spaceship is constantly affected by a slight gravitational pull from all celestial bodies in the system. Its path in open space is rarely perfectly straight.
    *   **Atmospheric Capture:** If the Spaceship touches a planet's Atmosphere, it is immediately pulled in and captured into orbit.
    *   **Shallow Entry:** Entering the Atmosphere at a shallow angle results in the Spaceship smoothly gliding into the outermost possible orbit, with a slight smoothed turn before fully entering.
     *   **Steep Entry:** Entering at a steep angle causes the Spaceship to pass deep into the Atmosphere. The trajectory shall follow a parabolic arc around the planet's core, heavily aided by an artificial centripetal slingshot hook applied during the ascent phase to ensure a smooth, predictable U-turn regardless of entry velocity. As the Spaceship ascends and reaches the atmospheric boundary, the trajectory's vertex (maximum) must align perfectly with the outermost orbit ($R_{max}$), ensuring it smoothly and tangentially settles into the circular orbit with a continuous, fluid movement without any sharp snapping or jumping.
    *   **Skipping Planets (Auto-Annihilation):** If the player successfully navigates into the Atmosphere of a further planet (e.g., Planet 2) without manually annihilating the previous active planet (e.g., Planet 1), the skipped planet is automatically annihilated upon capture. A red laser shoots from the Spaceship backwards across the solar system to hit the skipped planet.
*   **Annihilation Behavior & Controls:**
    *   **Action:** Pressing the action button (spacebar, left-click, tap) annihilates the *next* planet in the sequence (starting from planet 0 closest to the sun, then planet 1, etc.). The Sun and target portal cannot be annihilated.
    *   **Visuals:** A red laser flashes for a split second from the Spaceship to the center of the annihilated planet, accompanied by the annihilation animation.
     *   **Effect (Inside Atmosphere):** If the Spaceship is within the Atmosphere of the annihilated planet, it is immediately released from the planet's influence (gravity, drag). It receives a scalar velocity boost (defined by a tunable config parameter) applied to its current **absolute velocity** (as displayed on the Hud velocity gauge), and flies off in its **current direction** (as if the planet's influence vanished instantly).
    *   **Single-Pulse Logic:** The annihilation boost is a **one-time event** triggered at the moment of annihilation. It must not be applied repeatedly or continuously while the Spaceship remains within the atmosphere of a previously annihilated planet.
    *   **Effect (Outside Atmosphere):** If the Spaceship is outside the Atmosphere of the annihilated planet, the Spaceship's movement is completely unaffected by the annihilation.
    *   **Trajectory Independence:** The orbital movement of the annihilated planet MUST BE DISCARDED upon fly-off. The new absolute velocity vector is entirely determined by the boosted absolute speed and the current heading. Planet velocity is NEVER added to the Spaceship's velocity during annihilation.
*   **Constraints:**
    *   **Velocity Cap:** A global maximum velocity is strictly enforced.
    *   **Collision:** If the Spaceship crashes into a planet's core (radius + buffer), a comet, or the Sun, it triggers a Game Over. This applies regardless of whether the Spaceship is in orbit or in free flight. Crashing into a planet also triggers the annihilation of that planet and the Spaceship.

### Wandering Comets
*   **Generation:** Comets spawn with highly eccentric orbits and faster angular velocities than planets. They act as high-reward targets for expert slingshots.
*   **Orbital Constraints:** Comets have a minimum periapsis distance to ensure they clear the Sun's core and atmospheric glow.
*   **Comet Trails:**
    *   **Dynamic Particles:** Comets feature a dynamic trail of particles managed via an `InstancedMesh`.
    *   **Physics-Driven:** Trail segments spawn at the comet's position and are primarily driven away from the sun by "solar wind" forces, with minimal momentum inheritance.
    *   **Visual Lifecycle:** Particles spread out and fade over time based on their age.
    *   **Annihilation Behavior:** Upon comet annihilation, existing trail segments continue to simulate and fade naturally.
    *   **Minimap Stealth:** Comet trails are rendered on a dedicated layer to remain invisible on the Minimap, maintaining tactical clarity.

### Annihilation Sequence
*   **Planet/Ring Annihilation:** Triggered upon gravity release or collision.
*   **Animation Phases:**
    1.  **Collapse (4.1):** Planet and rings collapse to the core. Colors mix and saturation increases gradually.
    2.  **Radial Paint (4.2):** Atmosphere is painted from the core outwards with the mixed color, getting more desaturated as it expands.
    3.  **Continual Motion:** Phases 4.1 and 4.2 form a single continual motion: ease-in to collapse, rushing into the paint phase.
    4.  **Fade (4.3):** Fast ease-out fade of the fully painted atmosphere.
*   **Visual Deadline:** Luminance rings (glow layers) scale with the expanding sun to provide a clear indicator of the system's impending consumption. These are implemented as flat circles in the ecliptic plane to avoid camera clipping at extreme scales.

## Scoring
 *   **Energy Management (Lost in Space):** Score depletes over distance traveled and time based on tunable config parameters. If the score falls to zero, the game is over. If this happens while the Spaceship has drifted far outside the solar system, a "Lost in space" message is displayed. The player starts with an initial score defined by a config parameter.
 *   **Rewards:** Points awarded for travel distance and planetary capture, governed by tunable config parameters.
*   **Skip Multipliers:** All rewards (captures and portal reach) are multiplied by $2^n$ where $n$ is the number of planets skipped since the last capture.
*   **Portal Bonus:** Significant award (`SCORING_PORTAL_REACH_BONUS`) for level completion, subject to skip multipliers.

## Audio & Soundscape

The game features a fully procedural audio system that eliminates the need for static assets, ensuring high-performance, zero-latency feedback that scales with gameplay.

*   **Dynamic Loading:** All audio systems (both the SFX engine and the heavy Strudel.js music engine) are bundled separately and dynamically imported. They are only loaded when the game has officially started, provided either Music or SFX is enabled (or deferred mid-game if the player later enables audio). UI components must use the lightweight `sfx-proxy.ts` rather than statically importing the audio engine to prevent the large audio bundles from loading on the initial Start Screen.

### Procedural Music (Strudel.js)
*   **Ambient Background:** A prominent but non-distracting sci-fi soundtrack using softened sine-wave pads and deep triangle basses.
*   **Harmonic System:** The base soundtrack follows the **C Minor scale**.
*   **Dual-Sequence Switching:** The engine randomly alternates between two distinct background sequences every 4 bars. Transitions are synchronized to the start of a bar to maintain rhythmic continuity.
*   **Event-Driven Variations:** 
    *   **Orbit Capture (No Skips):** Triggers a bright **4-note** celebratory sequence in the **Eb Major scale**.
    *   **Planet Skip:** Triggers a bright **G Major scale** variation with a dynamic duration (**3 notes per skipped planet**) to reward aggressive playstyles.
*   **Velocity-Mapped Tempo:** The music's tempo (BPM) is tied directly to the Spaceship's absolute velocity: $BPM = \max(60, \frac{\text{velocity}}{8})$. This provides a persistent sense of speed and urgency.
*   **Level Transitions & Reliability:**
    *   **Initialization:** Music starts immediately and reliably upon mission start (first level) and after any game reset. It must **strictly wait** for the game to actually begin (`gameStarted === true`) and must not play during initial loading or on the Start Screen.
    *   **Level Finish:** The main music ends with a resolving major-chord harmonic twist that gently decays, signaling success.
    *   **Game Over:** Concludes with a sharp, disharmonic resolution (dissonant sawtooth cluster) to signal failure.
*   **Interactive Toggles:** Players can enable or disable the soundtrack independently from settings. The system ensures immediate "hushing" of all audio nodes upon deactivation.

### Sound Effects Engine (Web Audio API)
*   **Synthesis Architecture:** All SFX are generated in real-time using native oscillators (Sawtooth, Sine, Square) and noise buffers.
*   **Signature Effects:**
    *   **Laser:** An energetic falling sawtooth frequency sweep (1500Hz to 40Hz over 1 second).
    *   **Violent Planet Annihilation:** A multi-layered high-impact event combining a resonant noise sweep, a cluster of distorted sawtooth/square waves, and a heavy sub-bass "implosion" thump.
    *   **Comet Annihilation (Digital Disintegration):** A complex sequence of overlapping harmonic sweeps using multiple oscillators.
    *   **Crash (Intense Rumble):** A multi-layered impact featuring a deep sine-wave sweep (80Hz to 20Hz) combined with a high-volume lowpass noise explosion.
    *   **Sun Consumption:** A sizzling, highpass-filtered noise burn effect.
    *   **Portal Emergence:** A shimmery rising sine swell (100Hz to 1500Hz).
    *   **Portal Entry (Success):** A reversed version of the emergence sound (1500Hz to 100Hz sine sweep).
    *   **Finish Screen Celebration:** Triggered upon victory, featuring a series of bright, ascending harmonic sine chimes.
    *   **Atmospheric Drag:** A subtle, low-frequency noise rumble. The volume scales dynamically based on the Spaceship's depth within the atmosphere (0% at the edge, peaking at the planet surface).
    *   **UI Interactions:** Distinct synthesized blips and clicks for starting missions, restarting, and toggling settings.
    *   **Game Over:** A descending, mournful triangle-wave sweep that accompanies terminal impacts.

## Technical Requirements

### Graphics Settings
The application must support configurable graphics settings to maintain high performance across a variety of devices. The following settings are required:
*   **Auto Performance:** Automatically downgrades graphics settings if the framerate drops below an acceptable threshold.
*   **Detail Level (`low`, `medium`, `high`):** Controls the number of background stars, galaxies, and procedural celestial elements.
*   **Resolution Scale (`low`, `medium`, `high`):** Adjusts the internal rendering resolution to reduce GPU load while maintaining UI clarity.
*   **Antialiasing (`low`, `medium`, `high`):** Toggles or adjusts the quality of multi-sample or post-process antialiasing to smooth edges.
*   **Shadows (`off`, `basic`, `advanced`):** Toggles shadow casting and receiver maps. `advanced` uses high-resolution shadow maps; `basic` uses lower resolution or limits shadows to fewer objects; `off` disables them entirely.
*   **Shaders (`off`, `basic`, `advanced`):** Controls the complexity of procedural materials (e.g., planetary surfaces, atmospheres). `off` uses basic unlit or lambert materials; `advanced` uses complex noise-based shaders.

### CSS & Styling
*   **Separation of Concerns:** All CSS must be defined in dedicated `.css` files. Inline styles (`style` prop in React) are strictly prohibited except for high-frequency dynamic values calculated in `useFrame` that cannot be efficiently handled via CSS variables.
*   **File Naming:** CSS files must follow kebab-case and be adjacent to their respective components (e.g., `src/components/ui/hud.css` for `src/components/ui/hud.tsx`).
*   **Theme System:** Use a centralized theme in `src/app.css` using top-level CSS variables.
*   **Semantic Naming:** CSS variables must use semantic names describing their purpose (e.g., `--theme-primary`, `--bg-overlay`) rather than their literal color value (e.g., `--color-cyan`).
*   **Color Format:** All colors in CSS must consistently use `rgba()` values for uniformity and transparency control.
*   **3D Bridge:** The `src/app.css` file is the Single Source of Truth for the entire visual theme. 3D components MUST read their colors from these CSS variables using the `useThemeColors` hook to ensure visual parity between the DOM and the WebGL scene.

### Performance & Optimization
*   **Execution Priority:** System performance and smooth frame rates (60 FPS) are the highest priority. Performance-driven optimizations (e.g., direct ref mutations, object pooling, scratchpad vectors) take precedence over strict adherence to linter rules in high-frequency execution paths like `useFrame` or physics loops. ESLint rules should be selectively disabled in these cases rather than compromising performance.
*   **Shader-Driven Loading Screen:** A level-loading screen is displayed during level initialization, restarts, and transitions. During this phase, physics simulations, scoring depletion (distance and time penalties), and sun growth are completely frozen (`isLoadingLevel: true`). The loading screen is dismissed only after `renderer.compileAsync(scene, camera)` resolves (pre-compiling all shaders on a background GPU thread via the `KHR_parallel_shader_compile` extension), with a configurable minimum display floor (`APP_LOADING_MIN_DURATION_MS`) to prevent flashing. Browsers without `compileAsync` support fall back to a fixed timer (`APP_LOADING_FALLBACK_DURATION_MS`). This ensures gameplay always starts at a solid 60 FPS with zero shader compilation stutters.
*   **R3F Frame Loop Priorities:** The four core `useFrame` hooks MUST use explicit negative priorities to enforce a strict sequential execution order within each frame: Solar System Simulation (`-4`) → Spaceship Physics (`-3`) → Spaceship Visual Effects (`-2`) → Camera Follow (`-1`). This prevents 1-frame tracking delays between physics, mesh presentation, and camera framing. Negative priorities are required to avoid disabling R3F's automatic canvas rendering (which occurs when any priority is `> 0`).
*   **Decoupled State Trees:** High-frequency visual updates (e.g., score values, dynamic portal coordinates) must utilize non-reactive store retrievals inside hot loops or transient `.subscribe()` hooks to prevent full Virtual DOM re-renders of parent components.
*   **Visual Frame Throttling:** Non-essential background animations and UI updates must be throttled to conserve processing power: background star drift and minimap layout framing are restricted to 30Hz, and planet orbital visual updates are restricted to 15Hz.

### Technical Constraints
*   **Strudel.js Routing:** Using the `defaultOutput` parameter in `initStrudel` causes internal trigger failures (`getTrigger error: t is not a function`). Strudel's engine must use its internal default destination; do not attempt to override this with a custom `GainNode`. Use global gain control on the output or mix nodes externally if needed, but do not inject `defaultOutput`.
*   **Volume Mapping:** Volume sliders use a quadratic mapping (`gain = value^2`) to provide perceived linearity in loudness. 100% on the slider corresponds to unity gain (1.0).

### Architecture & Code Organization
*   **Hook-Driver / Store-Referee Architecture:** The system is split into two distinct layers to ensure performance and maintainability:
    *   **Simulation Layer (Hooks):** Specialized hooks (`useSpaceshipPhysics`, `useSolarSystemSimulation`) act as "drivers." They handle frame-by-frame physics integration (delta-time based math) and detect physical events. High-frequency state is kept in `useRef`.
    *   **State & Rules Layer (Store):** The Zustand store acts as the "referee." It centralizes all game rules, scoring formulas, and state transitions. Complex state transition logic is extracted from the main store definition into dedicated **named action logic functions** (handlers) to maintain readability and modularity. It reacts to notifications from the hooks to update the game state and check mission objectives.
*   **Spaceship Simulation:** Modularized into specialized hooks (`useSpaceshipPhysics` for movement and state, and `useSpaceshipEffects` for visuals like beams and shockwaves) composed together by `useSpaceshipSimulation`. Visual indicators like `AnnihilationBeam` and `Shockwave` are isolated into dedicated components.
*   **Solar System & Level Generation:** Level generation logic is separated into `useSolarSystemFactory`. Orbital mathematical formulas and collision detection are centralized in `src/physics/solar-system-physics.ts`. The main `useSolarSystemSimulation` strictly orchestrates the `useFrame` loop.
*   **Centralized Objectives:** Player-related collision logic (hitting the Sun, planets, the target Portal, and "Lost in Space" conditions) is centrally managed from the `GameLoop` component within `App.tsx` to maintain a single source of truth for mission objectives.

### Physics
*   **Keplerian Ellipses:** Planets follow stable elliptical paths.
 *   **Newtonian Integration:** Global gravity follows Newtonian physics ($F = G \frac{m_1 m_2}{r^2}$), with the gravitational constant $G$ and mass values being tunable config parameters to ensure the pull is notable but not overpowering.
 *   **Velocity Cap:** Maximum speed globally enforced by the tunable config parameter `GAMEPLAY_VELOCITY_MAX`.

## External Assets & Data

*   **Star/Constellation Data:** Real-world data should be fetched from `https://github.com/dieghernan/celestial_data`.
*   **Backgrounds:** Procedural generation of Milky Ways, Nebulae, and Galaxies using custom shaders to create a deep, layering celestial void.

## Visuals

*   **Decentralized Configuration:** All parameters stored in `XYZ.config.ts` adjacent to the `XYZ.ts` (or `XYZ.tsx`) they configure. Global parameters are in `src/app.config.ts` or `src/difficulty.config.ts`. All parameters use semantic prefixes.
*   **Planet Aesthetics:**
    *   Cartoony cel-shaded planets with banding.
    *   **Atmosphere Visuals:** To facilitate precise navigation, the visual representation of the Atmosphere (the faint glow) includes an additional constant buffer equal to the Spaceship's width. This ensures that visual contact with the glow's edge accurately represents the point of atmospheric capture. When shaders are enabled, the atmosphere glow is occluded by shadows cast from other celestial bodies.
    *   **Atmosphere Glow:** The atmosphere features a directional glow facing the sun. The angle and intensity of this glow are tunable via configuration.
    *   **Planetary Rings:** Some planets feature procedural rings. The number of rings, their inner and outer radii, and their rotation are randomized within level-dependent constraints. Rings are constrained to cover no more than 50% of the visible atmosphere area to maintain gameplay clarity.
    *   **Rotation:** Planets should have a slight, random rotation.
    *   **Sun-Relative Lighting:** Cel-shading is dynamically tied to the sun's position. Lighting is linear and cartoony, calculated from the sun's center with a tunable Z offset (+100 units) to ensure planets are well-illuminated for the camera.
    *   **Proximity Brightness:** Planets brighten as the sun expands. This is calculated as a linear factor based on the distance from the planet to the sun's outer edge ($\text{dist} - R_{sun}$).
*   **Portal Aesthetics:**
    *   **Improved Portal Glow:** Inner core glow enhanced with emissive materials.
*   **Spaceship Aesthetics:**
    *   **Spaceship Visuals:** Highly detailed 3D spaceship model featuring its original red and grey color scheme.
    *   **Navigation Lights:** Directional wing lights (Red on port, Green on starboard) for orientation.
    *   **Engines:** Cyan thrusters with a bright white-ish core for high-intensity visual feedback.
    *   **Cockpit:** Semi-transparent cockpit cover with a dim internal cyan glow.
    *   **Custom Shader:** Specialized cel-shading material that balances the original model's colors with the game's cartoony aesthetic. It includes a reduced ambient floor to prevent washing out in dark regions.
    *   **Dynamic Lighting:** Illuminated by the sun from a perspective-optimized source positioned between the star and the camera, ensuring consistent visibility from the player's view. It also features "Sun Influence" (brightening near the star) and a "Warming Glow" (emissive heating when deep in an atmosphere).
    *   **Engine Trails:** The Spaceship features a dynamic trail that visualizes its recent trajectory. This effect can be toggled via the dynamic `#debug` URL anchor.
*   **Sun Aesthetics:**
    *   **Color Shift:** The sun starts as an orangy-yellow and transitions to a deep red as it expands towards the target portal.
    *   **Luminance Rings:** Multi-layered glow rings that scale with the sun's radius. These rings are represented as circles in the ecliptic (XY) plane to provide a clear and stable visual indicator that doesn't clip through the camera as the sun expands.
*   **Visual Polish:**
    *   **Celestial Background:**
        *   Order: Milky Ways (closest), Nebulae, Stars & Constellations (same layer), Galaxies (deepest).
        *   Parallax drift towards center.
    *   **General Aesthetics:** 
        *   Cyan multiplier labels for skipped planets.
*   **Hud:**
    *   Score, distance, FPS, velocity gauge.
    *   Sun growth bar (fills red as it approaches boundary).
    *   **Debug Hud:** A detailed overlay (visible when the `#debug` URL anchor is present) providing real-time data on Spaceship velocity, world position, portal position, game state flags, and positions of nearby planets.
*   **Minimap:** Tactical top-right view. Its bounding box is determined strictly by the Sun and the Target Portal.
*   **Navigation Guides:** Persistent dashed target lines connecting consecutive active planets in the system (e.g., Planet 0 to Planet 1, Planet 1 to Planet 2, ..., Planet N to Target Portal). Comets and the Sun are excluded from these lines to maintain mission focus. These are for rough orientation, not exact paths to follow.

### Camera Modes
The system supports multiple camera behaviors to assist with navigation and immersion:
*   **Heliocentric:** Dynamically frames the Spaceship and its current target (planet or portal) using an adaptive bounding box.
*   **Axis Alignment:** Dynamically rotates the view to keep the Sun and Target Portal aligned on a vertical axis. The camera center is projected onto the Sun-Portal axis, allowing only minor lateral deviation to maintain a stable reference point for navigation.
*   **Orbital Tracking:** Locks the camera to the Spaceship's position with a fixed zoom level. It uses high-responsiveness smoothing to ensure the camera never lags behind during high-velocity orbits, providing a stable view for precise maneuvers.

