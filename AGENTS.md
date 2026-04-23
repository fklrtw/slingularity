# Agent Instructions - Slingularity

## 1. Foundations

### Core Mandates
*   **Strict Adherence:** Always perform exactly what is requested. Do not initiate unrequested tasks, refactoring, or "cleanup" once the original request is complete.
*   **Security:** NEVER log, print, or commit secrets, API keys, or sensitive credentials.
*   **Source Control:** DO NOT use Git for any reason. Never stage or commit changes. Never run git commands.
*   **Context Efficiency:** Minimize turns. Combine searches/reads in parallel. Use `grep_search` and `glob` to narrow scope.

### Communication & Tone
*   **Intent-First:** Use tool calls for actions, text for technical rationale and intent.
*   **Conciseness:** Avoid filler and progress commentary. 
*   **Transparency:** Briefly explain the purpose and impact of modifying shell commands before execution.

### Project Knowledge
*   **Contextual Precedence:** This file and `REQUIREMENTS.md` are foundational.
*   **Mandatory Alignment:** At the start of every session, read `REQUIREMENTS.md`, `TERMS.md`, `NEXT_STEPS.md`, and `DISCREPANCIES.md` (if present). This ensures you are fully synchronized with the project's current state, rules, and goals.
*   **Terminology:** Strictly honor `TERMS.md` (e.g., Spaceship, Annihilate, Atmosphere).
*   **Inclusivity:** ALWAYS use inclusive and neutral terminology (e.g., "primary", "replica").

## 2. Development Lifecycle

### Research & Strategy
*   Map the codebase and validate assumptions with targeted reads before proposing a strategy for major modifications.

### Execution & Validation
For every task, follow the **Plan -> Act -> Validate** cycle:
1.  **Plan:** Define implementation and testing strategy.
2.  **Act:** Apply surgical changes following local conventions. ALWAYS update related tests or add new ones to verify changes. For bugs, empirically reproduce the failure with a test case before fixing.
3.  **Validate:** Task completeness requires verified behavioral correctness and passing all project checks:
    *   `npx tsc --noEmit` (Type safety)
    *   `npx eslint .` (Linting - 2-space indentation)
    *   `npm run build` (Build integrity)
    *   `npm test` (All tests must pass. NEVER remove existing test cases unless the code they test has been explicitly removed; even then, verify it is truly obsolete before deletion).

## 3. Engineering Standards

### Code Quality & Performance
*   **Performance Priority:** Performance is more important than satisfying the linter. In high-frequency paths (e.g., `useFrame`, physics loops), disable ESLint rules if fixing them would introduce performance overhead (like unnecessary state updates or object allocations).
*   **TypeScript:** Full type safety required. No `any` or cast hacks unless strictly necessary for performance.
*   **Imports:** DO NOT use re-exports (e.g., `export *` or `export { x }`). ALWAYS use direct imports from the file where the symbol is defined to maintain clear dependency tracking.
*   **State:** Use atomic Zustand selectors (e.g., `useGameStore(s => s.value)`).
*   **Performance:** Prioritize O(1) lookups and pre-allocated scratchpad vectors for high-frequency loops to minimize GC pressure.
*   **Root-Render Elimination & Decoupling:** Do NOT subscribe to high-frequency reactive Zustand state (like `score` or `portalPosition`) at the root React level or in parent 3D components where changes would trigger virtual DOM cascades 60-120 times/sec. Read high-frequency state non-reactively using `useGameStore.getState().x` inside fast rendering loops (like `useFrame`) or use transient `.subscribe()` listeners to decouple UI from physics simulation.
*   **Level Loading & Simulation Pause:** During level load initialization, restarts, or next-level transitions, set `isLoadingLevel: true` and completely pause all physics ticks, planet/comet orbits, sun growth, and scoring depletion (time/distance penalties). The loading screen is dismissed only after `renderer.compileAsync(scene, camera)` resolves (waiting for actual GPU shader compilation), with a configurable minimum display floor to prevent flashing. Browsers without `compileAsync` fall back to a fixed timer. This ensures gameplay begins at a solid 60 FPS.
*   **Throttling Visuals:** Auxiliary visual systems must be throttled to conserve CPU/GPU frame budgets: throttle background star drift and minimap layout framing to 30Hz, and throttle orbit path calculations and planet visibility checks to 15Hz.
*   **Buffer Pre-allocation & Scratchpads:** Avoid instantiating new mathematical objects (such as `new Vector3` or `new Euler`) inside tick/render loops; hoist all allocations to static file-scoped scratchpads. Pre-allocate line segment geometries in `Float32Array` buffers and update positions in-place to avoid CPU layout thrashing.
*   **Build Optimization:** Utilize manual chunking in `vite.config.ts` to separate heavy libraries (Three.js, Strudel.js) and common dependencies from the main application bundle to improve loading performance and caching.

### Architecture & Structure
*   **Hook-Driver / Store-Referee Pattern:** Strictly maintain the separation between physics simulation and game state:
    *   **Hooks (Drivers):** Handle high-frequency physics integration, math, and event detection (collisions, captures). They keep low-level state (positions, velocities) in `useRef` to avoid React overhead.
    *   **Store (Referee):** Manages all state mutations, scoring logic, and game rules. It calculates the *consequences* of physical events (e.g., score depletion, game over triggers, skip multipliers).
    *   **Communication:** Hooks notify the store of significant events via actions. The store never performs physics integration; hooks never perform direct score calculations or complex game-rule branching.
    *   **Named Action Logic:** Extract complex state transition logic from the `useGameStore` definition into dedicated **named arrow functions** (handlers) located above the store creation. These functions should have clear JSDoc documentation. Simple one-line setters should remain inline.
*   **File Naming:** Use `kebab-case` (e.g., `my-file-name.ts`).
*   **Configuration:** Store parameters in `XYZ.config.ts` adjacent to the `XYZ.ts` (or `XYZ.tsx`) they configure. 
    *   **Centralized Difficulty:** All parameters that scale with the level or influence game difficulty MUST be gathered in `src/difficulty.config.ts`.
    *   **Config-Driven Formulas:** Every constant or coefficient used in physics formulas (e.g., G, drag, boosts) MUST be defined as a tunable parameter in an adjacent `*.config.ts` file.
*   **Components:** `Minimap` is decoupled from local state; do not pass `systemRef` or `spaceshipRef` as props. `Hud` may take these specifically for high-frequency debug displays.

### Procedural Music (Strudel.js)
*   **AudioContext Synchronization:** Strudel initializes its own `AudioContext` by default. When loading Strudel dynamically (async), the browser's "user gesture" window may expire, causing its context to start in a suspended state. ALWAYS share a pre-unlocked Web Audio API context from your main SFX engine when initializing Strudel (e.g., `initStrudel({ audioContext: sfx.getCtx() })`).
*   **Segmenting Continuous Signals:** Strudel's `irand(n)` generates a *continuous* random signal. If used within `note()` or `.n()` without segmenting, it will evaluate to a single, static value for the entire cycle. ALWAYS use `.segment(n)` (e.g., `irand(12).segment(8)`) to sample the randomness at fixed intervals, generating distinct notes per step.
*   **Sequence Switching:** Do not use array access or JS methods to pick patterns randomly per cycle (e.g., `[seq1, seq2].pick(...)` or `cat().random()`). Use Strudel's native `chooseCycles(seq1, seq2)` function for evaluating entire patterns dynamically.

### Maintenance
*   **Documentation (JSDoc):**
    *   Use normal English sentences, starting with a capitalized letter.
    *   The first line MUST be a short description without punctuation at the end.
    *   If more detail is needed, follow with normal prose text using proper punctuation.
    *   Conclude with `@param` documentation for all parameters.
    *   Use additional JSDoc tags like `@see` where appropriate to link related logic or documentation.
*   **Documentation (Inline):**
    *   Use inline comments extensively and comprehensively to make it easier to understand the code at a glance.
    *   Comments should be short and concise, starting with an uncapitalized letter and without punctuation at the end.
*   **Experimental Features:** Use the dynamic `#debug` URL anchor to enable diagnostics and performance-heavy or debug-only visuals (e.g., engine trails).

## 4. Visuals & Design (New Apps)
*   **Goal:** Build functional prototypes with rich aesthetics autonomously. Users judge applications by their visual impact; ensure they feel modern, "alive," and polished through consistent spacing, typography, and interactive feedback.
*   **Styling:** Mandatory separate CSS files for all components. DO NOT use inline `style` props or CSS-in-JS.
    *   Each component `MyComponent.tsx` should have a corresponding `my-component.css`.
    *   Use **Semantic Naming** for variables (purpose-driven, not value-driven).
    *   Use **RGBA values** consistently for all color definitions.
    *   **Single Source of Truth:** `src/app.css` controls everything. Use the `useThemeColors` hook in 3D components to sync WebGL colors with CSS variables.
*   **Web:** React (TypeScript).

## 5. Documentation Management
The following files define the system and MUST be kept updated:
*   **AGENTS.md**: (This file) Core mandates and standards.
*   **REQUIREMENTS.md**: Definitive functional/non-functional requirements.
*   **TERMS.md**: Standardized project vocabulary.
*   **DISCREPANCIES.md**: Log of technical debt or deviations.
*   **NEXT_STEPS.md**: Prioritized queue of enhancements.
