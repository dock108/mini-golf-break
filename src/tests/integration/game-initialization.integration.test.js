/**
 * Integration tests for Game initialization
 * Simplified to focus on key outcomes only
 */

import { Game } from '../../scenes/Game';

// Mock Three.js and other dependencies
jest.mock('three/examples/jsm/controls/OrbitControls', () => ({
  OrbitControls: jest.fn(() => ({
    enableDamping: true,
    dampingFactor: 0.1,
    enableZoom: true,
    enablePan: true,
    maxPolarAngle: Math.PI / 2,
    minDistance: 2,
    maxDistance: 50,
    target: { set: jest.fn() },
    update: jest.fn(),
    dispose: jest.fn()
  }))
}));

// Mock Three.js postprocessing modules
jest.mock('three/examples/jsm/postprocessing/EffectComposer', () => ({
  EffectComposer: jest.fn(() => ({
    setSize: jest.fn(),
    render: jest.fn(),
    addPass: jest.fn(),
    removePass: jest.fn(),
    dispose: jest.fn()
  }))
}));

jest.mock('three/examples/jsm/postprocessing/RenderPass', () => ({
  RenderPass: jest.fn(() => ({
    enabled: true,
    renderToScreen: false
  }))
}));

jest.mock('three/examples/jsm/postprocessing/UnrealBloomPass', () => ({
  UnrealBloomPass: jest.fn(() => ({
    threshold: 0.8,
    strength: 1.0,
    radius: 0.5,
    enabled: true
  }))
}));

jest.mock('three/examples/jsm/postprocessing/SMAAPass', () => ({
  SMAAPass: jest.fn(() => ({
    enabled: true
  }))
}));

jest.mock('three/examples/jsm/postprocessing/ShaderPass', () => ({
  ShaderPass: jest.fn(() => ({
    enabled: true,
    uniforms: {}
  }))
}));

jest.mock('three/examples/jsm/shaders/FXAAShader', () => ({
  FXAAShader: {
    uniforms: {},
    vertexShader: '',
    fragmentShader: ''
  }
}));

jest.mock('three/examples/jsm/shaders/GammaCorrectionShader', () => ({
  GammaCorrectionShader: {
    uniforms: {},
    vertexShader: '',
    fragmentShader: ''
  }
}));

// Mock PhysicsWorld with proper method
jest.mock('../../physics/PhysicsWorld', () => ({
  PhysicsWorld: jest.fn(() => ({
    world: {
      broadphase: {},
      gravity: { set: jest.fn() },
      addBody: jest.fn(),
      removeBody: jest.fn(),
      step: jest.fn(),
      bodies: [],
      addContactMaterial: jest.fn(),
      contactmaterials: [],
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    },
    update: jest.fn(),
    cleanup: jest.fn(),
    setCollisionCallback: jest.fn()
  }))
}));

// Mock Ball
jest.mock('../../objects/Ball', () => ({
  Ball: jest.fn(() => ({
    mesh: { position: { x: 0, y: 0, z: 0 } },
    body: { position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } },
    position: { x: 0, y: 0, z: 0 },
    init: jest.fn(),
    update: jest.fn(),
    reset: jest.fn(),
    cleanup: jest.fn()
  }))
}));

// Mock courses with minimal implementation
jest.mock('../../objects/BasicCourse', () => ({
  BasicCourse: {
    create: jest.fn(async () => ({
      currentHoleEntity: {
        hole: {},
        ballStartPosition: { x: 0, y: 0, z: 0 }
      },
      holeNumber: 1,
      totalHoles: 1,
      getHoleStartPosition: jest.fn(() => ({ x: 0, y: 0.1, z: 0 })),
      getHolePosition: jest.fn(() => ({ x: 0, y: 0, z: -5 }))
    }))
  }
}));

jest.mock('../../objects/NineHoleCourse', () => ({
  NineHoleCourse: {
    create: jest.fn(async () => ({
      currentHoleEntity: {
        hole: {},
        ballStartPosition: { x: 0, y: 0, z: 0 }
      },
      holeNumber: 1,
      totalHoles: 9,
      getHoleStartPosition: jest.fn(() => ({ x: 0, y: 0.1, z: 0 })),
      getHolePosition: jest.fn(() => ({ x: 0, y: 0, z: -5 }))
    }))
  }
}));

// Mock PostProcessingManager to prevent initialization errors
jest.mock('../../managers/PostProcessingManager', () => ({
  PostProcessingManager: jest.fn(() => ({
    init: jest.fn(),
    cleanup: jest.fn(),
    update: jest.fn(),
    addBloom: jest.fn(),
    removeBloom: jest.fn(),
    setBloomIntensity: jest.fn(),
    render: jest.fn(),
    handleResize: jest.fn()
  }))
}));

// Mock managers to prevent initialization errors
jest.mock('../../managers/UIManager', () => ({
  UIManager: jest.fn(() => ({
    init: jest.fn(),
    attachRenderer: jest.fn(),
    updateHoleInfo: jest.fn(),
    updateScore: jest.fn(),
    updateStrokes: jest.fn(),
    cleanup: jest.fn(),
    renderer: null
  }))
}));

jest.mock('../../managers/GameLoopManager', () => ({
  GameLoopManager: jest.fn(() => ({
    init: jest.fn(),
    startLoop: jest.fn(),
    cleanup: jest.fn()
  }))
}));

jest.mock('../../managers/BallManager', () => ({
  BallManager: jest.fn(function (game) {
    this.game = game;
    this.physicsManager = game.physicsManager;
    this.ball = null;
    this.init = jest.fn(() => {
      this.ball = {
        mesh: { position: { x: 0, y: 0, z: 0 } },
        body: { position: { x: 0, y: 0, z: 0 } }
      };
    });
    this.createBall = jest.fn(() => ({
      mesh: { position: { x: 0, y: 0, z: 0 } },
      body: { position: { x: 0, y: 0, z: 0 } }
    }));
    this.cleanup = jest.fn();
  })
}));

jest.mock('../../controls/CameraController', () => ({
  CameraController: jest.fn(function (game) {
    const THREE = require('three');
    this.game = game;
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.controls = {
      target: new THREE.Vector3(0, 0, 0),
      update: jest.fn()
    };
    this.init = jest.fn();
    this.setRenderer = jest.fn();
    this.setCourse = jest.fn();
    this.positionCameraForHole = jest.fn();
    this.cleanup = jest.fn();
  })
}));

describe('Game Initialization Integration', () => {
  let game;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '<div id="game-container"></div>';

    // Create game instance
    game = new Game();
  });

  afterEach(() => {
    // Cleanup
    if (game && game.cleanup) {
      game.cleanup();
    }
    jest.clearAllMocks();
  });

  test('should create all required managers', async () => {
    await game.init();

    // Verify core managers exist
    expect(game.debugManager).toBeDefined();
    expect(game.eventManager).toBeDefined();
    expect(game.stateManager).toBeDefined();
    expect(game.uiManager).toBeDefined();
    expect(game.physicsManager).toBeDefined();
    expect(game.ballManager).toBeDefined();
    expect(game.gameLoopManager).toBeDefined();
  });

  test('should set up scene and renderer', async () => {
    await game.init();

    // Verify Three.js components
    expect(game.scene).toBeDefined();
    expect(game.renderer).toBeDefined();
    expect(game.camera).toBeDefined();

    // Verify renderer is configured
    expect(game.renderer.shadowMap.enabled).toBe(true);
    expect(game.renderer.domElement).toBeDefined();
  });

  test('should complete basic initialization sequence', async () => {
    await game.init();

    // Verify essential game components are created
    expect(game.course).toBeDefined();
    if (game.course) {
      expect(game.course.totalHoles).toBeGreaterThan(0);
    }

    // Verify ball manager has been initialized
    expect(game.ballManager).toBeDefined();
    expect(game.ballManager.init).toHaveBeenCalled();

    // Verify input controller exists
    expect(game.inputController).toBeDefined();

    // Verify game loop was started
    expect(game.gameLoopManager.startLoop).toHaveBeenCalled();
  });

  test('should handle initialization errors gracefully', async () => {
    // Mock console.error to verify error handling
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    // Force an error during initialization
    game.scene = null; // This will cause errors when trying to add objects

    // Game should not throw
    await expect(game.init()).resolves.not.toThrow();

    // Verify error was logged
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('CRITICAL: Failed to initialize game:'),
      expect.any(Error)
    );

    consoleError.mockRestore();
  });
});
