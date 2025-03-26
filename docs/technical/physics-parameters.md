# Physics Parameters

This document outlines the key physics parameters used in the Mini Golf Break game.

## Ball Properties

| Parameter | Value | Description |
|-----------|-------|-------------|
| Mass | 0.45 kg | Mass of the golf ball |
| Radius | 0.2 m | Radius of the golf ball |
| Linear Damping | 0.6 | Air resistance/friction slowing linear movement |
| Angular Damping | 0.6 | Air resistance/friction slowing rotation |
| Sleep Speed Limit | 0.15 | Velocity threshold below which the ball can sleep |
| Sleep Time Limit | 0.2 | Time the ball needs to be below speed limit to sleep |

## Ball Force Application

| Parameter | Value | Description |
|-----------|-------|-------------|
| Force Multiplier | 15 | Multiplier applied to player's power input (0-1) when hitting the ball |

**Note:** Ball force can be applied using either `applyForce()` or `applyImpulse()` methods. The `applyImpulse()` method is an alias for backward compatibility.

## Material Interactions

### Ball-Ground Contact (Standard Green)

| Parameter | Value | Description |
|-----------|-------|-------------|
| Friction | 0.8 | Friction between ball and ground |
| Restitution | 0.5 | Bounciness of ball on ground |

### Ball-Bumper Contact (Obstacles)

| Parameter | Value | Description |
|-----------|-------|-------------|
| Friction | 0.3 | Reduced friction for bumpers |
| Restitution | 0.8 | Higher bounciness for obstacles |

### Ball-Sand Contact

| Parameter | Value | Description |
|-----------|-------|-------------|
| Friction | 1.5 | Higher friction in sand traps |
| Restitution | 0.2 | Reduced bounciness in sand |

### Ball-Ice Contact

| Parameter | Value | Description |
|-----------|-------|-------------|
| Friction | 0.1 | Very low friction on ice surfaces |
| Restitution | 0.7 | Higher bounciness on ice |

## World Settings

| Parameter | Value | Description |
|-----------|-------|-------------|
| Gravity | 9.8 m/s² | Standard Earth gravity |
| Default Timestep | 1/60 | Physics simulation timestep (60 Hz) |
| Max Sub-Steps | 3 | Maximum physics sub-steps per frame |
| Solver Iterations | 10 | Constraint solver iterations |

## Implementation Notes

1. Sleep parameters are now consistently defined across all components:
- Ball.js: sleepSpeedLimit = 0.15, sleepTimeLimit = 0.2
- PhysicsWorld.js: defaultSleepSpeedLimit = 0.15, defaultSleepTimeLimit = 0.2
- PhysicsWorld.createSphereBody(): sleepSpeedLimit = 0.15, sleepTimeLimit = 0.2

2. Damping values (linearDamping = 0.6, angularDamping = 0.6) are defined consistently between `Ball.js` and `PhysicsWorld.js`.

3. Ball mass was intentionally reduced from 0.5kg to 0.45kg in version 0.2.0 for improved handling.

4. When detecting if the ball has stopped, additional checks beyond the physics engine's sleep state are performed to ensure consistent gameplay.

5. World configuration parameters have been standardized:
- Solver iterations: 10 (as documented)
- Max physics sub-steps per frame: 3 (as documented) 