# Contributing to Mini Golf Break

**Last Updated:** July 20, 2025

We love your input! We want to make contributing to Mini Golf Break as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## We Develop with Github
We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## We Use [Github Flow](https://guides.github.com/introduction/flow/index.html)
Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main` or `overhaul`
2. If you've added code that should be tested, add tests to maintain our 80%+ coverage
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes with `npm test`
5. Make sure your code passes all pre-commit hooks
6. Issue that pull request!

## Code Quality Standards

### Test Coverage Requirements
All new code must maintain our high testing standards:
- **Statements:** 80%+ coverage required
- **Functions:** 80%+ coverage required  
- **Lines:** 80%+ coverage required
- **Branches:** Best effort (currently 71.48%)

Current project coverage: **82.76% statements** with 1,577 tests across 56 test suites.

### Pre-commit Hooks
The project uses pre-commit hooks that match our CI pipeline exactly:
1. **Code Formatting:** Prettier check
2. **Linting:** ESLint validation
3. **Security Audit:** npm audit for vulnerabilities
4. **Build Validation:** Both development and production builds
5. **Test Execution:** Unit tests with coverage

## Development Process

1. **Clone the repository**
   ```bash
   git clone https://github.com/dock108/mini-golf-break.git
   cd mini-golf-break
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm start
   ```
   Open http://localhost:8080 to view the game

4. **Run tests**
   ```bash
   # All tests
   npm test
   
   # With coverage
   npm run test:coverage
   
   # Watch mode
   npm run test:watch
   ```

5. **Check code quality**
   ```bash
   # Lint check
   npm run lint
   
   # Format check
   npm run format:check
   
   # Fix formatting
   npm run format
   ```

6. **Build for production**
   ```bash
   npm run build
   ```

## Project Architecture

Mini Golf Break follows a modular, event-driven architecture:

- **Manager Pattern:** Specialized managers handle different game aspects
- **Event System:** Components communicate through EventManager
- **Data-Driven:** Courses and settings loaded from JSON
- **Quality Scaling:** Visual effects scale based on device capabilities

Key managers include:
- `MaterialManager` - PBR materials and textures
- `EnvironmentManager` - HDR skyboxes and environments
- `StarfieldManager` - 15,000+ astronomical stars
- `LightingManager` - Dynamic multi-source lighting
- `PostProcessingManager` - Professional visual effects

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed system design.

## Testing Guidelines

### Writing Tests
Follow our three-tier testing approach:

1. **Unit Tests** (`src/tests/*.test.js`)
   - Test components in isolation
   - Mock all dependencies
   - Fast execution (<100ms)

2. **Integration Tests** (`src/tests/integration/*.test.js`)
   - Test component interactions
   - Minimal mocking
   - Real component instances

3. **UAT Tests** (`tests/uat/*.test.js`)
   - End-to-end browser tests
   - No mocking
   - User journey validation

### Test Example
```javascript
describe('MaterialManager', () => {
  let materialManager;
  
  beforeEach(() => {
    // Mock THREE.js
    global.THREE = createThreeMock();
    materialManager = new MaterialManager();
  });
  
  test('should create PBR material with environment map', () => {
    const material = materialManager.createBallMaterial({
      color: 0xffffff,
      metalness: 0.8
    });
    
    expect(material.envMap).toBeDefined();
    expect(material.metalness).toBe(0.8);
  });
});
```

## Code Style

- **ESLint:** Enforces code quality standards
- **Prettier:** Ensures consistent formatting
- **Pre-commit:** Automatic validation before commits

Configuration:
- 2 spaces for indentation
- Single quotes for strings
- No semicolons
- Trailing commas in multi-line objects

## Documentation

When contributing, please update:
- **JSDoc comments** for new functions/classes
- **README.md** for new features
- **CHANGELOG.md** for all changes
- **Test files** with descriptive test names

## Bug Reports

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Include browser/device info
  - Give sample code if applicable
- What you expected would happen
- What actually happens
- Console errors or warnings
- Screenshots/videos for visual issues

## Feature Requests

When proposing new features:
- Explain the use case
- Describe expected behavior
- Consider performance impact
- Suggest implementation approach
- Reference similar features if applicable

## Performance Considerations

Mini Golf Break targets 60 FPS on modern devices:
- Optimize draw calls
- Use object pooling for particles
- Implement LOD for complex meshes
- Profile with PerformanceManager (press 'p' in game)

## License

By contributing, you agree that your contributions will be licensed under its MIT License.

## Questions?

Feel free to open an issue for:
- Clarification on architecture
- Help with testing approach
- Code review before PR
- General questions

## References
This document was adapted from the open-source contribution guidelines for [Facebook's Draft](https://github.com/facebook/draft-js/blob/master/CONTRIBUTING.md)