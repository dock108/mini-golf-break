# Developer Guide for Mini Golf Break

This guide provides an overview of the Mini Golf Break codebase for developers who want to understand, modify, or extend the project.

## Architecture Overview

Mini Golf Break follows a component-based architecture where different systems interact through well-defined interfaces. The main components are:

1. **Game**: Central controller that manages game state, scene rendering, and coordinates other components
2. **PhysicsWorld**: Encapsulates the Cannon-es physics engine and manages simulation
3. **Course/BasicCourse**: Handles course generation, obstacles, and hole placement
4. **Ball**: Represents the player's ball with both visual mesh and physics body
5. **InputController**: Manages user interaction for hitting the ball

## Key Classes and Responsibilities

### Game Class (`src/scenes/Game.js`)

The Game class is the central coordinator that:
- Initializes the Three.js scene, camera, and renderer
- Sets up lighting and controls
- Manages game state (ball in motion, score, etc.)
- Updates all game objects during the animation loop
- Handles events like hole completion and water hazards
- Tracks the ball's safe positions for respawning
- Manages intelligent camera positioning for each hole
- Coordinates input protection during transitions

Key methods:
- `init()`: Sets up the game environment
- `update()`: Called each frame to update physics and rendering
- `hitBall(direction, power)`: Applies force to the ball and increments score
- `handleHoleCompleted()`: Logic when the ball enters a hole
- `updateCameraFollow(isMoving)`: Controls camera behavior during ball motion
- `positionCameraForHole(holeNumber)`: Sets optimal camera position for each hole
- `showMessage(text, duration)`: Displays messages and manages input state

### PhysicsWorld Class (`src/physics/PhysicsWorld.js`)

This class abstracts the Cannon-es physics engine:
- Creates and manages the physics world
- Handles material properties and contact behaviors
- Provides utility methods for creating physics bodies
- Manages the physics simulation step

### Course Class (`src/objects/Course.js`)

Responsible for generating the practice environment:
- Creates the terrain mesh and corresponding physics body
- Places holes, water hazards, and obstacles
- Provides collision detection for holes and hazards
- Manages course visuals and updates

Key methods:
- `createTerrain()`: Generates the main playing surface
- `createHoles()`: Places holes with proper collision detection
- `createWaterHazards()`: Creates water areas
- `isInHole(position, ball)`: Detects if the ball is in a hole
- `isInWater(position)`: Detects if the ball is in water

### BasicCourse Class (`src/objects/BasicCourse.js`)

Extends the Course class to create a structured multi-hole experience:
- Creates a 3-hole course with specific layouts and challenges 
- Defines specific hole positions and starting points
- Implements walls and boundaries to contain the ball
- Provides methods for hole navigation

Key methods:
- `createHole1()`, `createHole2()`, `createHole3()`: Create specific hole layouts
- `getHoleStartPosition(holeNumber)`: Returns starting position for each hole

### Ball Class (`src/objects/Ball.js`)

Represents the player's ball with:
- Visual representation using Three.js
- Physics body using Cannon-es
- Collision handling and physics properties

Key methods:
- `createMesh()`: Creates the visual ball
- `createBody()`: Creates the physics body
- `applyForce(direction, power)`: Applies force when hit
- `isStopped()`: Determines if the ball has stopped moving
- `update()`: Updates visual position based on physics

### InputController Class (`src/controls/InputController.js`)

Handles user interaction:
- Processes mouse/touch events for aiming and hitting
- Calculates direction and power from drag distance
- Manages visual feedback (direction line, power indicator)
- Toggles orbit controls during drag operations
- Provides input protection through enable/disable methods
- Shows ready indicator when input is enabled

Key methods:
- `onMouseDown/onTouchStart`: Initiates the drag operation
- `onMouseMove/onTouchMove`: Updates direction and power
- `onMouseUp/onTouchEnd`: Triggers the ball hit
- `updateAimLine()`: Shows directional guide
- `updatePowerIndicator()`: Updates power UI
- `enableInput()`, `disableInput()`: Controls input state

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
   - `sandMaterial`: Very high friction (2.0) with minimal bounce
   - Contact materials control friction and restitution

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

## Game Modes

### Practice Mode
- Default sandbox mode with a generic course layout
- Ball can be hit freely with no progression
- Score is tracked but not saved between sessions

### Course Mode
- Structured 3-hole course with specific challenges
- Tracks score per hole and total score
- Provides progression between holes
- Shows completion screen with final score

## Input Protection System

To prevent accidental shots, the game implements input protection:

1. **Automatic Disabling**:
   - During hole transitions
   - While messages are displayed
   - When the ball is being reset
   - During camera positioning
   
2. **Ready Indication**:
   - Visual "Ready" indicator appears when input is enabled
   - Provides clear feedback to the player
   - Automatically fades out after 2 seconds

3. **Cooldown Period**:
   - 300ms delay after messages disappear
   - Ensures camera has completed positioning

## Extending the Project

### Adding New Course Elements

To add new obstacles or course features:
1. Create mesh generation in the Course class
2. Add corresponding physics bodies
3. Set up proper collision detection
4. Update course creation logic

### Implementing New Game Mechanics

To add new gameplay features:
1. Extend the Game class with new state variables
2. Add handler methods for new mechanics
3. Modify the update loop to check for new conditions
4. Update UI to reflect new features

### Visual Enhancements

To improve visuals:
1. Modify material properties in object creation methods
2. Add post-processing effects to the renderer
3. Enhance lighting in the Game class
4. Add particle effects for events like successful putts

### Adding New Holes

To add new holes to the BasicCourse:
1. Create a new `createHoleX()` method in BasicCourse
2. Update the `constructor` to call this method
3. Add hole position to `getHoleStartPosition()`
4. Update the hole count in Game.js (currentHole check)
5. Add a new position to the holeScores array

## Debug Mode

Press 'd' during gameplay to toggle debug mode, which:
- Shows axes helpers and grid
- Displays additional console logs
- Can be extended with visualization for physics bodies

## Performance Considerations

When modifying the game, keep these performance aspects in mind:
- Minimize physics body complexity where possible
- Use instancing for repeated objects
- Dispose of Three.js geometries and materials when removing objects
- Avoid creating new objects in the update loop

## Common Issues and Solutions

1. **Z-fighting in visuals**: Ensure slight offsets between overlapping objects
2. **Physics tunneling**: Adjust substeps or body sizes
3. **Camera clipping**: Check near/far plane settings
4. **Input inconsistency**: Verify event propagation and coordinate transforms 