# Testing Strategy for Mini Golf Break

This document outlines the comprehensive testing approach for the Mini Golf Break game, utilizing a three-tier testing strategy to ensure quality, reliability, and performance across all platforms.

## Table of Contents

1. [Overview](#overview)
2. [Testing Architecture](#testing-architecture)
3. [Test Types](#test-types)
4. [Running Tests](#running-tests)
5. [Coverage Reports](#coverage-reports)
6. [Writing Tests](#writing-tests)
7. [CI/CD Integration](#cicd-integration)
8. [Best Practices](#best-practices)

## Overview

Mini Golf Break uses a three-tier testing approach:

1. **Unit Tests** - Fast, isolated component tests
2. **Integration Tests** - Component interaction verification
3. **UAT (User Acceptance Tests)** - End-to-end browser-based tests

Each tier serves a specific purpose in ensuring code quality while maintaining fast feedback loops during development.

## Testing Architecture

```
mini-golf-break/
├── src/tests/              # Unit tests
│   ├── *.test.js          # Component unit tests
│   ├── integration/       # Integration tests
│   │   └── *.test.js     # Component integration tests
│   ├── setup.js          # Test environment setup
│   └── jest.setup.js     # Jest configuration
├── tests/uat/             # UAT tests (Playwright)
│   ├── *.test.js         # End-to-end tests
│   ├── utils/            # Test helpers
│   └── playwright.config.js
├── coverage/              # Coverage reports
│   ├── jest/             # Unit/Integration coverage
│   ├── uat/              # UAT coverage
│   └── merged/           # Combined coverage
└── scripts/
    └── merge-coverage.js  # Coverage merge utility
```

## Test Types

### Unit Tests

**Purpose**: Test individual components in isolation

**Location**: `/src/tests/*.test.js`

**Framework**: Jest + Testing Library

**Examples**:
- Component rendering
- Manager initialization
- Utility functions
- Event handling
- State management

**Characteristics**:
- Fast execution (< 100ms per test)
- No external dependencies
- Heavy use of mocks
- Focus on single responsibility

### Integration Tests

**Purpose**: Test component interactions and data flow

**Location**: `/src/tests/integration/*.test.js`

**Framework**: Jest with minimal mocking

**Examples**:
- Physics + Ball interaction
- Game initialization sequence
- State propagation across managers
- Course loading and transitions

**Characteristics**:
- Moderate execution time (100ms - 1s per test)
- Real component instances
- Minimal mocking (only external deps)
- Focus on component contracts

### UAT Tests

**Purpose**: Validate user experience and full system behavior

**Location**: `/tests/uat/*.test.js`

**Framework**: Playwright

**Examples**:
- Complete game playthrough
- Mobile device interactions
- Visual regression testing
- Performance benchmarking
- Cross-browser compatibility

**Characteristics**:
- Slower execution (1-10s per test)
- Real browser environment
- No mocking
- Focus on user journeys

## Running Tests

### Quick Commands

```bash
# Run all tests
npm test

# Run specific test type
npm run test:unit
npm run test:integration
npm run test:uat

# Run with coverage
npm run test:coverage
npm run test:coverage:unit
npm run test:coverage:integration

# Run all tests with merged coverage
npm run test:coverage:all
```

### Detailed Test Execution

#### Unit Tests Only
```bash
npm run test:unit
# or
jest --selectProjects=unit
```

#### Integration Tests Only
```bash
npm run test:integration
# or
jest --selectProjects=integration
```

#### UAT Tests
```bash
# Headless mode
npm run test:uat

# With browser visible
npm run test:uat:headed

# Debug mode (step through)
npm run test:uat:debug
```

#### Watch Mode
```bash
# Watch unit tests
jest --selectProjects=unit --watch

# Watch integration tests
jest --selectProjects=integration --watch
```

#### Specific File/Pattern
```bash
# Run specific test file
jest src/tests/Ball.test.js

# Run tests matching pattern
jest --testNamePattern="physics"

# Run integration tests for specific component
jest --selectProjects=integration physics
```

## Coverage Reports

### Viewing Coverage

```bash
# Generate and view coverage
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

### Coverage Thresholds

Current minimum thresholds (configured in `jest.config.js`):
- Branches: 60%
- Functions: 60%
- Lines: 60%
- Statements: 60%

### Merged Coverage

To get a complete picture across all test types:

```bash
# Run all tests and merge coverage
npm run test:coverage:all

# View merged report
open coverage/merged/index.html
```

## Writing Tests

### Unit Test Example

```javascript
// src/tests/BallManager.test.js
import { BallManager } from '../managers/BallManager';

describe('BallManager', () => {
  let ballManager;
  let mockGame;

  beforeEach(() => {
    mockGame = {
      scene: { add: jest.fn() },
      physicsManager: { world: {} }
    };
    ballManager = new BallManager(mockGame);
  });

  test('should create ball at specified position', async () => {
    const position = { x: 0, y: 1, z: -5 };
    const ball = await ballManager.createBall(position);
    
    expect(ball).toBeDefined();
    expect(ball.mesh.position).toMatchObject(position);
  });
});
```

### Integration Test Example

```javascript
// src/tests/integration/physics-ball.integration.test.js
import { PhysicsManager } from '../../managers/PhysicsManager';
import { BallManager } from '../../managers/BallManager';

describe('Physics and Ball Integration', () => {
  let physicsManager, ballManager;

  beforeEach(() => {
    // Use real instances, minimal mocking
    physicsManager = new PhysicsManager(game);
    physicsManager.init();
    
    ballManager = new BallManager(game);
    ballManager.init(physicsManager);
  });

  test('should synchronize ball physics with mesh', async () => {
    const ball = await ballManager.createBall({ x: 0, y: 1, z: 0 });
    
    // Apply physics
    ball.body.applyImpulse(new CANNON.Vec3(5, 0, 0));
    physicsManager.update(16);
    ball.updateMeshFromBody();
    
    // Verify synchronization
    expect(ball.mesh.position.x).toBeCloseTo(ball.body.position.x);
  });
});
```

### UAT Test Example

```javascript
// tests/uat/game-flow.test.js
const { test, expect } = require('@playwright/test');
const { TestHelper } = require('./utils/TestHelper');

test('should complete hole successfully', async ({ page }) => {
  const testHelper = new TestHelper(page);
  await page.goto('/');
  
  await testHelper.waitForGameInitialization();
  
  // Play hole
  await testHelper.hitBall(0.7, { x: 0, y: 1 });
  await testHelper.waitForBallToStop();
  
  // Verify completion
  const strokes = await testHelper.getStrokeCount();
  expect(strokes).toBeGreaterThan(0);
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm run test:coverage:unit
    
    - name: Run integration tests
      run: npm run test:coverage:integration
    
    - name: Build application
      run: npm run build
    
    - name: Install Playwright
      run: npx playwright install --with-deps
    
    - name: Run UAT tests
      run: npm run test:uat
    
    - name: Merge coverage reports
      run: node scripts/merge-coverage.js
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        directory: ./coverage/merged
```

## Best Practices

### 1. Test Pyramid

Follow the test pyramid principle:
- Many unit tests (fast, focused)
- Moderate integration tests (component boundaries)
- Few UAT tests (critical user journeys)

### 2. Test Naming

Use descriptive test names that explain the scenario:
```javascript
// Good
test('should reset ball velocity to zero when resetBallPosition is called')

// Bad
test('reset ball')
```

### 3. Test Organization

Group related tests using `describe` blocks:
```javascript
describe('BallManager', () => {
  describe('createBall', () => {
    test('should create ball with default properties', () => {});
    test('should create ball at specified position', () => {});
  });
  
  describe('resetBallPosition', () => {
    test('should reset position to specified coordinates', () => {});
    test('should clear ball velocity', () => {});
  });
});
```

### 4. Mocking Strategy

- **Unit Tests**: Mock all dependencies
- **Integration Tests**: Mock only external services (API, database)
- **UAT Tests**: No mocking, use test data/environments

### 5. Async Testing

Always handle async operations properly:
```javascript
// Good
test('should load course', async () => {
  const course = await CourseLoader.load();
  expect(course).toBeDefined();
});

// Bad
test('should load course', () => {
  CourseLoader.load().then(course => {
    expect(course).toBeDefined();
  });
});
```

### 6. Test Data

Use factories or builders for complex test data:
```javascript
const createMockGame = (overrides = {}) => ({
  scene: new THREE.Scene(),
  camera: new THREE.PerspectiveCamera(),
  eventManager: new EventManager(),
  ...overrides
});
```

### 7. Performance

For performance-critical code, include performance tests:
```javascript
test('should update physics within 16ms budget', () => {
  const start = performance.now();
  physicsManager.update(16);
  const duration = performance.now() - start;
  
  expect(duration).toBeLessThan(16);
});
```

### 8. Visual Testing

Use snapshot testing for UI components:
```javascript
test('should render menu correctly', () => {
  const menu = renderer.create(<Menu />);
  expect(menu.toJSON()).toMatchSnapshot();
});
```

### 9. Error Scenarios

Always test error conditions:
```javascript
test('should handle missing physics world gracefully', () => {
  physicsManager.world = null;
  
  expect(() => {
    physicsManager.update(16);
  }).not.toThrow();
});
```

### 10. Cleanup

Always clean up after tests:
```javascript
afterEach(() => {
  // Clean up Three.js resources
  scene.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
  });
  
  // Clean up physics
  physicsManager.cleanup();
  
  // Clear all mocks
  jest.clearAllMocks();
});
```

## Debugging Tests

### Jest Tests

```bash
# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Run single test with console output
jest --verbose src/tests/Ball.test.js
```

### Playwright Tests

```bash
# Debug mode with Playwright Inspector
npm run test:uat:debug

# Save trace for debugging
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

### VS Code Configuration

Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "${file}"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Continuous Improvement

1. **Monitor Test Performance**: Keep track of test execution times
2. **Review Coverage Gaps**: Regularly check coverage reports
3. **Update Test Data**: Keep test scenarios current with game changes
4. **Refactor Tests**: Apply DRY principles to test code
5. **Document Failures**: Add comments explaining complex test scenarios

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://testingjavascript.com/)
- [Three.js Testing Guide](https://threejs.org/docs/#manual/en/introduction/Testing)