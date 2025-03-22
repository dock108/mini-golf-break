# File Structure Documentation for Mini Golf Break

This document describes the file structure for the **Mini Golf Break** project, following modern JavaScript game development practices with Three.js and Cannon-es.

## Project Root

```
mini-golf-break/
├── src/                      # Source code for the game
│   ├── index.js              # Main entry point initializing the app
│   ├── physics/              # Physics engine setup and logic
│   │   └── PhysicsWorld.js   # Cannon-es physics world encapsulation
│   ├── controls/             # Input handling and camera control logic
│   │   └── InputController.js # Manages user interactions and visual feedback
│   ├── scenes/               # Scene setup and management
│   │   └── Game.js           # Main game controller class
│   ├── objects/              # Game object classes
│   │   ├── Ball.js           # Golf ball with physics and visuals
│   │   ├── Course.js         # Base course class (used for practice mode)  
│   │   └── BasicCourse.js    # Structured 3-hole course implementation
│   └── utils/                # Utility functions and helpers
├── public/                   # Static files for serving
│   ├── index.html            # HTML entry point
│   ├── style.css             # Global styles
│   └── assets/               # Game assets (textures, models)
│       ├── textures/         # Textures and images
│       └── models/           # 3D models (if added later)
├── docs/                     # Detailed documentation
│   ├── file-structure.md     # This file
│   ├── game-design.md        # Game design principles
│   ├── physics-specs.md      # Physics configuration details
│   ├── camera-behavior-specs.md # Camera behavior documentation
│   ├── control-and-input-specs.md # Input system documentation
│   ├── graphics-and-style-guide.md # Visual styling guidelines
│   ├── mvp-scope.md          # Minimum viable product scope
│   ├── tech-stack-tools.md   # Technology choices
│   ├── deploy-strategy.md    # Deployment approach
│   └── future-roadmap.md     # Future development plans
├── package.json              # Project metadata and dependencies
├── README.md                 # Main project documentation
├── CHANGELOG.md              # Detailed version history
├── DEVELOPMENT_GUIDE.md      # Guide for developers
├── PROJECT_CHECKLIST.md      # Project progress tracking
├── LICENSE                   # MIT License
├── .gitignore                # Git ignore file
└── webpack.config.js         # Webpack configuration
```

## Key Files and Their Purpose

### Game Management

- **src/scenes/Game.js**: The central controller handling game state, physics updates, scene rendering, and coordinating all game elements. Manages game modes, scoring, camera behavior, and event handling.

### Course System

- **src/objects/Course.js**: The base course class used primarily for practice mode. Provides core functionality for terrain, holes, water hazards, and collision detection.
- **src/objects/BasicCourse.js**: Extends Course to create a structured 3-hole course with specific layouts and progression. Implements hole-specific geometry and start positions. Designed to load only one hole at a time, improving performance and allowing for more complex hole designs without spatial constraints.

### Physics Implementation

- **src/physics/PhysicsWorld.js**: Encapsulates the Cannon-es physics engine, managing materials, collision groups, and providing utilities for creating physics bodies. Handles the physics simulation step.

### User Interaction

- **src/controls/InputController.js**: Manages all user input for aiming and hitting the ball. Creates visual feedback including the aim line and power indicator. Handles mouse and touch events.

### Game Objects

- **src/objects/Ball.js**: Implements the golf ball with both visual mesh and physics body. Handles collision, movement, and provides methods for hitting and positioning.

### HTML/CSS

- **public/index.html**: Contains the game container, UI overlay elements, and menu system.
- **public/style.css**: Provides styling for UI elements, menu screens, and visual indicators.

## Recent Updates

The file structure now reflects the following recent improvements:

1. Enhanced course system with separation between base Course and BasicCourse implementations
2. Improved UI organization with better positioning of score display and controls
3. Added input protection system with ready indicators
4. Updated scoring system with per-hole and running total tracking
5. Implemented camera positioning specific to each hole
6. Optimized BasicCourse to load only the current hole, clearing previous hole objects and physics bodies during transitions

This structure is designed for modularity and maintainability as the project continues to evolve.
