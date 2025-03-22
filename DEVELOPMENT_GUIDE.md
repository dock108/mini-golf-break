# Developer Guide for Space Golf Break

This guide provides an overview of the Space Golf Break codebase for developers who want to understand, modify, or extend the project.

## Architecture Overview

Space Golf Break follows a component-based architecture where different systems interact through well-defined interfaces. The main components are:

1. **Game**: Central controller that manages game state, scene rendering, and coordinates other components
2. **PhysicsWorld**: Encapsulates the Cannon-es physics engine and manages simulation
3. **BasicCourse**: Handles space-themed course generation with a single hole
4. **Ball**: Represents the player's ball with visual mesh, physics body, and success effects
5. **InputController**: Manages user interaction for hitting the ball
6. **CameraController**: Handles camera positioning and movement
7. **ScoringSystem**: Manages scoring and display

## Key Classes and Responsibilities

### Game Class (`src/scenes/Game.js`)

The Game class is the central coordinator that:
- Initializes the Three.js scene, camera, and renderer
- Sets up the space environment with starfield and specialized lighting
- Manages game state (ball in motion, hole completion)
- Updates all game objects during the animation loop
- Handles events like hole completion and out-of-bounds
- Tracks the ball's safe position for respawning
- Displays the animated scorecard when the hole is completed
- Manages restart functionality

Key methods:
- `init()`: Sets up the game environment and space theme
- `update()`: Called each frame to update physics and rendering
- `hitBall(direction, power)`: Applies force to the ball and triggers sound
- `handleHoleCompleted()`: Logic when the ball enters a hole
- `displayScorecard()`: Shows animated completion scorecard
- `resetAndRestartHole()`: Resets the game for another round
- `checkBallInHole()`: Detects when the ball goes in the hole
- `createStarfield()`: Generates thousands of stars for the space background

### PhysicsWorld Class (`src/physics/PhysicsWorld.js`)

This class abstracts the Cannon-es physics engine:
- Creates and manages the physics world
- Handles material properties and contact behaviors
- Provides utility methods for creating physics bodies
- Manages the physics simulation step

### BasicCourse Class (`src/objects/BasicCourse.js`)

Responsible for generating the space-themed course:
- Creates a single, focused hole in space
- Defines fairway with contrasting border
- Implements the hole with proper physics
- Provides hole position information

Key methods:
- `createFairway()`: Generates the glowing green fairway with border
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
- Positions camera behind the ball looking toward the hole
- Follows the ball during motion
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

3. **Ball Physics**:
   - Mass: 0.45 kg (lighter for better control)
   - Linear Damping: 0.6 (air resistance and rolling friction)
   - Angular Damping: 0.6 (spin resistance)
   - Sleep Speed Limit: 0.15 (stops calculating physics below this speed)
   - Sleep Time Limit: 0.2 seconds (time before sleeping when slow)
   - Additional damping (0.9) applied during very slow movement

4. **Physics World Settings**:
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

### Adding Visual Elements to Space Environment

To enhance the space theme:
1. Create new space-themed objects in the `createStarfield()` method
2. Add additional lighting effects in the `setupLights()` method
3. Consider adding nebula effects with particle systems
4. Implement space-themed obstacles like asteroids

### Implementing Multiple Themed Holes

To add different hole designs:
1. Create new methods like `createHole2()`, `createHole3()` in BasicCourse
2. Design unique space-themed layouts for each
3. Update the navigation system to cycle between holes
4. Consider different physics properties for each theme

### Enhancing Audio

To improve audio feedback:
1. Add more varied sound types in the Ball class's `loadSounds()` method
2. Create more sophisticated oscillator patterns
3. Consider loading actual audio files for richer sounds
4. Add ambient background sounds for the space environment

### Adding High Score System

To implement high scores:
1. Create a new `HighScoreSystem` class
2. Use localStorage to persist scores between sessions
3. Add a high score display to the scorecard
4. Implement animations for new high scores

## Performance Considerations

When modifying the game, keep these performance aspects in mind:
- Minimize physics body complexity where possible
- Use instancing for repeated objects (like stars)
- Dispose of Three.js geometries and materials when removing objects
- Avoid creating new objects in the update loop
- Optimize lighting and shadows for performance on lower-end devices 