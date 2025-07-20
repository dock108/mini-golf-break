# Mini Golf Break - Development Guide

**Last Updated:** July 20, 2025

This guide provides comprehensive documentation for developers working on Mini Golf Break, a premium space-themed mini-golf game featuring professional-grade graphics, enterprise-level architecture, and comprehensive testing infrastructure.

## 🏗️ Architecture Overview

Mini Golf Break follows a modular, event-driven architecture with specialized manager classes handling different aspects of the game. The system is designed for maintainability, testability, and performance.

### Core Architecture Principles

1. **Manager Pattern**: Specialized managers handle specific domains (rendering, physics, audio, etc.)
2. **Event-Driven Communication**: Components communicate through a central EventManager
3. **Data-Driven Design**: Courses and configurations are loaded from JSON files
4. **Quality Scaling**: Visual effects and performance features scale based on device capabilities
5. **Comprehensive Testing**: 80%+ test coverage with robust mocking infrastructure

## 📁 Project Structure

```
mini-golf-break/
├── src/
│   ├── ads/              # Ad system (AdShipManager, AdShip, adConfig)
│   ├── config/           # Configuration files
│   ├── controls/         # Input and camera controllers
│   ├── courses/          # Course JSON definitions
│   ├── effects/          # Visual effects (particles, shaders)
│   ├── events/           # Event system (EventManager, EventTypes)
│   ├── game/            # Core game logic (ScoringSystem, etc.)
│   ├── managers/        # Core system managers
│   │   ├── DebugManager.js
│   │   ├── EnvironmentManager.js
│   │   ├── LightingManager.js
│   │   ├── MaterialManager.js
│   │   ├── PerformanceManager.js
│   │   ├── PostProcessingManager.js
│   │   ├── StarfieldManager.js
│   │   └── ui/          # UI-specific managers
│   ├── objects/         # Game objects
│   │   ├── Ball.js
│   │   ├── BaseElement.js
│   │   ├── BasicCourse.js
│   │   ├── HoleEntity.js
│   │   └── hazards/     # Hazard creation
│   ├── physics/         # Physics system
│   ├── scenes/          # Main game scene
│   ├── shaders/         # Custom GLSL shaders
│   ├── styles/          # CSS styles
│   ├── tests/           # Comprehensive test suites
│   └── utils/           # Utility functions
├── public/              # Static assets
├── docs/                # Documentation
├── reports/             # Generated reports
└── [configuration files]
```

## 🎮 Core Systems

### Game Class (`src/scenes/Game.js`)

The central coordinator that orchestrates all game systems:

```javascript
class Game {
  constructor() {
    // Initialize core Three.js components
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer();
    
    // Initialize all manager systems
    this.initializeManagers();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  initializeManagers() {
    // Visual systems
    this.materialManager = new MaterialManager(qualitySettings);
    this.environmentManager = new EnvironmentManager(this.renderer);
    this.lightingManager = new LightingManager(this.scene);
    this.postProcessingManager = new PostProcessingManager(this.renderer, this.scene, this.camera);
    this.starfieldManager = new StarfieldManager(this.scene);
    
    // Game systems
    this.eventManager = EventManager.getInstance();
    this.debugManager = new DebugManager(this);
    this.performanceManager = new PerformanceManager(this);
    this.courseDataManager = new CourseDataManager();
    
    // Physics and gameplay
    this.physicsWorld = new PhysicsWorld();
    this.ballManager = new BallManager(this);
    this.hazardManager = new HazardManager(this);
    this.holeManager = new HoleManager(this);
  }
}
```

### Manager Systems

#### MaterialManager
Handles all material creation with PBR workflow:
- Texture loading and caching
- Quality-based material scaling
- Environment map integration
- Material factory methods for different surface types

```javascript
// Example usage
const ballMaterial = materialManager.createBallMaterial({
  color: 0xffffff,
  metalness: 0.8,
  roughness: 0.2
});
```

#### EnvironmentManager
Manages HDR skyboxes and environment mapping:
- HDR texture loading
- Environment map generation
- Dynamic skybox switching
- Procedural skybox generation

#### StarfieldManager
Creates realistic astronomical environments:
- 15,000+ scientifically accurate stars
- Shader-based rendering for performance
- Binary star systems and twinkling effects
- Galaxy background rendering

#### LightingManager
Comprehensive lighting system:
- Multi-source lighting setup
- Dynamic light effects
- Quality-based shadow scaling
- Rim lighting and special effects

#### PostProcessingManager
Professional post-processing pipeline:
- Bloom for glowing elements
- FXAA/SMAA anti-aliasing
- ACESFilmic tone mapping
- Color grading and LUT support

#### PerformanceManager
Real-time performance monitoring:
- FPS and frame time tracking
- Memory usage monitoring
- Performance budget enforcement
- Visual performance overlay (toggle with 'p')

### Event-Driven Architecture

All components communicate through the EventManager:

```javascript
// Publishing events
eventManager.publish(EventTypes.BALL_HIT, {
  power: hitPower,
  direction: hitDirection
});

// Subscribing to events
eventManager.subscribe(EventTypes.HOLE_COMPLETED, (event) => {
  this.handleHoleCompletion(event.data);
});
```

Common event types:
- `GAME_INITIALIZED`
- `BALL_HIT`
- `BALL_STOPPED`
- `HOLE_COMPLETED`
- `HAZARD_ENTERED`
- `COURSE_LOADED`
- `STATE_CHANGED`

### Data-Driven Course System

Courses are defined in JSON format and loaded dynamically:

```javascript
// Course JSON structure
{
  "id": "space-station-alpha",
  "name": "Space Station Alpha",
  "environment": "spaceStation",
  "skybox": "space_station_interior",
  "holes": [
    {
      "index": 1,
      "par": 3,
      "name": "Launch Pad",
      "startPosition": [0, 0, -6],
      "holePosition": [0, 0, 6],
      "hazards": [
        {
          "type": "sand",
          "shape": "circle",
          "position": [2, 0, 0],
          "size": { "radius": 1.5 }
        }
      ]
    }
  ]
}
```

## 🧪 Testing Infrastructure

### Test Coverage Requirements

All code must maintain:
- **Statements**: 80%+ coverage ✅
- **Lines**: 80%+ coverage ✅
- **Functions**: 80%+ coverage ✅
- **Branches**: Best effort (not required to hit 80%)

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- MaterialManager.test.js
```

### Writing Tests

Example test structure:

```javascript
describe('MaterialManager', () => {
  let materialManager;
  
  beforeEach(() => {
    // Mock THREE.js objects
    global.THREE = {
      TextureLoader: jest.fn().mockImplementation(() => ({
        load: jest.fn((url, onLoad) => {
          const mockTexture = { 
            needsUpdate: false,
            dispose: jest.fn()
          };
          onLoad(mockTexture);
          return mockTexture;
        })
      })),
      MeshStandardMaterial: jest.fn().mockImplementation(options => ({
        ...options,
        dispose: jest.fn()
      }))
    };
    
    materialManager = new MaterialManager();
  });
  
  describe('createBallMaterial', () => {
    it('should create material with environment map', () => {
      const material = materialManager.createBallMaterial({
        color: 0xff0000
      });
      
      expect(material.envMap).toBe(materialManager.envMap);
      expect(material.needsUpdate).toBe(true);
    });
  });
});
```

### Mocking Guidelines

The project includes comprehensive mocks for:
- **THREE.js**: Complete geometry, material, and rendering mocks
- **CANNON.js**: Physics world and body mocks
- **DOM APIs**: Document and window mocks
- **Manager Classes**: Mocked versions for isolated testing

## 🔧 Development Workflow

### Pre-commit Hooks

The project uses pre-commit hooks to ensure code quality:

```bash
# Pre-commit checks include:
- ESLint validation
- Prettier formatting
- Test execution
- Build verification
```

### Development Commands

```bash
# Start development server
npm start

# Build for production
npm run build

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Adding New Features

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Implement with Tests**
   - Write tests first (TDD approach)
   - Ensure 80%+ coverage
   - Follow existing patterns

3. **Update Documentation**
   - Update relevant .md files
   - Add JSDoc comments
   - Update CHANGELOG.md

4. **Pre-commit Validation**
   - All tests must pass
   - No linting errors
   - Proper formatting

5. **Create Pull Request**
   - Clear description
   - Reference any issues
   - Include test results

## 🎨 Visual Systems

### Material System

Creating custom materials:

```javascript
// PBR Material with textures
const customMaterial = materialManager.createCustomMaterial({
  diffuseMap: 'textures/metal_diffuse.jpg',
  normalMap: 'textures/metal_normal.jpg',
  roughnessMap: 'textures/metal_roughness.jpg',
  metalnessMap: 'textures/metal_metalness.jpg',
  envMapIntensity: 0.8
});

// Glow material for special effects
const glowMaterial = materialManager.createGlowMaterial({
  color: 0x00ffff,
  intensity: 2.0
});
```

### Shader Development

Custom shaders are located in `src/shaders/`:

```glsl
// starfield.vert
varying vec3 vColor;
varying float vIntensity;

void main() {
  vColor = color;
  vIntensity = smoothstep(0.0, 1.0, temperature);
  
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = size * (300.0 / -mvPosition.z);
}
```

### Post-Processing Pipeline

Adding new post-processing effects:

```javascript
// In PostProcessingManager
addCustomPass() {
  const customPass = new ShaderPass(CustomShader);
  customPass.uniforms.intensity.value = 0.5;
  this.composer.addPass(customPass);
}
```

## ⚡ Performance Optimization

### Quality Settings

The game supports three quality levels:

```javascript
const qualitySettings = {
  low: {
    shadowMapSize: 512,
    textureSize: 512,
    postProcessing: false,
    particleCount: 100
  },
  medium: {
    shadowMapSize: 1024,
    textureSize: 1024,
    postProcessing: true,
    particleCount: 500
  },
  high: {
    shadowMapSize: 2048,
    textureSize: 2048,
    postProcessing: true,
    particleCount: 1000
  }
};
```

### Performance Monitoring

Use the PerformanceManager to track metrics:

```javascript
// Toggle performance overlay
// Press 'p' during gameplay

// Programmatic access
const metrics = performanceManager.getMetrics();
console.log(`FPS: ${metrics.fps}`);
console.log(`Frame Time: ${metrics.frameTime}ms`);
```

### Memory Management

Proper cleanup is essential:

```javascript
// Dispose of Three.js resources
material.dispose();
geometry.dispose();
texture.dispose();

// Remove physics bodies
physicsWorld.removeBody(body);

// Clean up event subscriptions
eventManager.unsubscribe(EventTypes.BALL_HIT, handler);
```

## 🚀 Deployment

### Building for Production

```bash
# Create optimized build
npm run build

# Output is in dist/ directory
# - Minified JavaScript
# - Optimized assets
# - Service worker for caching
```

### Environment Variables

```bash
# .env file
NODE_ENV=production
API_URL=https://api.minigolfbreak.com
QUALITY_DEFAULT=medium
```

## 🐛 Debugging

### Debug Mode

Press 'd' during gameplay to toggle debug mode:
- Physics body visualization
- Performance metrics
- Verbose logging
- Collision boundaries

### Common Issues

1. **Physics bodies not aligned with visuals**
   - Check position synchronization in update loops
   - Verify coordinate system consistency

2. **Memory leaks**
   - Ensure proper disposal in cleanup methods
   - Check event subscription cleanup

3. **Performance drops**
   - Use Performance Monitor to identify bottlenecks
   - Check for excessive draw calls
   - Optimize particle systems

## 📚 Additional Resources

- [Three.js Documentation](https://threejs.org/docs/)
- [Cannon-es Physics](https://pmndrs.github.io/cannon-es/)
- [Project Task List](TASK_LIST.ignore.md)
- [Architecture Details](ARCHITECTURE.md) *(coming soon)*
- [Testing Guide](TESTING.md)

---

**Mini Golf Break** - Premium space-themed mini-golf with enterprise-level quality standards.