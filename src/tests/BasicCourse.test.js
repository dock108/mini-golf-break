/**
 * Unit tests for BasicCourse
 */

import { BasicCourse } from '../objects/BasicCourse';
import * as THREE from 'three';

// Mock dependencies
jest.mock('../managers/CoursesManager');
jest.mock('../objects/HoleEntity');

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
});
