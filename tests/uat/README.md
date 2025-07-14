# UAT Testing Framework

This directory contains User Acceptance Testing (UAT) automation for the Mini Golf Break game.

## Overview

The UAT framework uses Playwright for end-to-end testing across multiple browsers and devices, ensuring the game works correctly from a user's perspective.

## Test Structure

```
tests/uat/
├── playwright.config.js     # Playwright configuration
├── utils/
│   └── TestHelper.js        # Common testing utilities
├── game-flow.test.js        # Core game functionality tests
├── mobile.test.js           # Mobile device specific tests
├── visual-regression.test.js # Visual consistency tests
├── performance.test.js      # Performance benchmarking
└── screenshots/             # Visual regression baselines
    ├── baseline/           # Reference images
    └── current/           # Current test images
```

## Running Tests

### Prerequisites

Install dependencies (when available):
```bash
npm install --save-dev @playwright/test playwright
```

### Basic Usage

```bash
# Run all UAT tests
npm run test:uat

# Run tests with browser visible (for debugging)
npm run test:uat:headed

# Run tests in debug mode with step-by-step execution
npm run test:uat:debug

# Run specific test file
npx playwright test tests/uat/game-flow.test.js

# Run tests on specific browser
npx playwright test --project=chromium-desktop

# Run tests on mobile devices
npx playwright test --project=mobile-chrome
```

## Test Categories

### 1. Core Game Flow Tests (`game-flow.test.js`)
- Game initialization and loading
- Complete hole playthrough scenarios
- Multi-stroke gameplay
- Hole transitions
- Scoring accuracy
- Game completion
- Performance during gameplay
- Error handling

### 2. Mobile Device Tests (`mobile.test.js`)
- iPhone, iPad, and Android compatibility
- Touch gesture handling
- Mobile performance optimizations
- Device orientation changes
- Multi-touch support
- Battery optimization features
- Cross-platform consistency

### 3. Visual Regression Tests (`visual-regression.test.js`)
- UI element positioning
- Canvas rendering consistency
- Responsive design validation
- Visual state management
- Error state appearances
- Accessibility features
- Performance impact on visuals

### 4. Performance Benchmarking (`performance.test.js`)
- Frame rate monitoring
- Memory usage tracking
- Loading time measurements
- Stress testing with multiple objects
- WebGL performance validation
- Background/foreground transitions
- Performance regression detection

## Test Helper Utilities

The `TestHelper` class provides common functionality:

```javascript
const testHelper = new TestHelper(page);

// Wait for game to fully initialize
await testHelper.waitForGameInitialization();

// Simulate ball hits
await testHelper.hitBall(0.7, { x: 0, y: 1 });

// Wait for ball physics to settle
await testHelper.waitForBallToStop();

// Get game state information
const gameState = await testHelper.getGameState();
const strokes = await testHelper.getStrokeCount();

// Mobile testing
await testHelper.simulateTouch(x, y, 'tap');
const metrics = await testHelper.checkPerformance();

// Visual regression
await testHelper.takeScreenshot('test-name');
```

## Configuration

### Playwright Configuration

The `playwright.config.js` configures:
- Multiple browser projects (Chrome, Safari, mobile devices)
- Test timeouts and retries
- Screenshot and video capture
- HTML and JUnit reporting
- Development server integration

### Device Coverage

Tests run across:
- **Desktop**: Chrome 1920x1080, Safari 1920x1080
- **Mobile**: iPhone 12, Pixel 5, iPad Pro
- **Responsive**: Various viewport sizes

## CI/CD Integration

### GitHub Actions Example

```yaml
name: UAT Tests
on: [push, pull_request]

jobs:
  uat-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install
      - run: npm run build
      - run: npm run test:uat
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: uat-results
          path: coverage/uat-results/
```

## Visual Regression Testing

### Baseline Management

```bash
# Update all baselines (run when UI changes are intentional)
npx playwright test --update-snapshots

# Update specific test baselines
npx playwright test visual-regression.test.js --update-snapshots

# Review visual differences
npx playwright show-report coverage/uat-results
```

### Screenshot Organization

- `baseline/`: Reference images for comparison
- `current/`: Latest test run screenshots
- Automatic comparison with configurable thresholds
- Diff images generated for failed comparisons

## Performance Benchmarking

### Metrics Tracked

- **Frame Rate**: Target >30 FPS for desktop, >25 FPS for mobile
- **Memory Usage**: Monitor for leaks and excessive growth
- **Loading Times**: Game initialization under 10 seconds
- **Render Time**: <16ms per frame for 60 FPS target
- **Physics Performance**: <5ms per physics step

### Thresholds

```javascript
// Performance expectations
expect(metrics.fps).toBeGreaterThan(30);
expect(metrics.avgRenderTime).toBeLessThan(16);
expect(metrics.memoryGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB
```

## Debugging Failed Tests

### Common Issues

1. **Timing Issues**: Increase timeouts or add explicit waits
2. **Visual Differences**: Check if UI changes are intentional
3. **Performance Fluctuations**: Run tests multiple times for consistency
4. **Mobile Test Failures**: Verify device simulation settings

### Debug Commands

```bash
# Run with browser visible
npm run test:uat:headed

# Step through test execution
npm run test:uat:debug

# Generate detailed trace
npx playwright test --trace on

# View test results
npx playwright show-report
```

## Best Practices

### Test Design
- Use page object patterns for complex interactions
- Keep tests atomic and independent
- Use descriptive test names and comments
- Implement proper waiting strategies

### Performance Testing
- Establish baseline metrics for comparison
- Test under various load conditions
- Monitor for performance regressions
- Use realistic test scenarios

### Visual Testing
- Update baselines when changes are intentional
- Use appropriate comparison thresholds
- Test across multiple devices and browsers
- Document visual changes in commits

### Maintenance
- Review and update tests regularly
- Keep test dependencies up to date
- Monitor test execution times
- Clean up unused screenshots and artifacts

## Troubleshooting

### Installation Issues
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Install Playwright browsers
npx playwright install
```

### Test Environment
- Ensure development server starts correctly
- Check for port conflicts (default: 8080)
- Verify game builds successfully
- Test with production build for accuracy

For more information, see the [Playwright documentation](https://playwright.dev/).