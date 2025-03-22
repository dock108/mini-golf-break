# Ball API Documentation

## Overview

The `Ball` class is a core component of the Mini Golf Break game, responsible for both the visual representation and physics behavior of the golf ball. It integrates with Three.js for rendering and Cannon.js for physics simulation.

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `radius` | Number | The radius of the ball (0.2m) |
| `mass` | Number | The mass of the ball (0.45kg) |
| `isMoving` | Boolean | Whether the ball is currently in motion |
| `position` | THREE.Vector3 | The current position of the ball |
| `body` | CANNON.Body | The physics body of the ball |
| `mesh` | THREE.Mesh | The visual mesh of the ball |

## Methods

### Constructor

```javascript
constructor(scene, physicsWorld, game)
```

Creates a new Ball instance.

**Parameters:**
- `scene` (THREE.Scene): The Three.js scene to add the ball mesh to
- `physicsWorld` (PhysicsWorld): The physics world to add the ball body to
- `game` (Game): Reference to the main game object for accessing managers

### Movement and Physics

#### `applyImpulse(direction, power)`

Applies an impulse to the ball in the specified direction with the given power. This is an alias for `applyForce()` for backward compatibility.

**Parameters:**
- `direction` (THREE.Vector3): Direction vector for the force
- `power` (Number): Power of the hit (0-1)

#### `applyForce(direction, power)`

Applies a force to the ball in the specified direction with the given power.

**Parameters:**
- `direction` (THREE.Vector3): Direction vector for the force
- `power` (Number): Power of the hit (0-1)

#### `setPosition(x, y, z)`

Sets the position of the ball to the specified coordinates.

**Parameters:**
- `x` (Number): X coordinate
- `y` (Number): Y coordinate
- `z` (Number): Z coordinate

#### `resetVelocity()`

Resets the velocity, angular velocity, forces, and torque on the ball to zero.

#### `isStopped()`

Checks if the ball has stopped moving based on velocity thresholds.

**Returns:**
- Boolean: True if the ball is stopped, false otherwise

### Visual Effects

#### `resetVisuals()`

Resets the ball's visual appearance to its default state.

#### `handleHoleSuccess()`

Triggers visual and audio effects when the ball successfully enters a hole.

### Status Checks

#### `isInHole()`

Checks if the ball is inside a hole.

**Returns:**
- Boolean: True if the ball is in the hole, false otherwise

### Resource Management

#### `cleanup()`

Cleans up resources used by the ball, including removing the mesh from the scene, removing the physics body, and disposing of geometries and materials.

## Events

The Ball class interacts with the event system through the following events:

- `BALL_CREATED`: Published when a new ball is created
- `BALL_HIT`: Published when the ball is hit
- `BALL_MOVED`: Published when the ball changes position
- `BALL_STOPPED`: Published when the ball comes to rest
- `BALL_RESET`: Published when the ball is reset after a hazard
- `BALL_IN_HOLE`: Published when the ball enters a hole

## Usage Example

```javascript
// Creating a ball
const ball = new Ball(scene, physicsWorld, game);

// Positioning the ball at the tee
ball.setPosition(0, 0.2, 8);

// Hitting the ball
const direction = new THREE.Vector3(0, 0, -1); // Aim toward the hole
const power = 0.7; // 70% power
ball.applyImpulse(direction, power);

// Checking if the ball has stopped
if (ball.isStopped()) {
    console.log("Ball has come to rest");
}

// Cleaning up resources when done
ball.cleanup();
```

## Notes

- The ball's physics properties are calibrated for realistic mini-golf behavior.
- The `applyImpulse()` and `applyForce()` methods are identical in functionality. The `applyImpulse()` method exists as an alias for backward compatibility.
- The ball automatically handles its own visual effects, including a small point light that follows it for better visibility. 