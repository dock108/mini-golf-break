/**
 * Unit tests for CourseElementFactory
 */

import { CourseElementFactory } from '../../objects/CourseElementFactory';
import { CourseElementRegistry } from '../../objects/CourseElementRegistry';
import * as THREE from 'three';

// Mock dependencies
jest.mock('../../objects/CourseElementRegistry');
jest.mock('../../objects/BaseElement');
jest.mock('../../objects/WallElement');
jest.mock('../../objects/BunkerElement');

describe('CourseElementFactory', () => {
  let mockScene;
  let mockPhysicsWorld;
  let factory;

  beforeEach(() => {
    // Mock scene
    mockScene = {
      add: jest.fn(),
      remove: jest.fn()
    };

    // Mock physics world
    mockPhysicsWorld = {
      addBody: jest.fn(),
      removeBody: jest.fn()
    };

    // Mock registry methods
    CourseElementRegistry.register = jest.fn();
    CourseElementRegistry.get = jest.fn();
    CourseElementRegistry.getAll = jest.fn(() => []);

    // Create factory instance
    factory = new CourseElementFactory(mockScene, mockPhysicsWorld);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with scene and physics world', () => {
      expect(factory.scene).toBe(mockScene);
      expect(factory.physicsWorld).toBe(mockPhysicsWorld);
    });

    test('should register default elements', () => {
      expect(CourseElementRegistry.register).toHaveBeenCalledWith('wall', expect.any(Function));
      expect(CourseElementRegistry.register).toHaveBeenCalledWith('bunker', expect.any(Function));
    });
  });

  describe('createElement', () => {
    test('should create element of specified type', () => {
      const mockElementClass = jest.fn(() => ({
        init: jest.fn(),
        mesh: {},
        body: {}
      }));
      CourseElementRegistry.get.mockReturnValue(mockElementClass);

      const config = { type: 'wall', position: { x: 0, y: 0, z: 0 } };
      const element = factory.createElement(config);

      expect(CourseElementRegistry.get).toHaveBeenCalledWith('wall');
      expect(mockElementClass).toHaveBeenCalledWith(mockScene, mockPhysicsWorld, config);
      expect(element).toBeDefined();
    });

    test('should throw error for unknown element type', () => {
      CourseElementRegistry.get.mockReturnValue(null);

      const config = { type: 'unknown' };

      expect(() => {
        factory.createElement(config);
      }).toThrow('Unknown element type: unknown');
    });

    test('should initialize created element', () => {
      const mockElement = {
        init: jest.fn()
      };
      const mockElementClass = jest.fn(() => mockElement);
      CourseElementRegistry.get.mockReturnValue(mockElementClass);

      const config = { type: 'bunker' };
      factory.createElement(config);

      expect(mockElement.init).toHaveBeenCalled();
    });
  });

  describe('createMultiple', () => {
    test('should create multiple elements', () => {
      const mockElement = {
        init: jest.fn(),
        mesh: {},
        body: {}
      };
      const mockElementClass = jest.fn(() => mockElement);
      CourseElementRegistry.get.mockReturnValue(mockElementClass);

      const configs = [
        { type: 'wall', position: { x: 0, y: 0, z: 0 } },
        { type: 'wall', position: { x: 5, y: 0, z: 0 } },
        { type: 'bunker', position: { x: 10, y: 0, z: 0 } }
      ];

      const elements = factory.createMultiple(configs);

      expect(elements.length).toBe(3);
      expect(mockElementClass).toHaveBeenCalledTimes(3);
    });

    test('should skip invalid configs', () => {
      CourseElementRegistry.get.mockImplementation(type => {
        if (type === 'invalid') {
          return null;
        }
        return jest.fn(() => ({ init: jest.fn() }));
      });

      const configs = [{ type: 'wall' }, { type: 'invalid' }, { type: 'bunker' }];

      const elements = factory.createMultiple(configs);

      expect(elements.length).toBe(2);
    });
  });

  describe('createWall', () => {
    test('should create wall with default config', () => {
      const mockWallElement = {
        init: jest.fn(),
        mesh: {},
        body: {}
      };
      const mockWallClass = jest.fn(() => mockWallElement);
      CourseElementRegistry.get.mockReturnValue(mockWallClass);

      const position = new THREE.Vector3(0, 0, 0);
      const size = new THREE.Vector3(1, 1, 1);

      const wall = factory.createWall(position, size);

      expect(CourseElementRegistry.get).toHaveBeenCalledWith('wall');
      expect(mockWallClass).toHaveBeenCalledWith(
        mockScene,
        mockPhysicsWorld,
        expect.objectContaining({
          type: 'wall',
          position,
          size
        })
      );
      expect(wall).toBe(mockWallElement);
    });

    test('should merge additional config options', () => {
      const mockWallClass = jest.fn(() => ({ init: jest.fn() }));
      CourseElementRegistry.get.mockReturnValue(mockWallClass);

      const position = new THREE.Vector3(0, 0, 0);
      const size = new THREE.Vector3(1, 1, 1);
      const config = { color: 0xff0000, material: 'metal' };

      factory.createWall(position, size, config);

      expect(mockWallClass).toHaveBeenCalledWith(
        mockScene,
        mockPhysicsWorld,
        expect.objectContaining({
          type: 'wall',
          position,
          size,
          color: 0xff0000,
          material: 'metal'
        })
      );
    });
  });

  describe('createBunker', () => {
    test('should create bunker with default config', () => {
      const mockBunkerElement = {
        init: jest.fn(),
        mesh: {},
        body: {}
      };
      const mockBunkerClass = jest.fn(() => mockBunkerElement);
      CourseElementRegistry.get.mockReturnValue(mockBunkerClass);

      const position = new THREE.Vector3(5, 0, 5);
      const radius = 2;

      const bunker = factory.createBunker(position, radius);

      expect(CourseElementRegistry.get).toHaveBeenCalledWith('bunker');
      expect(mockBunkerClass).toHaveBeenCalledWith(
        mockScene,
        mockPhysicsWorld,
        expect.objectContaining({
          type: 'bunker',
          position,
          radius
        })
      );
      expect(bunker).toBe(mockBunkerElement);
    });

    test('should handle custom bunker properties', () => {
      const mockBunkerClass = jest.fn(() => ({ init: jest.fn() }));
      CourseElementRegistry.get.mockReturnValue(mockBunkerClass);

      const position = new THREE.Vector3(0, 0, 0);
      const radius = 3;
      const config = { depth: 0.5, sandColor: 0xffcc00 };

      factory.createBunker(position, radius, config);

      expect(mockBunkerClass).toHaveBeenCalledWith(
        mockScene,
        mockPhysicsWorld,
        expect.objectContaining({
          type: 'bunker',
          position,
          radius,
          depth: 0.5,
          sandColor: 0xffcc00
        })
      );
    });
  });

  describe('getRegisteredTypes', () => {
    test('should return all registered element types', () => {
      CourseElementRegistry.getAll.mockReturnValue({
        wall: jest.fn(),
        bunker: jest.fn(),
        water: jest.fn()
      });

      const types = factory.getRegisteredTypes();

      expect(types).toEqual(['wall', 'bunker', 'water']);
    });

    test('should return empty array when no types registered', () => {
      CourseElementRegistry.getAll.mockReturnValue({});

      const types = factory.getRegisteredTypes();

      expect(types).toEqual([]);
    });
  });

  describe('registerCustomElement', () => {
    test('should register custom element type', () => {
      const customElementClass = jest.fn();

      factory.registerCustomElement('custom', customElementClass);

      expect(CourseElementRegistry.register).toHaveBeenCalledWith('custom', customElementClass);
    });

    test('should allow creating custom elements after registration', () => {
      const mockCustomElement = {
        init: jest.fn(),
        mesh: {},
        body: {}
      };
      const customElementClass = jest.fn(() => mockCustomElement);

      factory.registerCustomElement('ramp', customElementClass);
      CourseElementRegistry.get.mockReturnValue(customElementClass);

      const config = { type: 'ramp', angle: 30 };
      const element = factory.createElement(config);

      expect(element).toBe(mockCustomElement);
    });
  });
});
