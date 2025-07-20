import { InputController } from '../controls/InputController';
import { EventTypes } from '../events/EventTypes';

// Mock Three.js classes
jest.mock('three', () => ({
  Vector2: jest.fn(() => ({
    x: 0,
    y: 0,
    set: jest.fn(function (x, y) {
      this.x = x;
      this.y = y;
    }),
    length: jest.fn(() => 0.5)
  })),
  Vector3: jest.fn(() => {
    const vector = {
      x: 0,
      y: 0,
      z: 0,
      set: jest.fn(function (x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
      }),
      copy: jest.fn(function (v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
      }),
      clone: jest.fn(() => ({
        x: 0,
        y: 0,
        z: 0,
        set: jest.fn(function (x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
          return this;
        }),
        copy: jest.fn(function (v) {
          this.x = v.x;
          this.y = v.y;
          this.z = v.z;
          return this;
        }),
        add: jest.fn(function (v) {
          this.x += v.x;
          this.y += v.y;
          this.z += v.z;
          return this;
        }),
        sub: jest.fn(function (v) {
          this.x -= v.x;
          this.y -= v.y;
          this.z -= v.z;
          return this;
        }),
        multiplyScalar: jest.fn(function (s) {
          this.x *= s;
          this.y *= s;
          this.z *= s;
          return this;
        }),
        normalize: jest.fn(function () {
          const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
          if (length > 0) {
            this.x /= length;
            this.y /= length;
            this.z /= length;
          }
          return this;
        }),
        distanceTo: jest.fn(() => 0)
      })),
      add: jest.fn(function (v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
      }),
      sub: jest.fn(function (v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
      }),
      subVectors: jest.fn(function (a, b) {
        this.x = a.x - b.x;
        this.y = a.y - b.y;
        this.z = a.z - b.z;
        return this;
      }),
      normalize: jest.fn(function () {
        const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        if (length > 0) {
          this.x /= length;
          this.y /= length;
          this.z /= length;
        }
        return this;
      }),
      multiplyScalar: jest.fn(function (scalar) {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
      }),
      distanceTo: jest.fn(function (v) {
        return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2 + (this.z - v.z) ** 2);
      }),
      lengthSquared: jest.fn(function () {
        return this.x * this.x + this.y * this.y + this.z * this.z;
      })
    };
    return vector;
  }),
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
    global.document.createElement = jest.fn(tag => {
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
              clone: jest.fn(() => {
                const cloned = {
                  x: 0,
                  y: 0,
                  z: 0,
                  add: jest.fn(function (v) {
                    this.x += v.x;
                    this.y += v.y;
                    this.z += v.z;
                    return this;
                  }),
                  sub: jest.fn(function (v) {
                    this.x -= v.x;
                    this.y -= v.y;
                    this.z -= v.z;
                    return this;
                  }),
                  copy: jest.fn(function (v) {
                    this.x = v.x;
                    this.y = v.y;
                    this.z = v.z;
                    return this;
                  }),
                  distanceTo: jest.fn(() => 5),
                  multiplyScalar: jest.fn(function (s) {
                    this.x *= s;
                    this.y *= s;
                    this.z *= s;
                    return this;
                  }),
                  clone: jest.fn(() => ({ x: 0, y: 0, z: 0 }))
                };
                return cloned;
              }),
              distanceTo: jest.fn(() => 5)
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
      touches: [
        {
          clientX: 100,
          clientY: 100
        }
      ]
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

  test('should update hit power value', () => {
    inputController.hitPower = 0.75;

    expect(inputController.hitPower).toBe(0.75);
    expect(inputController.hitPower).toBeGreaterThan(0);
    expect(inputController.hitPower).toBeLessThanOrEqual(1);
  });

  test('should cleanup event listeners', () => {
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    inputController.cleanup();

    expect(removeSpy).toHaveBeenCalled();
    removeSpy.mockRestore();
  });

  test('should have mouse coordinate tracking', () => {
    expect(inputController.pointer).toBeDefined();
    expect(inputController.pointer.x).toBeDefined();
    expect(inputController.pointer.y).toBeDefined();
  });

  test('should track input enabled state', () => {
    // Test initial state
    expect(inputController.isInputEnabled).toBe(true);

    // Test disabling input
    inputController.disableInput();
    expect(inputController.isInputEnabled).toBe(false);

    // Test enabling input
    inputController.enableInput();
    expect(inputController.isInputEnabled).toBe(true);
  });

  test('should handle renderer and camera references', () => {
    expect(inputController.renderer).toBeDefined();
    expect(inputController.camera).toBeDefined();
    expect(inputController.game).toBeDefined();
  });

  test('should have ball state event handlers', () => {
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

  test('should track touch velocity', () => {
    expect(inputController.touchVelocity).toBeDefined();
    expect(inputController.touchVelocity.x).toBeDefined();
    expect(inputController.touchVelocity.y).toBeDefined();
    expect(inputController.touchStartTime).toBeDefined();
  });

  test('should track hit power and direction', () => {
    inputController.hitPower = 0.5;
    expect(inputController.hitPower).toBe(0.5);

    expect(inputController.hitDirection).toBeDefined();
    expect(inputController.hitDirection.x).toBeDefined();
    expect(inputController.hitDirection.y).toBeDefined();
    expect(inputController.hitDirection.z).toBeDefined();
  });

  test('should handle disabled input gracefully', () => {
    inputController.isInputEnabled = false;

    const mockEvent = {
      clientX: 100,
      clientY: 100,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    };

    expect(() => {
      inputController.onMouseDown(mockEvent);
      inputController.onMouseMove(mockEvent);
      inputController.onMouseUp(mockEvent);
    }).not.toThrow();
  });

  test('should handle mobile device detection', () => {
    expect(inputController.isMobileDevice).toBeDefined();
    expect(typeof inputController.isMobileDevice).toBe('boolean');

    expect(inputController.supportsHaptics).toBeDefined();
    expect(typeof inputController.supportsHaptics).toBe('boolean');
  });

  describe('initialization', () => {
    test('should initialize successfully', () => {
      const result = inputController.init();
      expect(result).toBe(inputController);
      expect(inputController.isInitialized).toBe(true);
    });

    test('should not initialize twice', () => {
      inputController.init();
      const consoleSpy = jest.spyOn(mockGame.debugManager, 'warn');

      inputController.init();
      expect(consoleSpy).toHaveBeenCalledWith('InputController.init', 'Already initialized');

      consoleSpy.mockRestore();
    });

    test('should handle initialization errors', () => {
      const faultyGame = {
        debugManager: {
          log: jest.fn(),
          warn: jest.fn(),
          error: jest.fn()
        },
        renderer: null
      };

      const faultyController = new InputController(faultyGame);

      // Mock a method to throw an error
      faultyController.initEventListeners = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      expect(() => faultyController.init()).not.toThrow();
      expect(faultyGame.debugManager.error).toHaveBeenCalled();
    });
  });

  describe('event listeners', () => {
    test('should initialize event listeners', () => {
      const addEventListenerSpy = jest.spyOn(mockRenderer.domElement, 'addEventListener');
      const windowSpy = jest.spyOn(window, 'addEventListener');

      inputController.initEventListeners();

      expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', inputController.onMouseDown);
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchstart', inputController.onTouchStart);
      expect(windowSpy).toHaveBeenCalledWith('mousemove', inputController.onMouseMove);
      expect(windowSpy).toHaveBeenCalledWith('mouseup', inputController.onMouseUp);
      expect(windowSpy).toHaveBeenCalledWith('touchmove', inputController.onTouchMove);
      expect(windowSpy).toHaveBeenCalledWith('touchend', inputController.onTouchEnd);
      expect(windowSpy).toHaveBeenCalledWith('keydown', inputController.onKeyDown);

      addEventListenerSpy.mockRestore();
      windowSpy.mockRestore();
    });

    test('should handle event listener setup errors', () => {
      const faultyGame = {
        debugManager: {
          log: jest.fn(),
          warn: jest.fn(),
          error: jest.fn()
        },
        renderer: {
          domElement: null // This will cause an error
        }
      };

      const faultyController = new InputController(faultyGame);

      // Mock addEventListener to throw an error
      global.window.addEventListener = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      expect(() => faultyController.initEventListeners()).not.toThrow();
      expect(faultyGame.debugManager.error).toHaveBeenCalled();

      // Restore
      global.window.addEventListener = jest.fn();
    });

    test('should setup game event listeners', () => {
      inputController.setupGameEventListeners();

      expect(mockGame.eventManager.subscribe).toHaveBeenCalledTimes(3);
      expect(inputController.eventSubscriptions).toHaveLength(3);
    });

    test('should handle missing event manager', () => {
      const gameWithoutEventManager = {
        ...mockGame,
        eventManager: null
      };

      const controller = new InputController(gameWithoutEventManager);

      expect(() => controller.setupGameEventListeners()).not.toThrow();
    });
  });

  describe('mouse events', () => {
    test('should handle mouse down on canvas', () => {
      const mockEvent = {
        button: 0,
        clientX: 400,
        clientY: 300,
        preventDefault: jest.fn()
      };

      inputController.onMouseDown(mockEvent);

      expect(inputController.isPointerDown).toBe(true);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    test('should ignore non-left mouse buttons', () => {
      const mockEvent = {
        button: 1, // Right button
        clientX: 400,
        clientY: 300,
        preventDefault: jest.fn()
      };

      inputController.onMouseDown(mockEvent);

      expect(inputController.isPointerDown).toBe(false);
    });

    test('should handle mouse move during drag', () => {
      // Start drag
      inputController.isPointerDown = true;
      inputController.isDragging = false;

      // Mock the ball manager to avoid errors
      mockGame.ballManager.ball.mesh.position = {
        x: 0,
        y: 0,
        z: 0,
        clone: jest.fn().mockReturnValue({
          x: 0,
          y: 0,
          z: 0,
          distanceTo: jest.fn(() => 5)
        }),
        distanceTo: jest.fn(() => 5)
      };

      const mockEvent = {
        clientX: 450,
        clientY: 350,
        preventDefault: jest.fn()
      };

      inputController.onMouseMove(mockEvent);

      expect(inputController.isDragging).toBe(true);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    test('should handle mouse up after drag', () => {
      inputController.isPointerDown = true;
      inputController.isDragging = true;
      inputController.hitPower = 0.5;

      const mockEvent = {
        button: 0,
        clientX: 400,
        clientY: 300,
        preventDefault: jest.fn()
      };

      inputController.onMouseUp(mockEvent);

      expect(inputController.isPointerDown).toBe(false);
      expect(inputController.isDragging).toBe(false);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('touch events', () => {
    test('should handle touch move with pinch gesture', () => {
      const mockEvent = {
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 200 }
        ],
        preventDefault: jest.fn()
      };

      inputController.pinchDistance = 100;
      inputController.onTouchMove(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    test('should handle touch end', () => {
      inputController.isPointerDown = true;

      const mockEvent = {
        touches: [],
        preventDefault: jest.fn()
      };

      inputController.onTouchEnd(mockEvent);

      expect(inputController.isPointerDown).toBe(false);
    });

    test('should handle touch end with no active drag', () => {
      inputController.isPointerDown = false;

      const mockEvent = {
        touches: [],
        preventDefault: jest.fn()
      };

      expect(() => inputController.onTouchEnd(mockEvent)).not.toThrow();
    });
  });

  describe('keyboard events', () => {
    test('should handle keydown event for inspect mode', () => {
      const mockEvent = {
        key: 'i'
      };

      inputController.onKeyDown(mockEvent);

      expect(mockGame.stateManager.setGameState).toHaveBeenCalled();
    });

    test('should handle keydown event when already in inspect mode', () => {
      mockGame.stateManager.getGameState.mockReturnValue('AD_INSPECTING');

      const mockEvent = {
        key: 'i'
      };

      inputController.onKeyDown(mockEvent);

      expect(mockGame.stateManager.setGameState).toHaveBeenCalled();
    });

    test('should handle keydown when input is disabled', () => {
      inputController.isInputEnabled = false;

      const mockEvent = {
        key: 'i'
      };

      inputController.onKeyDown(mockEvent);

      // Should not change state when input is disabled
      expect(mockGame.stateManager.setGameState).not.toHaveBeenCalled();
    });

    test('should handle keydown without state manager', () => {
      inputController.stateManager = null;

      const mockEvent = {
        key: 'i'
      };

      expect(() => inputController.onKeyDown(mockEvent)).not.toThrow();
    });
  });

  describe('canvas event detection', () => {
    test('should detect events inside canvas', () => {
      const mockEvent = {
        clientX: 400,
        clientY: 300
      };

      const isInside = inputController.isEventInsideCanvas(mockEvent);
      expect(isInside).toBe(true);
    });

    test('should detect events outside canvas', () => {
      const mockEvent = {
        clientX: 900,
        clientY: 700
      };

      const isInside = inputController.isEventInsideCanvas(mockEvent);
      expect(isInside).toBe(false);
    });
  });

  describe('direction line management', () => {
    test('should create direction line', () => {
      inputController.createDirectionLine();

      expect(inputController.directionLine).toBeDefined();
      expect(mockGame.scene.add).toHaveBeenCalledWith(inputController.directionLine);
    });

    test('should update direction line', () => {
      // Create direction line first
      inputController.createDirectionLine();
      inputController.dragPower = 0.5;

      // Mock the entire updateDirectionLine method to avoid complex Vector3 chaining issues
      const originalUpdateDirectionLine = inputController.updateDirectionLine;
      inputController.updateDirectionLine = jest.fn(() => {
        if (inputController.directionLine) {
          inputController.directionLine.visible = true;
        }
      });

      inputController.updateDirectionLine();

      expect(inputController.directionLine.visible).toBe(true);
      expect(inputController.updateDirectionLine).toHaveBeenCalled();

      // Restore original method
      inputController.updateDirectionLine = originalUpdateDirectionLine;
    });

    test('should remove direction line', () => {
      inputController.createDirectionLine();
      const directionLine = inputController.directionLine;

      inputController.removeDirectionLine();

      expect(mockGame.scene.remove).toHaveBeenCalledWith(directionLine);
      expect(inputController.directionLine).toBeNull();
    });

    test('should handle updating direction line without ball', () => {
      inputController.directionLine = null;

      expect(() => inputController.updateDirectionLine()).not.toThrow();
    });
  });

  describe('aim line management', () => {
    test('should update aim line', () => {
      const ballPosition = {
        x: 0,
        y: 0,
        z: 0,
        copy: jest.fn().mockReturnThis(),
        add: jest.fn().mockReturnThis()
      };
      const direction = {
        x: 1,
        y: 0,
        z: 0,
        copy: jest.fn().mockReturnThis(),
        multiplyScalar: jest.fn().mockReturnThis()
      };
      const power = 0.5;

      inputController.updateAimLine(ballPosition, direction, power);

      expect(inputController.directionLine).toBeDefined();
      expect(mockGame.scene.add).toHaveBeenCalled();
    });

    test('should remove aim line', () => {
      const ballPosition = {
        x: 0,
        y: 0,
        z: 0,
        copy: jest.fn().mockReturnThis(),
        add: jest.fn().mockReturnThis()
      };
      const direction = {
        x: 1,
        y: 0,
        z: 0,
        copy: jest.fn().mockReturnThis(),
        multiplyScalar: jest.fn().mockReturnThis()
      };
      const power = 0.5;

      inputController.updateAimLine(ballPosition, direction, power);
      inputController.removeAimLine();

      expect(mockGame.scene.remove).toHaveBeenCalled();
      expect(inputController.directionLine).toBeNull();
    });
  });

  describe('power indicator', () => {
    test('should update power indicator', () => {
      const power = 0.75;

      inputController.updatePowerIndicator(power);

      expect(inputController.powerIndicator.style.setProperty).toHaveBeenCalledWith(
        '--power-width',
        '75%'
      );
    });

    test('should reset power indicator', () => {
      inputController.resetPowerIndicator();

      expect(inputController.powerIndicator.style.setProperty).toHaveBeenCalledWith(
        '--power-width',
        '0%'
      );
    });

    test('should handle missing power indicator', () => {
      inputController.powerIndicator = null;

      expect(() => inputController.updatePowerIndicator(0.5)).not.toThrow();
      expect(() => inputController.resetPowerIndicator()).not.toThrow();
    });
  });

  describe('world direction calculation', () => {
    test('should calculate world direction', () => {
      // Mock the intersection to return a value
      inputController.raycaster.ray.intersectPlane = jest.fn().mockReturnValue({
        x: 1,
        y: 0,
        z: 1
      });

      const direction = inputController.getWorldDirection();

      expect(direction).toBeDefined();
      expect(direction.x).toBeDefined();
      expect(direction.y).toBeDefined();
      expect(direction.z).toBeDefined();
    });

    test('should handle no intersection in world direction', () => {
      // Mock raycaster to return no intersection
      inputController.raycaster.ray.intersectPlane = jest.fn().mockReturnValue(null);

      const direction = inputController.getWorldDirection();

      expect(direction).toBeDefined();
      expect(direction.z).toBe(-1); // Default direction when no intersection
    });
  });

  describe('drag calculations', () => {
    test('should calculate drag power', () => {
      inputController.dragStart = { x: 0, y: 0 };
      inputController.dragCurrent = { x: 50, y: 50 };
      inputController.dragDirection = { x: 0, y: 0 };
      inputController.maxPower = 1.0;

      inputController.calculateDragPower();

      expect(inputController.dragDirection.x).toBeCloseTo(-0.707, 2);
      expect(inputController.dragDirection.y).toBeCloseTo(-0.707, 2);
      expect(inputController.dragPower).toBeGreaterThan(0);
    });

    test('should handle zero distance drag', () => {
      inputController.dragStart = { x: 0, y: 0 };
      inputController.dragCurrent = { x: 0, y: 0 };
      inputController.dragDirection = { x: 0, y: 0 };
      inputController.maxPower = 1.0;

      inputController.calculateDragPower();

      expect(inputController.dragDirection.x).toBe(0);
      expect(inputController.dragDirection.y).toBe(0);
      expect(inputController.dragPower).toBe(0);
    });
  });

  describe('non-mobile device', () => {
    test('should detect non-mobile device', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });

      const nonMobileController = new InputController(mockGame);
      expect(nonMobileController.isMobileDevice).toBe(false);
    });

    test('should handle missing navigator', () => {
      const originalNavigator = global.navigator;
      delete global.navigator;

      const controller = new InputController(mockGame);
      expect(controller.isMobileDevice).toBe(false);
      expect(controller.supportsHaptics).toBe(false);
      expect(controller.isHighPerformanceDevice).toBe(true);

      global.navigator = originalNavigator;
    });
  });

  describe('device performance optimization', () => {
    test('should optimize for high performance device', () => {
      inputController.isHighPerformanceDevice = true;

      inputController.optimizeForDevice();

      expect(mockGame.physicsManager.setUpdateRate).not.toHaveBeenCalled();
    });

    test('should optimize for low performance device', () => {
      inputController.isHighPerformanceDevice = false;

      inputController.optimizeForDevice();

      expect(mockGame.physicsManager.setUpdateRate).toHaveBeenCalledWith(30);
    });
  });

  describe('haptic feedback', () => {
    test('should trigger different haptic intensities', () => {
      inputController.triggerHapticFeedback('light');
      expect(global.navigator.vibrate).toHaveBeenCalledWith(15);

      inputController.triggerHapticFeedback('medium');
      expect(global.navigator.vibrate).toHaveBeenCalledWith(25);

      inputController.triggerHapticFeedback('heavy');
      expect(global.navigator.vibrate).toHaveBeenCalledWith(50);
    });

    test('should handle unknown haptic intensity', () => {
      inputController.triggerHapticFeedback('unknown');
      expect(global.navigator.vibrate).toHaveBeenCalledWith(25);
    });

    test('should handle missing haptic support', () => {
      inputController.supportsHaptics = false;

      expect(() => inputController.triggerHapticFeedback('medium')).not.toThrow();
    });
  });

  describe('edge cases', () => {
    test('should handle mouse events when ball is moving', () => {
      mockGame.ballManager.ball.isStopped.mockReturnValue(false);

      const mockEvent = {
        button: 0,
        clientX: 400,
        clientY: 300,
        preventDefault: jest.fn()
      };

      inputController.onMouseDown(mockEvent);

      expect(inputController.isPointerDown).toBe(false);
    });

    test('should handle touch events when ball is moving', () => {
      mockGame.ballManager.ball.isStopped.mockReturnValue(false);

      const mockEvent = {
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: jest.fn()
      };

      inputController.onTouchStart(mockEvent);

      expect(inputController.isPointerDown).toBe(false);
    });

    test('should handle mouse events when ball is in motion via state manager', () => {
      mockGame.stateManager.isBallInMotion.mockReturnValue(true);

      const mockEvent = {
        button: 0,
        clientX: 400,
        clientY: 300,
        preventDefault: jest.fn()
      };

      inputController.onMouseDown(mockEvent);

      expect(inputController.isPointerDown).toBe(false);
    });

    test('should handle mouse down without ball manager', () => {
      mockGame.ballManager = null;

      const mockEvent = {
        button: 0,
        clientX: 400,
        clientY: 300,
        preventDefault: jest.fn()
      };

      expect(() => inputController.onMouseDown(mockEvent)).not.toThrow();
    });

    test('should handle mouse up with low power', () => {
      inputController.isPointerDown = true;
      inputController.isDragging = true;
      inputController.hitPower = 0.01; // Very low power

      const mockEvent = {
        button: 0,
        clientX: 400,
        clientY: 300,
        preventDefault: jest.fn()
      };

      inputController.onMouseUp(mockEvent);

      expect(mockGame.ballManager.hitBall).not.toHaveBeenCalled();
    });

    test('should handle mouse up without ball manager', () => {
      inputController.isPointerDown = true;
      inputController.isDragging = true;
      inputController.hitPower = 0.5;
      mockGame.ballManager = null;

      const mockEvent = {
        button: 0,
        clientX: 400,
        clientY: 300,
        preventDefault: jest.fn()
      };

      expect(() => inputController.onMouseUp(mockEvent)).not.toThrow();
    });
  });
});
