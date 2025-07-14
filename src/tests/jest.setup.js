/**
 * Jest setup file to configure test environment
 */

// Silence console output during tests

// Store original console methods before mocking
const originalConsoleError = console.error;

// Mock console methods to reduce noise during tests
console.log = jest.fn();
console.warn = jest.fn();

// Keep critical errors visible by restoring console.error for specific patterns
console.error = jest.fn((message, ...args) => {
  // Only show critical errors that aren't test-related
  if (
    typeof message === 'string' &&
    (message.includes('CRITICAL') ||
      message.includes('FATAL') ||
      message.includes('TypeError') ||
      message.includes('ReferenceError'))
  ) {
    originalConsoleError(message, ...args);
  }
});

// Note: Console methods will be restored when the test process ends

// Set environment variable to disable debug logging
process.env.NODE_ENV = 'test';
process.env.DISABLE_DEBUG_LOGGING = 'true';

// Mock Three.js OrbitControls to avoid ES module import issues
jest.mock('three/examples/jsm/controls/OrbitControls', () => ({
  OrbitControls: jest.fn(() => ({
    enableDamping: true,
    dampingFactor: 0.1,
    enableZoom: true,
    enablePan: true,
    maxPolarAngle: Math.PI / 2,
    minDistance: 2,
    maxDistance: 50,
    target: { set: jest.fn() },
    update: jest.fn(),
    dispose: jest.fn()
  }))
}));

// Mock additional Three.js classes needed by tests
jest.mock(
  'three',
  () => {
    const originalThree = jest.requireActual('three');
    return {
      ...originalThree,
      AudioListener: jest.fn(() => ({
        context: { state: 'running' },
        getInput: jest.fn(),
        removeFilter: jest.fn(),
        setFilter: jest.fn()
      })),
      Audio: jest.fn(() => ({
        setVolume: jest.fn().mockReturnThis(),
        play: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        setBuffer: jest.fn().mockReturnThis(),
        isPlaying: false
      })),
      Group: jest.fn(() => ({
        add: jest.fn(),
        remove: jest.fn(),
        children: [],
        name: '',
        userData: {},
        position: { x: 0, y: 0, z: 0, set: jest.fn() },
        rotation: { x: 0, y: 0, z: 0, set: jest.fn() },
        scale: { x: 1, y: 1, z: 1, set: jest.fn() }
      })),
      WebGLRenderer: jest.fn(() => ({
        setSize: jest.fn(),
        setClearColor: jest.fn(),
        setPixelRatio: jest.fn(),
        render: jest.fn(),
        dispose: jest.fn(),
        domElement: { nodeName: 'CANVAS' },
        capabilities: {},
        shadowMap: { enabled: false }
      })),
      PerspectiveCamera: jest.fn(() => ({
        position: { set: jest.fn(), copy: jest.fn() },
        lookAt: jest.fn(),
        add: jest.fn(),
        updateProjectionMatrix: jest.fn()
      }))
    };
  },
  { virtual: true }
);
