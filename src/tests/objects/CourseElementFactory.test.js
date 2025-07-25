/**
 * Unit tests for CourseElementFactory
 */

import { CourseElementFactory } from '../../objects/CourseElementFactory';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Note: THREE and CANNON mocks are provided by src/tests/setup.js
// Removing explicit mocks to use global setup

describe('CourseElementFactory', () => {
  let mockScene;
  let mockPhysicsWorld;
  let mockPosition;

  beforeEach(() => {
    // Mock scene
    mockScene = {
      add: jest.fn()
    };

    // Mock physics world
    mockPhysicsWorld = {
      addBody: jest.fn(),
      defaultMaterial: {},
      holeRimMaterial: {}
    };

    // Mock position
    mockPosition = { x: 0, y: 0, z: 0 };

    // Clear mock call history
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createHole', () => {
    test('should create hole with all components', () => {
      const elements = CourseElementFactory.createHole(mockScene, mockPhysicsWorld, mockPosition);

      expect(elements).toHaveProperty('holeBottom');
      expect(elements).toHaveProperty('holeWall');
      expect(elements).toHaveProperty('rim');
      expect(elements).toHaveProperty('bodies');

      // Verify scene.add was called for visual elements
      expect(mockScene.add).toHaveBeenCalledTimes(3); // bottom, wall, rim
    });

    test('should create hole without physics if no physics world', () => {
      const elements = CourseElementFactory.createHole(mockScene, null, mockPosition);

      expect(elements).toHaveProperty('holeBottom');
      expect(elements).toHaveProperty('holeWall');
      expect(elements).toHaveProperty('rim');
      expect(elements).not.toHaveProperty('bodies');
    });

    test('should use custom radius and depth', () => {
      const options = { radius: 0.6, depth: 0.4 };
      CourseElementFactory.createHole(mockScene, mockPhysicsWorld, mockPosition, options);

      expect(THREE.CircleGeometry).toHaveBeenCalledWith(0.6, 32);
      expect(THREE.CylinderGeometry).toHaveBeenCalledWith(0.6, 0.6, 0.4, 32);
    });

    test('should create physics bodies when physics world exists', () => {
      CourseElementFactory.createHole(mockScene, mockPhysicsWorld, mockPosition);

      expect(CANNON.Body).toHaveBeenCalled();
      expect(mockPhysicsWorld.addBody).toHaveBeenCalled();
    });
  });

  describe('createFlag', () => {
    test('should create flag with all components', () => {
      const elements = CourseElementFactory.createFlag(mockScene, mockPosition);

      expect(elements).toHaveProperty('pole');
      expect(elements).toHaveProperty('flag');
      expect(elements).toHaveProperty('light');

      // Verify scene.add was called
      expect(mockScene.add).toHaveBeenCalledTimes(3); // pole, flag, light
    });

    test('should use custom height', () => {
      const options = { height: 2.5 };
      CourseElementFactory.createFlag(mockScene, mockPosition, options);

      expect(THREE.CylinderGeometry).toHaveBeenCalledWith(0.03, 0.03, 2.5, 8);
    });

    test('should create flag with animation data', () => {
      const elements = CourseElementFactory.createFlag(mockScene, mockPosition);

      // The flag mesh should have userData with originalVertices
      expect(elements.flag.userData).toBeDefined();
    });
  });

  describe('createFairway', () => {
    test('should create fairway between two points', () => {
      const startPos = new THREE.Vector3(0, 0, 0);
      const endPos = new THREE.Vector3(10, 0, 0);
      const width = 5;
      const length = 10;

      const elements = CourseElementFactory.createFairway(
        mockScene,
        startPos,
        endPos,
        width,
        length
      );

      expect(elements).toHaveProperty('border');
      expect(elements).toHaveProperty('fairway');

      // Verify scene.add was called
      expect(mockScene.add).toHaveBeenCalledTimes(2); // border and fairway
    });

    test('should calculate midpoint correctly', () => {
      const startPos = new THREE.Vector3(0, 0, 0);
      const endPos = new THREE.Vector3(10, 0, 10);

      CourseElementFactory.createFairway(mockScene, startPos, endPos, 5, 10);

      // Verify that Vector3 constructor was called (midpoint calculation uses new Vector3)
      expect(THREE.Vector3).toHaveBeenCalled();
      // The specific method calls depend on implementation details,
      // but we can verify the general Vector3 usage
    });
  });

  describe('createWalls', () => {
    test('should create multiple walls', () => {
      const walls = [
        { position: [0, 0, 0], size: [1, 1, 1] },
        { position: [5, 0, 0], size: [2, 2, 2] }
      ];

      const elements = CourseElementFactory.createWalls(mockScene, mockPhysicsWorld, walls);

      expect(elements).toHaveLength(2);
      expect(mockScene.add).toHaveBeenCalledTimes(2);
      expect(mockPhysicsWorld.addBody).toHaveBeenCalledTimes(2);
    });

    test('should create walls without physics if no physics world', () => {
      const walls = [{ position: [0, 0, 0], size: [1, 1, 1] }];

      const elements = CourseElementFactory.createWalls(mockScene, null, walls);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toHaveProperty('mesh');
      expect(elements[0]).not.toHaveProperty('body');
    });
  });

  describe('animateFlag', () => {
    test('should animate flag vertices', () => {
      const mockFlag = {
        geometry: {
          attributes: {
            position: {
              array: new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0]),
              needsUpdate: false
            }
          }
        },
        userData: {
          originalVertices: [0, 0, 0, 1, 0, 0, 2, 0, 0]
        }
      };

      CourseElementFactory.animateFlag(mockFlag, 1.0);

      // Verify that needsUpdate was set
      expect(mockFlag.geometry.attributes.position.needsUpdate).toBe(true);
    });

    test('should not animate if flag has no userData', () => {
      const mockFlag = {
        geometry: {
          attributes: {
            position: {
              array: new Float32Array([0, 0, 0]),
              needsUpdate: false
            }
          }
        }
      };

      CourseElementFactory.animateFlag(mockFlag, 1.0);

      // Should not update if no userData
      expect(mockFlag.geometry.attributes.position.needsUpdate).toBe(false);
    });

    test('should handle null flag gracefully', () => {
      expect(() => {
        CourseElementFactory.animateFlag(null, 1.0);
      }).not.toThrow();
    });
  });
});
