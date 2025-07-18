/**
 * Unit tests for SkyboxGenerator
 */

import { SkyboxGenerator } from '../utils/SkyboxGenerator';
import * as THREE from 'three';

// Mock Three.js
jest.mock('three', () => ({
  CubeTexture: jest.fn(() => ({
    images: [],
    format: null,
    mapping: null,
    generateMipmaps: true,
    needsUpdate: false,
    encoding: null,
    flipY: true,
    dispose: jest.fn()
  })),
  RGBAFormat: 'rgba-format',
  CubeReflectionMapping: 'cube-reflection-mapping',
  sRGBEncoding: 'srgb-encoding'
}));

// Mock the Canvas API globally
const mockGradient = {
  addColorStop: jest.fn()
};

const mockContext = {
  createRadialGradient: jest.fn(() => mockGradient),
  createLinearGradient: jest.fn(() => mockGradient),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  save: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  closePath: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn()
};

const mockCanvas = {
  width: 512,
  height: 512,
  getContext: jest.fn(() => mockContext)
};

// Mock document.createElement globally while preserving the rest of document
const originalCreateElement = global.document.createElement;
global.document.createElement = jest.fn(tagName => {
  if (tagName === 'canvas') {
    return mockCanvas;
  }
  return originalCreateElement.call(global.document, tagName);
});

describe('SkyboxGenerator', () => {
  let skyboxGenerator;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    skyboxGenerator = new SkyboxGenerator();
  });

  describe('constructor', () => {
    test('should initialize with default values', () => {
      expect(skyboxGenerator.textureSize).toBe(1024);
      expect(skyboxGenerator.cubeSize).toBe(512);
    });
  });

  describe('generateDeepSpaceSkybox', () => {
    test('should generate deep space skybox with default options', () => {
      const skybox = skyboxGenerator.generateDeepSpaceSkybox();

      expect(THREE.CubeTexture).toHaveBeenCalled();
      expect(global.document.createElement).toHaveBeenCalledWith('canvas');
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
      expect(mockContext.createRadialGradient).toHaveBeenCalled();
      expect(mockGradient.addColorStop).toHaveBeenCalledWith(0, 'rgba(25, 25, 60, 1)');
      expect(mockGradient.addColorStop).toHaveBeenCalledWith(0.5, 'rgba(15, 15, 40, 1)');
      expect(mockGradient.addColorStop).toHaveBeenCalledWith(1, 'rgba(5, 5, 20, 1)');
      expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 512, 512);

      expect(skybox.format).toBe('rgba-format');
      expect(skybox.mapping).toBe('cube-reflection-mapping');
      expect(skybox.generateMipmaps).toBe(true);
      expect(skybox.needsUpdate).toBe(true);
    });

    test('should generate deep space skybox with custom options', () => {
      const options = {
        starCount: 5000,
        nebulaIntensity: 0.5,
        colorVariation: 0.9,
        brightStars: 100
      };

      const skybox = skyboxGenerator.generateDeepSpaceSkybox(options);

      expect(THREE.CubeTexture).toHaveBeenCalled();
      expect(skybox.images).toHaveLength(6);
      expect(skybox.needsUpdate).toBe(true);
    });

    test('should handle empty options object', () => {
      const skybox = skyboxGenerator.generateDeepSpaceSkybox({});

      expect(THREE.CubeTexture).toHaveBeenCalled();
      expect(skybox.images).toHaveLength(6);
    });
  });

  describe('generateStationSkybox', () => {
    test('should generate station skybox with default options', () => {
      const skybox = skyboxGenerator.generateStationSkybox();

      expect(THREE.CubeTexture).toHaveBeenCalled();
      expect(global.document.createElement).toHaveBeenCalledWith('canvas');
      expect(mockContext.createLinearGradient).toHaveBeenCalled();
      expect(mockGradient.addColorStop).toHaveBeenCalledWith(0, 'rgba(60, 70, 80, 1)');
      expect(mockGradient.addColorStop).toHaveBeenCalledWith(0.5, 'rgba(80, 90, 100, 1)');
      expect(mockGradient.addColorStop).toHaveBeenCalledWith(1, 'rgba(50, 60, 70, 1)');

      expect(skybox.format).toBe('rgba-format');
      expect(skybox.mapping).toBe('cube-reflection-mapping');
      expect(skybox.generateMipmaps).toBe(true);
      expect(skybox.needsUpdate).toBe(true);
    });

    test('should generate station skybox with custom options', () => {
      const options = {
        panelIntensity: 0.8,
        lightStrips: false,
        windows: false
      };

      const skybox = skyboxGenerator.generateStationSkybox(options);

      expect(THREE.CubeTexture).toHaveBeenCalled();
      expect(skybox.images).toHaveLength(6);
      expect(skybox.needsUpdate).toBe(true);
    });

    test('should handle windows on specific faces', () => {
      const options = {
        windows: true
      };

      const skybox = skyboxGenerator.generateStationSkybox(options);

      expect(THREE.CubeTexture).toHaveBeenCalled();
      expect(skybox.images).toHaveLength(6);
    });
  });

  describe('generateHDREnvironment', () => {
    test('should generate HDR environment for deep-space', () => {
      const skybox = skyboxGenerator.generateHDREnvironment('deep-space');

      expect(THREE.CubeTexture).toHaveBeenCalled();
      expect(skybox.encoding).toBe('srgb-encoding');
      expect(skybox.flipY).toBe(false);
    });

    test('should generate HDR environment for station', () => {
      const skybox = skyboxGenerator.generateHDREnvironment('station');

      expect(THREE.CubeTexture).toHaveBeenCalled();
      expect(skybox.encoding).toBe('srgb-encoding');
      expect(skybox.flipY).toBe(false);
    });

    test('should default to deep-space for unknown type', () => {
      const skybox = skyboxGenerator.generateHDREnvironment('unknown');

      expect(THREE.CubeTexture).toHaveBeenCalled();
      expect(skybox.encoding).toBe('srgb-encoding');
      expect(skybox.flipY).toBe(false);
    });

    test('should use default type when none provided', () => {
      const skybox = skyboxGenerator.generateHDREnvironment();

      expect(THREE.CubeTexture).toHaveBeenCalled();
      expect(skybox.encoding).toBe('srgb-encoding');
      expect(skybox.flipY).toBe(false);
    });
  });

  describe('addNebulaClouds', () => {
    test('should add nebula clouds to context', () => {
      const intensity = 0.5;
      const faceIndex = 0;

      skyboxGenerator.addNebulaClouds(mockContext, intensity, faceIndex);

      expect(mockContext.createRadialGradient).toHaveBeenCalled();
      expect(mockGradient.addColorStop).toHaveBeenCalled();
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    test('should handle different intensities', () => {
      const intensity = 0.8;
      const faceIndex = 1;

      skyboxGenerator.addNebulaClouds(mockContext, intensity, faceIndex);

      expect(mockContext.createRadialGradient).toHaveBeenCalled();
    });
  });

  describe('addStars', () => {
    test('should add regular and bright stars', () => {
      const starCount = 100;
      const brightStars = 10;
      const colorVariation = 0.7;

      skyboxGenerator.addStars(mockContext, starCount, brightStars, colorVariation);

      expect(mockContext.fillRect).toHaveBeenCalled();
      expect(mockContext.createRadialGradient).toHaveBeenCalled();
    });

    test('should handle zero stars', () => {
      const starCount = 0;
      const brightStars = 0;
      const colorVariation = 0.5;

      skyboxGenerator.addStars(mockContext, starCount, brightStars, colorVariation);

      // Should not crash and should not call fillRect when no stars
      expect(mockContext.fillRect).not.toHaveBeenCalled();
    });

    test('should apply color variation', () => {
      const starCount = 10;
      const brightStars = 5;
      const colorVariation = 1.0; // Always apply variation

      skyboxGenerator.addStars(mockContext, starCount, brightStars, colorVariation);

      expect(mockContext.fillRect).toHaveBeenCalled();
    });
  });

  describe('addTechPanels', () => {
    test('should add tech panels to context', () => {
      const intensity = 0.6;
      const faceIndex = 0;

      skyboxGenerator.addTechPanels(mockContext, intensity, faceIndex);

      expect(mockContext.fillRect).toHaveBeenCalled();
      expect(mockContext.strokeRect).toHaveBeenCalled();
    });

    test('should handle different intensities', () => {
      const intensity = 0.9;
      const faceIndex = 2;

      skyboxGenerator.addTechPanels(mockContext, intensity, faceIndex);

      expect(mockContext.fillRect).toHaveBeenCalled();
    });
  });

  describe('addLightStrips', () => {
    test('should add light strips to context', () => {
      const faceIndex = 0;

      skyboxGenerator.addLightStrips(mockContext, faceIndex);

      expect(mockContext.createLinearGradient).toHaveBeenCalled();
      expect(mockGradient.addColorStop).toHaveBeenCalled();
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    test('should handle different face indices', () => {
      const faceIndex = 3;

      skyboxGenerator.addLightStrips(mockContext, faceIndex);

      expect(mockContext.createLinearGradient).toHaveBeenCalled();
    });
  });

  describe('addStationWindows', () => {
    test('should add station windows to context', () => {
      const faceIndex = 0;

      skyboxGenerator.addStationWindows(mockContext, faceIndex);

      expect(mockContext.createRadialGradient).toHaveBeenCalled();
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    test('should handle different face indices', () => {
      const faceIndex = 1;

      skyboxGenerator.addStationWindows(mockContext, faceIndex);

      expect(mockContext.createRadialGradient).toHaveBeenCalled();
    });
  });

  describe('getCachedSkybox', () => {
    test('should create and cache deep-space skybox', () => {
      const skybox = skyboxGenerator.getCachedSkybox('deep-space');

      expect(THREE.CubeTexture).toHaveBeenCalled();
      expect(skyboxGenerator.cache.has('deep-space')).toBe(true);
      expect(skyboxGenerator.cache.get('deep-space')).toBe(skybox);
    });

    test('should create and cache station skybox', () => {
      const skybox = skyboxGenerator.getCachedSkybox('station');

      expect(THREE.CubeTexture).toHaveBeenCalled();
      expect(skyboxGenerator.cache.has('station')).toBe(true);
      expect(skyboxGenerator.cache.get('station')).toBe(skybox);
    });

    test('should create and cache HDR space skybox', () => {
      const skybox = skyboxGenerator.getCachedSkybox('hdr-space');

      expect(THREE.CubeTexture).toHaveBeenCalled();
      expect(skyboxGenerator.cache.has('hdr-space')).toBe(true);
      expect(skybox.encoding).toBe('srgb-encoding');
    });

    test('should create and cache HDR station skybox', () => {
      const skybox = skyboxGenerator.getCachedSkybox('hdr-station');

      expect(THREE.CubeTexture).toHaveBeenCalled();
      expect(skyboxGenerator.cache.has('hdr-station')).toBe(true);
      expect(skybox.encoding).toBe('srgb-encoding');
    });

    test('should default to deep-space for unknown type', () => {
      const skybox = skyboxGenerator.getCachedSkybox('unknown');

      expect(THREE.CubeTexture).toHaveBeenCalled();
      expect(skyboxGenerator.cache.has('unknown')).toBe(true);
    });

    test('should return cached skybox on subsequent calls', () => {
      const skybox1 = skyboxGenerator.getCachedSkybox('deep-space');
      const skybox2 = skyboxGenerator.getCachedSkybox('deep-space');

      expect(skybox1).toBe(skybox2);
    });

    test('should initialize cache if not exists', () => {
      expect(skyboxGenerator.cache).toBeUndefined();
      skyboxGenerator.getCachedSkybox('deep-space');
      expect(skyboxGenerator.cache).toBeDefined();
      expect(skyboxGenerator.cache).toBeInstanceOf(Map);
    });
  });

  describe('dispose', () => {
    test('should dispose cached textures', () => {
      // Create some cached textures
      const skybox1 = skyboxGenerator.getCachedSkybox('deep-space');
      const skybox2 = skyboxGenerator.getCachedSkybox('station');

      skyboxGenerator.dispose();

      expect(skybox1.dispose).toHaveBeenCalled();
      expect(skybox2.dispose).toHaveBeenCalled();
      expect(skyboxGenerator.cache.size).toBe(0);
    });

    test('should handle dispose when no cache exists', () => {
      expect(() => skyboxGenerator.dispose()).not.toThrow();
    });

    test('should handle textures without dispose method', () => {
      // Create cached texture without dispose method
      skyboxGenerator.getCachedSkybox('deep-space');
      const texture = skyboxGenerator.cache.get('deep-space');
      texture.dispose = undefined;

      expect(() => skyboxGenerator.dispose()).not.toThrow();
    });

    test('should handle empty cache', () => {
      skyboxGenerator.cache = new Map();
      expect(() => skyboxGenerator.dispose()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    test('should handle various random values', () => {
      // Test with different random values
      const skybox = skyboxGenerator.generateDeepSpaceSkybox();
      expect(THREE.CubeTexture).toHaveBeenCalled();
    });

    test('should handle multiple skybox generations', () => {
      const skybox1 = skyboxGenerator.generateDeepSpaceSkybox();
      const skybox2 = skyboxGenerator.generateStationSkybox();

      expect(THREE.CubeTexture).toHaveBeenCalledTimes(2);
      expect(skybox1).toBeDefined();
      expect(skybox2).toBeDefined();
    });
  });
});
