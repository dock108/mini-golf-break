# Mini Golf Break

A minimalist mini-golf experience built for quick relaxation breaks. Navigate your ball through perfectly crafted holes with intuitive controls and satisfying physics.

## Features
- **Clean Visual Design**: Play mini-golf in a beautiful, atmospheric setting with proper lighting and a minimalist environment
- **Vertical Course Design**: Holes are stacked vertically in space, with completed holes disappearing as you progress
- **Satisfying Transitions**: Watch your ball fall through space to the next hole after completion
- **Intelligent Camera**: Camera provides a clear high-angle starting view, looks slightly ahead of the ball, and follows smoothly.
- **Quick Gameplay Sessions**: Each hole is designed for 1-2 minutes of focused play—perfect for a mental break
- **Drag-and-Release Controls**: Simple, intuitive controls that mimic pulling back and releasing a pool cue
- **Realistic Physics**: Powered by Cannon-es physics engine. Features speed and angle-based hole entry logic for realistic interactions and lip-outs.
- **Physics Debug Visualization**: Optional wireframe view of physics bodies for debugging collisions (using CannonDebugRenderer), toggled with 'd' key.
- **Visual Feedback**: Holes fade out and disappear when completed, with satisfying animations
- **Animated Scorecard**: Celebratory scorecard appears after each hole
- **Sound Effects**: Audio feedback for hitting the ball and completing holes

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/mini-golf-break.git

# Navigate to the project directory
cd mini-golf-break

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Gameplay Instructions

1. **Controls**: 
   - Click and drag backwards from the ball to set direction and power
   - Release to hit the ball
   - Right-click drag to rotate camera
   - Scroll to zoom in/out

2. **Objective**: 
   - Complete each hole with as few strokes as possible
   - Watch the hole disappear when completed
   - Your ball will fall to the next hole below

3. **Scoring**:
   - Each stroke is counted
   - Par values are set for each hole
   - A scorecard appears after completing each hole

## Architecture Overview

The game uses a modular architecture with these key components:

### Core Managers
- **HoleStateManager**: Tracks state and progress for each hole
- **HoleTransitionManager**: Handles transitions between holes
- **HoleCompletionManager**: Manages hole completion and animations
- **StateManager**: Central game state coordination
- **EventManager**: Event-driven communication between components

### Physics System
- Optimized ball physics (0.45kg mass)
- Enhanced friction and damping
- Progressive damping system
- High-precision solver (30 iterations)
- Carefully tuned material properties

### Visual Systems
- Particle effects for success
- Hole fade-out animations
- Animated scorecard
- Subtle ball glow
- Atmospheric lighting

## Project Structure

```
mini-golf-break/
├── src/
│   ├── managers/        # Game system managers
│   ├── objects/         # Game objects (ball, course)
│   ├── physics/         # Physics engine integration
│   ├── scenes/          # Game scene management
│   ├── events/          # Event system
│   └── utils/          # Utility functions
├── docs/               # Documentation
│   ├── technical/      # Technical specifications
│   ├── design/         # Design documents
│   └── guides/         # User and developer guides
└── assets/            # Game assets
```

## Documentation

- [Development Guide](docs/guides/development-guide.md) - Detailed guide for developers
- [Architecture Standards](docs/technical/architecture-standards.md) - Coding standards and patterns
- [Physics Specifications](docs/technical/physics-specs.md) - Physics system details
- [Event System](docs/technical/event-system.md) - Event-driven architecture details

## Built With
- [Three.js](https://threejs.org/) - 3D rendering
- [Cannon-es](https://github.com/pmndrs/cannon-es) - Physics simulation
- [Webpack](https://webpack.js.org/) - Module bundling

## License

This project is licensed under the MIT License - see the LICENSE file for details.