/**
 * Unit tests for HazardFactory
 */

import * as HazardFactory from '../../../objects/hazards/HazardFactory';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Mock dependencies
jest.mock('three');
jest.mock('cannon-es');
jest.mock('three-csg-ts', () => ({
  CSG: {
    fromMesh: jest.fn(() => ({
      subtract: jest.fn(() => ({
        toMesh: jest.fn(() => ({
          position: { set: jest.fn() },
          receiveShadow: false,
          castShadow: false
        }))
      }))
    }))
  }
}));

describe('HazardFactory', () => {
  let mockWorld;
  let mockGroup;
  let mockHazardConfig;
  let mockCourseBounds;

  beforeEach(() => {
    // Mock THREE objects
    Object.defineProperty(THREE, 'BoxGeometry', {
      value: jest.fn(),
      writable: true,
      configurable: true
    });
    Object.defineProperty(THREE, 'CylinderGeometry', {
      value: jest.fn(),
      writable: true,
      configurable: true
    });
    Object.defineProperty(THREE, 'PlaneGeometry', {
      value: jest.fn(),
      writable: true,
      configurable: true
    });
    Object.defineProperty(THREE, 'MeshStandardMaterial', {
      value: jest.fn(() => ({
        color: 0xffffff,
        transparent: false,
        opacity: 1
      })),
      writable: true,
      configurable: true
    });
    Object.defineProperty(THREE, 'Mesh', {
      value: jest.fn(() => ({
        position: { set: jest.fn(), copy: jest.fn() },
        rotation: { set: jest.fn() },
        castShadow: false,
        receiveShadow: false,
        userData: {},
        geometry: { computeBoundingBox: jest.fn() }
      })),
      writable: true,
      configurable: true
    });
    Object.defineProperty(THREE, 'Group', {
      value: jest.fn(() => ({
        add: jest.fn(),
        position: { set: jest.fn() },
        userData: {}
      })),
      writable: true,
      configurable: true
    });
    Object.defineProperty(THREE, 'Color', {
      value: jest.fn(),
      writable: true,
      configurable: true
    });

    // Mock CANNON objects
    Object.defineProperty(CANNON, 'Body', {
      value: jest.fn(() => ({
        position: { set: jest.fn() },
        quaternion: { setFromEuler: jest.fn() },
        userData: {},
        addShape: jest.fn()
      })),
      writable: true,
      configurable: true
    });
    Object.defineProperty(CANNON, 'Box', {
      value: jest.fn(),
      writable: true,
      configurable: true
    });
    Object.defineProperty(CANNON, 'Vec3', {
      value: jest.fn((x, y, z) => ({ x, y, z })),
      writable: true,
      configurable: true
    });
    Object.defineProperty(CANNON, 'Material', {
      value: jest.fn(),
      writable: true,
      configurable: true
    });
    Object.defineProperty(CANNON, 'ContactMaterial', {
      value: jest.fn(),
      writable: true,
      configurable: true
    });

    // Mock world
    mockWorld = {
      addBody: jest.fn(),
      materials: {},
      addContactMaterial: jest.fn()
    };

    // Mock group
    mockGroup = {
      add: jest.fn()
    };

    // Default hazard config
    mockHazardConfig = {
      type: 'sand',
      position: { x: 0, y: 0, z: 0 }
    };

    // Mock course bounds
    mockCourseBounds = {
      width: 20,
      length: 40
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createHazard', () => {
    test('should create sand hazard', () => {
      mockHazardConfig.type = 'sand';
      mockHazardConfig.radius = 2;

      const result = HazardFactory.createHazard(
        mockWorld,
        mockGroup,
        mockHazardConfig,
        0,
        mockCourseBounds
      );

      expect(result).toBeDefined();
      expect(result.meshes).toBeDefined();
      expect(result.bodies).toBeDefined();
      expect(Array.isArray(result.meshes)).toBe(true);
      expect(Array.isArray(result.bodies)).toBe(true);
    });

    test('should create water hazard', () => {
      mockHazardConfig.type = 'water';
      mockHazardConfig.width = 4;
      mockHazardConfig.length = 4;

      const result = HazardFactory.createHazard(
        mockWorld,
        mockGroup,
        mockHazardConfig,
        0,
        mockCourseBounds
      );

      expect(result).toBeDefined();
      expect(result.meshes).toBeDefined();
      expect(result.bodies).toBeDefined();
    });

    test('should create bunker hazard', () => {
      mockHazardConfig.type = 'bunker';
      mockHazardConfig.radius = 3;

      const result = HazardFactory.createHazard(
        mockWorld,
        mockGroup,
        mockHazardConfig,
        0,
        mockCourseBounds
      );

      expect(result).toBeDefined();
      expect(result.meshes).toBeDefined();
      expect(result.bodies).toBeDefined();
    });

    test('should default to sand hazard for unknown type', () => {
      mockHazardConfig.type = 'unknown';
      mockHazardConfig.radius = 2;

      const result = HazardFactory.createHazard(
        mockWorld,
        mockGroup,
        mockHazardConfig,
        0,
        mockCourseBounds
      );

      // Should fall through to default case which creates sand
      expect(result).toBeDefined();
    });
  });

  describe('createSandHazard', () => {
    test('should be exported', () => {
      expect(HazardFactory.createSandHazard).toBeDefined();
      expect(typeof HazardFactory.createSandHazard).toBe('function');
    });
  });

  describe('createWaterHazard', () => {
    test('should be exported', () => {
      expect(HazardFactory.createWaterHazard).toBeDefined();
      expect(typeof HazardFactory.createWaterHazard).toBe('function');
    });
  });

  describe('createBunkerHazard', () => {
    test('should be exported', () => {
      expect(HazardFactory.createBunkerHazard).toBeDefined();
      expect(typeof HazardFactory.createBunkerHazard).toBe('function');
    });
  });

  describe('createSnowman', () => {
    test('should be exported', () => {
      expect(HazardFactory.createSnowman).toBeDefined();
      expect(typeof HazardFactory.createSnowman).toBe('function');
    });

    test('should create snowman mesh', () => {
      const snowman = HazardFactory.createSnowman({ x: 0, y: 0, z: 0 });

      expect(THREE.Group).toHaveBeenCalled();
      expect(snowman).toBeDefined();
    });
  });
});
