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
          castShadow: false,
          geometry: { computeBoundingBox: jest.fn() }
        }))
      }))
    })),
    intersect: jest.fn((mesh1, mesh2) => ({
      position: { set: jest.fn() },
      receiveShadow: false,
      castShadow: false,
      material: null,
      geometry: {
        computeBoundingBox: jest.fn(),
        dispose: jest.fn()
      }
    }))
  }
}));

describe('HazardFactory', () => {
  let mockWorld;
  let mockGroup;
  let mockHazardConfig;
  let mockCourseBounds;
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    // Mock THREE objects
    Object.defineProperty(THREE, 'BoxGeometry', {
      value: jest.fn(() => ({
        type: 'BoxGeometry',
        dispose: jest.fn()
      })),
      writable: true,
      configurable: true
    });
    Object.defineProperty(THREE, 'CylinderGeometry', {
      value: jest.fn(() => ({ type: 'CylinderGeometry' })),
      writable: true,
      configurable: true
    });
    Object.defineProperty(THREE, 'PlaneGeometry', {
      value: jest.fn(() => ({
        type: 'PlaneGeometry',
        rotateX: jest.fn(() => ({ type: 'PlaneGeometry' })),
        dispose: jest.fn()
      })),
      writable: true,
      configurable: true
    });
    Object.defineProperty(THREE, 'CircleGeometry', {
      value: jest.fn(() => ({
        type: 'CircleGeometry',
        rotateX: jest.fn(() => ({ type: 'CircleGeometry' })),
        dispose: jest.fn()
      })),
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
      value: jest.fn((geometry, material) => ({
        position: { set: jest.fn(), copy: jest.fn() },
        rotation: { set: jest.fn(), x: 0, y: 0, z: 0 },
        castShadow: false,
        receiveShadow: false,
        userData: {},
        geometry: geometry || { computeBoundingBox: jest.fn() },
        material: material || null,
        updateMatrix: jest.fn()
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
    Object.defineProperty(THREE, 'Vector3', {
      value: jest.fn((x = 0, y = 0, z = 0) => ({
        x,
        y,
        z,
        clone: jest.fn(() => ({
          x,
          y,
          z,
          sub: jest.fn(() => ({ x: 0, y: 0, z: 0 }))
        })),
        sub: jest.fn(() => ({ x: 0, y: 0, z: 0 }))
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
      value: jest.fn(() => ({ type: 'Box' })),
      writable: true,
      configurable: true
    });
    Object.defineProperty(CANNON, 'Cylinder', {
      value: jest.fn(() => ({ type: 'Cylinder' })),
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
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
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

  describe('createHazard with shapes', () => {
    test('should handle sand hazard with circle shape', () => {
      const hazardConfig = {
        type: 'sand',
        shape: 'circle',
        position: { x: 5, y: 0, z: 10 },
        size: { radius: 2 },
        depth: 0.3
      };

      const result = HazardFactory.createHazard(
        mockWorld,
        mockGroup,
        hazardConfig,
        1.0, // visualGreenY
        mockCourseBounds
      );

      expect(result).toHaveProperty('meshes');
      expect(result).toHaveProperty('bodies');
      expect(result.meshes.length).toBeGreaterThan(0);
      expect(result.bodies.length).toBeGreaterThan(0);
      expect(mockWorld.addBody).toHaveBeenCalled();
      expect(mockGroup.add).toHaveBeenCalled();
    });

    test('should handle sand hazard with rectangle shape', () => {
      const hazardConfig = {
        type: 'sand',
        shape: 'rectangle',
        position: { x: 0, y: 0, z: 0 },
        size: { width: 4, length: 6 }
      };

      const result = HazardFactory.createHazard(
        mockWorld,
        mockGroup,
        hazardConfig,
        1.0,
        mockCourseBounds
      );

      expect(result).toHaveProperty('meshes');
      expect(result).toHaveProperty('bodies');
      expect(THREE.PlaneGeometry).toHaveBeenCalled();
    });

    test('should handle sand hazard with compound shape', () => {
      const hazardConfig = {
        type: 'sand',
        shape: 'compound',
        position: { x: 0, y: 0, z: 0 },
        subShapes: [
          { position: { x: 0, y: 0, z: 0 }, radius: 2 },
          { position: { x: 2, y: 0, z: 0 }, radius: 1.5 },
          { position: { x: -2, y: 0, z: 0 }, radius: 1 }
        ]
      };

      const result = HazardFactory.createHazard(
        mockWorld,
        mockGroup,
        hazardConfig,
        1.0,
        mockCourseBounds
      );

      expect(result.meshes.length).toBe(3);
      expect(result.bodies.length).toBe(3);
    });

    test('should handle water hazard with circle shape', () => {
      const hazardConfig = {
        type: 'water',
        shape: 'circle',
        position: { x: 0, y: 0, z: 0 },
        size: { radius: 3 },
        depth: 0.2
      };

      const result = HazardFactory.createHazard(
        mockWorld,
        mockGroup,
        hazardConfig,
        1.0,
        mockCourseBounds
      );

      expect(result).toHaveProperty('meshes');
      expect(result).toHaveProperty('bodies');
      expect(THREE.MeshStandardMaterial).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 0x3399ff,
          transparent: true,
          opacity: 0.7
        })
      );
    });

    test('should handle water hazard with rectangle shape', () => {
      const hazardConfig = {
        type: 'water',
        shape: 'rectangle',
        position: { x: 0, y: 0, z: 0 },
        size: { width: 5, length: 8 }
      };

      const result = HazardFactory.createHazard(
        mockWorld,
        mockGroup,
        hazardConfig,
        1.0,
        mockCourseBounds
      );

      expect(result).toHaveProperty('meshes');
      expect(result).toHaveProperty('bodies');
    });

    test('should handle water hazard with compound shape', () => {
      const hazardConfig = {
        type: 'water',
        shape: 'compound',
        position: { x: 0, y: 0, z: 0 },
        subShapes: [
          { position: { x: 0, y: 0, z: 0 }, radius: 2 },
          { position: { x: 3, y: 0, z: 0 }, radius: 2 }
        ]
      };

      const result = HazardFactory.createHazard(
        mockWorld,
        mockGroup,
        hazardConfig,
        1.0,
        mockCourseBounds
      );

      expect(result.meshes.length).toBe(2);
      expect(result.bodies.length).toBe(2);
    });

    test('should handle unknown hazard type', () => {
      const hazardConfig = {
        type: 'unknown',
        shape: 'circle',
        position: { x: 0, y: 0, z: 0 },
        size: { radius: 2 }
      };

      const result = HazardFactory.createHazard(
        mockWorld,
        mockGroup,
        hazardConfig,
        1.0,
        mockCourseBounds
      );

      expect(result.meshes).toEqual([]);
      expect(result.bodies).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[HazardFactory] Unknown hazard type:',
        'unknown'
      );
    });

    test('should handle unsupported shape type', () => {
      const hazardConfig = {
        type: 'sand',
        shape: 'triangle', // Unsupported
        position: { x: 0, y: 0, z: 0 }
      };

      const result = HazardFactory.createHazard(
        mockWorld,
        mockGroup,
        hazardConfig,
        1.0,
        mockCourseBounds
      );

      expect(result.meshes).toEqual([]);
      expect(result.bodies).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unsupported shape:'),
        'triangle'
      );
    });

    test('should handle error during hazard creation', () => {
      // Make CylinderGeometry throw an error
      THREE.CylinderGeometry.mockImplementationOnce(() => {
        throw new Error('Geometry creation failed');
      });

      const hazardConfig = {
        type: 'sand',
        shape: 'circle',
        position: { x: 0, y: 0, z: 0 },
        size: { radius: 2 }
      };

      const result = HazardFactory.createHazard(
        mockWorld,
        mockGroup,
        hazardConfig,
        1.0,
        mockCourseBounds
      );

      expect(result.meshes).toEqual([]);
      expect(result.bodies).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[HazardFactory] Error creating hazard part:',
        expect.any(Error)
      );
    });

    test('should use default depth values', () => {
      const hazardConfig = {
        type: 'sand',
        shape: 'circle',
        position: { x: 0, y: 0, z: 0 },
        size: { radius: 2 }
        // No depth specified
      };

      const result = HazardFactory.createHazard(
        mockWorld,
        mockGroup,
        hazardConfig,
        1.0,
        mockCourseBounds
      );

      expect(result).toHaveProperty('meshes');
      expect(result).toHaveProperty('bodies');
    });

    test('should handle course bounds constraints', () => {
      // Update course bounds to have valid dimensions
      mockCourseBounds.width = 20;
      mockCourseBounds.length = 40;

      const hazardConfig = {
        type: 'sand',
        shape: 'circle',
        position: { x: 0, y: 0, z: 0 },
        size: { radius: 2 }
      };

      const result = HazardFactory.createHazard(
        mockWorld,
        mockGroup,
        hazardConfig,
        1.0,
        mockCourseBounds
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Will constrain hazards to course boundaries'),
        expect.any(String)
      );
    });

    test('should handle missing position in config', () => {
      const hazardConfig = {
        type: 'sand',
        shape: 'circle',
        // No position specified
        size: { radius: 2 }
      };

      const result = HazardFactory.createHazard(
        mockWorld,
        mockGroup,
        hazardConfig,
        1.0,
        mockCourseBounds
      );

      expect(result).toHaveProperty('meshes');
      expect(result).toHaveProperty('bodies');
    });

    test('should set correct userData for sand bunker trigger', () => {
      const mockBody = {
        position: { set: jest.fn() },
        quaternion: { setFromEuler: jest.fn() },
        userData: {},
        addShape: jest.fn()
      };

      CANNON.Body.mockReturnValueOnce(mockBody);

      const hazardConfig = {
        type: 'sand',
        shape: 'circle',
        position: { x: 0, y: 0, z: 0 },
        size: { radius: 2 }
      };

      const result = HazardFactory.createHazard(
        mockWorld,
        mockGroup,
        hazardConfig,
        1.0,
        mockCourseBounds
      );

      expect(mockBody.userData.isBunkerZone).toBe(true);
    });

    test('should set correct userData for water trigger', () => {
      const mockBody = {
        position: { set: jest.fn() },
        quaternion: { setFromEuler: jest.fn() },
        userData: {},
        addShape: jest.fn()
      };

      CANNON.Body.mockReturnValueOnce(mockBody);

      const hazardConfig = {
        type: 'water',
        shape: 'circle',
        position: { x: 0, y: 0, z: 0 },
        size: { radius: 2 }
      };

      const result = HazardFactory.createHazard(
        mockWorld,
        mockGroup,
        hazardConfig,
        1.0,
        mockCourseBounds
      );

      expect(mockBody.userData.isWaterZone).toBe(true);
    });
  });
});
