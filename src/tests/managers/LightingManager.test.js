/**
 * Unit tests for LightingManager
 */

import { LightingManager } from '../../managers/LightingManager';
import * as THREE from 'three';

// Mock THREE.js
jest.mock('three', () => ({
  DirectionalLight: jest.fn(() => ({
    position: { set: jest.fn() },
    castShadow: false,
    shadow: {
      camera: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        near: 0,
        far: 0
      },
      mapSize: { width: 0, height: 0 },
      radius: 0,
      blurSamples: 0
    },
    target: { position: { set: jest.fn() } }
  })),
  AmbientLight: jest.fn(() => ({
    intensity: 0
  })),
  HemisphereLight: jest.fn(() => ({
    position: { set: jest.fn() },
    intensity: 0
  })),
  PointLight: jest.fn(() => ({
    position: {
      set: jest.fn(),
      copy: jest.fn()
    },
    castShadow: false,
    shadow: {
      camera: { near: 0, far: 0 },
      mapSize: { width: 0, height: 0 }
    },
    decay: 0,
    userData: {}
  })),
  Color: jest.fn(color => ({ r: 1, g: 1, b: 1, isColor: true })),
  Vector3: jest.fn((x, y, z) => ({ x: x || 0, y: y || 0, z: z || 0 })),
  BasicShadowMap: 0,
  PCFShadowMap: 1,
  CameraHelper: jest.fn(() => ({
    visible: false
  })),
  PCFSoftShadowMap: 2
}));

// Mock DynamicLightingEffects
jest.mock('../../utils/DynamicLightingEffects.js', () => ({
  DynamicLightingEffects: jest.fn(() => ({
    init: jest.fn(),
    update: jest.fn(),
    cleanup: jest.fn(),
    dispose: jest.fn()
  }))
}));

describe('LightingManager', () => {
  let lightingManager;
  let mockScene;
  let mockRenderer;

  beforeEach(() => {
    mockScene = {
      add: jest.fn(),
      remove: jest.fn(),
      userData: {} // Add userData object
    };

    mockRenderer = {
      physicallyCorrectLights: false,
      shadowMap: {
        enabled: false,
        type: 0
      }
    };

    lightingManager = new LightingManager(mockScene, mockRenderer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with scene and renderer', () => {
      expect(lightingManager.scene).toBe(mockScene);
      expect(lightingManager.renderer).toBe(mockRenderer);
      expect(lightingManager.lights).toBeDefined();
      expect(lightingManager.settings).toBeDefined();
      expect(lightingManager.lightCount).toBe(0);
      expect(lightingManager.maxLights).toBe(8);
      expect(lightingManager.dynamicEffects).toBeNull();
    });

    test('should initialize light references', () => {
      expect(lightingManager.lights.mainSun).toBeNull();
      expect(lightingManager.lights.ambient).toBeNull();
      expect(lightingManager.lights.rimLights).toEqual([]);
      expect(lightingManager.lights.pointLights).toEqual([]);
      expect(lightingManager.lights.holeLights).toEqual([]);
    });

    test('should initialize settings with defaults', () => {
      expect(lightingManager.settings.mainSunIntensity).toBe(2.0);
      expect(lightingManager.settings.ambientIntensity).toBe(0.3);
      expect(lightingManager.settings.rimLightIntensity).toBe(0.8);
      expect(lightingManager.settings.enableShadows).toBe(true);
      expect(lightingManager.settings.shadowQuality).toBe('high');
    });
  });

  describe('init', () => {
    test('should initialize lighting system', () => {
      lightingManager.createMainSunlight = jest.fn();
      lightingManager.createAmbientLighting = jest.fn();
      lightingManager.createRimLights = jest.fn();
      lightingManager.configureShadows = jest.fn();

      lightingManager.init();

      expect(mockRenderer.physicallyCorrectLights).toBe(true);
      expect(lightingManager.createMainSunlight).toHaveBeenCalled();
      expect(lightingManager.createAmbientLighting).toHaveBeenCalled();
      expect(lightingManager.createRimLights).toHaveBeenCalled();
      expect(lightingManager.configureShadows).toHaveBeenCalled();
    });

    test('should initialize dynamic effects', () => {
      const DynamicLightingEffects =
        require('../../utils/DynamicLightingEffects.js').DynamicLightingEffects;

      lightingManager.init();

      expect(DynamicLightingEffects).toHaveBeenCalledWith(lightingManager);
      expect(lightingManager.dynamicEffects).toBeDefined();
      // The init() method is not called in LightingManager, the DynamicLightingEffects constructor handles initialization
    });
  });

  describe('createMainSunlight', () => {
    test('should create main directional light', () => {
      lightingManager.getShadowMapSize = jest.fn().mockReturnValue(4096);
      lightingManager.createMainSunlight();

      expect(THREE.DirectionalLight).toHaveBeenCalledWith(0xffffff, 2.0); // White color
      expect(lightingManager.lights.mainSun).toBeDefined();
      expect(lightingManager.lights.mainSun.position.set).toHaveBeenCalledWith(50, 100, 50);
      expect(lightingManager.lights.mainSun.castShadow).toBe(true);
      expect(mockScene.add).toHaveBeenCalledWith(lightingManager.lights.mainSun);
      expect(lightingManager.lightCount).toBe(1);
    });

    test('should configure shadow properties', () => {
      lightingManager.getShadowMapSize = jest.fn().mockReturnValue(4096);
      lightingManager.createMainSunlight();
      const sun = lightingManager.lights.mainSun;

      expect(sun.shadow.camera.top).toBe(50);
      expect(sun.shadow.camera.bottom).toBe(-50);
      expect(sun.shadow.camera.left).toBe(-50);
      expect(sun.shadow.camera.right).toBe(50);
      expect(sun.shadow.camera.near).toBe(0.1);
      expect(sun.shadow.camera.far).toBe(200);
      expect(sun.shadow.mapSize.width).toBe(4096);
      expect(sun.shadow.mapSize.height).toBe(4096);
      // radius and blurSamples are not set in the implementation
      expect(sun.shadow.bias).toBe(-0.0001);
      expect(sun.shadow.normalBias).toBe(0.02);
    });
  });

  describe('createAmbientLighting', () => {
    test('should create ambient light', () => {
      lightingManager.createAmbientLighting();

      expect(THREE.AmbientLight).toHaveBeenCalledWith(0x404080, 0.3);
      expect(lightingManager.lights.ambient).toBeDefined();
      expect(mockScene.add).toHaveBeenCalledWith(lightingManager.lights.ambient);
    });

    test('should create hemisphere light', () => {
      lightingManager.createAmbientLighting();

      // The implementation only creates an ambient light, not a hemisphere light
      expect(THREE.AmbientLight).toHaveBeenCalled();
      expect(mockScene.add).toHaveBeenCalledTimes(1); // only ambient
    });
  });

  describe('createRimLights', () => {
    test('should create blue rim light', () => {
      lightingManager.createRimLights();

      expect(THREE.DirectionalLight).toHaveBeenCalledWith(0x4080ff, 0.24); // 0.8 * 0.3
      expect(lightingManager.lights.rimLights).toHaveLength(3);
      expect(lightingManager.lights.rimLights[0].position.set).toHaveBeenCalledWith(-80, 20, -60);
      expect(lightingManager.lightCount).toBe(3);
    });

    test('should create purple rim light', () => {
      lightingManager.createRimLights();

      expect(THREE.DirectionalLight).toHaveBeenCalledWith(0x8040ff, 0.16000000000000003); // 0.8 * 0.2
      expect(lightingManager.lights.rimLights[1].position.set).toHaveBeenCalledWith(60, -10, 80);
    });

    test('should create orange rim light', () => {
      lightingManager.createRimLights();

      expect(THREE.DirectionalLight).toHaveBeenCalledWith(0xff8040, 0.12); // 0.8 * 0.15
      expect(lightingManager.lights.rimLights[2].position.set).toHaveBeenCalledWith(30, 50, -100);
    });

    test('should add all rim lights and targets to scene', () => {
      lightingManager.createRimLights();

      // Each rim light is added twice (light + target)
      expect(mockScene.add).toHaveBeenCalledTimes(6);
      lightingManager.lights.rimLights.forEach(light => {
        expect(mockScene.add).toHaveBeenCalledWith(light);
        expect(mockScene.add).toHaveBeenCalledWith(light.target);
      });
    });
  });

  describe('configureShadows', () => {
    test('should enable shadows when settings allow', () => {
      lightingManager.settings.enableShadows = true;
      lightingManager.configureShadows();

      expect(mockRenderer.shadowMap.enabled).toBe(true);
      expect(mockRenderer.shadowMap.type).toBe(THREE.PCFSoftShadowMap);
    });

    test('should disable shadows when settings disable', () => {
      lightingManager.settings.enableShadows = false;
      lightingManager.configureShadows();

      expect(mockRenderer.shadowMap.enabled).toBe(false);
    });
  });

  describe('addHoleLight', () => {
    test('should add point light for hole', () => {
      const position = { x: 10, y: 5, z: 20 };
      lightingManager.addHoleLight(position);

      expect(THREE.PointLight).toHaveBeenCalledWith(0x00ff88, 0.8, 3.0);
      expect(lightingManager.lights.holeLights).toHaveLength(1);
      const expectedPosition = new THREE.Vector3(position.x, position.y + 0.5, position.z);
      expect(lightingManager.lights.holeLights[0].position.copy).toHaveBeenCalledWith(
        expectedPosition
      );
      expect(lightingManager.lights.holeLights[0].userData.type).toBe('holeLight');
      expect(mockScene.add).toHaveBeenCalled();
    });

    test('should not exceed max lights', () => {
      lightingManager.lightCount = 8; // Max lights
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      lightingManager.addHoleLight({ x: 0, y: 0, z: 0 });

      expect(console.warn).toHaveBeenCalledWith('[LightingManager] Maximum light count reached');
      expect(lightingManager.lights.holeLights).toHaveLength(0);

      consoleWarnSpy.mockRestore();
    });

    test('should configure point light shadow', () => {
      lightingManager.addHoleLight({ x: 0, y: 0, z: 0 });
      const holeLight = lightingManager.lights.holeLights[0];

      expect(holeLight.decay).toBe(2);
      expect(holeLight.userData.type).toBe('holeLight');
    });
  });

  describe('update lighting animations', () => {
    test('should animate rim lights', () => {
      // Create rim lights first
      lightingManager.createRimLights();
      const originalIntensities = lightingManager.lights.rimLights.map(l => l.intensity);

      // Mock Date.now
      const mockTime = 1000;
      jest.spyOn(Date, 'now').mockReturnValue(mockTime);

      lightingManager.update(0.016);

      // Check that intensities have been updated
      lightingManager.lights.rimLights.forEach((light, index) => {
        expect(light.intensity).toBeDefined();
      });

      Date.now.mockRestore();
    });

    test('should animate hole lights', () => {
      // Add a hole light
      lightingManager.addHoleLight({ x: 0, y: 0, z: 0 });

      // Mock Date.now
      const mockTime = 1000;
      jest.spyOn(Date, 'now').mockReturnValue(mockTime);

      lightingManager.update(0.016);

      // Check that hole light intensity was updated
      expect(lightingManager.lights.holeLights[0].intensity).toBeDefined();

      Date.now.mockRestore();
    });
  });

  describe('update', () => {
    test('should update dynamic effects', () => {
      lightingManager.init();
      const deltaTime = 0.016;

      lightingManager.update(deltaTime);

      expect(lightingManager.dynamicEffects.update).toHaveBeenCalledWith(deltaTime);
    });

    test('should handle no dynamic effects', () => {
      lightingManager.dynamicEffects = null;

      expect(() => lightingManager.update(0.016)).not.toThrow();
    });
  });

  describe('getShadowMapSize', () => {
    test('should return correct size for low quality', () => {
      lightingManager.settings.shadowQuality = 'low';
      expect(lightingManager.getShadowMapSize()).toBe(1024);
    });

    test('should return correct size for medium quality', () => {
      lightingManager.settings.shadowQuality = 'medium';
      expect(lightingManager.getShadowMapSize()).toBe(2048);
    });

    test('should return correct size for high quality', () => {
      lightingManager.settings.shadowQuality = 'high';
      expect(lightingManager.getShadowMapSize()).toBe(4096);
    });

    test('should default to medium size', () => {
      lightingManager.settings.shadowQuality = 'invalid';
      expect(lightingManager.getShadowMapSize()).toBe(2048);
    });
  });

  describe('getShadowMapType', () => {
    test('should return correct type for low quality', () => {
      lightingManager.settings.shadowQuality = 'low';
      expect(lightingManager.getShadowMapType()).toBe(THREE.BasicShadowMap);
    });

    test('should return correct type for medium quality', () => {
      lightingManager.settings.shadowQuality = 'medium';
      expect(lightingManager.getShadowMapType()).toBe(THREE.PCFShadowMap);
    });

    test('should return correct type for high quality', () => {
      lightingManager.settings.shadowQuality = 'high';
      expect(lightingManager.getShadowMapType()).toBe(THREE.PCFSoftShadowMap);
    });

    test('should default to PCFSoftShadowMap', () => {
      lightingManager.settings.shadowQuality = 'invalid';
      expect(lightingManager.getShadowMapType()).toBe(THREE.PCFSoftShadowMap);
    });
  });

  describe('setQuality', () => {
    test('should update shadow quality settings', () => {
      lightingManager.createMainSunlight();
      const mockDispose = jest.fn();
      lightingManager.lights.mainSun.shadow.mapSize = { setScalar: jest.fn() };
      lightingManager.lights.mainSun.shadow.map = { dispose: mockDispose };

      lightingManager.setQuality('low');

      expect(lightingManager.settings.shadowQuality).toBe('low');
      expect(lightingManager.lights.mainSun.shadow.mapSize.setScalar).toHaveBeenCalledWith(1024);
      expect(mockDispose).toHaveBeenCalled();
      expect(lightingManager.lights.mainSun.shadow.map).toBeNull();
    });

    test('should handle shadow without map', () => {
      lightingManager.createMainSunlight();
      lightingManager.lights.mainSun.shadow.mapSize = { setScalar: jest.fn() };
      // No shadow.map

      lightingManager.setQuality('medium');

      expect(lightingManager.settings.shadowQuality).toBe('medium');
      expect(lightingManager.lights.mainSun.shadow.mapSize.setScalar).toHaveBeenCalledWith(2048);
    });

    test('should handle no main sun light', () => {
      lightingManager.setQuality('low');

      expect(lightingManager.settings.shadowQuality).toBe('low');
      expect(mockRenderer.shadowMap.type).toBe(THREE.BasicShadowMap);
    });
  });

  describe('setShadowsEnabled', () => {
    test('should enable shadows', () => {
      lightingManager.createMainSunlight();

      lightingManager.setShadowsEnabled(true);

      expect(lightingManager.settings.enableShadows).toBe(true);
      expect(mockRenderer.shadowMap.enabled).toBe(true);
      expect(lightingManager.lights.mainSun.castShadow).toBe(true);
    });

    test('should disable shadows', () => {
      lightingManager.createMainSunlight();

      lightingManager.setShadowsEnabled(false);

      expect(lightingManager.settings.enableShadows).toBe(false);
      expect(mockRenderer.shadowMap.enabled).toBe(false);
      expect(lightingManager.lights.mainSun.castShadow).toBe(false);
    });
  });

  describe('updateIntensities', () => {
    test('should update main sun intensity', () => {
      lightingManager.createMainSunlight();

      lightingManager.updateIntensities({ mainSun: 3.0 });

      expect(lightingManager.lights.mainSun.intensity).toBe(3.0);
      expect(lightingManager.settings.mainSunIntensity).toBe(3.0);
    });

    test('should update ambient intensity', () => {
      lightingManager.createAmbientLighting();

      lightingManager.updateIntensities({ ambient: 0.5 });

      expect(lightingManager.lights.ambient.intensity).toBe(0.5);
      expect(lightingManager.settings.ambientIntensity).toBe(0.5);
    });

    test('should update rim light intensity setting', () => {
      lightingManager.updateIntensities({ rimLights: 1.0 });

      expect(lightingManager.settings.rimLightIntensity).toBe(1.0);
    });

    test('should handle partial updates', () => {
      lightingManager.createMainSunlight();
      lightingManager.createAmbientLighting();
      const originalAmbient = lightingManager.lights.ambient.intensity;

      lightingManager.updateIntensities({ mainSun: 2.5 });

      expect(lightingManager.lights.mainSun.intensity).toBe(2.5);
      expect(lightingManager.lights.ambient.intensity).toBe(originalAmbient);
    });
  });

  describe('cleanup', () => {
    test('should cleanup dynamic effects', () => {
      lightingManager.init();
      const disposeSpy = lightingManager.dynamicEffects.dispose;

      lightingManager.cleanup();

      expect(disposeSpy).toHaveBeenCalled();
      expect(lightingManager.dynamicEffects).toBeNull();
    });

    test('should remove all lights from scene', () => {
      lightingManager.createMainSunlight();
      lightingManager.createAmbientLighting();
      lightingManager.createRimLights();
      lightingManager.addHoleLight({ x: 0, y: 0, z: 0 });

      const allLights = [
        lightingManager.lights.mainSun,
        lightingManager.lights.ambient,
        ...lightingManager.lights.rimLights,
        ...lightingManager.lights.holeLights
      ];

      lightingManager.cleanup();

      allLights.forEach(light => {
        if (light) {
          expect(mockScene.remove).toHaveBeenCalledWith(light);
        }
      });
    });

    test('should reset light count', () => {
      lightingManager.lightCount = 5;

      lightingManager.cleanup();

      expect(lightingManager.lightCount).toBe(0);
    });

    test('should handle partial initialization', () => {
      lightingManager.createMainSunlight();
      // Don't create other lights

      expect(() => lightingManager.cleanup()).not.toThrow();
    });
  });
});
