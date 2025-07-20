/**
 * Unit tests for DynamicLightingEffects
 */

import { DynamicLightingEffects } from '../utils/DynamicLightingEffects';
import * as THREE from 'three';

// Mock Three.js
jest.mock('three', () => ({
  Vector3: jest.fn((x = 0, y = 0, z = 0) => ({ x, y, z })),
  Color: jest.fn(color => ({ color })),
  PointLight: jest.fn(() => ({
    uuid: 'test-light-uuid',
    userData: {},
    intensity: 1.0,
    parent: null
  }))
}));

describe('DynamicLightingEffects', () => {
  let dynamicLightingEffects;
  let mockLightingManager;

  beforeEach(() => {
    let lightIdCounter = 0;

    // Mock lighting manager
    mockLightingManager = {
      addPointLight: jest.fn().mockImplementation(() => ({
        uuid: `test-light-uuid-${++lightIdCounter}`,
        userData: {},
        intensity: 1.0,
        parent: {
          remove: jest.fn()
        }
      }))
    };

    dynamicLightingEffects = new DynamicLightingEffects(mockLightingManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with lighting manager', () => {
      expect(dynamicLightingEffects.lightingManager).toBe(mockLightingManager);
      expect(dynamicLightingEffects.animatedLights).toBeInstanceOf(Map);
      expect(dynamicLightingEffects.time).toBe(0);
    });

    test('should handle null lighting manager', () => {
      const effects = new DynamicLightingEffects(null);
      expect(effects.lightingManager).toBeNull();
    });
  });

  describe('addHazardWarningLight', () => {
    test('should add hazard warning light with default type', () => {
      const position = new THREE.Vector3(1, 2, 3);
      const light = dynamicLightingEffects.addHazardWarningLight(position);

      expect(mockLightingManager.addPointLight).toHaveBeenCalledWith(
        new THREE.Vector3(1, 3, 3), // Y position + 1.0
        0xffa500, // Orange color for sand
        0.6,
        4.0
      );
      expect(light.userData.type).toBe('hazardWarning');
      expect(light.userData.hazardType).toBe('sand');
      expect(light.userData.baseIntensity).toBe(0.6);
      expect(dynamicLightingEffects.animatedLights.has(light.uuid)).toBe(true);
    });

    test('should add hazard warning light with specific type', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const light = dynamicLightingEffects.addHazardWarningLight(position, 'water');

      expect(mockLightingManager.addPointLight).toHaveBeenCalledWith(
        new THREE.Vector3(0, 1, 0),
        0x0080ff, // Blue color for water
        0.6,
        4.0
      );
      expect(light.userData.hazardType).toBe('water');
    });

    test('should handle all hazard types', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const hazardTypes = ['sand', 'water', 'lava', 'ice', 'void'];
      const expectedColors = [0xffa500, 0x0080ff, 0xff4500, 0x87ceeb, 0x8b00ff];

      hazardTypes.forEach((type, index) => {
        jest.clearAllMocks();
        dynamicLightingEffects.addHazardWarningLight(position, type);
        expect(mockLightingManager.addPointLight).toHaveBeenCalledWith(
          expect.any(Object),
          expectedColors[index],
          0.6,
          4.0
        );
      });
    });

    test('should handle unknown hazard type', () => {
      const position = new THREE.Vector3(0, 0, 0);
      dynamicLightingEffects.addHazardWarningLight(position, 'unknown');

      expect(mockLightingManager.addPointLight).toHaveBeenCalledWith(
        expect.any(Object),
        0xffa500, // Default orange
        0.6,
        4.0
      );
    });

    test('should handle null lighting manager', () => {
      const effects = new DynamicLightingEffects(null);
      const position = new THREE.Vector3(0, 0, 0);
      const light = effects.addHazardWarningLight(position);

      expect(light).toBeUndefined();
    });
  });

  describe('addBumperEffectLight', () => {
    test('should add bumper effect light with default type', () => {
      const position = new THREE.Vector3(1, 2, 3);
      const light = dynamicLightingEffects.addBumperEffectLight(position);

      expect(mockLightingManager.addPointLight).toHaveBeenCalledWith(
        new THREE.Vector3(1, 2.8, 3), // Y position + 0.8
        0x00ff00, // Green color for standard
        0.8,
        3.0
      );
      expect(light.userData.type).toBe('bumperEffect');
      expect(light.userData.bumperType).toBe('standard');
      expect(light.userData.baseIntensity).toBe(0.8);
      expect(light.userData.pulseSpeed).toBe(3.0);
    });

    test('should handle all bumper types', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const bumperTypes = ['standard', 'bouncy', 'explosive', 'magnetic', 'teleport'];
      const expectedColors = [0x00ff00, 0xff00ff, 0xff0000, 0x00ffff, 0x8a2be2];

      bumperTypes.forEach((type, index) => {
        jest.clearAllMocks();
        dynamicLightingEffects.addBumperEffectLight(position, type);
        expect(mockLightingManager.addPointLight).toHaveBeenCalledWith(
          expect.any(Object),
          expectedColors[index],
          0.8,
          3.0
        );
      });
    });

    test('should handle unknown bumper type', () => {
      const position = new THREE.Vector3(0, 0, 0);
      dynamicLightingEffects.addBumperEffectLight(position, 'unknown');

      expect(mockLightingManager.addPointLight).toHaveBeenCalledWith(
        expect.any(Object),
        0x00ff00, // Default green
        0.8,
        3.0
      );
    });
  });

  describe('addObstacleLight', () => {
    test('should add obstacle light with default type', () => {
      const position = new THREE.Vector3(1, 2, 3);
      const light = dynamicLightingEffects.addObstacleLight(position);

      expect(mockLightingManager.addPointLight).toHaveBeenCalledWith(
        new THREE.Vector3(1, 3.2, 3), // Y position + 1.2
        0x00ffff, // Cyan color for tech
        1.0,
        5.0
      );
      expect(light.userData.type).toBe('obstacleEffect');
      expect(light.userData.obstacleType).toBe('tech');
      expect(light.userData.baseIntensity).toBe(1.0);
    });

    test('should handle all obstacle types', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const obstacleTypes = ['tech', 'energy', 'plasma', 'crystal', 'alien', 'portal'];
      const expectedColors = [0x00ffff, 0xff00ff, 0x8a2be2, 0x00ff88, 0xff4500, 0x1e90ff];

      obstacleTypes.forEach((type, index) => {
        jest.clearAllMocks();
        dynamicLightingEffects.addObstacleLight(position, type);
        expect(mockLightingManager.addPointLight).toHaveBeenCalledWith(
          expect.any(Object),
          expectedColors[index],
          1.0,
          5.0
        );
      });
    });
  });

  describe('addSpacePhenomenaLight', () => {
    test('should add space phenomena light with default type', () => {
      const position = new THREE.Vector3(1, 2, 3);
      const light = dynamicLightingEffects.addSpacePhenomenaLight(position);

      expect(mockLightingManager.addPointLight).toHaveBeenCalledWith(
        new THREE.Vector3(1, 4, 3), // Y position + 2.0
        0x8b00ff, // Purple color for nebula
        0.4,
        8.0
      );
      expect(light.userData.type).toBe('spacePhenomena');
      expect(light.userData.phenomenaType).toBe('nebula');
      expect(light.userData.baseIntensity).toBe(0.4);
      expect(light.userData.flickerIntensity).toBe(0.3);
    });

    test('should handle all phenomena types', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const phenomenaTypes = ['nebula', 'star', 'pulsar', 'quasar', 'aurora', 'comet'];
      const expectedColors = [0x8b00ff, 0xffffff, 0x00ff00, 0xff0080, 0x00ff80, 0x87ceeb];

      phenomenaTypes.forEach((type, index) => {
        jest.clearAllMocks();
        dynamicLightingEffects.addSpacePhenomenaLight(position, type);
        expect(mockLightingManager.addPointLight).toHaveBeenCalledWith(
          expect.any(Object),
          expectedColors[index],
          0.4,
          8.0
        );
      });
    });

    test('should set higher flicker intensity for pulsar', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const light = dynamicLightingEffects.addSpacePhenomenaLight(position, 'pulsar');

      expect(light.userData.flickerIntensity).toBe(0.8);
    });
  });

  describe('addRimLightingToMesh', () => {
    test('should add rim lighting to mesh with material', () => {
      const mockMesh = {
        material: {
          onBeforeCompile: jest.fn(),
          needsUpdate: false
        }
      };

      dynamicLightingEffects.addRimLightingToMesh(mockMesh, 0xff0000, 0.8);

      expect(mockMesh.material.onBeforeCompile).toBeDefined();
      expect(mockMesh.material.needsUpdate).toBe(true);
    });

    test('should handle mesh without material', () => {
      const mockMesh = {};

      expect(() => {
        dynamicLightingEffects.addRimLightingToMesh(mockMesh);
      }).not.toThrow();
    });

    test('should handle null mesh', () => {
      expect(() => {
        dynamicLightingEffects.addRimLightingToMesh(null);
      }).not.toThrow();
    });

    test('should handle material without onBeforeCompile', () => {
      const mockMesh = {
        material: {}
      };

      expect(() => {
        dynamicLightingEffects.addRimLightingToMesh(mockMesh);
      }).not.toThrow();
    });
  });

  describe('createRimLightShader', () => {
    test('should create rim light shader with uniforms', () => {
      const shader = dynamicLightingEffects.createRimLightShader(0xff0000, 0.5);

      expect(shader.uniforms).toBeDefined();
      expect(shader.uniforms.rimColor).toBeDefined();
      expect(shader.uniforms.rimIntensity).toBeDefined();
      expect(shader.uniforms.time).toBeDefined();
      expect(shader.vertexShader).toBeDefined();
      expect(shader.fragmentShader).toBeDefined();
      expect(typeof shader.vertexShader).toBe('string');
      expect(typeof shader.fragmentShader).toBe('string');
    });

    test('should create shader with default parameters', () => {
      const shader = dynamicLightingEffects.createRimLightShader();

      expect(shader.uniforms.rimColor).toBeDefined();
      expect(shader.uniforms.rimIntensity).toBeDefined();
    });
  });

  describe('update', () => {
    test('should update animated lights', () => {
      // Add a hazard warning light
      const position = new THREE.Vector3(0, 0, 0);
      const light = dynamicLightingEffects.addHazardWarningLight(position);

      // Mock Math.sin to return a predictable value
      const originalSin = Math.sin;
      Math.sin = jest.fn().mockReturnValue(0.5);

      dynamicLightingEffects.update(0.016);

      expect(dynamicLightingEffects.time).toBe(0.016);
      expect(light.intensity).toBeDefined();

      // Restore Math.sin
      Math.sin = originalSin;
    });

    test('should update bumper effect lights', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const light = dynamicLightingEffects.addBumperEffectLight(position);

      const originalSin = Math.sin;
      Math.sin = jest.fn().mockReturnValue(0.5);

      dynamicLightingEffects.update(0.016);

      expect(light.intensity).toBeDefined();

      Math.sin = originalSin;
    });

    test('should update obstacle effect lights', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const light = dynamicLightingEffects.addObstacleLight(position);

      const originalSin = Math.sin;
      Math.sin = jest.fn().mockReturnValue(0.5);

      dynamicLightingEffects.update(0.016);

      expect(light.intensity).toBeDefined();

      Math.sin = originalSin;
    });

    test('should update space phenomena lights with flicker', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const light = dynamicLightingEffects.addSpacePhenomenaLight(position);

      const originalSin = Math.sin;
      const originalRandom = Math.random;
      Math.sin = jest.fn().mockReturnValue(0.5);
      Math.random = jest.fn().mockReturnValue(0.5);

      dynamicLightingEffects.update(0.016);

      expect(light.intensity).toBeDefined();

      Math.sin = originalSin;
      Math.random = originalRandom;
    });

    test('should handle lights with unknown types', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const light = dynamicLightingEffects.addHazardWarningLight(position);
      light.userData.type = 'unknown';

      expect(() => {
        dynamicLightingEffects.update(0.016);
      }).not.toThrow();
    });
  });

  describe('removeLight', () => {
    test('should remove animated light', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const light = dynamicLightingEffects.addHazardWarningLight(position);

      expect(dynamicLightingEffects.animatedLights.has(light.uuid)).toBe(true);

      dynamicLightingEffects.removeLight(light);

      expect(dynamicLightingEffects.animatedLights.has(light.uuid)).toBe(false);
      expect(light.parent.remove).toHaveBeenCalledWith(light);
    });

    test('should handle light without parent', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const light = dynamicLightingEffects.addHazardWarningLight(position);
      light.parent = null;

      expect(() => {
        dynamicLightingEffects.removeLight(light);
      }).not.toThrow();
    });

    test('should handle null light', () => {
      expect(() => {
        dynamicLightingEffects.removeLight(null);
      }).not.toThrow();
    });

    test('should handle light not in animated lights', () => {
      const light = { uuid: 'non-existent-light' };

      expect(() => {
        dynamicLightingEffects.removeLight(light);
      }).not.toThrow();
    });
  });

  describe('removeAllLights', () => {
    test('should remove all animated lights', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const light1 = dynamicLightingEffects.addHazardWarningLight(position);
      const light2 = dynamicLightingEffects.addBumperEffectLight(position);

      expect(dynamicLightingEffects.animatedLights.size).toBe(2);

      dynamicLightingEffects.removeAllLights();

      expect(dynamicLightingEffects.animatedLights.size).toBe(0);
      expect(light1.parent.remove).toHaveBeenCalledWith(light1);
      expect(light2.parent.remove).toHaveBeenCalledWith(light2);
    });

    test('should handle lights without parents', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const light = dynamicLightingEffects.addHazardWarningLight(position);
      light.parent = null;

      expect(() => {
        dynamicLightingEffects.removeAllLights();
      }).not.toThrow();
    });
  });

  describe('getActiveLightCount', () => {
    test('should return correct light count', () => {
      expect(dynamicLightingEffects.getActiveLightCount()).toBe(0);

      const position = new THREE.Vector3(0, 0, 0);
      dynamicLightingEffects.addHazardWarningLight(position);
      expect(dynamicLightingEffects.getActiveLightCount()).toBe(1);

      dynamicLightingEffects.addBumperEffectLight(position);
      expect(dynamicLightingEffects.getActiveLightCount()).toBe(2);
    });
  });

  describe('dispose', () => {
    test('should dispose all lights', () => {
      const position = new THREE.Vector3(0, 0, 0);
      dynamicLightingEffects.addHazardWarningLight(position);
      dynamicLightingEffects.addBumperEffectLight(position);

      const removeAllLightsSpy = jest.spyOn(dynamicLightingEffects, 'removeAllLights');

      dynamicLightingEffects.dispose();

      expect(removeAllLightsSpy).toHaveBeenCalled();
      expect(dynamicLightingEffects.animatedLights.size).toBe(0);
    });
  });
});
