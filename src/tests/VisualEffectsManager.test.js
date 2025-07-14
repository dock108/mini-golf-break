/**
 * Unit tests for VisualEffectsManager
 */

import { VisualEffectsManager } from '../managers/VisualEffectsManager';
import * as THREE from 'three';

describe('VisualEffectsManager', () => {
  let mockGame;
  let mockScene;
  let visualEffectsManager;

  beforeEach(() => {
    // Mock THREE objects
    Object.defineProperty(THREE, 'PointLight', {
      value: jest.fn(() => ({
        position: { set: jest.fn(), copy: jest.fn() },
        color: new THREE.Color(),
        intensity: 1,
        distance: 100,
        decay: 2
      })),
      writable: true,
      configurable: true
    });

    Object.defineProperty(THREE, 'Color', {
      value: jest.fn(() => ({
        setHex: jest.fn(),
        r: 1,
        g: 1,
        b: 1
      })),
      writable: true,
      configurable: true
    });

    // Setup mock scene
    mockScene = {
      add: jest.fn(),
      remove: jest.fn()
    };

    // Setup mock game object
    mockGame = {
      scene: mockScene,
      debugManager: {
        log: jest.fn()
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with game reference', () => {
      visualEffectsManager = new VisualEffectsManager(mockGame);

      expect(visualEffectsManager.game).toBe(mockGame);
      expect(visualEffectsManager.scene).toBe(mockScene);
      expect(visualEffectsManager.effects).toBeDefined();
      expect(Array.isArray(visualEffectsManager.effects)).toBe(true);
      expect(visualEffectsManager.effects.length).toBe(0);
    });
  });

  describe('init', () => {
    beforeEach(() => {
      visualEffectsManager = new VisualEffectsManager(mockGame);
    });

    test('should log initialization', () => {
      visualEffectsManager.init();

      expect(mockGame.debugManager.log).toHaveBeenCalledWith('[VisualEffectsManager] Initialized');
    });

    test('should set initialization flag', () => {
      expect(visualEffectsManager.isInitialized).toBeUndefined();

      visualEffectsManager.init();

      expect(visualEffectsManager.isInitialized).toBe(true);
    });
  });

  describe('createSuccessEffect', () => {
    beforeEach(() => {
      visualEffectsManager = new VisualEffectsManager(mockGame);
      visualEffectsManager.init();
    });

    test('should create point light effect', () => {
      const position = { x: 10, y: 5, z: 15 };

      visualEffectsManager.createSuccessEffect(position);

      expect(THREE.PointLight).toHaveBeenCalledWith(0x00ff00, 2, 10);
    });

    test('should position light at specified location', () => {
      const position = { x: 10, y: 5, z: 15 };
      const mockLight = {
        position: { set: jest.fn() }
      };
      THREE.PointLight.mockReturnValue(mockLight);

      visualEffectsManager.createSuccessEffect(position);

      expect(mockLight.position.set).toHaveBeenCalledWith(10, 5, 15);
    });

    test('should add light to scene', () => {
      const position = { x: 0, y: 0, z: 0 };

      visualEffectsManager.createSuccessEffect(position);

      expect(mockScene.add).toHaveBeenCalled();
    });

    test('should track created effect', () => {
      const position = { x: 0, y: 0, z: 0 };

      visualEffectsManager.createSuccessEffect(position);

      expect(visualEffectsManager.effects.length).toBe(1);
      expect(visualEffectsManager.effects[0]).toHaveProperty('light');
      expect(visualEffectsManager.effects[0]).toHaveProperty('startTime');
      expect(visualEffectsManager.effects[0]).toHaveProperty('duration');
    });

    test('should set effect duration', () => {
      const position = { x: 0, y: 0, z: 0 };

      visualEffectsManager.createSuccessEffect(position);

      const effect = visualEffectsManager.effects[0];
      expect(effect.duration).toBe(1000); // 1 second
    });
  });

  describe('update', () => {
    beforeEach(() => {
      visualEffectsManager = new VisualEffectsManager(mockGame);
      visualEffectsManager.init();
    });

    test('should update effect intensity over time', () => {
      const mockLight = {
        position: { set: jest.fn() },
        intensity: 2
      };
      THREE.PointLight.mockReturnValue(mockLight);

      visualEffectsManager.createSuccessEffect({ x: 0, y: 0, z: 0 });
      const effect = visualEffectsManager.effects[0];
      effect.startTime = Date.now() - 500; // Half duration elapsed

      visualEffectsManager.update();

      expect(mockLight.intensity).toBeLessThan(2);
      expect(mockLight.intensity).toBeGreaterThan(0);
    });

    test('should remove expired effects', () => {
      visualEffectsManager.createSuccessEffect({ x: 0, y: 0, z: 0 });
      const effect = visualEffectsManager.effects[0];
      effect.startTime = Date.now() - 2000; // Past duration

      visualEffectsManager.update();

      expect(visualEffectsManager.effects.length).toBe(0);
      expect(mockScene.remove).toHaveBeenCalled();
    });

    test('should handle multiple effects', () => {
      visualEffectsManager.createSuccessEffect({ x: 0, y: 0, z: 0 });
      visualEffectsManager.createSuccessEffect({ x: 5, y: 5, z: 5 });

      expect(visualEffectsManager.effects.length).toBe(2);

      visualEffectsManager.update();

      expect(visualEffectsManager.effects.length).toBe(2);
    });

    test('should handle empty effects array', () => {
      expect(() => {
        visualEffectsManager.update();
      }).not.toThrow();
    });
  });

  describe('createHitEffect', () => {
    beforeEach(() => {
      visualEffectsManager = new VisualEffectsManager(mockGame);
      visualEffectsManager.init();
    });

    test('should create hit effect with different color', () => {
      const position = { x: 0, y: 0, z: 0 };

      visualEffectsManager.createHitEffect(position);

      expect(THREE.PointLight).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      );
      expect(visualEffectsManager.effects.length).toBe(1);
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      visualEffectsManager = new VisualEffectsManager(mockGame);
      visualEffectsManager.init();
    });

    test('should remove all effects from scene', () => {
      visualEffectsManager.createSuccessEffect({ x: 0, y: 0, z: 0 });
      visualEffectsManager.createSuccessEffect({ x: 5, y: 5, z: 5 });

      visualEffectsManager.cleanup();

      expect(mockScene.remove).toHaveBeenCalledTimes(2);
      expect(visualEffectsManager.effects.length).toBe(0);
    });

    test('should handle cleanup without effects', () => {
      expect(() => {
        visualEffectsManager.cleanup();
      }).not.toThrow();
    });

    test('should reset initialization state', () => {
      visualEffectsManager.cleanup();

      expect(visualEffectsManager.isInitialized).toBe(false);
    });
  });

  describe('effect types', () => {
    beforeEach(() => {
      visualEffectsManager = new VisualEffectsManager(mockGame);
      visualEffectsManager.init();
    });

    test('should support different effect types', () => {
      const types = ['success', 'hit', 'hazard'];
      const position = { x: 0, y: 0, z: 0 };

      types.forEach(type => {
        visualEffectsManager.createEffect(type, position);
      });

      expect(visualEffectsManager.effects.length).toBe(3);
    });

    test('should use different colors for different effects', () => {
      const position = { x: 0, y: 0, z: 0 };

      visualEffectsManager.createSuccessEffect(position);
      const successCall = THREE.PointLight.mock.calls[0];

      visualEffectsManager.createHitEffect(position);
      const hitCall = THREE.PointLight.mock.calls[1];

      expect(successCall[0]).not.toBe(hitCall[0]); // Different colors
    });
  });
});
