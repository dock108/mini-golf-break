import { CourseFactory } from '../objects/CourseFactory';
import { HoleEntity } from '../objects/HoleEntity';
import * as THREE from 'three';

// Mock HoleEntity
jest.mock('../objects/HoleEntity', () => ({
  HoleEntity: jest.fn(() => {
    const THREE = require('three');
    return {
      create: jest.fn().mockResolvedValue(undefined),
      getWorldStartPosition: jest.fn(() => new THREE.Vector3(0, 0, 8)),
      getWorldHolePosition: jest.fn(() => new THREE.Vector3(0, 0, -8)),
      worldHolePosition: new THREE.Vector3(0, 0, 0)
    };
  })
}));

// Mock debug utility
jest.mock('../utils/debug', () => ({
  debug: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('CourseFactory', () => {
  let courseFactory;
  let mockGame;

  beforeEach(() => {
    mockGame = {
      scene: new THREE.Scene(),
      physicsManager: {
        getWorld: jest.fn(() => ({
          addBody: jest.fn(),
          removeBody: jest.fn(),
          addEventListener: jest.fn()
        }))
      },
      environmentManager: {
        setSkybox: jest.fn().mockResolvedValue(undefined)
      },
      lightingManager: {
        applyLightingPreset: jest.fn()
      },
      postProcessingManager: {
        setBloomIntensity: jest.fn(),
        setToneMappingExposure: jest.fn()
      }
    };

    courseFactory = new CourseFactory(mockGame);

    // Clear mock calls
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with game reference', () => {
      expect(courseFactory.game).toBe(mockGame);
    });
  });

  describe('createCourse', () => {
    test('should create course from valid data', async () => {
      const courseData = {
        id: 'test-course',
        name: 'Test Course',
        author: 'Test Author',
        description: 'Test Description',
        totalHoles: 2,
        totalPar: 7,
        metadata: {
          difficulty: 'medium',
          theme: 'space',
          environment: {
            skybox: 'space-nebula',
            lighting: { preset: 'test' },
            postProcessing: {
              bloom: { intensity: 0.5 },
              toneMappingExposure: 1.0
            }
          }
        },
        elementsByType: {
          hole: [
            {
              type: 'hole',
              id: 'hole_1',
              name: 'Hole 1',
              index: 0,
              position: [0, 0, 0],
              holePosition: [0, 0, -8],
              startPosition: [0, 0, 8],
              par: 3,
              hazards: [],
              bumpers: []
            },
            {
              type: 'hole',
              id: 'hole_2',
              name: 'Hole 2',
              index: 1,
              position: [20, 0, 0],
              holePosition: [20, 0, -8],
              startPosition: [20, 0, 8],
              par: 4,
              hazards: [],
              bumpers: []
            }
          ]
        },
        holes: new Map()
      };

      const result = await courseFactory.createCourse(courseData);

      expect(result).toBeDefined();
      expect(result.id).toBe('test-course');
      expect(result.name).toBe('Test Course');
      expect(result.totalHoles).toBe(2);
      expect(result.totalPar).toBe(7);
      expect(result.holeEntities).toHaveLength(2);
      expect(result.currentHoleEntity).toBeDefined();
      expect(result.getHoleStartPosition).toBeDefined();
      expect(result.getHolePosition).toBeDefined();
      expect(result.getCurrentHole).toBeDefined();
      expect(result.setCurrentHole).toBeDefined();

      // Check that environment settings were applied
      expect(mockGame.environmentManager.setSkybox).toHaveBeenCalledWith('space-nebula');
      expect(mockGame.lightingManager.applyLightingPreset).toHaveBeenCalledWith({ preset: 'test' });
      expect(mockGame.postProcessingManager.setBloomIntensity).toHaveBeenCalledWith(0.5);
      expect(mockGame.postProcessingManager.setToneMappingExposure).toHaveBeenCalledWith(1.0);
    });

    test('should handle course with fog settings', async () => {
      const courseData = {
        id: 'fog-course',
        name: 'Fog Course',
        author: 'Test Author',
        description: 'Test Description',
        totalHoles: 1,
        totalPar: 3,
        metadata: {
          environment: {
            fog: {
              enabled: true,
              color: '0x000022',
              near: 50,
              far: 200
            }
          }
        },
        elementsByType: {
          hole: [
            {
              type: 'hole',
              id: 'hole_1',
              name: 'Hole 1',
              index: 0,
              position: [0, 0, 0],
              holePosition: [0, 0, -8],
              startPosition: [0, 0, 8],
              par: 3,
              hazards: [],
              bumpers: []
            }
          ]
        },
        holes: new Map()
      };

      const result = await courseFactory.createCourse(courseData);

      expect(result).toBeDefined();
      expect(mockGame.scene.fog).toBeInstanceOf(THREE.Fog);
      expect(mockGame.scene.fog.color.getHex()).toBe(0x000022);
      expect(mockGame.scene.fog.near).toBe(50);
      expect(mockGame.scene.fog.far).toBe(200);
    });

    test('should handle course without environment settings', async () => {
      const courseData = {
        id: 'simple-course',
        name: 'Simple Course',
        author: 'Test Author',
        description: 'Test Description',
        totalHoles: 1,
        totalPar: 3,
        metadata: {},
        elementsByType: {
          hole: [
            {
              type: 'hole',
              id: 'hole_1',
              name: 'Hole 1',
              index: 0,
              position: [0, 0, 0],
              holePosition: [0, 0, -8],
              startPosition: [0, 0, 8],
              par: 3,
              hazards: [],
              bumpers: []
            }
          ]
        },
        holes: new Map()
      };

      const result = await courseFactory.createCourse(courseData);

      expect(result).toBeDefined();
      expect(mockGame.environmentManager.setSkybox).not.toHaveBeenCalled();
      expect(mockGame.lightingManager.applyLightingPreset).not.toHaveBeenCalled();
    });
  });

  describe('createHoleEntity', () => {
    test('should create hole entity with correct configuration', async () => {
      const holeData = {
        type: 'hole',
        id: 'hole_1',
        name: 'Test Hole',
        index: 0,
        position: [0, 0, 0],
        holePosition: [0, 0, -8],
        startPosition: [0, 0, 8],
        par: 3,
        courseWidth: 6,
        courseLength: 20,
        hazards: [
          {
            type: 'sand',
            position: [1, 0, 0],
            radius: 2
          }
        ],
        bumpers: [
          {
            position: [2, 0, 0],
            size: [0.5, 0.5, 1],
            rotation: [0, 0, 0]
          }
        ],
        materials: { surface: 'metal' },
        lighting: { spotlights: [] },
        decorations: [],
        difficulty: 'medium'
      };

      const courseData = { metadata: {} };

      const result = await courseFactory.createHoleEntity(holeData, courseData);

      expect(HoleEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          addBody: expect.any(Function),
          removeBody: expect.any(Function),
          addEventListener: expect.any(Function)
        }),
        expect.objectContaining({
          index: 0,
          description: 'Test Hole',
          par: 3,
          courseWidth: 6,
          courseLength: 20,
          materials: { surface: 'metal' },
          lighting: { spotlights: [] },
          decorations: [],
          difficulty: 'medium'
        }),
        mockGame.scene,
        mockGame
      );

      expect(result).toBeDefined();
      expect(result.worldHolePosition.x).toBe(0);
      expect(result.worldHolePosition.y).toBe(0);
      expect(result.worldHolePosition.z).toBe(0);
    });

    test('should handle hole with boundary shape', async () => {
      const holeData = {
        type: 'hole',
        id: 'hole_1',
        name: 'Test Hole',
        index: 0,
        position: [0, 0, 0],
        holePosition: [0, 0, -8],
        startPosition: [0, 0, 8],
        par: 3,
        boundaryShape: [
          [-5, -10],
          [-5, 10],
          [5, 10],
          [5, -10]
        ],
        hazards: [],
        bumpers: []
      };

      const courseData = { metadata: {} };

      await courseFactory.createHoleEntity(holeData, courseData);

      expect(HoleEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          addBody: expect.any(Function),
          removeBody: expect.any(Function),
          addEventListener: expect.any(Function)
        }),
        expect.objectContaining({
          boundaryShape: expect.arrayContaining([
            expect.any(THREE.Vector2),
            expect.any(THREE.Vector2),
            expect.any(THREE.Vector2),
            expect.any(THREE.Vector2)
          ])
        }),
        mockGame.scene,
        mockGame
      );
    });
  });

  describe('convertHazards', () => {
    test('should convert hazards to expected format', () => {
      const hazards = [
        {
          type: 'sand',
          position: [1, 0, 2],
          size: { x: 2, y: 0.5, z: 3 },
          subShapes: [{ position: { x: 1, z: 2 }, radius: 1 }]
        }
      ];

      const result = courseFactory.convertHazards(hazards);

      expect(result).toHaveLength(1);
      expect(result[0].position).toBeInstanceOf(THREE.Vector3);
      expect(result[0].position.x).toBe(1);
      expect(result[0].position.y).toBe(0);
      expect(result[0].position.z).toBe(2);
      expect(result[0].size).toBeInstanceOf(THREE.Vector3);
      expect(result[0].size.x).toBe(2);
      expect(result[0].size.y).toBe(0.5);
      expect(result[0].size.z).toBe(3);
      expect(result[0].subShapes[0].position).toBeInstanceOf(THREE.Vector3);
    });

    test('should handle empty hazards array', () => {
      const result = courseFactory.convertHazards([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('convertBumpers', () => {
    test('should convert bumpers to expected format', () => {
      const bumpers = [
        {
          position: [1, 2, 3],
          size: [0.5, 0.5, 1],
          rotation: [0, 0.5, 0]
        }
      ];

      const result = courseFactory.convertBumpers(bumpers);

      expect(result).toHaveLength(1);
      expect(result[0].position).toBeInstanceOf(THREE.Vector3);
      expect(result[0].position.x).toBe(1);
      expect(result[0].position.y).toBe(2);
      expect(result[0].position.z).toBe(3);
      expect(result[0].size).toBeInstanceOf(THREE.Vector3);
      expect(result[0].rotation).toBeInstanceOf(THREE.Euler);
    });

    test('should handle empty bumpers array', () => {
      const result = courseFactory.convertBumpers([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('course methods', () => {
    let course;

    beforeEach(async () => {
      const courseData = {
        id: 'test-course',
        name: 'Test Course',
        author: 'Test Author',
        description: 'Test Description',
        totalHoles: 2,
        totalPar: 7,
        metadata: {},
        elementsByType: {
          hole: [
            {
              type: 'hole',
              id: 'hole_1',
              name: 'Hole 1',
              index: 0,
              position: [0, 0, 0],
              holePosition: [0, 0, -8],
              startPosition: [0, 0, 8],
              par: 3,
              hazards: [],
              bumpers: []
            },
            {
              type: 'hole',
              id: 'hole_2',
              name: 'Hole 2',
              index: 1,
              position: [20, 0, 0],
              holePosition: [20, 0, -8],
              startPosition: [20, 0, 8],
              par: 4,
              hazards: [],
              bumpers: []
            }
          ]
        },
        holes: new Map()
      };

      course = await courseFactory.createCourse(courseData);
    });

    test('getHoleStartPosition should return current hole start position', () => {
      const position = course.getHoleStartPosition();
      expect(position).toBeInstanceOf(THREE.Vector3);
      expect(position.x).toBe(0);
      expect(position.y).toBe(0);
      expect(position.z).toBe(8);
    });

    test('getHolePosition should return current hole position', () => {
      const position = course.getHolePosition();
      expect(position).toBeInstanceOf(THREE.Vector3);
      expect(position.x).toBe(0);
      expect(position.y).toBe(0);
      expect(position.z).toBe(-8);
    });

    test('getCurrentHole should return current hole entity', () => {
      const hole = course.getCurrentHole();
      expect(hole).toBe(course.currentHoleEntity);
    });

    test('setCurrentHole should change current hole', () => {
      const originalHole = course.currentHoleEntity;
      course.setCurrentHole(1);

      expect(course.currentHoleIndex).toBe(1);
      expect(course.currentHoleEntity).toBe(course.holeEntities[1]);
      expect(course.currentHoleEntity).not.toBe(originalHole);
    });

    test('setCurrentHole should handle invalid index', () => {
      const originalHole = course.currentHoleEntity;
      const originalIndex = course.currentHoleIndex;

      course.setCurrentHole(999);

      expect(course.currentHoleIndex).toBe(originalIndex);
      expect(course.currentHoleEntity).toBe(originalHole);
    });
  });

  describe('applyEnvironmentSettings', () => {
    test('should handle missing managers gracefully', async () => {
      const gameWithoutManagers = {
        scene: new THREE.Scene()
      };

      const factory = new CourseFactory(gameWithoutManagers);

      const environmentSettings = {
        skybox: 'space-nebula',
        lighting: { preset: 'test' },
        postProcessing: {
          bloom: { intensity: 0.5 }
        }
      };

      // Should not throw
      await expect(factory.applyEnvironmentSettings(environmentSettings)).resolves.not.toThrow();
    });
  });
});
