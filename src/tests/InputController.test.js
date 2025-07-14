import { InputController } from '../controls/InputController';
import { EventTypes } from '../events/EventTypes';

// Mock Three.js classes
jest.mock('three', () => ({
  Vector2: jest.fn(() => ({
    x: 0,
    y: 0,
    set: jest.fn(function(x, y) {
      this.x = x;
      this.y = y;
    }),
    length: jest.fn(() => 0.5)
  })),
  Vector3: jest.fn(() => ({
    x: 0,
    y: 0,
    z: 0,
    set: jest.fn(),
    copy: jest.fn(),
    clone: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
    add: jest.fn(),
    subVectors: jest.fn(),
    normalize: jest.fn(),
    multiplyScalar: jest.fn(),
    distanceTo: jest.fn(() => 0),
    lengthSquared: jest.fn(() => 0)
  })),
  Raycaster: jest.fn(() => ({
    setFromCamera: jest.fn(),
    intersectObjects: jest.fn(() => []),
    intersectObject: jest.fn(() => []),
    ray: {
      intersectPlane: jest.fn(() => ({ x: 0, y: 0, z: 0 }))
    }
  })),
  Plane: jest.fn(() => ({})),
  BufferGeometry: jest.fn(() => ({
    setFromPoints: jest.fn(),
    setAttribute: jest.fn(),
    dispose: jest.fn()
  })),
  LineBasicMaterial: jest.fn(() => ({
    dispose: jest.fn()
  })),
  Line: jest.fn(() => ({
    position: { y: 0 },
    visible: true,
    geometry: {
      attributes: {
        position: { needsUpdate: true }
      },
      dispose: jest.fn()
    },
    material: { dispose: jest.fn() }
  })),
  BufferAttribute: jest.fn(),
  Float32Array: jest.fn(),
  Color: jest.fn()
}));

describe('InputController', () => {
  let inputController;
  let mockGame;
  let mockRenderer;
  let mockCamera;

  beforeEach(() => {
    // Set up DOM environment
    if (!global.document) {
      global.document = {};
    }

    // Mock DOM elements
    global.document.getElementById = jest.fn().mockReturnValue({
      style: {
        display: 'none',
        setProperty: jest.fn()
      }
    });

    // Mock navigator for mobile detection
    if (!global.navigator) {
      global.navigator = {};
    }

    Object.defineProperty(global.navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
    });

    Object.defineProperty(global.navigator, 'deviceMemory', {
      writable: true,
      value: 4
    });

    Object.defineProperty(global.navigator, 'vibrate', {
      writable: true,
      value: jest.fn()
    });

    // Mock canvas context
    const mockContext = {
      getParameter: jest.fn().mockReturnValue('Apple GPU'),
      canvas: { width: 512, height: 512 }
    };

    // Set up createElement mock
    global.document.createElement = jest.fn((tag) => {
      if (tag === 'canvas') {
        return {
          getContext: jest.fn(() => mockContext),
          width: 512,
          height: 512
        };
      }
      return {};
    });

    // Mock window if not available
    if (!global.window) {
      global.window = {
        innerWidth: 800,
        innerHeight: 600,
        devicePixelRatio: 1,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };
    }

    mockRenderer = {
      domElement: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        getBoundingClientRect: jest.fn(() => ({
          left: 0,
          top: 0,
          right: 800,
          bottom: 600
        }))
      }
    };

    mockCamera = {
      getWorldDirection: jest.fn()
    };

    mockGame = {
      debugManager: {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      },
      eventManager: {
        publish: jest.fn(),
        subscribe: jest.fn(() => () => {}) // Return unsubscribe function
      },
      stateManager: {
        isBallInMotion: jest.fn(() => false),
        isHoleCompleted: jest.fn(() => false),
        getGameState: jest.fn(() => 'AIMING'),
        setGameState: jest.fn()
      },
      ballManager: {
        ball: {
          mesh: {
            position: {
              x: 0,
              y: 0,
              z: 0,
              clone: jest.fn(() => ({ x: 0, y: 0, z: 0 }))
            }
          },
          radius: 0.2,
          isStopped: jest.fn(() => true)
        },
        hitBall: jest.fn()
      },
      cameraController: {
        controls: {
          enabled: true
        },
        panCameraOnEdge: jest.fn(),
        adjustZoom: jest.fn(),
        optimizeForMobile: jest.fn(),
        setQualityLevel: jest.fn()
      },
      scene: {
        add: jest.fn(),
        remove: jest.fn()
      },
      renderer: mockRenderer,
      camera: mockCamera,
      physicsManager: {
        setUpdateRate: jest.fn()
      }
    };

    inputController = new InputController(mockGame);
  });

  afterEach(() => {
    if (inputController && typeof inputController.cleanup === 'function') {
      inputController.cleanup();
    }
  });

  test('should initialize with correct mobile detection', () => {
    expect(inputController.isMobileDevice).toBe(true);
    expect(inputController.supportsHaptics).toBe(true);
    expect(inputController.isHighPerformanceDevice).toBe(true);
  });

  test('should detect device performance correctly', () => {
    // Test high-performance detection
    expect(inputController.detectDevicePerformance()).toBe(true);

    // Test low-performance device
    Object.defineProperty(global.navigator, 'deviceMemory', {
      writable: true,
      value: 2
    });

    const lowPerfController = new InputController(mockGame);
    expect(lowPerfController.isHighPerformanceDevice).toBe(false);
  });

  test('should trigger haptic feedback', () => {
    inputController.triggerHapticFeedback('medium');
    expect(global.navigator.vibrate).toHaveBeenCalledWith(25);

    inputController.triggerHapticFeedback('heavy');
    expect(global.navigator.vibrate).toHaveBeenCalledWith(50);
  });

  test('should handle pinch zoom gestures', () => {
    const pinchDelta = 10;
    inputController.handlePinchZoom(pinchDelta);

    expect(mockGame.cameraController.adjustZoom).toHaveBeenCalled();
  });

  test('should apply mobile optimizations', () => {
    // Make it a low-performance device to trigger optimization
    inputController.isHighPerformanceDevice = false;

    inputController.optimizeForDevice();

    expect(mockGame.physicsManager.setUpdateRate).toHaveBeenCalledWith(30);
  });

  test('should handle touch start events', () => {
    const mockTouchEvent = {
      preventDefault: jest.fn(),
      touches: [{
        clientX: 100,
        clientY: 100
      }]
    };

    inputController.onTouchStart(mockTouchEvent);

    expect(mockTouchEvent.preventDefault).toHaveBeenCalled();
    expect(inputController.lastTouchPosition.x).toBe(100);
    expect(inputController.lastTouchPosition.y).toBe(100);
  });

  test('should handle multi-touch events', () => {
    const mockMultiTouchEvent = {
      preventDefault: jest.fn(),
      touches: [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 200 }
      ]
    };

    inputController.onTouchStart(mockMultiTouchEvent);

    expect(inputController.isMultiTouch).toBe(true);
    expect(inputController.pinchDistance).toBeGreaterThan(0);
  });

  test('should enable and disable input correctly', () => {
    inputController.disableInput();
    expect(inputController.isInputEnabled).toBe(false);
    expect(mockGame.eventManager.publish).toHaveBeenCalledWith(
      EventTypes.INPUT_DISABLED,
      expect.any(Object),
      inputController
    );

    inputController.enableInput();
    expect(inputController.isInputEnabled).toBe(true);
    expect(mockGame.eventManager.publish).toHaveBeenCalledWith(
      EventTypes.INPUT_ENABLED,
      expect.any(Object),
      inputController
    );
  });

  test('should detect quick tap gestures', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    inputController.touchStartTime = performance.now() - 100; // 100ms ago
    inputController.touchVelocity.length = jest.fn(() => 0.05); // Low velocity

    inputController.handleQuickTap();

    // Clean up
    logSpy.mockRestore();
  });

  test('should handle swipe gestures with velocity boost', () => {
    inputController.hitPower = 0.5;
    inputController.touchVelocity.length = jest.fn(() => 1.0); // High velocity

    const originalPower = inputController.hitPower;
    inputController.handleSwipeGesture();

    expect(inputController.hitPower).toBeGreaterThan(originalPower);
  });

  test('should handle ball state events', () => {
    // Test ball stopped event
    inputController.handleBallStopped();
    expect(inputController.isInputEnabled).toBe(true);

    // Test ball in hole event
    inputController.handleBallInHole();
    expect(inputController.isInputEnabled).toBe(false);

    // Test hole started event
    inputController.handleHoleStarted();
    expect(inputController.isInputEnabled).toBe(true);
  });
});
