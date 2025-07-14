/**
 * Simple test for the PerformanceManager
 *
 * Run this test with:
 *   node src/tests/PerformanceManagerTest.js
 */

// Mock the game object and DOM for testing
const mockGame = {
  debugManager: {
    warn: (source, message) => console.log(`DEBUG WARN [${source}]: ${message}`),
    enabled: true
  },
  scene: {
    traverse: callback => {
      // Mock traversing 100 objects
      for (let i = 0; i < 100; i++) {
        callback();
      }
    }
  },
  physicsManager: {
    world: {
      bodies: Array(10).fill({}) // 10 mock physics bodies
    }
  }
};

// Mock document and window
global.document = {
  createElement: () => ({
    style: {},
    appendChild: () => {}
  }),
  getElementById: () => null,
  body: {
    appendChild: () => {}
  }
};

global.window = {
  addEventListener: () => {},
  performance: {
    now: () => Date.now(),
    memory: {
      jsHeapSizeLimit: 2147483648,
      totalJSHeapSize: 50000000,
      usedJSHeapSize: 40000000
    }
  }
};

// Import the PerformanceManager
const { PerformanceManager } = require('../managers/PerformanceManager.js');

/**
 * Run a simple test of the PerformanceManager functionality
 */
function runTest() {
  console.log('=== PerformanceManager Test ===');

  // Create a performance manager instance
  const performanceManager = new PerformanceManager(mockGame);

  // Initialize the manager
  performanceManager.init();
  console.log('✓ PerformanceManager initialized successfully');

  // Test timer functions
  console.log('\nTesting timer functions:');
  performanceManager.startTimer('testTimer');

  // Simulate some work
  let sum = 0;
  for (let i = 0; i < 1000000; i++) {
    sum += i;
  }

  const elapsed = performanceManager.endTimer('testTimer');
  console.log(`✓ Timer worked: ${elapsed.toFixed(2)}ms elapsed`);

  // Test frame tracking
  console.log('\nTesting frame tracking:');

  // Simulate several frames
  for (let i = 0; i < 10; i++) {
    performanceManager.beginFrame();

    // Simulate physics work
    performanceManager.startTimer('physics');
    for (let j = 0; j < 100000; j++) {
      sum += j * 0.01;
    }
    performanceManager.endTimer('physics');

    // Simulate render work
    performanceManager.startTimer('render');
    for (let j = 0; j < 200000; j++) {
      sum += j * 0.005;
    }
    performanceManager.endTimer('render');

    performanceManager.endFrame();
  }

  console.log('✓ Processed 10 frames successfully');
  console.log(`Final sum: ${sum}`); // Use the sum variable

  // Test performance data retrieval
  const perfData = performanceManager.getPerformanceData();
  console.log('\nPerformance data:');
  console.log(`✓ FPS: ${perfData.fps.current}`);
  console.log(`✓ Frame time: ${perfData.frameTime.current}ms`);
  console.log(`✓ Physics time: ${perfData.physics.current}ms`);
  console.log(`✓ Render time: ${perfData.render.current}ms`);

  // Test memory stats
  performanceManager.updateMemoryStats();
  const memoryData = performanceManager.getPerformanceData().memory;
  console.log('\nMemory data:');
  console.log(`✓ Used memory: ${memoryData.usedMB}MB`);

  // Test object counts
  const objectCounts = performanceManager.getPerformanceData().objects;
  console.log('\nObject counts:');
  console.log(`✓ Three.js objects: ${objectCounts.three}`);
  console.log(`✓ Physics bodies: ${objectCounts.physics}`);

  // Test debug output
  const debugString = performanceManager.getDebugString();
  console.log('\nDebug string:');
  console.log(`✓ ${debugString}`);

  // Test cleanup
  performanceManager.cleanup();
  console.log('\n✓ Cleanup completed successfully');

  console.log('\n=== All tests passed ===');
}

// Run the test
runTest();
