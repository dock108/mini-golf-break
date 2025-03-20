# Developer Guide for Mini Golf Break

This guide provides an overview of the Mini Golf Break codebase for developers who want to understand, modify, or extend the project.

## Architecture Overview

Mini Golf Break follows a component-based architecture where different systems interact through well-defined interfaces. The main components are:

1. **Game**: Central controller that manages game state, scene rendering, and coordinates other components
2. **PhysicsWorld**: Encapsulates the Cannon-es physics engine and manages simulation
3. **Course**: Handles course generation, obstacles, and hole placement
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

Key methods:
- `init()`: Sets up the game environment
- `update()`: Called each frame to update physics and rendering
- `hitBall(direction, power)`: Applies force to the ball
- `handleHoleCompleted()`: Logic when the ball enters a hole
- `updateCameraFollow(isMoving)`: Controls camera behavior

### PhysicsWorld Class (`src/physics/PhysicsWorld.js`)

This class abstracts the Cannon-es physics engine:
- Creates and manages the physics world
- Handles material properties and contact behaviors
- Provides utility methods for creating physics bodies
- Manages the physics simulation step

### Course Class (`src/objects/Course.js`)

Responsible for generating the playable environment:
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

Key methods:
- `onMouseDown/onTouchStart`: Initiates the drag operation
- `onMouseMove/onTouchMove`: Updates direction and power
- `onMouseUp/onTouchEnd`: Triggers the ball hit
- `updateAimLine()`: Shows directional guide
- `updatePowerIndicator()`: Updates power UI

## Physics Implementation

The physics system uses Cannon-es with these key configurations:

1. **Collision Groups**:
   - Group 1: Course terrain
   - Group 2: Holes and triggers
   - Group 4: Ball

2. **Material Properties**:
   - `groundMaterial`: For the course (high friction)
   - `ballMaterial`: For the player's ball
   - Contact materials control friction and restitution

3. **Ball Physics**:
   - Mass: 0.5 kg
   - Damping: Linear (0.2) and Angular (0.3)
   - Sleep settings to detect when ball has stopped

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