# Developer Guide for Mini Golf Break

This guide provides an overview of the Mini Golf Break codebase for developers who want to understand, modify, or extend the project.

## Architecture Overview

Mini Golf Break follows a component-based architecture where different systems interact through well-defined interfaces. The main components are:

1. **Game**: Central controller that manages game state, scene rendering, and coordinates other components
2. **PhysicsWorld**: Encapsulates the Cannon-es physics engine and manages simulation
3. **BasicCourse**: Handles course generation with a single hole
4. **Ball**: Represents the player's ball with visual mesh, physics body, and success effects
5. **InputController**: Manages user interaction for hitting the ball
6. **CameraController**: Handles camera positioning and movement
7. **ScoringSystem**: Manages scoring and display

## Key Classes and Responsibilities

### Game Class (`src/scenes/Game.js`)

The Game class is the central coordinator that:
- Initializes the Three.js scene, camera, and renderer
- Sets up the environment with appropriate lighting and background
- Manages game state (ball in motion, hole completion)
- Updates all game objects during the animation loop
- Handles events like hole completion and out-of-bounds
- Tracks the ball's safe position for respawning
- Displays the animated scorecard when the hole is completed
- Manages restart functionality

Key methods:
- `init()`: Sets up the game environment
- `update()`: Called each frame to update physics and rendering
- `hitBall(direction, power)`: Applies force to the ball and triggers sound
- `handleHoleCompleted()`: Logic when the ball enters a hole
- `displayScorecard()`: Shows animated completion scorecard
- `resetAndRestartHole()`: Resets the game for another round
- `checkBallInHole()`: Detects when the ball goes in the hole
- `createBackground()`: Generates the visual background environment

### PhysicsWorld Class (`src/physics/PhysicsWorld.js`)

This class abstracts the Cannon-es physics engine:
- Creates and manages the physics world
- Handles material properties and contact behaviors
- Provides utility methods for creating physics bodies
- Manages the physics simulation step

### BasicCourse Class (`src/objects/BasicCourse.js`)

Responsible for generating the course:
- Creates a single, focused hole
- Defines fairway with contrasting border
- Implements the hole with proper physics
- Provides hole position information

Key methods:
- `createFairway()`: Generates the fairway with contrasting border
- `createHoleAt()`: Creates the hole with proper physics and visuals
- `getHolePosition()`: Returns the position of the hole
- `getHoleStartPosition()`: Returns the starting (tee) position
- `createHole1()`: Sets up the single hole design

### Ball Class (`src/objects/Ball.js`)

Represents the player's ball with:
- Visual representation using Three.js with subtle glow
- Physics body using Cannon-es
- Success effects (color change, particles, pulsing)
- Sound effects system

Key methods:
- `createMesh()`: Creates the visual ball with dimples
- `createBody()`: Creates the physics body
- `applyForce(direction, power)`: Applies force when hit
- `handleHoleSuccess()`: Triggers success effects when the ball is in hole
- `playSound(soundName, volume)`: Plays various sound effects
- `createSuccessParticles()`: Generates the particle effect when in hole
- `updateSuccessEffects()`: Animates particles and pulsing effect

### InputController Class (`src/controls/InputController.js`)

Handles user interaction:
- Processes mouse/touch events for aiming and hitting
- Calculates direction and power from drag distance
- Manages visual feedback (direction line, power indicator)
- Toggles orbit controls during drag operations

### CameraController Class (`src/controls/CameraController.js`)

Manages the camera system:
- Positions camera with a high-angle view at the start of each hole, framing the tee and cup
- Calculates a target slightly ahead of the ball (based on velocity or hole direction)
- Follows the calculated target smoothly during motion and aiming
- Handles smooth transitions between states
- Provides optimal viewing angles

### ScoringSystem Class (`src/game/ScoringSystem.js`)

Handles scoring and display:
- Tracks strokes for the single hole
- Updates score display
- Provides methods for resetting score

## Physics Implementation

The physics system uses Cannon-es with these key configurations:

1. **Collision Groups**:
   - Group 1: Course terrain
   - Group 2: Holes and triggers
   - Group 4: Ball

2. **Material Properties**:
   - `groundMaterial`: High friction (0.8) for realistic rolling
   - `ballMaterial`: For the player's ball
   - `bumperMaterial`: Low friction (0.1) with high restitution (0.8)
   - `holeRimMaterial`: Similar friction to ground, very low restitution (0.01) to dampen rim bounces.
   - Other materials like `sandMaterial`, `holeCupMaterial`

3. **Ball Physics**:
   - Mass: 0.45 kg (lighter for better control)
   - Linear Damping: 0.6 (air resistance and rolling friction)
   - Angular Damping: 0.6 (spin resistance)
   - Sleep Speed Limit: 0.15 (stops calculating physics below this speed)
   - Sleep Time Limit: 0.2 seconds (time before sleeping when slow)
   - Additional damping (0.9) applied during very slow movement
   - Radius: 0.2 units

4. **Hole Physics**:
   - Hole Radius: ~0.5 units (adjusted for realistic proportions relative to ball)
   - Hole Rim/Funnel: Uses `holeRimMaterial` for dampened interaction.
   - Hole Trigger: Detects ball entry.

5. **Physics World Settings**:
   - Gravity: -9.81 m/s² (Earth gravity)
   - Solver Iterations: 30 (for stability)
   - Solver Tolerance: 0.0001 (high precision)
   - Fixed Timestep: 1/60 second
   - Max Substeps: 8 (for smooth motion)

## Animated Scorecard Implementation

The animated scorecard is implemented in the `displayScorecard()` method:

1. **Creation**: A DOM-based overlay is created with styled elements
2. **Animation In**: CSS transitions animate the scorecard scaling and fading in
3. **Score Counter**: A counter progressively increments with sound effects
4. **Continue Prompt**: After the animation, a click-anywhere prompt appears
5. **Event Handling**: Document-wide click listener waits for user action
6. **Animation Out**: Scorecard fades out with scale animation
7. **Cleanup**: After animation out, the scorecard is removed and game restarted

## Sound System Implementation

The sound system uses the Web Audio API through Three.js Audio:

1. **Sound Types**:
   - Hit sound: Plays when the ball is struck
   - Success sound: Plays when the ball goes in the hole
   - UI sounds: For interactions and scorecard

2. **Implementation**:
   - Creates audio context through Three.js AudioListener
   - Generates sounds programmatically using oscillators
   - Controls volume levels for different sound types
   - Implements sound playback with appropriate attack/decay

3. **Usage**:
   - `ball.playSound('hit', power)`: Plays hit sound with volume based on power
   - `ball.playSound('success')`: Plays success sound when the ball goes in the hole
   - Scorecard uses hit sound with low volume for counter animation

## Debug Mode

Press 'd' during gameplay to toggle debug mode, which:
- Shows axes helpers and grid
- Displays additional console logs
- Shows a wireframe view of the scene

## Extending the Project

### Adding Visual Elements to Environment

To enhance the visual environment:
1. Create new background elements in the `createBackground()` method
2. Add additional lighting effects in the `setupLights()` method
3. Consider adding atmosphere effects with particle systems
4. Implement themed obstacles and decorative elements

### Implementing Multiple Themed Holes

To add different hole designs:
1. Create new methods like `createHole2()`, `createHole3()` in BasicCourse
2. Design unique themed layouts for each
3. Update the navigation system to cycle between holes
4. Consider different physics properties for each theme

### Enhancing Audio

To improve audio feedback:
1. Add more varied sound types in the Ball class's `loadSounds()` method
2. Create more sophisticated oscillator patterns
3. Consider loading actual audio files for richer sounds
4. Add ambient background sounds for atmosphere

### Adding High Score System

To implement high scores:
1. Create a new `HighScoreSystem` class
2. Use localStorage to persist scores between sessions
3. Add a high score display to the scorecard
4. Implement animations for new high scores

## Performance Considerations

When modifying the game, keep these performance aspects in mind:
- Minimize physics body complexity where possible
- Use instancing for repeated objects
- Dispose of Three.js geometries and materials when removing objects
- Avoid creating new objects in the update loop
- Optimize lighting and shadows for performance on lower-end devices

## Project Structure

```
mini-golf-break/
├── src/
│   ├── assets/          # Static assets (textures, models, sounds)
│   ├── config/          # Game configuration files (e.g., course layouts - if separated)
│   ├── events/          # Event types and EventManager
│   ├── managers/        # Core game system managers (UI, Physics, Audio, State, etc.)
│   ├── objects/         # Game objects (Ball, HoleEntity, BaseElement, HazardFactory, etc.)
│   │   └── hazards/     # Hazard creation logic (HazardFactory.js)
│   ├── physics/         # Physics world setup and utilities
│   ├── scenes/          # Main game scene (Game.js)
│   ├── styles/          # CSS styles
│   └── utils/           # Utility functions (math, helpers)
├── docs/                # Project documentation
├── node_modules/        # NPM dependencies
├── public/              # Static files served by dev server (index.html)
├── .babelrc             # Babel configuration
├── .eslintrc.json       # ESLint configuration
├── .gitignore           # Git ignore rules
├── package.json         # Project metadata and dependencies
├── package-lock.json    # Locked dependency versions
├── PROJECT_CHECKLIST.md # Development task checklist
├── README.md            # Project overview
└── webpack.config.js    # Webpack build configuration
```

## Key Components

*   **`src/scenes/Game.js`**: The main entry point and orchestrator for the game scene. Initializes managers, loads the course, and manages the game state.
*   **`src/managers/`**: Contains various manager classes responsible for specific game systems:
    *   `PhysicsManager`: Manages the Cannon-es physics world, materials, and simulation steps.
    *   `UIManager`: Handles HUD updates, messages, and other UI elements.
    *   `InputController`: Processes user input (mouse clicks/drags) for aiming and shooting.
    *   `CameraController`: Manages the Three.js camera position and behavior (following the ball, initial views).
    *   `AudioManager`: Loads and plays sound effects.
    *   `EventManager`: Facilitates communication between different game components using a publish/subscribe pattern.
    *   `GameLoopManager`: Runs the main game loop, updating physics and rendering the scene.
    *   `ScoringSystem`: Tracks strokes and calculates scores.
    *   `HoleStateManager`, `HoleCompletionManager`, `HoleTransitionManager`: Manage the state, completion logic, and transitions between holes.
    *   `HazardManager`: (Currently handles mostly out-of-bounds) Detects boundary violations.
    *   `VisualEffectsManager`: (Basic structure) Handles particle effects and other visual flair.
*   **`src/objects/`**: Contains classes representing game entities:
    *   `BaseElement.js`: A base class providing common functionality (ID, config, position, basic cleanup) for course elements.
    *   `HoleEntity.js`: Represents a single hole, including the green, walls, hole cup, trigger zones, and hazards. Extends `BaseElement`.
    *   `Ball.js`: Represents the golf ball, managing its visual mesh, physics body, and interactions (hole entry, bunker state, collisions).
    *   `BasicCourse.js`: Defines the layout and configuration for the default course, including hole definitions and hazard placements.
    *   `hazards/HazardFactory.js`: A factory module responsible for creating hazard visuals and physics triggers based on configuration.
*   **`src/physics/`**: Contains physics-related setup and utility functions.
*   **`src/events/EventTypes.js`**: Defines constants for different game events.

## Development Workflow

1.  **Branching:** Create a new feature branch from `main` or `develop` for your changes.
2.  **Coding:** Implement features or fixes, adhering to the project's coding style (ESLint configuration provided).
3.  **Testing:** Run the development server (`npm start`) and test thoroughly in the browser. Check the console for errors or warnings.
4.  **Committing:** Make small, logical commits with clear messages.
5.  **Pull Request:** Create a pull request for review when your feature/fix is complete.

## Key Concepts & How-Tos

### Adding a New Hole

1.  **Open:** `src/objects/BasicCourse.js`.
2.  **Locate:** The `holeConfigs` array (currently defined within the `static async create` method, consider moving to the constructor or a separate config file).
3.  **Add Object:** Add a new configuration object to the array, incrementing the `index`.
4.  **Define Properties:** Specify `holePosition`, `startPosition`, `courseWidth`, `courseLength`, `par`, `description`.
5.  **(Optional) Define Hazards:** Add a `hazards` array (see below).
6.  **(Optional) Define Boundaries:** For non-rectangular holes, add a `boundaryWalls` array (see below) and ensure `courseWidth`/`courseLength` are large enough to contain the shape.
7.  **Update Total:** Ensure `this.totalHoles` is updated correctly if modifying the array size dynamically.

### Defining Hazards

Hazards are defined within the `hazards` array in a hole's configuration object (`holeConfigs`). The creation logic is handled by `src/objects/hazards/HazardFactory.js`.

**Configuration:**

```javascript
hazards: [
  {
    type: 'sand', // Currently only 'sand' is fully implemented
    shape: 'circle', // 'circle', 'rectangle', or 'compound'
    depth: 0.25,     // Depth of the hazard depression
    position: new THREE.Vector3(x, y, z), // World position for simple shapes OR base position for compound
    size: { radius: R } // For shape: 'circle'
    // size: { width: W, length: L } // For shape: 'rectangle'
    // subShapes: [ ... ] // For shape: 'compound'
  },
  // Example Compound (Snowman)
  {
    type: 'sand',
    shape: 'compound',
    depth: 0.25,
    position: new THREE.Vector3(baseX, baseY, baseZ), // Base position for the whole compound shape
    subShapes: [
      // Positions here are RELATIVE to the main 'position' above
      { position: { x: relX1, z: relZ1 }, radius: R1 },
      { position: { x: relX2, z: relZ2 }, radius: R2 }
      // Only circle subShapes currently supported in factory
    ]
  }
]
```

**Adding New Hazard Types:**

1.  Add a `case` to the `switch` statement in `HazardFactory.createHazard`.
2.  Implement a `createYourHazardType(world, group, config, visualGreenY)` function.
3.  This function should create the necessary visual meshes (using `THREE`) and physics trigger bodies (`CANNON.Body` with `isTrigger: true`) based on the `config`.
4.  Remember to add the created meshes/bodies to the `group` and `world` respectively, and return them.

### Defining Custom Hole Shapes (e.g., L-Shape)

For non-rectangular holes, use the `boundaryWalls` configuration instead of relying on the default 4 outer walls.

1.  **Set Large Dimensions:** In the hole config, set `courseWidth` and `courseLength` large enough to encompass the desired shape.
2.  **Define `boundaryWalls` Array:** Add a `boundaryWalls` array to the hole config.
3.  **Specify Segments:** Each element in the array defines one wall segment:
    ```javascript
    boundaryWalls: [
      // Points are [x, z] relative to the hole's center position
      { start: [startX, startZ], end: [endX, endZ] },
      // ... more segments to define the perimeter ...
    ]
    ```
4.  **`HoleEntity.createWalls` Logic:** This method will automatically detect the `boundaryWalls` array and use it to generate the walls instead of the default outer rectangle.

### Modifying Physics

*   **Ball Physics:** Properties like mass, radius, damping, and restitution are primarily set in `src/objects/Ball.js` constructor and `createPhysicsBody` method.
*   **World Settings:** Gravity, solver iterations, and contact materials are configured in `src/physics/PhysicsWorld.js`.
*   **Hazard Effects:** Damping changes for bunkers are applied in `Ball.checkAndUpdateBunkerState`.
*   **Hole Entry:** Speed and overlap thresholds (`HOLE_ENTRY_MAX_SPEED`, `HOLE_ENTRY_OVERLAP_REQUIRED`) are defined as constants at the top of `src/objects/Ball.js`.

### Debugging

*   **Browser Console:** Check for errors, warnings, and custom log messages.
*   **Physics Debugger:** Press the 'd' key during gameplay to toggle the Cannon-es debug renderer, which visualizes physics shapes and contacts. 