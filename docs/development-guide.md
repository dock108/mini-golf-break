# Developer Guide for Mini Golf Break

This guide provides comprehensive information for developers who want to understand, modify, or extend the Mini Golf Break project.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Core Systems](#core-systems)
3. [Game Flow](#game-flow)
4. [Key Classes and Responsibilities](#key-classes-and-responsibilities)
5. [Development Workflow](#development-workflow)
6. [Testing and Debugging](#testing-and-debugging)

## Architecture Overview

Mini Golf Break follows a component-based architecture where different systems interact primarily through an `EventManager`. The main components are coordinated by the `Game` class.

1. **`Game`**: Central controller that manages game state, scene rendering, and coordinates other managers.
2. **`NineHoleCourse` / `BasicCourse`**: Handles course generation and layout.
3. **`HoleEntity`**: Represents a single hole with its geometry, physics, and hazards.
4. **`Ball`**: Represents the player's ball.
5. **`PhysicsManager` / `PhysicsWorld`**: Encapsulates the Cannon-es physics engine and manages simulation.
6. **`InputController`**: Manages user interaction for hitting the ball and **ad banner clicks**.
7. **`CameraController`**: Handles camera positioning, movement, **and subtle ad focus blending**.
8. **`ScoringSystem`**: Manages scoring and display.
9. **`AdShipManager` / `AdShip`**: Manages the lifecycle, movement, ad display, and interaction for ad ships.
10. Various other **Managers** (`UI`, `Audio`, `HoleState`, `HoleTransition`, `HoleCompletion`, `VisualEffects`, `Hazard`, `Debug`, `Performance`, `GameLoop`, `Event`) handle specific subsystems.

### Core Managers
- **`EventManager`**: Central hub for publishing and subscribing to game events.
- **`StateManager`**: Manages the overall game state (Initializing, Aiming, Hole Completed, Game Completed).
- **`PhysicsManager`**: Manages the Cannon-es physics world, materials, and simulation step.
- **`GameLoopManager`**: Orchestrates the main game update loop, calling manager updates in the correct order.
- **`PerformanceManager`**: Tracks FPS, frame times, and component update times.
- **`DebugManager`**: Handles debug overlays, logging, and error reporting.
- **`UIManager`**: Manages all DOM-based UI elements (score display, messages, final scorecard).
- **`AudioManager`**: Handles sound playback using Three.js Audio.
- **`VisualEffectsManager`**: Intended for managing visual effects (currently minimal usage).
- **`CameraController`**: Handles camera positioning, movement, and transitions.
- **`InputController`**: Manages user input (mouse/touch) for aiming and hitting the ball.
- **`BallManager`**: Manages the creation, state, physics updates, and removal of the golf ball.
- **`HazardManager`**: Detects when the ball enters hazards (out of bounds, water) and triggers resets.
- **`HoleStateManager`**: Tracks state related to the *current* hole (primarily for internal manager use).
- **`HoleCompletionManager`**: Handles logic when the ball enters the hole (effects, scoring, state updates, triggering transitions/completion).
- **`HoleTransitionManager`**: Manages the transition sequence between holes (currently Hole 1 to Hole 2), including cleanup and setup.

### Event System
The game relies heavily on events for communication between managers. See `docs/technical/event-system.md` for details on specific events.

```javascript
// Publishing an event
this.game.eventManager.publish(EventTypes.BALL_HIT, { power: shotPower }, this);

// Subscribing to an event
this.eventSubscriptions.push(
    this.game.eventManager.subscribe(EventTypes.BALL_STOPPED, this.handleBallStopped, this)
);
```

## Core Systems

### Physics System
- Uses Cannon-es via `PhysicsManager` and `PhysicsWorld`.
- Ball properties:
  - Mass: 0.45kg
  - Linear damping: 0.6
  - Angular damping: 0.6
- World configuration:
  - Gravity: -9.81 m/s²
  - Solver iterations: 10 (Adjusted)
  - Max substeps: 3 (Adjusted)
  - Fixed timestep: 1/60 second
- See `docs/technical/physics-parameters.md` for detailed material and contact properties.

#### Physics Gameplay Goals (from physics-specs.md)

*   **Ball Movement**: Aim for realistic rolling, proper friction/damping, and intuitive response to applied force. Ball should come to a complete stop reliably.
*   **Course Interactions**: Different surfaces (green, sand) should noticeably affect ball speed and behavior. Collisions with walls/obstacles should feel fair.
*   **Hole Mechanics**: Hole detection should be reliable based on proximity and low speed. Visual/audio feedback for success should be clear.

### Rendering and Visuals
- Three.js for 3D rendering managed by the `Game` class.
- **Course Geometry**: Uses Constructive Solid Geometry (CSG) via `three-csg-ts` in `HoleEntity.js` to create cutouts for the hole and sand traps in the green surface, avoiding Z-fighting.
- **Starfield**: Procedurally generated starfield background in `Game.js`.
- **Lighting**: Basic ambient and directional lighting in `Game.js`.
- **Effects**: Ball glow, success particles (`Ball.js`), hole fade-out (`HoleCompletionManager`).
- **Style Guide**: Aims for a clean, minimalist, high-contrast look. Emissive materials used for visibility (e.g., green fairway). Key colors: Green (fairway), White (ball), Dark (hole rim), Accent (UI elements). See `graphics-and-style-guide.md` for specific color codes if needed (Consider merging fully or deleting this file).

### Input System
- Managed by `InputController`.
- **Core Mechanic**: Drag-and-release mouse/touch input.
    - Click/touch and drag to aim (determines direction).
    - Drag distance determines power (linear scaling, clamped).
    - Release to shoot.
- **Visual Feedback**:
    - Aim direction line displayed during drag.
    - Power indicator (likely DOM element) shows shot strength during drag.
- **State Handling**: Input is disabled by `InputController` during ball movement, hole transitions, and potentially UI interactions based on events like `BALL_STOPPED`, `HOLE_STARTED`, `BALL_IN_HOLE`.
- Integrates with `CameraController` to disable orbit controls during aiming/dragging.

### Performance Monitoring System
- Managed by `PerformanceManager`.
- Tracks FPS, frame times, component update times, memory usage, and object counts.
- Press 'p' key during gameplay to toggle the visual performance display overlay.
- Display shows real-time metrics, often color-coded based on performance budgets (e.g., FPS target > 30).
- Provides warnings via `DebugManager` when budgets are exceeded.

## Game Flow

1.  **Initialization (`App.js` -> `Game.init`)**: Sets up renderer, managers, loads course (currently 2 holes via `BasicCourse`), creates ball, sets up UI and event listeners, starts game loop.
2.  **Aiming (`GameState.AIMING`)**: Player uses drag input via `InputController` to aim and set power.
3.  **Ball Hit**: `InputController` calculates force, calls `BallManager.hitBall`, which applies physics force and publishes `BALL_HIT`.
4.  **Ball Moving**: `BallManager` updates ball physics, publishes `BALL_MOVED`. `CameraController` follows ball. `HazardManager` checks for hazards.
5.  **Ball Stops**: `BallManager` detects low velocity, publishes `BALL_STOPPED`. `InputController` re-enables aiming.
6.  **Hazard**: `HazardManager` detects hazard, publishes `HAZARD_DETECTED`. `BallManager` resets ball to last safe position.
7.  **Ball in Hole**: Physics collision detected by `Ball.js`, publishes `BALL_IN_HOLE`. `HoleCompletionManager` handles this:
    *   Plays sound/effects, shows message.
    *   Sets state `holeCompleted` = true.
    *   Updates score via `ScoringSystem`.
    *   Publishes `HOLE_COMPLETED`.
    *   If not last hole, calls `HoleTransitionManager.transitionToNextHole` after a delay.
    *   If last hole, sets `GameState.GAME_COMPLETED` and publishes `GAME_COMPLETED`.
8.  **Hole Transition (`HoleTransitionManager`)**: Cleans up previous hole, initializes next hole via `BasicCourse.initializeHole`, positions ball, updates camera and UI, publishes `HOLE_STARTED`.
9.  **Game Complete (`GameState.GAME_COMPLETED`)**: `UIManager` listens for `GAME_COMPLETED`, fetches total strokes from `ScoringSystem`, and displays the final scorecard overlay.

## Key Classes and Responsibilities

*   **`Game` (`src/scenes/Game.js`)**: Main coordinator. Initializes systems, manages core Three.js objects (scene, renderer, lights), sets up starfield, handles window resize, and orchestrates cleanup. Most direct game logic has been moved to managers.
    - Manages restart functionality
    - Instantiates and cleans up major managers, including `AdShipManager`.
*   **`BasicCourse` (`src/objects/BasicCourse.js`)**: Defines the course structure (currently 2 hardcoded holes). Loads hole configurations, initializes `HoleEntity` objects for each hole, manages transitions between holes.
*   **`HoleEntity` (`src/objects/HoleEntity.js`)**: Represents a single hole. Creates the green surface (using CSG), walls, hole trigger, start marker, and hazards (sand traps using CSG) based on configuration. Manages associated meshes and physics bodies.
*   **`Ball` (`src/objects/Ball.js`)**: Represents the player's ball.
    *   **Core**: Creates the visual mesh (THREE.Mesh) and physics body (CANNON.Body).
    *   **Physics**: Handles physics updates, applying damping and sleep states. Provides methods `applyForce()`/`applyImpulse()` to hit the ball, `setPosition()`, `resetVelocity()`.
    *   **Collision**: Listens for physics collisions, specifically checking for the hole trigger body (`userData.type === 'hole'`).
    *   **Events**: Publishes `BALL_IN_HOLE` upon successful hole collision.
    *   **Effects**: Manages its own visual effects like glow and `handleHoleSuccess()` (triggers particles, sound via `AudioManager`).
    *   **Cleanup**: `cleanup()` method disposes of mesh, body, geometry, material.
*   **`UIManager` (`src/managers/UIManager.js`)**: Manages all DOM elements: score display, hole info, stroke count, messages, power indicator (styling likely inline), debug info (styling likely inline), and the final scorecard overlay.
*   **`InputController` (`src/controls/InputController.js`)**: Handles mouse/touch input for aiming/hitting, calculates shot vector, manages aim/power indicators, disables/enables input based on game state.
    - Handles ad banner clicks via raycasting when in `AD_INSPECTING` state.
    - Toggles `AD_INSPECTING` state via key press ('i').
*   **`CameraController` (`src/controls/CameraController.js`)**:
    *   **Core**: Manages the Three.js `PerspectiveCamera`.
    *   **Intelligent Positioning**: Positions the camera with a high overhead angle that shows the entire hole and ensures enough space behind the ball for pull-back aiming.
    *   **User Adjustments**: Detects when the player manually adjusts the camera and respects these adjustments until the ball moves.
    *   **Active Following**: Actively follows the ball's motion by positioning the camera behind the movement direction, not just changing the orbit center.
    *   **Dynamic Following**: When the ball is moving fast, the camera positions itself behind the movement direction; when slow or stopped, it maintains a consistent position relative to the ball.
    *   **Offset Viewport**: Camera is intentionally shifted down by approximately 15% to show more of the course at the top of the screen and less starfield at the bottom.
    *   **Transitions**: Improved transitions with the camera intelligently following behind the ball's movement direction with increased responsiveness.
    *   **Orbit Controls**: Integrates `OrbitControls` for free look when the player is not aiming/hitting.
    *   **Initialization**: Sets initial camera position with a high angle and good framing of the course.
    *   **Cleanup**: Disposes of controls and event listeners.
    - Respects user camera adjustments until the ball moves again
    - Subtly blends camera target towards nearest ad ship while the ball is in motion.
    - Resets ad focus blend state when positioning for a new hole.
*   **`ScoringSystem` (`src/game/ScoringSystem.js`)**: Simple system to track strokes per hole and total strokes for the course.
*   **`HoleCompletionManager` (`src/managers/HoleCompletionManager.js`)**: Central handler for the `BALL_IN_HOLE` event. Triggers effects, sound, UI messages, updates score, sets state, and initiates hole transitions or game completion.
*   **`AdShipManager` (`src/ads/AdShipManager.js`)**: Manages the ad ship system.
    - Spawns and despawns (or recycles) `AdShip` instances.
    - Manages a pool of active ad ships (e.g., `maxShips`).
    - Assigns movement patterns (orbiting for stations, linear for others) and parameters.
    - Handles simple collision avoidance (slowdown) between ships.
    - Rotates ads displayed on ships based on timers or recycling events.
    - Contains the main `THREE.Group` holding all ad ships.
*   **`AdShip` (`src/ads/AdShip.js`)**: Represents a single ad ship instance.
    - Creates procedural placeholder mesh based on type (nasa, alien, station).
    - Creates a `PlaneGeometry` banner mesh.
    - Generates dynamic banner textures using the Canvas API based on `adData.title`.
    - Updates its internal state (e.g., station rotation).
    - Provides an `updateAd` method to change the displayed ad and regenerate the texture.
    - Stores `adData` in banner mesh `userData` for click detection.
*   **`adConfig` (`src/ads/adConfig.js`)**: Exports a `mockAds` array containing ad objects (`{ title, url, texturePath }`).
    - `texturePath` is currently unused as banners are canvas-generated.

## Development Workflow

### Setting Up
1.  Clone repo: `git clone ...`
2.  Install dependencies: `npm install`
3.  Start dev server: `npm start`

### Making Changes
- Identify the responsible manager(s) for the feature.
- Modify manager logic and utilize the `EventManager` for cross-component communication.
- Add/modify UI elements via `UIManager`.
- Add/modify 3D objects via `HoleEntity`, `Ball`, or `Game`.
- Update relevant documentation.

### Debugging
- Press 'd' to toggle `DebugManager` overlay (physics wireframes, logs).
- Use browser developer console for extensive logs from managers.
- Check event flow using `EventManager` logs.
- **Ad Inspect Mode:** Press the 'i' key when the ball is stopped to toggle Ad Inspect mode. This enables camera controls and allows clicking on ad banners.

## Testing and Debugging

### Debug Mode
Press 'd' during gameplay to toggle debug mode, which:
- Shows axes helpers and grid
- Displays additional console logs
- Shows a wireframe view of the scene (TBD, might conflict with physics debugger)

## Physics Debug Renderer

The project includes `CannonDebugRenderer` (from `src/utils/CannonDebugRenderer.js`) to help visualize the Cannon.js physics bodies directly within the Three.js scene. This is invaluable for debugging collision issues.

- **Integration**: It's initialized in `Game.js` and updated in `GameLoopManager.js` before rendering.
- **Appearance**: It draws green wireframes around all active physics bodies.
- **Usage**: If collisions aren't working as expected (e.g., ball falling through floor), enable this view to see if the physics bodies are correctly positioned, oriented, and shaped.

## Common Issues & Checks
1.  **Physics**: Collision groups/masks, material properties, body positioning, sleep states, damping.
2.  **Visuals**: Camera position/target, object positions, Z-fighting (CSG helps), material transparency/opacity, lighting/shadows.
3.  **State/Flow**: Event publishing/subscriptions, manager initialization order (`Game.init`), state transitions (`StateManager`), race conditions during transitions.
4.  **CSG Issues**: Ensure correct geometry subtraction order, apply matrix transforms *before* CSG conversion, recalculate normals (`computeVertexNormals`) on the final mesh.

## Additional Resources
- [Architecture Standards](../technical/architecture-standards.md)
- [Physics Parameters](../technical/physics-parameters.md)
- [Event System Documentation](../technical/event-system.md)
- [Error Handling Guidelines](../technical/error-handling-guidelines.md)
- [CHANGELOG.md](../../CHANGELOG.md)

## Physics Implementation

The physics system uses Cannon-es with these key configurations:

1.  **Course Geometry**:
    -   Uses a `CANNON.Trimesh` generated directly from the visual `THREE.PlaneGeometry` for the floor.
    -   Floor bodies are correctly set to `type: CANNON.Body.STATIC`.
    -   Hole cutouts using CSG are currently disabled; hole interaction is handled separately.

2.  **Hole Interaction**:
    -   Hole detection logic resides entirely within `Ball.update()`.
    -   It checks if the ball's center is within a defined `holePhysicalRadius` of the hole's center position (`ball.currentHolePosition`).
    -   If close enough, it checks the ball's speed against `ball.holeEntryThresholds.MAX_SAFE_SPEED`.
    -   If faster than safe speed, it calculates the impact angle using `calculateImpactAngle` and checks for lip-out conditions using `isLipOut` (based on speed/angle thresholds).
    -   A static cylinder trigger body (`holeTriggerBody`) exists at the hole location but is currently unused for detection logic (could be removed or used for visual debugging).
    -   The physical `holeCupBody` has been removed.

3.  **Collision Groups**:
    -   Group 1: Course terrain (Floor/Green - Trimesh)
    -   Group 2: Holes and triggers (Unused holeTrigger body)
    -   Group 4: Ball
    -   Group 8: Triggers (e.g., Bunker Zones)

4.  **Material Properties**:
    -   `groundMaterial`: High friction (0.8) for realistic rolling. Used for the green Trimesh.
    -   `ballMaterial`: For the player's ball.
    -   `bumperMaterial`: Low friction (0.1) with high restitution (0.8). Used for course walls.
    -   `holeRimMaterial`: Currently unused.
    -   `holeCupMaterial`: Removed.

5.  **Ball Physics**:
    -   Mass: 0.45 kg
    -   Linear/Angular Damping: 0.6
    -   Sleep parameters configured.
    -   Hole entry thresholds defined in constructor (`MAX_SAFE_SPEED`, `LIP_OUT_SPEED_THRESHOLD`, `LIP_OUT_ANGLE_THRESHOLD`).

6.  **Physics World Settings**:
    -   Gravity: -9.81 m/s²
    -   Solver Iterations: 30
    -   Fixed Timestep: 1/60s

## Debug Mode

Press 'd' during gameplay to toggle debug mode, which shows:
- Axes helpers and grid helpers (via `DebugManager`).
- Physics wireframes (via `CannonDebugRenderer`, controlled by `DebugManager` state).

## Physics Debug Renderer

The project includes `CannonDebugRenderer` (`src/utils/CannonDebugRenderer.js`) to visualize Cannon.js physics bodies.

- **Integration**: Initialized in `Game.js`. Its `update()` is called conditionally in `GameLoopManager.js` based on `DebugManager.enabled`. Its meshes are cleared by `DebugManager.toggleDebugMode()` when disabling debug mode. Its `world` reference is updated by `HoleTransitionManager` after physics world reset.
- **Appearance**: Draws green wireframes around active physics bodies.
- **Usage**: Essential for debugging collision issues, body placement, and orientation.

## Animated Scorecard Implementation

The scorecard implementation is currently a static overlay. Future updates will include an animated scorecard that shows the player's progress and highlights their best shots.

## Project Structure

```
mini-golf-break/
├── src/
│   ├── assets/          # Static assets (textures, models, sounds)
│   │   └── textures/
│   │       └── ads/     # Placeholder for ad banner images (if used)
│   ├── ads/             # Ad Ship System files
│   │   ├── AdShip.js
│   │   ├── AdShipManager.js
│   │   └── adConfig.js
│   ├── config/          # Game configuration files (e.g., course layouts - if separated)
│   ├── controls/        # InputController, CameraController
│   ├── events/          # Event types and EventManager
│   ├── game/            # Game-specific logic (e.g., ScoringSystem)
│   ├── managers/        # Core game system managers (UI, Physics, Audio, State, etc.)
│   ├── objects/         # Game objects (Ball, HoleEntity, BaseElement, Course, hazards/, etc.)
│   │   └── hazards/
│   ├── physics/         # Physics world setup and utilities
│   ├── scenes/          # Main game scene (Game.js)
│   ├── states/          # Game state definitions (GameState.js)
│   ├── styles/          # CSS styles
│   └── utils/           # Utility functions (math, helpers, debug renderers)
├── docs/                # Project documentation
├── node_modules/        # NPM dependencies
├── public/              # Static files served by dev server (index.html)
├── .babelrc             # Babel configuration
├── .eslintrc.json       # ESLint configuration
├── .gitignore           # Git ignore rules
├── package.json         # Project metadata and dependencies
├── package-lock.json    # Locked dependency versions
├── PROJECT_CHECKLIST.md # Development task checklist (if used)
├── README.md            # Project overview
└── webpack.config.js    # Webpack build configuration
```

## Key Components

*   **`src/scenes/Game.js`**: Main entry point...
*   **`src/managers/`**: Various manager classes...
    *   ... (existing managers) ...
    *   `AdShipManager`: Manages the ad ship system.
*   **`src/objects/`**: Game entities...
    *   ... (existing objects) ...
*   **`src/ads/`**: Classes related to the Ad Ship system:
    *   `AdShip.js`: Represents a single ad ship instance.
    *   `AdShipManager.js`: Manages lifecycle, movement, ads.
    *   `adConfig.js`: Mock ad data.
*   **`src/physics/`**: Physics setup...
*   **`src/events/EventTypes.js`**: Event constants...
*   **`src/states/GameState.js`**: Defines game states, including `AD_INSPECTING`.

### InputController Class (`src/controls/InputController.js`)

Handles user interaction:
*   Processes mouse/touch events for aiming and hitting the ball.
*   Calculates direction and power from drag distance.
*   Manages visual feedback (direction line, power indicator).
*   Disables/enables aiming input based on game state.
*   Toggles camera orbit controls during aiming vs. free look/ad inspect.
*   **Handles ad banner clicks via raycasting when in `AD_INSPECTING` state.**
*   **Toggles `AD_INSPECTING` state via key press ('i').**

### CameraController Class (`src/controls/CameraController.js`)

Manages the camera system:
*   **Core**: Manages the Three.js `PerspectiveCamera` and `OrbitControls`.
*   **Ball Following**: Updates camera position and target smoothly based on ball movement (direction, speed) or a stable view when stopped.
*   **Hole Positioning**: Sets appropriate high-angle views when a new hole starts.
*   **User Interaction**: Respects manual camera adjustments until the ball is hit.
*   **Ad Focus Blending**: Subtly shifts the camera's look-at target towards the nearest visible ad ship while the ball is rolling, blending back when stopped.
*   **Cleanup**: Disposes of controls and event listeners.

### ScoringSystem Class (`src/game/ScoringSystem.js`)
// ... existing description ...

### HoleCompletionManager (`src/managers/HoleCompletionManager.js`)
// ... existing description ...

### AdShipManager Class (`src/ads/AdShipManager.js`)

Manages the ad ship system:
*   Spawns and manages a pool of `AdShip` instances (`maxShips`).
*   Assigns movement patterns (orbiting for stations, linear for others) and parameters.
*   Handles simple distance-based collision avoidance (slowdown) between ships.
*   Recycles linear ships when they go out of bounds.
*   Rotates ads displayed on ships based on timers.
*   Contains the main `THREE.Group` holding all ad ships, added to the main scene.

### AdShip Class (`src/ads/AdShip.js`)

Represents a single ad ship:
*   Creates procedural placeholder mesh based on type (nasa, alien, station).
*   Creates a `PlaneGeometry` banner mesh.
*   Generates dynamic banner textures using the Canvas API based on `adData.title`.
*   Updates its internal state (e.g., station rotation).
*   Provides an `updateAd` method to change the displayed ad and regenerate the texture.
*   Stores `adData` in banner mesh `userData` for click detection.

### AdConfig File (`src/ads/adConfig.js`)

*   Exports a `mockAds` array containing ad objects (`{ title, url, ... }`).
*   (Currently uses dummy URLs).

// ... rest of Key Classes ...
