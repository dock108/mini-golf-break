# Mini Golf Break - System Architecture

**Version:** 1.0  
**Last Updated:** July 20, 2025

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [Component Architecture](#component-architecture)
4. [Manager Systems](#manager-systems)
5. [Data Flow](#data-flow)
6. [Design Patterns](#design-patterns)
7. [Technical Stack](#technical-stack)
8. [Performance Architecture](#performance-architecture)
9. [Testing Architecture](#testing-architecture)
10. [Deployment Architecture](#deployment-architecture)

## System Overview

Mini Golf Break is a browser-based 3D mini-golf game built with a modular, event-driven architecture. The system emphasizes separation of concerns, testability, and performance optimization.

```
┌─────────────────────────────────────────────────────────────┐
│                        Game Loop                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Render    │  │   Physics   │  │    Input    │        │
│  │   System    │  │   System    │  │   System    │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                 │                 │                │
│  ┌──────▼─────────────────▼─────────────────▼──────┐        │
│  │              Event Manager (Pub/Sub)             │        │
│  └──────┬─────────────────┬─────────────────┬──────┘        │
│         │                 │                 │                │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐        │
│  │   Visual    │  │    Game     │  │     UI      │        │
│  │  Managers   │  │  Managers   │  │  Managers   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Architecture Principles

### 1. Modular Design
Each system is encapsulated in its own manager class with clear responsibilities and interfaces.

### 2. Event-Driven Communication
Components communicate through a central EventManager using publish/subscribe pattern, reducing coupling.

### 3. Data-Driven Configuration
Game content (courses, materials, settings) is defined in external JSON/configuration files.

### 4. Performance Scalability
Quality settings and LOD systems allow the game to run on various device capabilities.

### 5. Test-First Development
Comprehensive test coverage (80%+) with robust mocking infrastructure.

## Component Architecture

### Core Components

```
Game (Main Orchestrator)
├── Rendering Pipeline
│   ├── Three.js Scene
│   ├── WebGL Renderer
│   └── Camera System
├── Manager Systems
│   ├── Visual Managers
│   ├── Game Logic Managers
│   └── System Managers
├── Physics Simulation
│   ├── Cannon-es World
│   └── Collision Detection
└── Event System
    ├── EventManager
    └── Event Types
```

### Visual Architecture

```
Visual Pipeline
├── MaterialManager
│   ├── PBR Materials
│   ├── Texture Cache
│   └── Quality Scaling
├── EnvironmentManager
│   ├── HDR Skyboxes
│   ├── Environment Maps
│   └── Procedural Generation
├── LightingManager
│   ├── Multi-Source Lights
│   ├── Dynamic Effects
│   └── Shadow Management
├── PostProcessingManager
│   ├── Bloom Pass
│   ├── Anti-Aliasing
│   ├── Tone Mapping
│   └── Color Grading
└── StarfieldManager
    ├── Star Catalog (15K+)
    ├── Shader Rendering
    └── Animation System
```

## Manager Systems

### Visual Managers

#### MaterialManager
**Responsibility:** Centralized material creation and management
- **Texture Loading:** Asynchronous loading with caching
- **Material Factory:** PBR materials with consistent workflow
- **Quality Scaling:** Dynamic texture resolution based on device
- **Memory Management:** Proper disposal and cleanup

#### EnvironmentManager
**Responsibility:** Environment and skybox management
- **HDR Support:** High dynamic range environment maps
- **Procedural Generation:** Runtime skybox creation
- **Reflection Probes:** Real-time environment reflections
- **Scene Integration:** Automatic scene background updates

#### StarfieldManager
**Responsibility:** Realistic space environment
- **Star Catalog:** 15,000+ astronomically accurate stars
- **Shader System:** GPU-based rendering for performance
- **Animation:** Variable stars and binary systems
- **Galaxy Effects:** Background nebula and galaxy rendering

#### LightingManager
**Responsibility:** Dynamic lighting system
- **Multi-Source:** Directional, point, and spot lights
- **Dynamic Effects:** Pulsing, flickering, color transitions
- **Shadow System:** Cascaded shadow maps with quality scaling
- **Performance:** Automatic light culling and LOD

#### PostProcessingManager
**Responsibility:** Screen-space effects pipeline
- **Effect Composer:** Three.js post-processing pipeline
- **Quality Presets:** Low, medium, high configurations
- **Performance Scaling:** Dynamic effect toggling
- **Custom Shaders:** Extensible shader system

### Game Logic Managers

#### BallManager
**Responsibility:** Ball physics and state management
- **Physics Integration:** Cannon-es rigid body
- **State Tracking:** Motion, position, hazard states
- **Visual Effects:** Success animations, particle systems
- **Event Publishing:** Ball state change notifications

#### HoleManager
**Responsibility:** Hole completion and progression
- **Completion Detection:** Ball-in-hole physics
- **Score Tracking:** Per-hole stroke counting
- **Transition Management:** Hole-to-hole progression
- **Event Coordination:** Completion event handling

#### HazardManager
**Responsibility:** Hazard detection and penalties
- **Collision Detection:** Water and sand trap detection
- **Penalty System:** Stroke penalties and ball reset
- **Visual Feedback:** Hazard entry effects
- **State Management:** Hazard interaction tracking

#### CourseDataManager
**Responsibility:** Data-driven course loading
- **JSON Schema:** Standardized course format
- **Validation:** Course data integrity checks
- **Hot Reload:** Development mode file watching
- **Course Packs:** Multi-course bundle support

### System Managers

#### EventManager
**Responsibility:** Component communication hub
- **Pub/Sub System:** Decoupled event handling
- **Event Types:** Standardized event constants
- **Error Handling:** Safe event propagation
- **Debug Support:** Event flow visualization

#### PerformanceManager
**Responsibility:** Performance monitoring and optimization
- **Metrics Tracking:** FPS, frame time, memory usage
- **Budget System:** Performance threshold alerts
- **Visual Overlay:** Real-time performance display
- **Optimization:** Automatic quality adjustment

#### DebugManager
**Responsibility:** Development and debugging tools
- **Error Tracking:** Centralized error handling
- **Debug Overlays:** Physics visualization, stats
- **Logging System:** Categorized debug output
- **Development Tools:** Hot reload, state inspection

## Data Flow

### Game Initialization Flow
```
1. Game Constructor
   ├── Initialize Three.js (Scene, Renderer, Camera)
   ├── Create Manager Instances
   ├── Setup Event Subscriptions
   └── Load Initial Course

2. Manager Initialization
   ├── MaterialManager → Load textures, create materials
   ├── EnvironmentManager → Load skybox, setup environment
   ├── LightingManager → Create lights, setup shadows
   ├── PostProcessingManager → Setup effect pipeline
   └── CourseDataManager → Load course JSON

3. Course Loading
   ├── Parse Course JSON
   ├── Create Hole Entities
   ├── Setup Physics Bodies
   └── Position Camera
```

### Game Loop Flow
```
requestAnimationFrame Loop
├── Performance.mark('frame-start')
├── Update Physics (16.67ms timestep)
│   ├── Step Physics World
│   ├── Update Ball Position
│   └── Check Collisions
├── Update Game Logic
│   ├── Check Hole Completion
│   ├── Update Hazard States
│   └── Process Input
├── Update Visual Systems
│   ├── Update Animations
│   ├── Update Particle Effects
│   └── Update Camera
├── Render Frame
│   ├── Render Scene
│   ├── Apply Post-Processing
│   └── Update UI
└── Performance.measure('frame-time')
```

### Event Flow Example
```
User Clicks to Hit Ball
├── InputController captures mouse event
├── Calculate power and direction
├── Publish BALL_HIT event
│   ├── BallManager receives event → Apply physics force
│   ├── UIManager receives event → Update stroke count
│   ├── AudioManager receives event → Play hit sound
│   └── EffectsManager receives event → Create hit particles
└── Ball starts moving → Publish BALL_MOVING event
```

## Design Patterns

### Singleton Pattern
Used for global managers that should have only one instance:
```javascript
class EventManager {
  static instance = null;
  
  static getInstance() {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }
}
```

### Factory Pattern
Used for creating materials and game objects:
```javascript
class MaterialManager {
  createBallMaterial(options) {
    // Factory method for creating ball materials
  }
  
  createCourseMaterial(options) {
    // Factory method for creating course materials
  }
}
```

### Observer Pattern
Implemented through EventManager for decoupled communication:
```javascript
// Publisher
eventManager.publish(EventTypes.HOLE_COMPLETED, { 
  holeIndex: 1, 
  strokes: 3 
});

// Subscriber
eventManager.subscribe(EventTypes.HOLE_COMPLETED, (event) => {
  this.updateScore(event.data);
});
```

### Module Pattern
Each manager encapsulates its functionality:
```javascript
class StarfieldManager {
  constructor() {
    // Private state
    this._stars = [];
    this._shaderMaterial = null;
  }
  
  // Public interface
  createStarfield() { /* ... */ }
  update(deltaTime) { /* ... */ }
  dispose() { /* ... */ }
}
```

## Technical Stack

### Core Technologies
- **Three.js 0.174.0**: 3D graphics and rendering
- **Cannon-es 0.20.0**: Physics simulation
- **Webpack 5**: Module bundling and build optimization
- **Jest 29**: Testing framework
- **Playwright**: E2E testing

### Rendering Pipeline
- **WebGL 2.0**: Hardware-accelerated graphics
- **GLSL Shaders**: Custom vertex and fragment shaders
- **PBR Workflow**: Physically-based rendering
- **HDR Pipeline**: High dynamic range rendering

### Build System
- **Babel**: ES6+ transpilation
- **Terser**: JavaScript minification
- **PostCSS**: CSS processing
- **Webpack Dev Server**: Hot module replacement

## Performance Architecture

### Optimization Strategies

#### Level of Detail (LOD)
```javascript
// Dynamic quality adjustment based on performance
if (fps < 30) {
  this.setQuality('low');
} else if (fps < 50) {
  this.setQuality('medium');
} else {
  this.setQuality('high');
}
```

#### Object Pooling
Reuse objects to reduce garbage collection:
```javascript
class ParticlePool {
  constructor(size) {
    this.pool = [];
    this.active = [];
    // Pre-allocate particles
    for (let i = 0; i < size; i++) {
      this.pool.push(new Particle());
    }
  }
}
```

#### Texture Atlasing
Combine multiple textures to reduce draw calls:
```javascript
// Single texture with multiple materials
const atlas = new THREE.TextureLoader().load('atlas.png');
const materials = [
  new THREE.MeshStandardMaterial({ 
    map: atlas,
    offset: new THREE.Vector2(0, 0),
    repeat: new THREE.Vector2(0.25, 0.25)
  })
];
```

### Memory Management

#### Resource Disposal
```javascript
dispose() {
  // Dispose Three.js resources
  this.geometry?.dispose();
  this.material?.dispose();
  this.texture?.dispose();
  
  // Remove from scene
  this.scene.remove(this.mesh);
  
  // Clear references
  this.mesh = null;
}
```

#### Event Cleanup
```javascript
cleanup() {
  // Unsubscribe from all events
  this.subscriptions.forEach(sub => {
    this.eventManager.unsubscribe(sub.type, sub.handler);
  });
  this.subscriptions = [];
}
```

## Testing Architecture

### Test Structure
```
src/tests/
├── managers/          # Manager unit tests
├── objects/           # Game object tests
├── integration/       # Integration tests
├── mocks/            # Shared mock objects
└── utils/            # Test utilities
```

### Mocking Strategy
```javascript
// THREE.js mock example
global.THREE = {
  Scene: jest.fn(),
  WebGLRenderer: jest.fn().mockImplementation(() => ({
    setSize: jest.fn(),
    setPixelRatio: jest.fn(),
    shadowMap: { enabled: false, type: 1 }
  })),
  // ... comprehensive mocks
};
```

### Coverage Requirements
- **Statements**: 80%+ ✅
- **Lines**: 80%+ ✅
- **Functions**: 80%+ ✅
- **Branches**: Best effort

## Deployment Architecture

### Build Pipeline
```
Source Code
├── Webpack Build
│   ├── Transpilation (Babel)
│   ├── Bundling
│   ├── Minification
│   └── Asset Optimization
├── Testing
│   ├── Unit Tests
│   ├── Integration Tests
│   └── Coverage Reports
└── Distribution
    ├── HTML/CSS/JS bundles
    ├── Optimized assets
    └── Service worker
```

### Production Optimizations
- **Code Splitting**: Lazy load non-critical modules
- **Tree Shaking**: Remove unused code
- **Asset Compression**: Gzip/Brotli compression
- **CDN Distribution**: Static asset delivery
- **Service Worker**: Offline capability and caching

### Performance Budgets
```javascript
// webpack.config.js
performance: {
  maxEntrypointSize: 512000,  // 500KB
  maxAssetSize: 256000,       // 250KB
  hints: 'warning'
}
```

## Future Architecture Considerations

### Scalability
- **WebGPU Support**: Next-generation graphics API
- **Web Workers**: Offload physics calculations
- **Module Federation**: Micro-frontend architecture
- **Progressive Loading**: Stream course data

### Extensibility
- **Plugin System**: Third-party content support
- **Mod Support**: User-generated courses
- **Theme System**: Customizable visual themes
- **Localization**: Multi-language support

---

**Mini Golf Break** - Architectural excellence in browser-based gaming.