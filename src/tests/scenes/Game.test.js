/**
 * Unit tests for Game.js
 */

// Mock PostProcessingManager to avoid THREE.js ESM issues
jest.mock('../../managers/PostProcessingManager', () => ({
  PostProcessingManager: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    handleResize: jest.fn(),
    render: jest.fn(),
    cleanup: jest.fn()
  }))
}));

// Mock all managers to avoid complex dependencies
jest.mock('../../managers/StateManager', () => ({
  StateManager: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    setState: jest.fn(),
    getState: jest.fn().mockReturnValue({}),
    cleanup: jest.fn()
  }))
}));

jest.mock('../../managers/UIManager', () => ({
  UIManager: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    attachRenderer: jest.fn(),
    cleanup: jest.fn()
  }))
}));

jest.mock('../../managers/PhysicsManager', () => ({
  PhysicsManager: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    getWorld: jest.fn().mockReturnValue({}),
    cleanup: jest.fn()
  }))
}));

jest.mock('../../managers/DebugManager', () => ({
  DebugManager: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    error: jest.fn(),
    cleanup: jest.fn()
  }))
}));

jest.mock('../../managers/EventManager', () => ({
  EventManager: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    subscribe: jest.fn(),
    cleanup: jest.fn()
  }))
}));

jest.mock('../../managers/PerformanceManager', () => ({
  PerformanceManager: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    cleanup: jest.fn()
  }))
}));

jest.mock('../../managers/AudioManager', () => ({
  AudioManager: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    cleanup: jest.fn()
  }))
}));

jest.mock('../../managers/VisualEffectsManager', () => ({
  VisualEffectsManager: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    cleanup: jest.fn()
  }))
}));

jest.mock('../../managers/BallManager', () => ({
  BallManager: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    cleanup: jest.fn()
  }))
}));

jest.mock('../../managers/HazardManager', () => ({
  HazardManager: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    cleanup: jest.fn()
  }))
}));

jest.mock('../../managers/HoleStateManager', () => ({
  HoleStateManager: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    cleanup: jest.fn()
  }))
}));

jest.mock('../../managers/HoleTransitionManager', () => ({
  HoleTransitionManager: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    cleanup: jest.fn()
  }))
}));

jest.mock('../../managers/HoleCompletionManager', () => ({
  HoleCompletionManager: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    cleanup: jest.fn()
  }))
}));

jest.mock('../../managers/GameLoopManager', () => ({
  GameLoopManager: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    startLoop: jest.fn(),
    stopLoop: jest.fn(),
    cleanup: jest.fn()
  }))
}));

jest.mock('../../managers/MaterialManager', () => ({
  MaterialManager: jest.fn().mockImplementation(() => ({
    setRenderer: jest.fn(),
    cleanup: jest.fn()
  }))
}));

jest.mock('../../managers/EnvironmentManager', () => ({
  EnvironmentManager: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(true),
    cleanup: jest.fn()
  }))
}));

jest.mock('../../managers/LightingManager', () => ({
  LightingManager: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    cleanup: jest.fn()
  }))
}));

jest.mock('../../managers/CourseDataManager', () => ({
  CourseDataManager: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    cleanup: jest.fn()
  }))
}));

jest.mock('../../controls/CameraController', () => ({
  CameraController: jest.fn().mockImplementation(() => ({
    camera: { aspect: 1, updateProjectionMatrix: jest.fn() },
    init: jest.fn(),
    setCourse: jest.fn(),
    setRenderer: jest.fn(),
    cleanup: jest.fn()
  }))
}));

jest.mock('../../controls/InputController', () => ({
  InputController: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    enableInput: jest.fn(),
    cleanup: jest.fn()
  }))
}));

jest.mock('../../game/ScoringSystem', () => ({
  ScoringSystem: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    cleanup: jest.fn()
  }))
}));

jest.mock('../../objects/CourseFactory', () => ({
  CourseFactory: {
    createCourse: jest.fn().mockResolvedValue({
      currentHoleEntity: { getWorldStartPosition: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 }) }
    })
  }
}));

jest.mock('../../objects/SpaceDecorations', () => ({
  SpaceDecorations: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(true),
    cleanup: jest.fn()
  }))
}));

// Mock THREE.WebGLRenderer
jest.mock('three', () => {
  const actual = jest.requireActual('three');
  return {
    ...actual,
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      setSize: jest.fn(),
      setPixelRatio: jest.fn(),
      setClearColor: jest.fn(),
      shadowMap: { enabled: false, type: 2 },
      outputColorSpace: 'srgb',
      toneMapping: 0,
      toneMappingExposure: 1,
      setAnimationLoop: jest.fn(),
      domElement: {
        style: {},
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      },
      render: jest.fn(),
      dispose: jest.fn(),
      getContext: jest.fn().mockReturnValue({
        getExtension: jest.fn().mockReturnValue({})
      })
    }))
  };
});

import { Game } from '../../scenes/Game';
import * as THREE from 'three';

describe('Game', () => {
  let game;
  let mockContainer;

  beforeEach(() => {
    // Mock DOM
    mockContainer = {
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      style: {},
      offsetWidth: 800,
      offsetHeight: 600
    };

    global.document = {
      getElementById: jest.fn().mockReturnValue(mockContainer)
    };

    global.window = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      innerWidth: 1920,
      innerHeight: 1080,
      devicePixelRatio: 2
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (game) {
      jest.clearAllMocks();
    }
  });

  describe('constructor', () => {
    test('should initialize game instance with required components', () => {
      game = new Game();

      expect(game).toBeDefined();
      expect(game.scene).toBeInstanceOf(THREE.Scene);
      expect(game.clock).toBeInstanceOf(THREE.Clock);
      expect(game.deltaTime).toBe(0);
      expect(game.renderer).toBeNull();
    });

    test('should create all managers', () => {
      game = new Game();

      expect(game.debugManager).toBeDefined();
      expect(game.eventManager).toBeDefined();
      expect(game.performanceManager).toBeDefined();
      expect(game.stateManager).toBeDefined();
      expect(game.uiManager).toBeDefined();
      expect(game.physicsManager).toBeDefined();
      expect(game.audioManager).toBeDefined();
      expect(game.visualEffectsManager).toBeDefined();
      expect(game.ballManager).toBeDefined();
      expect(game.hazardManager).toBeDefined();
      expect(game.holeStateManager).toBeDefined();
      expect(game.holeTransitionManager).toBeDefined();
      expect(game.holeCompletionManager).toBeDefined();
      expect(game.gameLoopManager).toBeDefined();
      expect(game.materialManager).toBeDefined();
      expect(game.environmentManager).toBeDefined();
      expect(game.courseDataManager).toBeDefined();
    });

    test('should create camera controller and scoring system', () => {
      game = new Game();

      expect(game.cameraController).toBeDefined();
      expect(game.camera).toBe(game.cameraController.camera);
      expect(game.scoringSystem).toBeDefined();
    });
  });

  describe('enableGameInput', () => {
    test('should enable input controller when available', () => {
      game = new Game();
      game.inputController = { enableInput: jest.fn() };

      game.enableGameInput();

      expect(game.inputController.enableInput).toHaveBeenCalled();
    });

    test('should handle missing input controller', () => {
      game = new Game();
      game.inputController = null;

      expect(() => game.enableGameInput()).not.toThrow();
    });
  });

  describe('getSelectedCourseId', () => {
    test('should return default course id', () => {
      game = new Game();

      const courseId = game.getSelectedCourseId();

      expect(courseId).toBe('../objects/courses/basic-course.json');
    });
  });

  describe('handleResize', () => {
    beforeEach(() => {
      game = new Game();
      game.renderer = {
        setSize: jest.fn()
      };
      game.camera = {
        aspect: 1,
        updateProjectionMatrix: jest.fn()
      };
      game.postProcessingManager = {
        resize: jest.fn()
      };

      mockContainer.offsetWidth = 1024;
      mockContainer.offsetHeight = 768;
    });

    test('should resize renderer when both exist', () => {
      game.postProcessingManager = null; // Remove to avoid method call
      game.handleResize();

      expect(game.renderer.setSize).toHaveBeenCalled();
    });

    test('should handle post processing resize when available', () => {
      game.postProcessingManager = { handleResize: jest.fn() };
      game.handleResize();

      expect(game.postProcessingManager.handleResize).toHaveBeenCalled();
    });

    test('should handle missing renderer', () => {
      game.renderer = null;

      expect(() => game.handleResize()).not.toThrow();
    });

    test('should handle missing post processing', () => {
      game.postProcessingManager = null;

      expect(() => game.handleResize()).not.toThrow();
    });
  });

  describe('cleanupManager', () => {
    test('should call cleanup on manager with cleanup method', () => {
      game = new Game();
      const mockManager = { cleanup: jest.fn() };

      game.cleanupManager(mockManager);

      expect(mockManager.cleanup).toHaveBeenCalled();
    });

    test('should handle null manager', () => {
      game = new Game();

      expect(() => game.cleanupManager(null)).not.toThrow();
    });

    test('should handle manager without cleanup method', () => {
      game = new Game();
      const mockManager = { init: jest.fn() };

      expect(() => game.cleanupManager(mockManager)).not.toThrow();
    });
  });

  describe('disposeThreeObject', () => {
    test('should dispose geometry and material', () => {
      game = new Game();
      const mockGeometry = { dispose: jest.fn() };
      const mockMaterial = { dispose: jest.fn() };
      const mockObject = {
        geometry: mockGeometry,
        material: mockMaterial
      };

      game.disposeThreeObject(mockObject);

      expect(mockGeometry.dispose).toHaveBeenCalled();
      expect(mockMaterial.dispose).toHaveBeenCalled();
    });

    test('should handle array of materials', () => {
      game = new Game();
      const mockMaterial1 = { dispose: jest.fn() };
      const mockMaterial2 = { dispose: jest.fn() };
      const mockObject = {
        geometry: { dispose: jest.fn() },
        material: [mockMaterial1, mockMaterial2]
      };

      game.disposeThreeObject(mockObject);

      expect(mockMaterial1.dispose).toHaveBeenCalled();
      expect(mockMaterial2.dispose).toHaveBeenCalled();
    });

    test('should handle object without geometry or material', () => {
      game = new Game();
      const mockObject = {};

      expect(() => game.disposeThreeObject(mockObject)).not.toThrow();
    });
  });

  describe('setupEventListeners', () => {
    test('should not throw when called', () => {
      game = new Game();

      expect(() => game.setupEventListeners()).not.toThrow();
    });
  });

  describe('cleanup', () => {
    test('should handle missing components gracefully', () => {
      game = new Game();
      game.gameLoopManager = null;
      game.renderer = null;
      game.debugManager = null;
      game.scene = null;

      expect(() => game.cleanup()).not.toThrow();
    });
  });
});
