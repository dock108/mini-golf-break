# Developer Guide for Mini Golf Break

This guide provides comprehensive information for developers who want to understand, modify, or extend the Mini Golf Break project.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Core Systems](#core-systems)
3. [Game Flow](#game-flow)
4. [Development Workflow](#development-workflow)
5. [Testing and Debugging](#testing-and-debugging)

## Architecture Overview

Mini Golf Break uses a modular, event-driven architecture with clear separation of concerns:

### Core Managers
- **HoleStateManager**: Tracks state and progress for each hole
  - Manages hole completion status
  - Tracks strokes and par values
  - Records start/end times
  - Maintains hazard information

- **HoleTransitionManager**: Handles transitions between holes
  - Manages ball fall animation
  - Coordinates hole visibility
  - Handles cleanup and setup
  - Controls camera transitions

- **HoleCompletionManager**: Manages hole completion
  - Detects successful putts
  - Triggers completion animations
  - Updates scoring
  - Shows completion UI

- **StateManager**: Central state coordination
  - Tracks game-wide state
  - Manages state transitions
  - Coordinates between systems
  - Handles game flow

### Event System
The game uses an event-driven architecture for communication between components:

```javascript
// Publishing events
this.game.eventManager.publish(
    EventTypes.HOLE_COMPLETED,
    {
        holeNumber: holeNumber,
        totalStrokes: totalStrokes
    },
    this
);

// Subscribing to events
this.game.eventManager.subscribe(
    EventTypes.HOLE_STARTED,
    this.handleHoleStarted,
    this
);
```

## Core Systems

### Physics System
- Uses Cannon-es physics engine
- Ball properties:
  - Mass: 0.45kg
  - Linear damping: 0.6
  - Angular damping: 0.6
- World configuration:
  - Gravity: -9.81 m/s²
  - Solver iterations: 30
  - Fixed timestep: 1/60 second

### Visual Systems
- Three.js for 3D rendering
- Key features:
  - Hole fade-out animations
  - Ball glow effects
  - Particle systems
  - Camera positioning
  - Atmospheric lighting

### Input System
- Drag-and-release mechanics
- Power calculation based on drag distance
- Direction line visualization
- Camera controls integration

## Game Flow

### Hole Progression
1. **Hole Start**
   - Initialize hole state
   - Position ball at tee
   - Set up camera
   - Show hole info

2. **During Play**
   - Track ball movement
   - Update stroke count
   - Check for hazards
   - Monitor hole completion

3. **Hole Completion**
   - Trigger completion animation
   - Update score
   - Prepare transition
   - Show scorecard

4. **Transition**
   - Animate ball fall
   - Clean up current hole
   - Set up next hole
   - Update UI

## Development Workflow

### Setting Up the Development Environment
1. Clone the repository
2. Install dependencies
3. Start the development server
4. Enable debug mode (press 'd')

### Making Changes
1. **Adding Features**
   - Create new manager if needed
   - Implement event handling
   - Add necessary UI elements
   - Update documentation

2. **Modifying Existing Features**
   - Locate relevant manager
   - Check event dependencies
   - Update state handling
   - Test thoroughly

### Best Practices
1. **Code Organization**
   - Keep managers focused
   - Use events for communication
   - Maintain clean interfaces
   - Document public methods

2. **State Management**
   - Use StateManager for game state
   - Handle transitions properly
   - Clean up resources
   - Validate state changes

## Testing and Debugging

### Debug Mode
Press 'd' during gameplay to enable:
- Axes helpers
- Grid visualization
- Physics body wireframes
- Console logging

### Common Issues
1. **Physics Problems**
   - Check collision groups
   - Verify material properties
   - Monitor ball velocity
   - Check sleep parameters

2. **Visual Glitches**
   - Verify camera positioning
   - Check material properties
   - Monitor render order
   - Validate animations

3. **State Issues**
   - Check event flow
   - Verify cleanup
   - Monitor transitions
   - Validate initialization

### Performance Optimization
- Use object pooling
- Optimize physics calculations
- Manage memory properly
- Clean up event listeners

## Additional Resources
- [Architecture Standards](../technical/architecture-standards.md)
- [Physics Specifications](../technical/physics-specs.md)
- [Event System Documentation](../technical/event-system.md)
- [Error Handling Guidelines](../technical/error-handling-guidelines.md) 