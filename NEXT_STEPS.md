# Next Steps for Slingularity

This document outlines potential improvements for Slingularity across visual, gameplay, and audio categories.

## 1. Visual & Atmospheric Polish
*   **Engine Thruster Particles:** Implement a high-performance particle system using instanced meshes. These particles should activate during free flight to provide dynamic visual feedback on the Spaceship's orientation and current speed.
*   **Procedural Planet Shaders:** Replace static colors with noise-based custom shaders. This allows for unique, animated surface textures such as swirling gas clouds for giants or detailed terrain for rocky planets.
*   **Performance Optimization:** Use entity properties (like `atmosphereRadius`) where possible instead of multiple function calls (like `getAtmosphereRadius`) in hot paths across different systems.

## 2. Gameplay Depth
*   **Gravity Anomalies:** Add localized "gravity wells" or asteroid belts that introduce turbulence. This requires players to be more proactive with their steering during long-distance transits.
*   **Efficiency Ranks:** Implement a medal system (Bronze, Silver, Gold) for each level. Ranks are determined by the remaining score, encouraging players to master aggressive skip routes and optimized trajectories.
*   **Atmospheric Entry Refinement:** Revisit the steep entry "dive and swing" mechanics. While the current artificial centripetal hook (gated to ascent) and V_entry radius coupling are stable, further playtesting may be needed to fine-tune the feel of high-speed U-turns and ensure the transition to a locked orbit remains perfectly fluid across all entry speeds.
*   **Visual Velocity Persistence:** Consider adding the planet's *visual* velocity (derived from its slowed-down `omega` rotation) to the Spaceship upon annihilation in a future update. This would provide more continuity without the extreme jumps caused by the high analytical orbital velocities.


