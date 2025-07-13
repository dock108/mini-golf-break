// Jest setup file for Mini Golf Break tests
import '@testing-library/jest-dom';

// Mock Three.js global objects for testing
global.THREE = {
  Scene: jest.fn(() => ({
    add: jest.fn(),
    remove: jest.fn(),
    traverse: jest.fn()
  })),
  WebGLRenderer: jest.fn(() => ({
    setSize: jest.fn(),
    render: jest.fn(),
    dispose: jest.fn()
  })),
  PerspectiveCamera: jest.fn(),
  Vector3: jest.fn(() => ({ 
    x: 0, 
    y: 0, 
    z: 0,
    copy: jest.fn(),
    clone: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
    toArray: jest.fn(() => [0, 0, 0])
  })),
  Euler: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
  Mesh: jest.fn(() => ({
    position: { x: 0, y: 0, z: 0, copy: jest.fn() },
    rotation: { x: 0, y: 0, z: 0 },
    castShadow: false,
    receiveShadow: false
  })),
  Group: jest.fn(() => ({
    add: jest.fn(),
    remove: jest.fn(),
    position: { x: 0, y: 0, z: 0, copy: jest.fn() }
  })),
  SphereGeometry: jest.fn(),
  MeshStandardMaterial: jest.fn(() => ({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.2
  })),
  PointLight: jest.fn(() => ({
    position: { x: 0, y: 0, z: 0, copy: jest.fn() }
  })),
  Box3: jest.fn(() => ({
    min: { x: 0, y: 0, z: 0 },
    max: { x: 0, y: 0, z: 0 },
    expandByPoint: jest.fn()
  }))
};

// Mock Cannon-es physics for testing
global.CANNON = {
  World: jest.fn(() => ({
    add: jest.fn(),
    remove: jest.fn(),
    step: jest.fn()
  })),
  Body: jest.fn(() => ({
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    material: null,
    addEventListener: jest.fn()
  })),
  Material: jest.fn(),
  ContactMaterial: jest.fn(),
  Vec3: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
  Sphere: jest.fn(),
  Box: jest.fn()
};

// Mock DOM methods that might be used
global.document.createElement = jest.fn(elementType => {
  const element = {
    style: {},
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  };

  // Mock canvas-specific methods
  if (elementType === 'canvas') {
    element.getContext = jest.fn(() => ({
      fillStyle: '',
      fillRect: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      createImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(4)
      })),
      putImageData: jest.fn()
    }));
    element.width = 512;
    element.height = 512;
  }

  return element;
});

// Mock window performance
global.performance = {
  now: jest.fn(() => Date.now())
};
