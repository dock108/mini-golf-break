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
    position: { x: 0, y: 0, z: 0, copy: jest.fn() },
    name: '',
    userData: {},
    children: []
  })),
  SphereGeometry: jest.fn(),
  CircleGeometry: jest.fn(),
  CylinderGeometry: jest.fn(),
  RingGeometry: jest.fn(),
  PlaneGeometry: jest.fn(),
  BoxGeometry: jest.fn(),
  MeshStandardMaterial: jest.fn(() => ({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.2
  })),
  MeshBasicMaterial: jest.fn(() => ({
    color: 0xffffff
  })),
  CanvasTexture: jest.fn(),
  PointLight: jest.fn(() => ({
    position: { x: 0, y: 0, z: 0, copy: jest.fn() }
  })),
  AudioListener: jest.fn(() => ({
    context: { state: 'running' },
    getInput: jest.fn(),
    removeFilter: jest.fn(),
    setFilter: jest.fn()
  })),
  Audio: jest.fn(() => ({
    setBuffer: jest.fn(),
    setVolume: jest.fn(),
    play: jest.fn(),
    stop: jest.fn(),
    pause: jest.fn(),
    isPlaying: false
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
    step: jest.fn(),
    contactmaterials: [], // Array with map method for contact materials logging
    addContactMaterial: jest.fn(),
    removeContactMaterial: jest.fn(),
    addBody: jest.fn(),
    removeBody: jest.fn(),
    gravity: { set: jest.fn() },
    solver: { iterations: 30, tolerance: 0.0001 },
    broadphase: null,
    allowSleep: true,
    defaultSleepSpeedLimit: 0.15,
    defaultSleepTimeLimit: 0.2,
    defaultContactMaterial: { friction: 0.8, restitution: 0.1 },
    bodies: [],
    constraints: [],
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  })),
  Body: jest.fn(() => ({
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    material: null,
    addEventListener: jest.fn(),
    quaternion: {
      setFromAxisAngle: jest.fn(),
      x: 0,
      y: 0,
      z: 0,
      w: 1
    },
    addShape: jest.fn(),
    userData: {}
  })),
  Material: jest.fn(),
  ContactMaterial: jest.fn(),
  Vec3: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
  Sphere: jest.fn(),
  Box: jest.fn(),
  Cylinder: jest.fn(),
  Plane: jest.fn()
};

// Mock window.AudioContext
global.window = global.window || {};
global.window.AudioContext = jest.fn(() => ({
  createGain: jest.fn(() => ({
    gain: { value: 1 },
    connect: jest.fn()
  })),
  createBufferSource: jest.fn(() => ({
    buffer: null,
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn()
  })),
  decodeAudioData: jest.fn((buffer, success) => {
    success({});
  }),
  destination: {},
  state: 'running',
  currentTime: 0
}));

// Mock DOM methods that might be used
global.document.createElement = jest.fn(elementType => {
  const element = {
    style: {},
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    textContent: '',
    id: '',
    children: [],
    parentNode: null,
    innerHTML: '',
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    removeAttribute: jest.fn(),
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(),
      toggle: jest.fn()
    }
  };

  // Add style.cssText property
  Object.defineProperty(element.style, 'cssText', {
    get: jest.fn(() => ''),
    set: jest.fn(),
    enumerable: true,
    configurable: true
  });

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

// Mock additional document methods
global.document.getElementById = jest.fn(id => {
  // Return a mock element with the requested ID
  const element = global.document.createElement('div');
  element.id = id;
  return element;
});

global.document.querySelector = jest.fn(() => {
  // Return a mock element for any selector
  return global.document.createElement('div');
});

global.document.querySelectorAll = jest.fn(() => {
  // Return an empty array for any selector
  return [];
});

// Enhance existing document.body with missing methods
if (global.document.body) {
  global.document.body.appendChild = jest.fn();
  global.document.body.removeChild = jest.fn();
}

// Mock window performance
global.performance = {
  now: jest.fn(() => Date.now())
};
