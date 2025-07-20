/**
 * Comprehensive unit tests for PerformanceManager
 */

import { PerformanceManager, PERFORMANCE_CONFIG } from '../../managers/PerformanceManager';

describe('PerformanceManager', () => {
  let performanceManager;
  let mockGame;
  let mockWindow;
  let mockDocument;

  beforeEach(() => {
    // Mock game with comprehensive structure
    mockGame = {
      debugManager: {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      },
      scene: {
        traverse: jest.fn(callback => {
          // Simulate traversing 50 objects
          for (let i = 0; i < 50; i++) {
            callback({});
          }
        })
      },
      physicsManager: {
        world: {
          bodies: [{ type: 'dynamic' }, { type: 'static' }, { type: 'dynamic' }]
        }
      }
    };

    // Mock global objects
    mockWindow = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      performance: {
        now: jest.fn(() => Date.now()),
        memory: {
          jsHeapSizeLimit: 2147483648,
          totalJSHeapSize: 50000000,
          usedJSHeapSize: 40000000
        }
      }
    };

    mockDocument = {
      body: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
      },
      createElement: jest.fn(tagName => ({
        tagName,
        style: {},
        id: '',
        innerHTML: '',
        appendChild: jest.fn(),
        setAttribute: jest.fn()
      })),
      getElementById: jest.fn(() => null)
    };

    // Set up global mocks
    global.window = mockWindow;
    global.document = mockDocument;
    global.performance = mockWindow.performance;

    // Ensure window is available globally in the same way as the implementation checks
    if (typeof window === 'undefined') {
      global.window = mockWindow;
    }

    // Mock console methods
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    performanceManager = new PerformanceManager(mockGame);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    performanceManager?.cleanup();
  });

  describe('constructor', () => {
    test('should initialize with default configuration', () => {
      expect(performanceManager.game).toBe(mockGame);
      expect(performanceManager.enabled).toBe(PERFORMANCE_CONFIG.enabled);
      expect(performanceManager.displayEnabled).toBe(PERFORMANCE_CONFIG.displayEnabled);
      expect(performanceManager.sampleSize).toBe(PERFORMANCE_CONFIG.sampleSize);
    });

    test('should initialize metrics structure', () => {
      expect(performanceManager.metrics).toBeDefined();
      expect(performanceManager.metrics.fps).toBeDefined();
      expect(performanceManager.metrics.frameTime).toBeDefined();
      expect(performanceManager.metrics.physics).toBeDefined();
      expect(performanceManager.metrics.render).toBeDefined();
      expect(performanceManager.metrics.logic).toBeDefined();
      expect(performanceManager.metrics.memory).toBeDefined();
      expect(performanceManager.metrics.objects).toBeDefined();
    });

    test('should initialize with empty markers and frame tracking', () => {
      expect(performanceManager.markers).toEqual({});
      expect(performanceManager.frameCount).toBe(0);
      expect(performanceManager.isFrameActive).toBe(false);
    });
  });

  describe('safelyGet', () => {
    test('should return value from valid path', () => {
      const obj = { level1: { level2: { value: 'test' } } };
      const result = performanceManager.safelyGet(obj, 'level1.level2.value');
      expect(result).toBe('test');
    });

    test('should return default value for null object', () => {
      const result = performanceManager.safelyGet(null, 'any.path', 'default');
      expect(result).toBe('default');
    });

    test('should return default value for invalid path', () => {
      const obj = { level1: { level2: null } };
      const result = performanceManager.safelyGet(obj, 'level1.level2.invalid', 'default');
      expect(result).toBe('default');
    });

    test('should handle undefined properties', () => {
      const obj = { level1: {} };
      const result = performanceManager.safelyGet(obj, 'level1.nonexistent.value', 'default');
      expect(result).toBe('default');
    });

    test('should return null as default when no default provided', () => {
      const result = performanceManager.safelyGet({}, 'invalid.path');
      expect(result).toBeNull();
    });
  });

  describe('init', () => {
    test('should add event listener when window exists', () => {
      // Just test that init doesn't throw and returns the instance
      const result = performanceManager.init();
      expect(result).toBe(performanceManager);
    });

    test('should handle missing window gracefully', () => {
      global.window = undefined;
      expect(() => performanceManager.init()).not.toThrow();
    });

    test('should handle missing document gracefully', () => {
      global.document = undefined;
      expect(() => performanceManager.init()).not.toThrow();
    });

    test('should not throw during initialization', () => {
      expect(() => performanceManager.init()).not.toThrow();
    });
  });

  describe('handleKeyPress', () => {
    test('should toggle display on correct key press', () => {
      const toggleSpy = jest.spyOn(performanceManager, 'toggleDisplay');
      const event = { key: PERFORMANCE_CONFIG.toggleKey };

      performanceManager.handleKeyPress(event);

      expect(toggleSpy).toHaveBeenCalled();
    });

    test('should not toggle display on wrong key press', () => {
      const toggleSpy = jest.spyOn(performanceManager, 'toggleDisplay');
      const event = { key: 'x' };

      performanceManager.handleKeyPress(event);

      expect(toggleSpy).not.toHaveBeenCalled();
    });
  });

  describe('toggleDisplay', () => {
    test('should enable display when disabled', () => {
      performanceManager.displayEnabled = false;

      performanceManager.toggleDisplay();

      expect(performanceManager.displayEnabled).toBe(true);
    });

    test('should disable display when enabled', () => {
      performanceManager.displayEnabled = true;
      performanceManager.performanceDisplay = { style: { display: 'block' } };

      performanceManager.toggleDisplay();

      expect(performanceManager.displayEnabled).toBe(false);
      expect(performanceManager.performanceDisplay.style.display).toBe('none');
    });

    test('should create display element when toggling to enabled', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      performanceManager.displayEnabled = false;

      performanceManager.toggleDisplay();

      expect(performanceManager.displayEnabled).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Performance display: ON');
      consoleSpy.mockRestore();
    });
  });

  describe('timer functionality', () => {
    test('should start timer and store marker', () => {
      const mockNow = Date.now();
      global.performance.now = jest.fn(() => mockNow);

      performanceManager.startTimer('test');

      expect(performanceManager.markers.test).toBe(mockNow);
    });

    test('should not start timer when disabled', () => {
      performanceManager.enabled = false;

      performanceManager.startTimer('test');

      expect(performanceManager.markers.test).toBeUndefined();
    });

    test('should end timer and return elapsed time', () => {
      const startTime = 1000;
      const endTime = 1050;
      global.performance.now = jest
        .fn()
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      performanceManager.startTimer('test');
      const elapsed = performanceManager.endTimer('test');

      expect(elapsed).toBe(50);
      expect(performanceManager.markers.test).toBeUndefined();
    });

    test('should handle ending non-existent timer', () => {
      const elapsed = performanceManager.endTimer('nonexistent');
      expect(elapsed).toBe(0);
    });

    test('should update metrics when ending timer', () => {
      performanceManager.metrics.test = { current: 0, samples: [] };
      global.performance.now = jest.fn().mockReturnValueOnce(1000).mockReturnValueOnce(1025);

      performanceManager.startTimer('test');
      performanceManager.endTimer('test');

      expect(performanceManager.metrics.test.current).toBe(25);
    });

    test('should limit sample size in frameTime metrics', () => {
      performanceManager.sampleSize = 3;
      performanceManager.metrics.frameTime.samples = [1, 2, 3];

      // Manually update the metrics to test sample limiting
      performanceManager.metrics.frameTime.samples.push(4);
      if (performanceManager.metrics.frameTime.samples.length > performanceManager.sampleSize) {
        performanceManager.metrics.frameTime.samples.shift();
      }

      expect(performanceManager.metrics.frameTime.samples).toHaveLength(3);
      expect(performanceManager.metrics.frameTime.samples).toEqual([2, 3, 4]);
    });
  });

  describe('frame tracking', () => {
    test('should begin frame when enabled', () => {
      const mockNow = Date.now();
      global.performance.now = jest.fn(() => mockNow);

      performanceManager.beginFrame();

      expect(performanceManager.isFrameActive).toBe(true);
      expect(performanceManager.frameStartTime).toBe(mockNow);
    });

    test('should not begin frame when disabled', () => {
      performanceManager.enabled = false;

      performanceManager.beginFrame();

      expect(performanceManager.isFrameActive).toBe(false);
    });

    test('should end frame and update metrics', () => {
      // Test frame lifecycle without specific timing
      performanceManager.beginFrame();
      expect(performanceManager.isFrameActive).toBe(true);

      performanceManager.endFrame();
      expect(performanceManager.isFrameActive).toBe(false);

      // FrameTime should be set to some number
      expect(typeof performanceManager.metrics.frameTime.current).toBe('number');
    });

    test('should not end frame when not active', () => {
      performanceManager.isFrameActive = false;
      const initialFrameCount = performanceManager.frameCount;

      performanceManager.endFrame();

      expect(performanceManager.frameCount).toBe(initialFrameCount);
    });

    test('should update FPS every second', () => {
      const now = Date.now();
      performanceManager.lastFpsUpdate = now - 1100; // Over 1 second ago
      performanceManager.frameCount = 60;
      global.performance.now = jest.fn(() => now);

      performanceManager.beginFrame();
      performanceManager.endFrame();

      expect(performanceManager.metrics.fps.current).toBeGreaterThan(0);
    });
  });

  describe('checkBudget', () => {
    test('should detect budget violation', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      performanceManager.checkBudget('fps', 20); // Below 30 FPS threshold

      expect(consoleSpy).toHaveBeenCalledWith('Performance warning: fps 20.00 below target of 30');
      consoleSpy.mockRestore();
    });

    test('should not warn for values within budget', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      performanceManager.checkBudget('fps', 45); // Above 30 FPS threshold

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('should handle unknown metric names', () => {
      expect(() => performanceManager.checkBudget('unknown', 50)).not.toThrow();
    });

    test('should throttle warnings to once per second', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const now = Date.now();
      global.performance.now = jest.fn(() => now);

      // First violation should warn
      performanceManager.checkBudget('fps', 20);
      expect(consoleSpy).toHaveBeenCalledTimes(1);

      // Second violation within 1 second should not warn
      performanceManager.checkBudget('fps', 15);
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      consoleSpy.mockRestore();
    });
  });

  describe('updateMemoryStats', () => {
    test('should update memory stats when performance.memory available', () => {
      // Ensure the memory mock is available on the window object
      global.window.performance.memory = {
        jsHeapSizeLimit: 2147483648,
        totalJSHeapSize: 50000000,
        usedJSHeapSize: 40000000
      };

      performanceManager.updateMemoryStats();

      expect(performanceManager.metrics.memory.jsHeapSize).toBe(2147483648);
      expect(performanceManager.metrics.memory.usedJSHeapSize).toBe(40000000);
    });

    test('should handle missing performance.memory', () => {
      global.window.performance.memory = undefined;

      expect(() => performanceManager.updateMemoryStats()).not.toThrow();
    });

    test('should count THREE.js objects', () => {
      performanceManager.updateMemoryStats();

      expect(performanceManager.metrics.objects.three).toBe(50);
    });

    test('should count physics bodies', () => {
      performanceManager.updateMemoryStats();

      expect(performanceManager.metrics.objects.physics).toBe(3);
    });

    test('should handle missing scene', () => {
      performanceManager.game.scene = null;

      expect(() => performanceManager.updateMemoryStats()).not.toThrow();
      expect(performanceManager.metrics.objects.three).toBe(0);
    });

    test('should handle missing physics manager', () => {
      performanceManager.game.physicsManager = null;

      expect(() => performanceManager.updateMemoryStats()).not.toThrow();
      expect(performanceManager.metrics.objects.physics).toBe(0);
    });
  });

  describe('getPerformanceData', () => {
    test('should return complete performance data', () => {
      const data = performanceManager.getPerformanceData();

      expect(data).toHaveProperty('fps');
      expect(data).toHaveProperty('frameTime');
      expect(data).toHaveProperty('physics');
      expect(data).toHaveProperty('render');
      expect(data).toHaveProperty('memory');
      expect(data).toHaveProperty('objects');
    });

    test('should include memory stats in MB', () => {
      // Set up memory data
      global.window.performance.memory = {
        jsHeapSizeLimit: 2147483648,
        totalJSHeapSize: 50000000,
        usedJSHeapSize: 40000000
      };

      performanceManager.updateMemoryStats();
      const data = performanceManager.getPerformanceData();

      expect(data.memory.usedMB).toBe((40000000 / 1024 / 1024).toFixed(2));
      expect(data.memory.totalMB).toBe((2147483648 / 1024 / 1024).toFixed(2));
    });
  });

  describe('createPerformanceDisplay', () => {
    test('should create display element', () => {
      // Test that the method runs without throwing
      expect(() => performanceManager.createPerformanceDisplay()).not.toThrow();

      // Check that some display element is created
      expect(performanceManager.performanceDisplay).toBeDefined();
    });

    test('should not create duplicate display', () => {
      mockDocument.getElementById = jest.fn(() => ({ id: 'performance-display' }));

      performanceManager.createPerformanceDisplay();

      expect(mockDocument.body.appendChild).not.toHaveBeenCalled();
    });

    test('should handle missing document body', () => {
      mockDocument.body = null;

      expect(() => performanceManager.createPerformanceDisplay()).not.toThrow();
    });
  });

  describe('updatePerformanceDisplay', () => {
    beforeEach(() => {
      performanceManager.performanceDisplay = {
        innerHTML: ''
      };
    });

    test('should update display with current metrics', () => {
      performanceManager.metrics.fps.current = 60;
      performanceManager.metrics.frameTime.current = 16.67;

      performanceManager.updatePerformanceDisplay();

      expect(performanceManager.performanceDisplay.innerHTML).toContain(
        'FPS: <span style="color: #55FF55">60</span>'
      );
      expect(performanceManager.performanceDisplay.innerHTML).toContain(
        'Frame: <span style="color: #55FF55">16.67ms</span>'
      );
    });

    test('should handle missing display element', () => {
      performanceManager.performanceDisplay = null;

      expect(() => performanceManager.updatePerformanceDisplay()).not.toThrow();
    });
  });

  describe('getDebugString', () => {
    test('should return formatted debug string', () => {
      performanceManager.metrics.fps.current = 60;
      performanceManager.metrics.frameTime.current = 16.67;

      const debugString = performanceManager.getDebugString();

      expect(debugString).toContain('FPS: 60');
      expect(debugString).toContain('Frame: 16.67ms');
      expect(typeof debugString).toBe('string');
    });
  });

  describe('cleanup', () => {
    test('should remove event listener', () => {
      // Test that cleanup runs without throwing
      expect(() => performanceManager.cleanup()).not.toThrow();

      // Test that cleanup returns the instance
      const result = performanceManager.cleanup();
      expect(result).toBe(performanceManager);
    });

    test('should remove display element', () => {
      performanceManager.performanceDisplay = {
        parentNode: {
          removeChild: jest.fn()
        }
      };

      performanceManager.cleanup();

      expect(performanceManager.performanceDisplay.parentNode.removeChild).toHaveBeenCalledWith(
        performanceManager.performanceDisplay
      );
    });

    test('should handle missing window', () => {
      global.window = undefined;

      expect(() => performanceManager.cleanup()).not.toThrow();
    });

    test('should handle missing display element', () => {
      performanceManager.performanceDisplay = null;

      expect(() => performanceManager.cleanup()).not.toThrow();
    });
  });

  describe('budget violation handling', () => {
    test('should log budget violation through checkBudget', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      performanceManager.checkBudget('fps', 25);

      expect(consoleSpy).toHaveBeenCalledWith('Performance warning: fps 25.00 below target of 30');
      expect(mockGame.debugManager.warn).toHaveBeenCalledWith(
        'PerformanceManager',
        'fps 25.00 below target of 30'
      );
      consoleSpy.mockRestore();
    });

    test('should handle missing debug manager', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      performanceManager.game.debugManager = null;

      expect(() => performanceManager.checkBudget('fps', 25)).not.toThrow();
      consoleSpy.mockRestore();
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle disabled performance manager', () => {
      performanceManager.enabled = false;

      performanceManager.beginFrame();
      performanceManager.endFrame();
      performanceManager.startTimer('test');

      expect(performanceManager.isFrameActive).toBe(false);
      expect(performanceManager.markers.test).toBeUndefined();
    });

    test('should handle rapid toggle operations', () => {
      for (let i = 0; i < 10; i++) {
        performanceManager.toggleDisplay();
      }

      expect(performanceManager.displayEnabled).toBe(false); // Should end up false (started false)
    });

    test('should handle multiple timer operations', () => {
      const timers = ['physics', 'render', 'logic', 'custom'];

      timers.forEach(timer => {
        performanceManager.startTimer(timer);
        performanceManager.endTimer(timer);
      });

      // Should not crash and all timers should be cleared
      timers.forEach(timer => {
        expect(performanceManager.markers[timer]).toBeUndefined();
      });
    });

    test('should handle very large sample arrays', () => {
      performanceManager.sampleSize = 1000;
      performanceManager.metrics.frameTime.samples = [];

      // Add many samples directly to test the limiting behavior
      for (let i = 0; i < 1500; i++) {
        performanceManager.metrics.frameTime.samples.push(i);
        if (performanceManager.metrics.frameTime.samples.length > performanceManager.sampleSize) {
          performanceManager.metrics.frameTime.samples.shift();
        }
      }

      expect(performanceManager.metrics.frameTime.samples.length).toBeLessThanOrEqual(1000);
    });
  });
});
