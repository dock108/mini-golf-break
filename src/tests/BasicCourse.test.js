/**
 * Unit tests for BasicCourse
 */

import { BasicCourse } from '../objects/BasicCourse';
import * as THREE from 'three';

// Mock dependencies
jest.mock('../managers/CoursesManager');
jest.mock('../objects/HoleEntity');

// Mock console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn
};

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
});

describe('BasicCourse', () => {
  let mockGame;
  let mockScene;
  let mockPhysicsWorld;
  let basicCourse;

  beforeEach(() => {
    // Setup mock game object
    mockScene = {
      add: jest.fn(),
      remove: jest.fn()
    };

    mockPhysicsWorld = {
      addBody: jest.fn(),
      removeBody: jest.fn()
    };

    mockGame = {
      scene: mockScene,
      physicsWorld: mockPhysicsWorld,
      physicsManager: {
        getWorld: jest.fn(() => mockPhysicsWorld)
      },
      ballManager: {
        createBall: jest.fn().mockResolvedValue()
      },
      stateManager: {
        setState: jest.fn()
      },
      eventManager: {
        publish: jest.fn()
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      basicCourse = new BasicCourse(mockGame);

      expect(basicCourse.game).toBe(mockGame);
      expect(basicCourse.scene).toBe(mockScene);
      expect(basicCourse.isHoleComplete).toBe(false);
      expect(basicCourse.pendingHoleTransition).toBe(false);
      expect(basicCourse.isTransitioning).toBe(false);
    });

    test('should initialize with custom options', () => {
      const customOptions = {
        startPosition: new THREE.Vector3(5, 0, 10),
        autoCreate: true
      };

      basicCourse = new BasicCourse(mockGame, customOptions);

      expect(basicCourse.game).toBe(mockGame);
    });

    test('should define hole configurations', () => {
      basicCourse = new BasicCourse(mockGame);

      expect(basicCourse.holeConfigs).toBeDefined();
      expect(Array.isArray(basicCourse.holeConfigs)).toBe(true);
      expect(basicCourse.holeConfigs.length).toBeGreaterThan(0);
    });
  });

  describe('hole configurations', () => {
    beforeEach(() => {
      basicCourse = new BasicCourse(mockGame);
    });

    test('should have proper structure for each hole config', () => {
      basicCourse.holeConfigs.forEach(config => {
        expect(config).toHaveProperty('index');
        expect(config).toHaveProperty('holePosition');
        expect(config).toHaveProperty('startPosition');
        expect(config).toHaveProperty('courseWidth');
        expect(config).toHaveProperty('courseLength');
        expect(config).toHaveProperty('par');
        expect(config).toHaveProperty('description');

        // Verify positions are Vector3 instances
        expect(config.holePosition).toBeInstanceOf(THREE.Vector3);
        expect(config.startPosition).toBeInstanceOf(THREE.Vector3);

        // Verify numeric properties
        expect(typeof config.courseWidth).toBe('number');
        expect(typeof config.courseLength).toBe('number');
        expect(typeof config.par).toBe('number');
        expect(config.par).toBeGreaterThan(0);
      });
    });

    test('should have unique hole descriptions', () => {
      const descriptions = basicCourse.holeConfigs.map(config => config.description);
      const uniqueDescriptions = new Set(descriptions);

      expect(uniqueDescriptions.size).toBe(descriptions.length);
    });

    test('should have sequential hole indices', () => {
      basicCourse.holeConfigs.forEach((config, index) => {
        expect(config.index).toBe(index);
      });
    });
  });

  describe('course properties', () => {
    beforeEach(() => {
      basicCourse = new BasicCourse(mockGame);
    });

    test('should have valid course dimensions', () => {
      basicCourse.holeConfigs.forEach(config => {
        expect(config.courseWidth).toBeGreaterThan(0);
        expect(config.courseLength).toBeGreaterThan(0);
      });
    });

    test('should have reasonable par values', () => {
      basicCourse.holeConfigs.forEach(config => {
        expect(config.par).toBeGreaterThanOrEqual(2);
        expect(config.par).toBeLessThanOrEqual(6);
      });
    });
  });

  describe('hole transitions', () => {
    beforeEach(() => {
      basicCourse = new BasicCourse(mockGame);
    });

    test('should track hole completion state', () => {
      expect(basicCourse.isHoleComplete).toBe(false);

      basicCourse.isHoleComplete = true;
      expect(basicCourse.isHoleComplete).toBe(true);
    });

    test('should track pending transitions', () => {
      expect(basicCourse.pendingHoleTransition).toBe(false);

      basicCourse.pendingHoleTransition = true;
      expect(basicCourse.pendingHoleTransition).toBe(true);
    });

    test('should track active transitions', () => {
      expect(basicCourse.isTransitioning).toBe(false);

      basicCourse.isTransitioning = true;
      expect(basicCourse.isTransitioning).toBe(true);
    });
  });

  describe('inheritance', () => {
    test('should extend CoursesManager', () => {
      const CoursesManager = require('../managers/CoursesManager').CoursesManager;
      basicCourse = new BasicCourse(mockGame);

      // BasicCourse should be an instance of CoursesManager
      expect(basicCourse).toBeInstanceOf(CoursesManager);
    });
  });

  describe('static create method', () => {
    test('should create and initialize course successfully', async () => {
      const HoleEntity = require('../objects/HoleEntity').HoleEntity;
      HoleEntity.mockImplementation(() => ({
        init: jest.fn()
      }));

      const course = await BasicCourse.create(mockGame);

      expect(course).toBeInstanceOf(BasicCourse);
      expect(course.currentHoleIndex).toBe(0);
      expect(course.currentHole).toBeDefined();
      expect(course.startPosition).toBeDefined();
    });

    test('should throw error if physics world not available', async () => {
      mockGame.physicsManager.getWorld.mockReturnValue(null);

      await expect(BasicCourse.create(mockGame)).rejects.toThrow('Physics world not available');
    });

    test('should throw error if initialization fails', async () => {
      const HoleEntity = require('../objects/HoleEntity').HoleEntity;
      HoleEntity.mockImplementation(() => {
        throw new Error('HoleEntity creation failed');
      });

      await expect(BasicCourse.create(mockGame)).rejects.toThrow();
    });
  });

  describe('initializeHole', () => {
    beforeEach(() => {
      basicCourse = new BasicCourse(mockGame);
      const HoleEntity = require('../objects/HoleEntity').HoleEntity;
      HoleEntity.mockImplementation(() => ({
        init: jest.fn()
      }));
    });

    test('should initialize hole successfully', async () => {
      const result = await basicCourse.initializeHole(0);

      expect(result).toBe(true);
      expect(basicCourse.currentHoleIndex).toBe(0);
      expect(basicCourse.currentHole).toBeDefined();
      expect(basicCourse.startPosition).toBeDefined();
    });

    test('should handle invalid hole index', async () => {
      const result = await basicCourse.initializeHole(-1);
      expect(result).toBe(false);

      const result2 = await basicCourse.initializeHole(999);
      expect(result2).toBe(false);

      const result3 = await basicCourse.initializeHole(null);
      expect(result3).toBe(false);

      const result4 = await basicCourse.initializeHole(NaN);
      expect(result4).toBe(false);
    });

    test('should handle HoleEntity creation error', async () => {
      const HoleEntity = require('../objects/HoleEntity').HoleEntity;
      HoleEntity.mockImplementation(() => {
        throw new Error('Creation failed');
      });

      const result = await basicCourse.initializeHole(0);

      expect(result).toBe(false);
      expect(basicCourse.currentHole).toBeNull();
    });

    test('should handle missing hole config', async () => {
      basicCourse.holeConfigs = [];
      const result = await basicCourse.initializeHole(0);

      expect(result).toBe(false);
    });
  });

  describe('setStartPosition', () => {
    beforeEach(() => {
      basicCourse = new BasicCourse(mockGame);
    });

    test('should set valid Vector3 position', () => {
      const position = new THREE.Vector3(1, 2, 3);
      basicCourse.setStartPosition(position);

      expect(basicCourse.startPosition).toBe(position);
    });

    test('should not set invalid position', () => {
      basicCourse.setStartPosition(null);
      expect(basicCourse.startPosition).toBeUndefined();

      basicCourse.setStartPosition({ x: 1, y: 2, z: 3 }); // Not a Vector3
      expect(basicCourse.startPosition).toBeUndefined();

      basicCourse.setStartPosition(undefined);
      expect(basicCourse.startPosition).toBeUndefined();
    });
  });

  describe('createCourse', () => {
    beforeEach(() => {
      basicCourse = new BasicCourse(mockGame);
      basicCourse.clearCurrentHole = jest.fn();
      basicCourse.initializeHole = jest.fn().mockResolvedValue(true);
    });

    test('should create course for valid hole number', async () => {
      const result = await basicCourse.createCourse(1);

      expect(result).toBe(true);
      expect(basicCourse.clearCurrentHole).toHaveBeenCalled();
      expect(basicCourse.initializeHole).toHaveBeenCalledWith(0);
    });

    test('should reject invalid hole numbers', async () => {
      const result1 = await basicCourse.createCourse(0);
      expect(result1).toBe(false);

      const result2 = await basicCourse.createCourse(999);
      expect(result2).toBe(false);

      const result3 = await basicCourse.createCourse(null);
      expect(result3).toBe(false);
    });

    test('should handle physics world not available', async () => {
      mockGame.physicsManager.getWorld.mockReturnValue(null);
      const result = await basicCourse.createCourse(1);

      expect(result).toBe(false);
    });

    test('should handle initialization failure', async () => {
      basicCourse.initializeHole.mockResolvedValue(false);
      const result = await basicCourse.createCourse(1);

      expect(result).toBe(false);
    });

    test('should handle errors gracefully', async () => {
      basicCourse.clearCurrentHole.mockRejectedValue(new Error('Clear failed'));
      const result = await basicCourse.createCourse(1);

      expect(result).toBe(false);
    });
  });

  describe('onBallInHole', () => {
    beforeEach(() => {
      basicCourse = new BasicCourse(mockGame);
      basicCourse.currentHoleIndex = 0;
    });

    test('should set hole complete for current hole', () => {
      basicCourse.onBallInHole(0);

      expect(basicCourse.isHoleComplete).toBe(true);
    });

    test('should ignore if already transitioning', () => {
      basicCourse.isTransitioning = true;
      basicCourse.onBallInHole(0);

      expect(basicCourse.isHoleComplete).toBe(false);
    });

    test('should ignore if wrong hole', () => {
      basicCourse.onBallInHole(1); // Wrong hole

      expect(basicCourse.isHoleComplete).toBe(false);
    });
  });

  describe('loadNextHole', () => {
    beforeEach(() => {
      basicCourse = new BasicCourse(mockGame);
      basicCourse.currentHoleIndex = 0;
      basicCourse.clearCurrentHole = jest.fn();
      basicCourse.initializeHole = jest.fn().mockResolvedValue(true);
      basicCourse.startPosition = new THREE.Vector3(0, 0, 0);

      // Mock eventManager publish
      mockGame.eventManager.publish = jest.fn();
    });

    test('should load next hole successfully', async () => {
      const result = await basicCourse.loadNextHole();

      expect(result).toBe(true);
      expect(basicCourse.isTransitioning).toBe(false);
      expect(basicCourse.clearCurrentHole).toHaveBeenCalled();
      expect(basicCourse.initializeHole).toHaveBeenCalledWith(1); // Next hole index is 1
    });

    test('should prevent concurrent transitions', async () => {
      basicCourse.isTransitioning = true;
      const result = await basicCourse.loadNextHole();

      expect(result).toBe(false);
    });

    test('should handle last hole completion', async () => {
      basicCourse.currentHoleIndex = basicCourse.totalHoles - 1;
      const result = await basicCourse.loadNextHole();

      expect(result).toBe(false);
    });

    test('should handle initialization failure', async () => {
      basicCourse.initializeHole.mockResolvedValue(false);
      const result = await basicCourse.loadNextHole();

      expect(result).toBe(false);
    });

    test('should handle missing start position', async () => {
      basicCourse.startPosition = null;
      const result = await basicCourse.loadNextHole();

      expect(result).toBe(false);
    });

    test('should handle errors gracefully', async () => {
      basicCourse.clearCurrentHole.mockRejectedValue(new Error('Clear failed'));
      const result = await basicCourse.loadNextHole();

      expect(result).toBe(false);
      expect(basicCourse.isTransitioning).toBe(false);
    });
  });

  describe('clearCurrentHole', () => {
    beforeEach(() => {
      basicCourse = new BasicCourse(mockGame);
    });

    test('should clear existing hole', () => {
      const mockHole = {
        destroy: jest.fn()
      };
      basicCourse.currentHole = mockHole;

      basicCourse.clearCurrentHole();

      expect(mockHole.destroy).toHaveBeenCalled();
      expect(basicCourse.currentHole).toBeNull();
    });

    test('should handle no current hole', () => {
      basicCourse.currentHole = null;

      expect(() => basicCourse.clearCurrentHole()).not.toThrow();
    });
  });

  describe('getCurrentHoleNumber', () => {
    beforeEach(() => {
      basicCourse = new BasicCourse(mockGame);
    });

    test('should return correct hole number', () => {
      basicCourse.currentHoleIndex = 0;
      expect(basicCourse.getCurrentHoleNumber()).toBe(1);

      basicCourse.currentHoleIndex = 2;
      expect(basicCourse.getCurrentHoleNumber()).toBe(3);
    });
  });

  describe('getCurrentHoleConfig', () => {
    beforeEach(() => {
      basicCourse = new BasicCourse(mockGame);
    });

    test('should return current hole config', () => {
      basicCourse.currentHoleIndex = 0;
      const config = basicCourse.getCurrentHoleConfig();

      expect(config).toBe(basicCourse.holeConfigs[0]);
    });

    test('should return null for invalid index', () => {
      basicCourse.currentHoleIndex = -1;
      expect(basicCourse.getCurrentHoleConfig()).toBeNull();

      basicCourse.currentHoleIndex = 999;
      expect(basicCourse.getCurrentHoleConfig()).toBeNull();
    });
  });

  describe('hasNextHole', () => {
    beforeEach(() => {
      basicCourse = new BasicCourse(mockGame);
    });

    test('should return true if has next hole', () => {
      basicCourse.currentHoleIndex = 0;
      expect(basicCourse.hasNextHole()).toBe(true);
    });

    test('should return false if on last hole', () => {
      basicCourse.currentHoleIndex = basicCourse.totalHoles - 1;
      expect(basicCourse.hasNextHole()).toBe(false);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      basicCourse = new BasicCourse(mockGame);
      basicCourse.loadNextHole = jest.fn();
    });

    test('should handle hole completion', done => {
      basicCourse.isHoleComplete = true;
      basicCourse.pendingHoleTransition = false;
      basicCourse.hasNextHole = jest.fn().mockReturnValue(true);

      basicCourse.update(0.016);

      expect(basicCourse.pendingHoleTransition).toBe(true);

      // Wait for requestAnimationFrame
      setTimeout(() => {
        expect(basicCourse.loadNextHole).toHaveBeenCalled();
        expect(basicCourse.isHoleComplete).toBe(false);
        expect(basicCourse.pendingHoleTransition).toBe(false);
        done();
      }, 20);
    });

    test('should handle course completion', done => {
      basicCourse.isHoleComplete = true;
      basicCourse.pendingHoleTransition = false;
      basicCourse.currentHoleIndex = basicCourse.totalHoles - 1; // Last hole
      basicCourse.loadNextHole = jest.fn().mockResolvedValue(false);

      basicCourse.update(0.016);

      // loadNextHole is called in requestAnimationFrame
      setTimeout(() => {
        expect(basicCourse.loadNextHole).toHaveBeenCalled();
        done();
      }, 20);
    });

    test('should not trigger if already pending', () => {
      basicCourse.isHoleComplete = true;
      basicCourse.pendingHoleTransition = true;

      basicCourse.update(0.016);

      expect(basicCourse.loadNextHole).not.toHaveBeenCalled();
    });
  });

  describe('getHolePosition', () => {
    beforeEach(() => {
      basicCourse = new BasicCourse(mockGame);
    });

    test('should return hole position', () => {
      basicCourse.currentHoleIndex = 0;
      const position = basicCourse.getHolePosition();

      expect(position).toEqual(basicCourse.holeConfigs[0].holePosition);
    });

    test('should return null for invalid index', () => {
      basicCourse.currentHoleIndex = -1;
      expect(basicCourse.getHolePosition()).toBeNull();

      basicCourse.currentHoleIndex = 999;
      expect(basicCourse.getHolePosition()).toBeNull();
    });

    test('should handle missing hole position', () => {
      basicCourse.currentHoleIndex = 0;
      basicCourse.holeConfigs[0].holePosition = null;

      expect(basicCourse.getHolePosition()).toBeNull();
    });
  });

  describe('getHoleStartPosition', () => {
    beforeEach(() => {
      basicCourse = new BasicCourse(mockGame);
    });

    test('should return hole start position', () => {
      basicCourse.currentHoleIndex = 0;
      const position = basicCourse.getHoleStartPosition();

      expect(position).toEqual(basicCourse.holeConfigs[0].startPosition);
    });

    test('should return null for invalid index', () => {
      basicCourse.currentHoleIndex = -1;
      expect(basicCourse.getHoleStartPosition()).toBeNull();

      basicCourse.currentHoleIndex = 999;
      expect(basicCourse.getHoleStartPosition()).toBeNull();
    });

    test('should handle missing start position', () => {
      basicCourse.currentHoleIndex = 0;
      basicCourse.holeConfigs[0].startPosition = null;

      expect(basicCourse.getHoleStartPosition()).toBeNull();
    });
  });

  describe('getHolePar', () => {
    beforeEach(() => {
      basicCourse = new BasicCourse(mockGame);
    });

    test('should return hole par', () => {
      basicCourse.currentHoleIndex = 0;
      const par = basicCourse.getHolePar();

      expect(par).toBe(basicCourse.holeConfigs[0].par);
    });

    test('should return 0 for invalid index', () => {
      basicCourse.currentHoleIndex = -1;
      expect(basicCourse.getHolePar()).toBe(0);

      basicCourse.currentHoleIndex = 999;
      expect(basicCourse.getHolePar()).toBe(0);
    });

    test('should handle missing par value', () => {
      basicCourse.currentHoleIndex = 0;
      basicCourse.holeConfigs[0].par = null;

      expect(basicCourse.getHolePar()).toBe(0);
    });
  });
});
