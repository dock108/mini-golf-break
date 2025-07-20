# Mini Golf Break - Premium Space-Themed Mini Golf Experience

**Mini Golf Break** is a visually stunning, semi-realistic space-themed mini golf game featuring professional-grade graphics, movie-quality visual effects, and enterprise-level architecture. Built with cutting-edge web technologies, it delivers a premium gaming experience with physically-based rendering, HDR environments, and a sophisticated effects system.

## 🚀 Premium Features

### 🎨 Professional Graphics & Rendering
- **PBR Material System:** Physically-based rendering with diffuse, normal, roughness, and metalness maps
- **HDR Environment Mapping:** High dynamic range skyboxes with real-time reflections
- **Dynamic Lighting System:** Multi-source lighting with rim lights, point lights, and dynamic shadows
- **Post-Processing Pipeline:** Bloom, tone mapping (ACESFilmic), FXAA/SMAA anti-aliasing, and color grading
- **Procedural Space Environments:** Real-time nebula generation and atmospheric effects

### 🌌 Astronomical Realism
- **StarfieldManager:** 15,000+ scientifically accurate stars with proper magnitudes and colors
- **Binary Star Systems:** Realistic variable star animations and twinkling effects
- **Galaxy Backgrounds:** Shader-based rendering with proper astronomical positioning
- **Shooting Stars:** Dynamic particle effects with realistic trajectories

### ⚙️ Advanced Physics
- **Realistic Ball Physics:** Powered by Cannon-es with accurate collision detection
- **Material Properties:** Different friction and restitution for various surfaces
- **Bunker Physics:** Increased drag and realistic sand trap behavior
- **Water Hazards:** One-stroke penalties with proper reset mechanics
- **High-Speed Rejection:** Realistic hole entry logic based on velocity

### 🎮 Gameplay Features
- **Data-Driven Courses:** JSON-based course architecture for easy content creation
- **Multiple Environments:** Deep space, space station interior, and procedural skyboxes
- **Dynamic Camera System:** Intelligent following with direction-based positioning
- **Hazard System:** Configurable sand traps and water hazards with CSG cutouts
- **Course Progression:** Multi-hole courses with automatic advancement
- **Scoring System:** Per-hole and total score tracking with visual feedback

### 🏗️ Enterprise Architecture
- **Modular Manager System:** 20+ specialized managers for different game systems
- **Event-Driven Architecture:** Decoupled components communicating through events
- **Quality Scaling:** Dynamic performance optimization for various devices
- **Memory Management:** Efficient texture caching and resource disposal
- **Hot-Reload Support:** Development mode with automatic course reloading

### 🧪 Professional Testing Infrastructure
- **Comprehensive Test Coverage:** 82.76% statements, 82.69% lines, 85.97% functions
- **Test Suites:** 56 unit & integration test suites with 1,577 total tests
- **Robust Mocking:** Complete THREE.js and CANNON.js mock systems
- **CI/CD Ready:** Pre-commit hooks matching CI pipeline validation
- **Visual Regression:** Playwright-based UAT testing with screenshot comparison

## 🚀 Getting Started

### Prerequisites
- Node.js 14+ and npm
- Modern web browser with WebGL support
- Git for version control

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd mini-golf-break

# Install dependencies
npm install

# Run development server
npm start
```

Open your browser to `http://localhost:8080`

### Build for Production
```bash
# Create optimized production build
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 🎮 How to Play

1. **Aim:** Click and hold on the golf ball
2. **Power:** Drag backward to set shot power (indicated by the aiming line)
3. **Shoot:** Release to hit the ball
4. **Goal:** Complete each hole in the fewest strokes possible
5. **Navigate:** Progress through multiple holes with increasing difficulty

### Controls
- **Mouse/Touch:** Click and drag for shooting
- **Camera:** Automatic intelligent following
- **Debug Mode:** Press 'd' to toggle physics visualization
- **Performance:** Press 'p' to toggle performance overlay

## 🏗️ Technical Architecture

### Core Technologies
- **Three.js 0.174.0:** Advanced 3D graphics and rendering
- **Cannon-es 0.20.0:** Physics simulation engine
- **Webpack 5:** Module bundling and optimization
- **Jest:** Testing framework with comprehensive mocking
- **Playwright:** End-to-end and visual regression testing

### Key Systems
- **MaterialManager:** PBR workflow with texture caching and quality settings
- **EnvironmentManager:** HDR skybox loading and environment mapping
- **StarfieldManager:** Astronomical star catalog with shader-based rendering
- **LightingManager:** Multi-source dynamic lighting system
- **PostProcessingManager:** Professional post-processing effects
- **PerformanceManager:** Real-time performance monitoring and optimization
- **EventManager:** Central event bus for component communication
- **StateManager:** Game state management with event notifications

### Performance Metrics
- **Build Size:** ~1.34MB (optimized for web delivery)
- **Target FPS:** 60fps on modern devices, 30fps minimum
- **Load Time:** < 3 seconds
- **Memory Efficient:** Texture atlasing and resource pooling

## 📊 Project Status

### Development Timeline
- **Project Start:** July 18, 2025
- **Phase 1 Complete:** July 18, 2025 - Visual & Graphics Overhaul
- **Phase 2.1 Complete:** July 19, 2025 - Data-Driven Architecture
- **Test Coverage Complete:** July 20, 2025 - 80%+ coverage achieved

### Code Quality
- **ESLint:** Industry-standard linting configuration
- **Pre-commit Hooks:** Automated quality checks
- **Security Audits:** Zero vulnerabilities
- **Build Validation:** Development and production builds

## 🚀 Future Development

### Phase 2.3: Modular Obstacle System
- Teleporter pads with particle effects
- Speed boost strips
- Moving platforms
- Rotating barriers
- Gravity wells
- Force fields

### Phase 3: User Experience & Sharing
- Score management with local storage
- Handicap calculation system
- Post-game scorecard UI
- Social sharing features
- Achievement system

### Phase 4: Performance & Polish
- Asset optimization with KTX2 compression
- LOD system implementation
- Mobile-specific optimizations
- Enhanced loading experience

## 📝 Documentation

- **[Development Guide](DEVELOPMENT_GUIDE.md):** Architecture and development practices
- **[Testing Guide](TESTING.md):** Testing strategies and best practices
- **[Task List](TASK_LIST.ignore.md):** Project progress and planning
- **[Changelog](CHANGELOG.md):** Detailed version history

## 🎯 Design Philosophy

Mini Golf Break represents a convergence of casual gameplay with premium visual quality. The space theme provides a unique backdrop for traditional mini-golf mechanics, while the professional-grade rendering system delivers an experience typically reserved for AAA games. Every system is built with modularity and performance in mind, ensuring smooth gameplay across a wide range of devices.

## 🤝 Contributing

This project follows industry best practices for code quality and testing. All contributions should:
- Maintain 80%+ test coverage
- Pass ESLint validation
- Include appropriate documentation
- Follow the established architectural patterns

## 📄 License

[License information here]

---

**Mini Golf Break** - Where casual gaming meets stellar visuals. Experience mini-golf like never before in the vastness of space.