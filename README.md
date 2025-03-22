# Mini Golf Break

A fun, casual offline mini-golf experience built for grown-up PS2-era kids looking to unwind without chaos or multiplayer madness.

## Features
- **Quick Gameplay Sessions**: Designed specifically for short, relaxing rounds lasting just 2-5 minutes—perfect for busy schedules or quick breaks.
- **Drag-and-Release Controls**: Simple, intuitive controls that mimic pulling back and releasing a pool cue, making gameplay accessible and enjoyable.
- **Offline First**: Fully playable offline, ensuring you can enjoy a relaxing round of mini-golf anywhere, anytime—no internet required.
- **Realistic Physics**: Powered by Cannon-es physics engine with finely-tuned parameters for authentic ball movement and natural rolling behavior.
- **Minimalist Design**: Clean, distraction-free visuals that focus on gameplay rather than flashy graphics.
- **Multiple Game Modes**: Practice freely in sandbox mode or challenge yourself on the structured course.
- **Input Protection**: Prevents accidental shots during transitions with visual "Ready" indicator when input is enabled.
- **Intelligent Camera System**: Camera consistently positions behind the ball looking toward the hole for optimal aiming, with smooth transitions during gameplay.
- **Visible Hole Design**: Enhanced hole visibility with distinct rim and depth for better targeting.
- **Comprehensive Scoring**: Tracks both per-hole scores and running total score throughout the course.
- **Game Menu**: Start screen with multiple game modes, instructions and pause functionality for a polished gaming experience.
- **Debug Mode**: Press 'd' during gameplay to toggle debug mode, showing physics bodies and additional information.
- **Dynamic Hole Loading**: Optimized to load only the current active hole, improving performance and allowing for more diverse hole designs.

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/mini-golf-break.git

# Navigate to the project directory
cd mini-golf-break

# Install dependencies
npm install

# Start the development server
npm start
```

## Gameplay Instructions

- **Starting**: Choose "Start Practice" for freestyle play or "Play Basic Course" to play the course.
- **Controls**: Click and drag backwards from the ball to set direction and power, then release to hit.
- **Power Indicator**: A visual bar shows the strength of your shot based on how far you drag.
- **Camera**: Use right-click drag to rotate the camera around the ball, scroll to zoom in/out.
- **Objective**: Get the ball into the hole with as few strokes as possible.
- **Hazards**: Avoid water (blue areas) which will reset your ball with a penalty stroke.
- **Scoring**: Your score shows both current hole strokes and total score - lower is better!
- **Ready Indicator**: A "Ready" message appears when you can take your shot.
- **Pausing**: Click the pause button or press ESC to return to the menu.
- **Course Completion**: Complete each hole to advance and see your final score.

## Development Status

This project is currently in active development. The current version features:

- Perfect-focused first hole with appropriate mini-golf scale and dimensions
- Enhanced hole visibility with dark rim and proper depth visualization
- Improved ball-hole interaction and success detection
- Reliable camera positioning system for optimal aiming
- Fully enclosed hole with wooden barriers to prevent ball loss
- Finely-tuned physics for realistic ball movement
- Intuitive drag-and-release controls with power indication
- Visual aim guides when preparing shots
- Intelligent camera positioning and following behavior
- Water hazard detection with penalty system
- Comprehensive score tracking system
- Improved UI layout and ready indicator
- Start menu with gameplay instructions

Check the [CHANGELOG.md](./CHANGELOG.md) for detailed development history and the [PROJECT_CHECKLIST.md](./PROJECT_CHECKLIST.md) for current progress and upcoming features.

## Technical Highlights

### Physics System
- Optimized ball physics with 0.45kg mass for ideal control
- Enhanced friction and damping for natural rolling behavior
- Progressive damping system for smooth deceleration
- High-precision solver with 30 iterations and 8 substeps
- Carefully tuned material properties for different surfaces

### Input Protection
- Prevents accidental shots during hole transitions
- Disables input during message displays and camera positioning
- Visual "Ready" indicator appears when the game is ready for input
- Ensures reliable gameplay experience across all devices

## Project Structure

```
mini-golf-break/
├── src/                      # Source code for the game
│   ├── controls/             # Input handling
│   ├── objects/              # Game objects (ball, course)
│   ├── physics/              # Physics engine integration
│   ├── scenes/               # Game scene management
│   └── utils/                # Utility functions
├── public/                   # Static assets and bundled output
├── docs/                     # Documentation
└── assets/                   # Game assets (textures, models)
```

## Built With
- [Three.js](https://threejs.org/) - 3D rendering
- [Cannon-es](https://github.com/pmndrs/cannon-es) - Physics simulation
- [Webpack](https://webpack.js.org/) - Module bundling

## Roadmap
- Enhanced visual feedback for successful shots
- Sound effects for ball interactions
- Additional course layouts and obstacles
- Mobile touch controls optimization
- Game completion flow and statistics

## Contributing

Contributions are welcome! Please check the [PROJECT_CHECKLIST.md](./PROJECT_CHECKLIST.md) for areas that need attention.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments
- Three.js community for excellent documentation and examples
- Cannon-es physics engine contributors
- All early testers who provided valuable feedback