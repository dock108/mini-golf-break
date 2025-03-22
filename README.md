# Space Golf Break

A minimalist space-themed mini-golf experience built for quick relaxation breaks. Navigate your ball through a single, perfectly crafted hole floating in the cosmic void.

## Features
- **Space-Themed Environment**: Play mini-golf in a beautiful, atmospheric space setting with proper lighting and starfield background
- **Quick Gameplay Session**: Designed specifically for short, relaxing rounds lasting just 1-2 minutes—perfect for a mental break
- **Drag-and-Release Controls**: Simple, intuitive controls that mimic pulling back and releasing a pool cue, making gameplay accessible
- **Intuitive Physics**: Powered by Cannon-es physics engine with finely-tuned parameters for authentic ball movement
- **Visual Feedback**: Satisfying green glow and particle effects when the ball drops in the hole
- **Animated Scorecard**: Celebratory scorecard appears when you complete the hole, showing your score with a counter animation
- **Sound Effects**: Audio feedback for hitting the ball and completing the hole enhances the experience
- **Intelligent Camera**: Camera consistently positions behind the ball looking toward the hole for optimal aiming
- **Replayable Experience**: After completing the hole, easily replay with a single click for another quick round

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/space-golf-break.git

# Navigate to the project directory
cd space-golf-break

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Gameplay Instructions

- **Controls**: Click and drag backwards from the ball to set direction and power, then release to hit
- **Power Indicator**: A visual bar shows the strength of your shot based on how far you drag
- **Camera**: Use right-click drag to rotate the camera around the ball, scroll to zoom in/out
- **Objective**: Get the ball into the hole with as few strokes as possible
- **Scoring**: A beautiful animated scorecard appears when you complete the hole
- **Replaying**: After completing the hole, click anywhere to play again

## Development Status

This project is currently a focused single-hole experience, concentrating on perfecting the core gameplay mechanics in a space environment:

- Space-themed minimalist course with starfield background and atmospheric lighting
- Enhanced ball-hole interaction with realistic physics
- Satisfying visual and audio feedback when completing the hole
- Animated scorecard showing your score
- Smooth restart flow to encourage multiple plays
- Refined ball physics for satisfying movement

Check the [CHANGELOG.md](./CHANGELOG.md) for detailed development history and the [PROJECT_CHECKLIST.md](./PROJECT_CHECKLIST.md) for current progress and upcoming features.

## Technical Highlights

### Physics System
- Optimized ball physics with 0.45kg mass for ideal control
- Enhanced friction and damping for natural rolling behavior
- Progressive damping system for smooth deceleration
- High-precision solver with 30 iterations and 8 substeps
- Carefully tuned material properties for different surfaces

### Visual Feedback
- Particle effects and color change when the ball enters the hole
- Animated scorecard with counting animation for score display
- Subtle ball glow to maintain visibility in space environment
- Camera positioning for optimal view of both ball and hole

## Project Structure

```
space-golf-break/
├── src/                      # Source code for the game
│   ├── controls/             # Input handling
│   ├── objects/              # Game objects (ball, course)
│   ├── physics/              # Physics engine integration
│   ├── scenes/               # Game scene management
│   ├── game/                 # Game logic and scoring
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
- Additional visual elements in the space environment
- Expanded sound effects library
- Mobile touch controls optimization
- Multiple hole options with different layouts
- Local high scores tracking

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments
- Three.js community for excellent documentation and examples
- Cannon-es physics engine contributors
- All early testers who provided valuable feedback