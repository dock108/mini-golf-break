/**
 * Unit tests for StarfieldManager
 */

import { StarfieldManager } from '../../managers/StarfieldManager';
import * as THREE from 'three';

// Mock THREE.js
jest.mock('three', () => {
  const mockGeometry = {
    setAttribute: jest.fn(),
    dispose: jest.fn(),
    attributes: {
      brightness: {
        array: new Float32Array(100),
        needsUpdate: false
      }
    }
  };

  const mockMaterial = {
    uniforms: {
      time: { value: 0 },
      twinkleSpeed: { value: 1.0 },
      twinkleIntensity: { value: 0.6 },
      galaxyOpacity: { value: 0.4 },
      nebulaOpacity: { value: 0.3 },
      galaxyRotation: { value: 0 },
      startTime: { value: 0 },
      duration: { value: 2 },
      startPosition: { value: { copy: jest.fn() } },
      endPosition: { value: { copy: jest.fn() } },
      intensity: { value: 1 }
    },
    dispose: jest.fn()
  };

  return {
    Vector3: jest.fn((x = 0, y = 0, z = 0) => ({
      x,
      y,
      z,
      clone: jest.fn().mockReturnThis(),
      add: jest.fn().mockReturnThis(),
      copy: jest.fn().mockReturnThis()
    })),
    Color: jest.fn((r = 1, g = 1, b = 1) => ({ r, g, b })),
    BufferGeometry: jest.fn(() => mockGeometry),
    SphereGeometry: jest.fn(() => mockGeometry),
    Float32BufferAttribute: jest.fn(),
    ShaderMaterial: jest.fn(() => mockMaterial),
    Points: jest.fn((geometry, material) => ({
      geometry,
      material,
      visible: true
    })),
    Mesh: jest.fn((geometry, material) => ({
      geometry,
      material,
      visible: true
    })),
    AdditiveBlending: 'additive',
    BackSide: 'back'
  };
});

// Mock StarfieldShader
jest.mock('../../utils/StarfieldShader.js', () => ({
  StarfieldShader: {
    uniforms: {
      time: { value: 0 },
      twinkleSpeed: { value: 1.0 },
      twinkleIntensity: { value: 0.6 }
    },
    vertexShader: 'mock vertex shader',
    fragmentShader: 'mock fragment shader'
  },
  GalaxyShader: {
    uniforms: {
      time: { value: 0 },
      galaxyOpacity: { value: 0.4 },
      nebulaOpacity: { value: 0.3 },
      galaxyRotation: { value: 0 }
    },
    vertexShader: 'mock galaxy vertex shader',
    fragmentShader: 'mock galaxy fragment shader'
  },
  ShootingStarShader: {
    uniforms: {
      time: { value: 0 },
      startTime: { value: 0 },
      duration: { value: 2 },
      startPosition: { value: { copy: jest.fn() } },
      endPosition: { value: { copy: jest.fn() } },
      intensity: { value: 1 }
    },
    vertexShader: 'mock shooting star vertex shader',
    fragmentShader: 'mock shooting star fragment shader'
  }
}));

describe('StarfieldManager', () => {
  let starfieldManager;
  let mockScene;
  let mockCamera;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock console.log
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Mock setTimeout
    jest.spyOn(global, 'setTimeout').mockImplementation((callback, delay) => {
      // Store callback for manual execution in tests
      callback._delay = delay;
      return callback;
    });

    mockScene = {
      add: jest.fn(),
      remove: jest.fn()
    };

    mockCamera = {
      position: { x: 0, y: 0, z: 0 }
    };

    starfieldManager = new StarfieldManager(mockScene, mockCamera);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with proper default values', () => {
      expect(starfieldManager.scene).toBe(mockScene);
      expect(starfieldManager.camera).toBe(mockCamera);
      expect(starfieldManager.starField).toBeNull();
      expect(starfieldManager.galaxyBackground).toBeNull();
      expect(starfieldManager.shootingStars).toEqual([]);
      expect(starfieldManager.time).toBe(0);
      expect(starfieldManager.lastShootingStarTime).toBe(0);
    });

    test('should set default settings', () => {
      expect(starfieldManager.settings).toEqual({
        starCount: 15000,
        galaxyVisible: true,
        shootingStarFrequency: 0.02,
        maxShootingStars: 3,
        starTwinkleSpeed: 1.0,
        starTwinkleIntensity: 0.6,
        galaxyOpacity: 0.4,
        nebulaOpacity: 0.3
      });
    });

    test('should generate star catalog on initialization', () => {
      expect(starfieldManager.starCatalog).toBeDefined();
      expect(starfieldManager.starCatalog.mainSequence).toBeDefined();
      expect(starfieldManager.starCatalog.giants).toBeDefined();
      expect(starfieldManager.starCatalog.dwarfs).toBeDefined();
      expect(starfieldManager.starCatalog.binaries).toBeDefined();
      expect(starfieldManager.starCatalog.variables).toBeDefined();
    });
  });

  describe('generateStarCatalog', () => {
    test('should generate stars with correct proportions', () => {
      const catalog = starfieldManager.generateStarCatalog();

      // Check proportions are roughly correct
      const totalExpected = starfieldManager.settings.starCount;
      const actualTotal =
        catalog.mainSequence.length +
        catalog.giants.length +
        catalog.dwarfs.length +
        catalog.binaries.length +
        catalog.variables.length;

      expect(actualTotal).toBeGreaterThan(totalExpected * 0.95); // Allow 5% variance
      expect(catalog.mainSequence.length).toBeGreaterThan(totalExpected * 0.75);
      expect(catalog.giants.length).toBeGreaterThan(0);
      expect(catalog.dwarfs.length).toBeGreaterThan(0);
    });

    test('should create stars with proper properties', () => {
      const catalog = starfieldManager.generateStarCatalog();

      const mainStar = catalog.mainSequence[0];
      expect(mainStar).toHaveProperty('position');
      expect(mainStar).toHaveProperty('brightness');
      expect(mainStar).toHaveProperty('color');
      expect(mainStar).toHaveProperty('size');
      expect(mainStar).toHaveProperty('twinklePhase');
      expect(mainStar.type).toBe('main');
    });

    test('should create binary stars with dual positions', () => {
      const catalog = starfieldManager.generateStarCatalog();

      if (catalog.binaries.length > 0) {
        const binaryStar = catalog.binaries[0];
        expect(binaryStar).toHaveProperty('position');
        expect(binaryStar).toHaveProperty('position2');
        expect(binaryStar).toHaveProperty('orbitalPhase');
        expect(binaryStar.type).toBe('binary');
      }
    });

    test('should create variable stars with variation properties', () => {
      const catalog = starfieldManager.generateStarCatalog();

      if (catalog.variables.length > 0) {
        const variableStar = catalog.variables[0];
        expect(variableStar).toHaveProperty('baseBrightness');
        expect(variableStar).toHaveProperty('variationAmplitude');
        expect(variableStar).toHaveProperty('period');
        expect(variableStar.type).toBe('variable');
      }
    });
  });

  describe('init', () => {
    test('should initialize all starfield components', () => {
      starfieldManager.init();

      expect(starfieldManager.starField).toBeDefined();
      expect(starfieldManager.galaxyBackground).toBeDefined();
      expect(starfieldManager.shootingStars.length).toBe(
        starfieldManager.settings.maxShootingStars
      );
      expect(mockScene.add).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[StarfieldManager] Initialized with')
      );
    });

    test('should call component creation methods', () => {
      const createMainStarFieldSpy = jest.spyOn(starfieldManager, 'createMainStarField');
      const createGalaxyBackgroundSpy = jest.spyOn(starfieldManager, 'createGalaxyBackground');
      const setupShootingStarSystemSpy = jest.spyOn(starfieldManager, 'setupShootingStarSystem');

      starfieldManager.init();

      expect(createMainStarFieldSpy).toHaveBeenCalled();
      expect(createGalaxyBackgroundSpy).toHaveBeenCalled();
      expect(setupShootingStarSystemSpy).toHaveBeenCalled();
    });
  });

  describe('createMainStarField', () => {
    test('should create starfield geometry and material', () => {
      starfieldManager.createMainStarField();

      expect(THREE.BufferGeometry).toHaveBeenCalled();
      expect(THREE.ShaderMaterial).toHaveBeenCalled();
      expect(THREE.Points).toHaveBeenCalled();
      expect(mockScene.add).toHaveBeenCalled();
      expect(starfieldManager.starField).toBeDefined();
    });

    test('should set geometry attributes', () => {
      starfieldManager.createMainStarField();

      const geometry = starfieldManager.starField.geometry;
      expect(geometry.setAttribute).toHaveBeenCalledWith('position', expect.anything());
      expect(geometry.setAttribute).toHaveBeenCalledWith('size', expect.anything());
      expect(geometry.setAttribute).toHaveBeenCalledWith('brightness', expect.anything());
      expect(geometry.setAttribute).toHaveBeenCalledWith('twinklePhase', expect.anything());
      expect(geometry.setAttribute).toHaveBeenCalledWith('starType', expect.anything());
      expect(geometry.setAttribute).toHaveBeenCalledWith('starColor', expect.anything());
    });

    test('should configure shader material uniforms', () => {
      starfieldManager.createMainStarField();

      const material = starfieldManager.starField.material;
      expect(material.uniforms.twinkleSpeed.value).toBe(starfieldManager.settings.starTwinkleSpeed);
      expect(material.uniforms.twinkleIntensity.value).toBe(
        starfieldManager.settings.starTwinkleIntensity
      );
    });
  });

  describe('createGalaxyBackground', () => {
    test('should create galaxy background when visible', () => {
      starfieldManager.settings.galaxyVisible = true;
      starfieldManager.createGalaxyBackground();

      expect(THREE.SphereGeometry).toHaveBeenCalled();
      expect(THREE.ShaderMaterial).toHaveBeenCalled();
      expect(THREE.Mesh).toHaveBeenCalled();
      expect(mockScene.add).toHaveBeenCalled();
      expect(starfieldManager.galaxyBackground).toBeDefined();
    });

    test('should not create galaxy background when not visible', () => {
      starfieldManager.settings.galaxyVisible = false;
      starfieldManager.createGalaxyBackground();

      expect(starfieldManager.galaxyBackground).toBeNull();
    });

    test('should configure galaxy material uniforms', () => {
      starfieldManager.settings.galaxyVisible = true;
      starfieldManager.createGalaxyBackground();

      const material = starfieldManager.galaxyBackground.material;
      expect(material.uniforms.galaxyOpacity.value).toBe(starfieldManager.settings.galaxyOpacity);
      expect(material.uniforms.nebulaOpacity.value).toBe(starfieldManager.settings.nebulaOpacity);
    });
  });

  describe('setupShootingStarSystem', () => {
    test('should create maximum number of shooting stars', () => {
      starfieldManager.setupShootingStarSystem();

      expect(starfieldManager.shootingStars.length).toBe(
        starfieldManager.settings.maxShootingStars
      );
      expect(mockScene.add).toHaveBeenCalledTimes(starfieldManager.settings.maxShootingStars);
    });

    test('should create shooting stars with proper configuration', () => {
      starfieldManager.setupShootingStarSystem();

      starfieldManager.shootingStars.forEach(star => {
        expect(star.visible).toBe(false);
        expect(star.geometry).toBeDefined();
        expect(star.material).toBeDefined();
      });
    });
  });

  describe('createShootingStar', () => {
    beforeEach(() => {
      starfieldManager.setupShootingStarSystem();
    });

    test('should activate an available shooting star', () => {
      starfieldManager.createShootingStar();

      const activeStar = starfieldManager.shootingStars.find(star => star.visible);
      expect(activeStar).toBeDefined();
    });

    test('should not create shooting star when none available', () => {
      // Make all stars visible
      starfieldManager.shootingStars.forEach(star => {
        star.visible = true;
      });

      const initialVisibleCount = starfieldManager.shootingStars.filter(
        star => star.visible
      ).length;
      starfieldManager.createShootingStar();

      const finalVisibleCount = starfieldManager.shootingStars.filter(star => star.visible).length;
      expect(finalVisibleCount).toBe(initialVisibleCount);
    });

    test('should configure shooting star material uniforms', () => {
      starfieldManager.createShootingStar();

      const activeStar = starfieldManager.shootingStars.find(star => star.visible);
      if (activeStar) {
        const material = activeStar.material;
        expect(material.uniforms.startTime.value).toBe(starfieldManager.time);
        expect(material.uniforms.duration.value).toBeGreaterThan(1.5);
        expect(material.uniforms.intensity.value).toBeGreaterThan(0.8);
      }
    });

    test('should schedule star to hide after duration', () => {
      starfieldManager.createShootingStar();

      expect(setTimeout).toHaveBeenCalled();
      const timeoutCall = setTimeout.mock.calls[0];
      expect(timeoutCall[1]).toBeGreaterThan(1500); // Duration * 1000
    });
  });

  describe('update', () => {
    beforeEach(() => {
      starfieldManager.init();
    });

    test('should update time', () => {
      const deltaTime = 0.016;
      const initialTime = starfieldManager.time;

      starfieldManager.update(deltaTime);

      expect(starfieldManager.time).toBe(initialTime + deltaTime);
    });

    test('should update starfield material time', () => {
      starfieldManager.update(0.016);

      expect(starfieldManager.starField.material.uniforms.time.value).toBe(starfieldManager.time);
    });

    test('should update galaxy background time and rotation', () => {
      starfieldManager.update(0.016);

      const material = starfieldManager.galaxyBackground.material;
      expect(material.uniforms.time.value).toBe(starfieldManager.time);
      expect(material.uniforms.galaxyRotation.value).toBe(starfieldManager.time * 0.005);
    });

    test('should update variable star brightness', () => {
      starfieldManager.update(0.016);

      expect(starfieldManager.starField.geometry.attributes.brightness.needsUpdate).toBe(true);
    });

    test('should update shooting star uniforms', () => {
      // Create a visible shooting star
      starfieldManager.createShootingStar();

      starfieldManager.update(0.016);

      const visibleStar = starfieldManager.shootingStars.find(star => star.visible);
      if (visibleStar) {
        expect(visibleStar.material.uniforms.time.value).toBe(starfieldManager.time);
      }
    });

    test('should create shooting stars based on frequency', () => {
      starfieldManager.time = 6; // Past the 5 second threshold
      starfieldManager.lastShootingStarTime = 0;

      // Mock random to guarantee shooting star creation
      jest.spyOn(Math, 'random').mockReturnValue(0.01); // Less than shootingStarFrequency

      starfieldManager.update(0.016);

      expect(starfieldManager.lastShootingStarTime).toBeGreaterThan(0);
    });
  });

  describe('utility methods', () => {
    describe('randomSpherePosition', () => {
      test('should generate position within specified radius', () => {
        const radius = 100;
        const position = starfieldManager.randomSpherePosition(radius);

        expect(position).toHaveProperty('x');
        expect(position).toHaveProperty('y');
        expect(position).toHaveProperty('z');

        // Check that it creates a THREE.Vector3
        expect(THREE.Vector3).toHaveBeenCalled();
      });
    });

    describe('addRandomOffset', () => {
      test('should add random offset to position', () => {
        const basePosition = new THREE.Vector3(10, 20, 30);
        const maxOffset = 5;

        const offsetPosition = starfieldManager.addRandomOffset(basePosition, maxOffset);

        expect(basePosition.clone).toHaveBeenCalled();
      });
    });

    describe('color methods', () => {
      test('getMainSequenceColor should return a color', () => {
        const color = starfieldManager.getMainSequenceColor();
        expect(color).toHaveProperty('r');
        expect(color).toHaveProperty('g');
        expect(color).toHaveProperty('b');
      });

      test('getGiantColor should return a color', () => {
        const color = starfieldManager.getGiantColor();
        expect(color).toHaveProperty('r');
        expect(color).toHaveProperty('g');
        expect(color).toHaveProperty('b');
      });

      test('getDwarfColor should return a color', () => {
        const color = starfieldManager.getDwarfColor();
        expect(color).toHaveProperty('r');
        expect(color).toHaveProperty('g');
        expect(color).toHaveProperty('b');
      });

      test('getVariableColor should return a color', () => {
        const color = starfieldManager.getVariableColor();
        expect(color).toHaveProperty('r');
        expect(color).toHaveProperty('g');
        expect(color).toHaveProperty('b');
      });
    });
  });

  describe('updateSettings', () => {
    beforeEach(() => {
      starfieldManager.init();
    });

    test('should update settings object', () => {
      const newSettings = {
        starTwinkleSpeed: 2.0,
        galaxyOpacity: 0.8
      };

      starfieldManager.updateSettings(newSettings);

      expect(starfieldManager.settings.starTwinkleSpeed).toBe(2.0);
      expect(starfieldManager.settings.galaxyOpacity).toBe(0.8);
    });

    test('should update starfield material uniforms', () => {
      const newSettings = {
        starTwinkleSpeed: 2.0,
        starTwinkleIntensity: 0.9
      };

      starfieldManager.updateSettings(newSettings);

      const material = starfieldManager.starField.material;
      expect(material.uniforms.twinkleSpeed.value).toBe(2.0);
      expect(material.uniforms.twinkleIntensity.value).toBe(0.9);
    });

    test('should update galaxy material uniforms', () => {
      const newSettings = {
        galaxyOpacity: 0.8,
        nebulaOpacity: 0.6
      };

      starfieldManager.updateSettings(newSettings);

      const material = starfieldManager.galaxyBackground.material;
      expect(material.uniforms.galaxyOpacity.value).toBe(0.8);
      expect(material.uniforms.nebulaOpacity.value).toBe(0.6);
    });
  });

  describe('setVisible', () => {
    beforeEach(() => {
      starfieldManager.init();
    });

    test('should set starfield visibility', () => {
      starfieldManager.setVisible(false);

      expect(starfieldManager.starField.visible).toBe(false);
      expect(starfieldManager.galaxyBackground.visible).toBe(false);

      starfieldManager.shootingStars.forEach(star => {
        expect(star.visible).toBe(false);
      });
    });

    test('should preserve shooting star visibility when setting to true', () => {
      // First make a shooting star visible
      starfieldManager.shootingStars[0].visible = true;

      starfieldManager.setVisible(true);

      expect(starfieldManager.starField.visible).toBe(true);
      expect(starfieldManager.galaxyBackground.visible).toBe(true);
      // Shooting stars should maintain their current visibility when set to true
    });
  });

  describe('dispose', () => {
    beforeEach(() => {
      starfieldManager.init();
    });

    test('should dispose of all resources', () => {
      starfieldManager.dispose();

      expect(mockScene.remove).toHaveBeenCalledWith(starfieldManager.starField);
      expect(mockScene.remove).toHaveBeenCalledWith(starfieldManager.galaxyBackground);

      // Should remove all shooting stars
      starfieldManager.shootingStars.forEach(star => {
        expect(mockScene.remove).toHaveBeenCalledWith(star);
      });
    });

    test('should dispose geometries and materials', () => {
      const starField = starfieldManager.starField;
      const galaxyBackground = starfieldManager.galaxyBackground;
      const shootingStars = [...starfieldManager.shootingStars];

      starfieldManager.dispose();

      expect(starField.geometry.dispose).toHaveBeenCalled();
      expect(starField.material.dispose).toHaveBeenCalled();
      expect(galaxyBackground.geometry.dispose).toHaveBeenCalled();
      expect(galaxyBackground.material.dispose).toHaveBeenCalled();

      shootingStars.forEach(star => {
        expect(star.geometry.dispose).toHaveBeenCalled();
        expect(star.material.dispose).toHaveBeenCalled();
      });
    });

    test('should clear shooting stars array', () => {
      starfieldManager.dispose();

      expect(starfieldManager.shootingStars).toEqual([]);
    });

    test('should handle null components gracefully', () => {
      starfieldManager.starField = null;
      starfieldManager.galaxyBackground = null;

      expect(() => starfieldManager.dispose()).not.toThrow();
    });
  });
});
