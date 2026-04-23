# Slingularity

A 3D browser-based gravity slingshot simulator exploring orbital mechanics through a capture-and-release "slingshot" mechanic.

*   **Play Online:** [Slingularity on GitHub Pages](https://fklrtw.github.io/slingularity/)
*   **Test Coverage:** [Coverage Report](https://fklrtw.github.io/slingularity/coverage/)

## About the Game

Slingularity is an atmospheric space flight simulator that challenges players to navigate through increasingly complex solar systems using only the gravity of planets and the power of annihilation. 

As a pilot in a race against time, you must escape the clutches of a rapidly expanding star. Your journey begins at the edge of the innermost planet, and your objective is to reach the celestial portal orbiting far outside the system boundary. To get there, you must master the **Capture-and-Release** mechanic:
*   **Capture:** Approach a planet's atmosphere to be pulled into a stable orbit.
*   **Annihilate:** Trigger a high-energy pulse to annihilate the current planet, releasing your ship with a significant velocity boost to propel you toward your next target.
*   **Navigate:** Use global gravity and momentum to drift through the void, carefully timing your captures to avoid crashing into planetary cores or being consumed by the expanding sun.

Every mission is a high-stakes balance of energy management and precision flight. Will you play it safe, or will you skip planets to build massive score multipliers while the stellar deadline closes in?

## Features

*   **Gravity Slingshot Gameplay:** Experience fluid, physics-driven movement where every turn and boost is determined by your proximity to celestial bodies.
*   **Stellar Evolution & Urgency:** Outrun a sun that grows exponentially, shifting from a bright yellow star to a deep red giant before collapsing into a white dwarf, neutron star, or black hole upon your success.
*   **Dynamic Solar Systems:** Explore procedurally generated systems where planet counts follow the Fibonacci sequence, featuring wandering comets, planetary rings, and atmospheric drag.
*   **Immersive Procedural Audio:** A generative sci-fi soundtrack that reacts to your speed and planetary captures, creating a unique soundscape for every level.
*   **Custom Cel-Shaded Visuals:** A vibrant, cartoony aesthetic powered by custom shaders, featuring detailed 3D models and perspective-optimized lighting.
*   **High-Stakes Scoring:** Earn points for distance and captures, with exponential bonuses for skipping planets and performing aggressive maneuvers.

## Procedural Music

The game features an immersive, generative soundtrack powered by **Strudel.js** that reacts in real-time to your flight:

*   **Reactive Tempo:** The music's BPM scales dynamically with your spaceship's velocity—the faster you fly, the more intense the rhythm becomes.
*   **Dynamic Harmonics:** The musical scale shifts based on your performance. While the base exploration uses a mysterious C-minor scale, successful orbits and planet skips trigger harmonic shifts to Eb-major and G-major respectively.
*   **In-Game Event Cues:**
    *   **Orbiting:** Capturing a planet's gravity adds bright, celebratory layers to the soundscape.
    *   **Planet Skipping:** Passing by planets without capturing them triggers unique melodic runs that celebrate your aggressive trajectory.
    *   **Victory:** Reaching the portal resolves the soundtrack into a triumphant C-major chord progression.
*   **Generative Textures:** Using Perlin noise and algorithmic sequencing, the melody evolves over time, ensuring a unique audio experience for every mission.

## Getting Started

Follow these instructions to get the project up and running on your local machine for development and testing.

### Prerequisites

*   **Node.js** (v22.12.0 or higher; Node.js 22+ LTS recommended)
*   **npm** (comes with Node.js)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/fklrtw/slingularity.git
    cd slingularity
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```

## Usage

The following scripts are available in the project:

*   `npm run dev`: Starts the Vite development server.
*   `npm run build`: Compiles the project into highly optimized static assets in the `dist/` directory.
*   `npm test`: Executes the test suite using Vitest.
*   `npm run coverage`: Runs tests and generates a code coverage report.
*   `npm run preview`: Locally previews the production build.

## Contributing

Contributions are welcome! Whether it's fixing bugs, adding new features, or improving documentation, please feel free to:

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

Please ensure your code adheres to the project's styling and passes all tests.

## Credits & Attributions

This project includes assets, dependencies, and code from third-party sources. We appreciate the contributors for their hard work.

### Development & AI
*   **fklrtw** — Lead Developer
*   **[Google Antigravity](https://antigravity.google)** — Agentic AI Assistant (Google DeepMind)

### 3D Models
*   **"low poly space ship"**
    *   **Author:** [chrisonciuconcepts](https://sketchfab.com/chrisonciuconcepts)
    *   **Source:** [Sketchfab](https://sketchfab.com/3d-models/low-poly-space-ship-587941c9c11742c6b82dfb99e7b210b9)
    *   **License:** [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)

### Fonts
*   **"Tiny5"** (via `@fontsource/tiny5`)
    *   **Designer:** Stefan Schmidt
    *   **License:** [SIL Open Font License, Version 1.1 (OFL-1.1)](https://openfontlicense.org)

### Core Libraries
*   **React:** [MIT License](https://react.dev/license)
*   **Three.js:** [MIT License](https://github.com/mrdoob/three.js/blob/master/LICENSE)
*   **Vite:** [MIT License](https://github.com/vitejs/vite/blob/main/LICENSE)
*   **Strudel.js:** [MIT License](https://github.com/strudel/strudel/blob/main/LICENSE)
*   **Zustand:** [MIT License](https://github.com/pmndrs/zustand/blob/main/LICENSE)

---
*If you are the author of an asset used in this project and believe we have not credited you correctly, please reach out so we can resolve the issue immediately.*

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
