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

Mini Golf Break uses a modular, event-driven architecture with clear separation of concerns, built around a central `Game` class that coordinates various managers.

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
*   **`CameraController` (`src/controls/CameraController.js`)**:
    *   **Core**: Manages the Three.js `PerspectiveCamera`.
    *   **Intelligent Positioning**: Positions the camera with a high overhead angle that shows the entire hole and ensures enough space behind the ball for pull-back aiming.
    *   **User Adjustments**: Detects when the player manually adjusts the camera and respects these adjustments until the ball moves.
    *   **Smart Following**: Smoothly follows the ball when in motion, with look-ahead based on velocity for better course visibility.
    *   **Transitions**: Handles smooth camera movements between holes (triggered by `HOLE_STARTED`).
    *   **Orbit Controls**: Integrates `OrbitControls` for free look when the player is not aiming/hitting.
    *   **Initialization**: Sets initial camera position with a high angle and good framing of the course.
    *   **Cleanup**: Disposes of controls and event listeners.
*   **`ScoringSystem` (`src/game/ScoringSystem.js`)**: Simple system to track strokes per hole and total strokes for the course.
*   **`HoleCompletionManager` (`src/managers/HoleCompletionManager.js`)**: Central handler for the `BALL_IN_HOLE` event. Triggers effects, sound, UI messages, updates score, sets state, and initiates hole transitions or game completion.

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
    -   Currently uses a `CANNON.Trimesh` generated directly from the visual `THREE.PlaneGeometry` for the floor due to issues with CSG-generated geometry. (**Update:** Collision now works with this simple Trimesh).
    -   Floor bodies **must** be set to `type: CANNON.Body.STATIC` to prevent them falling. (**Update:** Added in `HoleEntity.js`).
    -   Hole cutouts using CSG are temporarily disabled pending investigation into geometry/rotation issues.

2.  **Collision Groups**:
    -   Group 1: Course terrain (Floor/Green - Currently Trimesh)
    -   Group 2: Holes and triggers (Hole Cup Body)
    -   Group 4: Ball
    -   Group 8: Triggers (e.g., Bunker Zones)

3.  **Material Properties**:
    -   `groundMaterial`: High friction (0.8) for realistic rolling. Used for the green Trimesh.
    -   `ballMaterial`: For the player's ball.
    -   `bumperMaterial`: Low friction (0.1) with high restitution (0.8). Used for course walls.
    -   `holeRimMaterial`: Similar friction to ground, very low restitution (0.01) to dampen rim bounces. (Currently unused as hole edge is part of Trimesh).
    -   `holeCupMaterial`: Used for the physical hole cup body below the green.
    -   Other materials like `sandMaterial`.

4.  **Ball Physics**:
    -   Mass: 0.45 kg (lighter for better control)
    -   Linear Damping: 0.6 (air resistance and rolling friction)
    -   Angular Damping: 0.6 (spin resistance)
    -   Sleep Speed Limit: 0.15 (stops calculating physics below this speed)
    -   Sleep Time Limit: 0.2 seconds (time before sleeping when slow)
    -   Additional damping (0.9) applied during very slow movement
    -   Radius: 0.2 units

5.  **Hole Physics**:
    -   Physical `holeCupBody` (Cylinder) positioned slightly below the green surface (`visualGreenY`) using `holeCupMaterial`. (**Update:** Y-position corrected in `HoleEntity.js`).
    -   Hole detection in `Ball.js` checks horizontal distance and if `ball.body.position.y < 0`. (**Update:** Logic fixed and re-enabled).
    -   Visual hole uses `PlaneGeometry`.

6.  **Physics World Settings**:
    -   Gravity: -9.81 m/s² (Earth gravity)
    -   Solver Iterations: 30 (for stability)
    -   Solver Tolerance: 0.0001 (high precision)
    -   Fixed Timestep: 1/60 second
    -   Max Substeps: 8 (for smooth motion)

## Animated Scorecard Implementation

The scorecard implementation is currently a static overlay. Future updates will include an animated scorecard that shows the player's progress and highlights their best shots.
