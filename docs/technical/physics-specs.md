# Mini Golf Break - Physics Specifications

## Core Physics Parameters

### Ball Properties
- Mass: 0.45 kg
- Radius: 0.02134 m (standard golf ball)
- Friction: 0.3 (rolling friction)
- Restitution: 0.7 (bounciness)
- Linear Damping: 0.6 (air resistance)
- Angular Damping: 0.6 (spin resistance)

### Force Application
- Force Multiplier: 15
- Maximum Force: 30 N
- Minimum Force: 1 N
- Force Application Point: Center of ball
- Force Direction: Based on drag direction

### Course Materials
- Fairway: 
  - Friction: 0.3
  - Restitution: 0.1
  - Rolling Resistance: 0.1
- Rough:
  - Friction: 0.5
  - Restitution: 0.05
  - Rolling Resistance: 0.2
- Sand:
  - Friction: 0.7
  - Restitution: 0.02
  - Rolling Resistance: 0.3
- Water:
  - Buoyancy: 0.5
  - Drag: 0.8
  - Restitution: 0.01

## Physics Behaviors

### Ball Movement
1. **Initial State**
   - Ball positioned at hole's tee
   - Zero velocity and angular velocity
   - Proper orientation for putting

2. **Shot Execution**
   - Force applied based on drag distance
   - Direction determined by drag angle
   - Initial spin based on shot power
   - Proper collision detection with course

3. **Motion**
   - Realistic rolling physics
   - Proper friction and damping
   - Spin effects on trajectory
   - Collision response with obstacles

4. **Stopping Conditions**
   - Velocity threshold: 0.01 m/s
   - Angular velocity threshold: 0.01 rad/s
   - Time-based stop after 5 seconds
   - Collision with hole trigger

### Course Interactions

1. **Fairway**
   - Smooth rolling
   - Minimal bounce
   - Consistent friction
   - Clear boundaries

2. **Rough**
   - Increased friction
   - Reduced speed
   - More unpredictable movement
   - Visual distinction

3. **Sand**
   - High friction
   - Significant speed reduction
   - Ball sinking effect
   - Clear visual feedback

4. **Water**
   - Buoyancy effect
   - High drag
   - Splash effects
   - Reset trigger

### Hole Mechanics

1. **Hole Detection**
   - Collision with hole rim
   - Velocity threshold check
   - Position verification
   - Success trigger

2. **Success State**
   - Ball color change
   - Particle effects
   - Sound effects
   - Score update

3. **Transition**
   - Ball reset to next hole
   - Physics cleanup
   - Camera reposition
   - UI update

## Technical Implementation

### Physics Engine (Cannon-es)
- World gravity: (0, -9.81, 0)
- Fixed time step: 1/60
- Sub-steps: 3
- Solver iterations: 10

### Collision Detection
- Ball radius: 0.02134 m
- Collision margin: 0.001 m
- Collision response: 0.3
- Friction: 0.3

### Performance Optimization
- Object pooling for particles
- Efficient collision detection
- Optimized physics calculations
- Proper cleanup between holes

## Testing Requirements

### Physics Validation
1. **Ball Movement**
   - Consistent rolling behavior
   - Proper friction application
   - Accurate force response
   - Realistic spin effects

2. **Course Interaction**
   - Correct material properties
   - Proper collision response
   - Appropriate friction values
   - Clear visual feedback

3. **Hole Mechanics**
   - Reliable hole detection
   - Proper success triggers
   - Smooth transitions
   - Score accuracy

### Performance Metrics
- 60 FPS minimum
- Physics update time < 16ms
- Memory usage < 500MB
- Smooth transitions
- No physics glitches
