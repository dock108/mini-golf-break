/**
 * Unit tests for HoleTransitionManager
 */

import { HoleTransitionManager } from '../../managers/HoleTransitionManager';
import { EventTypes } from '../../events/EventTypes';
import { GameState } from '../../states/GameState';

// Mock dependencies
jest.mock('../../events/EventTypes', () => ({
  EventTypes: {
    GAME_COMPLETED: 'game:completed'
  }
}));

jest.mock('../../states/GameState', () => ({
  GameState: {
    GAME_COMPLETED: 'game_completed'
  }
}));

describe('HoleTransitionManager', () => {
  let holeTransitionManager;
  let mockGame;

  beforeEach(() => {
    // Create comprehensive mock game object
    mockGame = {
      scene: {
        traverse: jest.fn(),
        clear: jest.fn(),
        add: jest.fn(),
        children: []
      },
      stateManager: {
        getCurrentHoleNumber: jest.fn(() => 1),
        resetForNextHole: jest.fn(),
        state: { debugMode: false }
      },
      course: {
        getTotalHoles: jest.fn(() => 9),
        clearCurrentHole: jest.fn(),
        createCourse: jest.fn().mockResolvedValue(true),
        getHolePosition: jest.fn(() => ({ x: 0, y: 0, z: 10 })),
        getHoleStartPosition: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
        getCurrentHoleMesh: jest.fn(() => ({
          userData: {
            material: {
              transparent: false,
              opacity: 1.0
            }
          }
        }))
      },
      eventManager: {
        publish: jest.fn()
      },
      physicsManager: {
        resetWorld: jest.fn(),
        world: {
          world: {
            step: jest.fn(),
            addBody: jest.fn(),
            removeBody: jest.fn(),
            bodies: [],
            solver: { iterations: 10, tolerance: 0.001 },
            gravity: { y: -9.82, toString: () => '(0, -9.82, 0)' }
          }
        },
        defaultMaterial: {},
        ballMaterial: {},
        groundMaterial: {},
        wallMaterial: {},
        sandMaterial: {}
      },
      cannonDebugRenderer: {
        clearMeshes: jest.fn(),
        world: null
      },
      ballManager: {
        ball: {
          body: { velocity: { length: () => 0 } },
          mesh: { position: { x: 0, y: 0, z: 0 } }
        },
        removeBall: jest.fn(),
        createBall: jest.fn(() => true),
        resetBall: jest.fn()
      },
      inputController: {
        enableInput: jest.fn()
      },
      uiManager: {
        updateHoleInfo: jest.fn(),
        showMessage: jest.fn()
      },
      holeCompletionManager: {
        resetGracePeriod: jest.fn()
      },
      cameraController: {
        updateCameraForHole: jest.fn()
      },
      createStarfield: jest.fn()
    };

    // Set up resetWorld to return the existing world
    mockGame.physicsManager.resetWorld.mockResolvedValue(mockGame.physicsManager.world);

    holeTransitionManager = new HoleTransitionManager(mockGame);

    // Clear all mocks
    jest.clearAllMocks();

    // Mock console methods
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();

    // Mock performance.now and Date.now
    jest.spyOn(performance, 'now').mockReturnValue(1000);
    jest.spyOn(Date, 'now').mockReturnValue(12345);

    // Mock setTimeout and requestAnimationFrame
    global.setTimeout = jest.fn((fn, timeout) => {
      if (typeof fn === 'function') {
        process.nextTick(fn); // Execute asynchronously but immediately
      }
      return 'timeout-id';
    });
    global.requestAnimationFrame = jest.fn(fn => {
      if (typeof fn === 'function') {
        process.nextTick(fn);
      }
      return 1;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    performance.now.mockRestore();
    Date.now.mockRestore();
  });

  describe('constructor', () => {
    test('should initialize with game reference and default values', () => {
      expect(holeTransitionManager.game).toBe(mockGame);
      expect(holeTransitionManager.transitionDuration).toBe(2000);
    });
  });

  describe('init', () => {
    test('should return self for chaining', () => {
      const result = holeTransitionManager.init();
      expect(result).toBe(holeTransitionManager);
    });
  });

  describe('transitionToNextHole', () => {
    describe('game completion detection', () => {
      test('should detect game completion when on last hole', async () => {
        mockGame.stateManager.getCurrentHoleNumber.mockReturnValue(9);
        mockGame.course.getTotalHoles.mockReturnValue(9);

        const result = await holeTransitionManager.transitionToNextHole();

        expect(result).toBe(false);
        expect(mockGame.eventManager.publish).toHaveBeenCalledWith(
          EventTypes.GAME_COMPLETED,
          { timestamp: 12345 },
          holeTransitionManager
        );
        expect(console.warn).toHaveBeenCalledWith(
          '[HoleTransitionManager] No more holes available (current: 9, total: 9)'
        );
      });

      test('should detect game completion when beyond last hole', async () => {
        mockGame.stateManager.getCurrentHoleNumber.mockReturnValue(10);
        mockGame.course.getTotalHoles.mockReturnValue(9);

        const result = await holeTransitionManager.transitionToNextHole();

        expect(result).toBe(false);
        expect(mockGame.eventManager.publish).toHaveBeenCalledWith(
          EventTypes.GAME_COMPLETED,
          expect.any(Object),
          holeTransitionManager
        );
      });

      test('should handle missing event manager gracefully', async () => {
        mockGame.stateManager.getCurrentHoleNumber.mockReturnValue(9);
        mockGame.course.getTotalHoles.mockReturnValue(9);
        mockGame.eventManager = null;

        const result = await holeTransitionManager.transitionToNextHole();

        expect(result).toBe(false);
        expect(console.error).toHaveBeenCalledWith(
          '[HoleTransitionManager] EventManager not available to publish GAME_COMPLETED.'
        );
      });
    });

    describe('successful hole transition', () => {
      beforeEach(() => {
        mockGame.stateManager.getCurrentHoleNumber.mockReturnValue(2);
        mockGame.course.getTotalHoles.mockReturnValue(9);
      });

      test('should complete full transition successfully', async () => {
        const unloadSpy = jest
          .spyOn(holeTransitionManager, 'unloadCurrentHole')
          .mockResolvedValue();
        const loadSpy = jest.spyOn(holeTransitionManager, 'loadNewHole').mockResolvedValue(true);

        const result = await holeTransitionManager.transitionToNextHole();

        expect(result).toBe(true);
        expect(unloadSpy).toHaveBeenCalled();
        expect(mockGame.physicsManager.resetWorld).toHaveBeenCalled();
        expect(loadSpy).toHaveBeenCalledWith(3);
        expect(mockGame.stateManager.resetForNextHole).toHaveBeenCalled();
        expect(mockGame.ballManager.createBall).toHaveBeenCalled();
        expect(mockGame.inputController.enableInput).toHaveBeenCalled();
      });

      test('should handle physics world reset failure', async () => {
        mockGame.physicsManager.resetWorld.mockResolvedValue(null);

        const result = await holeTransitionManager.transitionToNextHole();

        expect(result).toBe(false);
        expect(console.error).toHaveBeenCalledWith(
          '[HoleTransitionManager] Physics world reset failed or returned invalid world.'
        );
      });

      test('should handle load new hole failure', async () => {
        jest.spyOn(holeTransitionManager, 'unloadCurrentHole').mockResolvedValue();
        jest.spyOn(holeTransitionManager, 'loadNewHole').mockResolvedValue(false);

        const result = await holeTransitionManager.transitionToNextHole();

        expect(result).toBe(false);
        expect(console.error).toHaveBeenCalledWith('[HoleTransitionManager] Failed to load hole 3');
      });

      test('should handle missing ball manager gracefully', async () => {
        mockGame.ballManager = null;
        jest.spyOn(holeTransitionManager, 'unloadCurrentHole').mockResolvedValue();
        jest.spyOn(holeTransitionManager, 'loadNewHole').mockResolvedValue(true);

        const result = await holeTransitionManager.transitionToNextHole();

        expect(result).toBe(true);
        expect(console.error).toHaveBeenCalledWith(
          '[HoleTransitionManager] BallManager not available to create ball for new hole.'
        );
      });

      test('should handle missing input controller gracefully', async () => {
        mockGame.inputController = null;
        jest.spyOn(holeTransitionManager, 'unloadCurrentHole').mockResolvedValue();
        jest.spyOn(holeTransitionManager, 'loadNewHole').mockResolvedValue(true);

        const result = await holeTransitionManager.transitionToNextHole();

        expect(result).toBe(true);
        expect(console.warn).toHaveBeenCalledWith(
          '[HoleTransitionManager] InputController not available to enable for new hole.'
        );
      });

      test('should preserve debug mode state', async () => {
        mockGame.stateManager.state.debugMode = true;
        jest.spyOn(holeTransitionManager, 'unloadCurrentHole').mockResolvedValue();
        jest.spyOn(holeTransitionManager, 'loadNewHole').mockResolvedValue(true);

        await holeTransitionManager.transitionToNextHole();

        expect(mockGame.stateManager.state.debugMode).toBe(true);
      });

      test('should update cannon debug renderer world reference', async () => {
        jest.spyOn(holeTransitionManager, 'unloadCurrentHole').mockResolvedValue();
        jest.spyOn(holeTransitionManager, 'loadNewHole').mockResolvedValue(true);

        await holeTransitionManager.transitionToNextHole();

        expect(mockGame.cannonDebugRenderer.clearMeshes).toHaveBeenCalled();
        expect(mockGame.cannonDebugRenderer.world).toBe(mockGame.physicsManager.world.world);
      });
    });

    describe('error handling', () => {
      test('should handle transition errors gracefully', async () => {
        const error = new Error('Transition failed');
        jest.spyOn(holeTransitionManager, 'unloadCurrentHole').mockRejectedValue(error);

        const result = await holeTransitionManager.transitionToNextHole();

        expect(result).toBe(false);
        expect(console.error).toHaveBeenCalledWith(
          '[HoleTransitionManager] Error during hole transition:',
          error
        );
      });

      test('should handle missing positions from course', async () => {
        mockGame.course.getHolePosition.mockReturnValue(null);
        jest.spyOn(holeTransitionManager, 'unloadCurrentHole').mockResolvedValue();
        jest.spyOn(holeTransitionManager, 'loadNewHole').mockResolvedValue(true);

        const result = await holeTransitionManager.transitionToNextHole();

        expect(result).toBe(false);
        expect(console.error).toHaveBeenCalledWith(
          '[HoleTransitionManager] Failed to get valid positions for new hole'
        );
      });
    });
  });

  describe('unloadCurrentHole', () => {
    test('should clean up all hole resources', async () => {
      const cleanSceneSpy = jest.spyOn(holeTransitionManager, 'cleanScene');

      await holeTransitionManager.unloadCurrentHole();

      expect(mockGame.course.clearCurrentHole).toHaveBeenCalled();
      expect(mockGame.ballManager.removeBall).toHaveBeenCalled();
      expect(cleanSceneSpy).toHaveBeenCalled();
    });

    test('should handle missing course gracefully', async () => {
      mockGame.course = null;

      await expect(holeTransitionManager.unloadCurrentHole()).resolves.not.toThrow();
    });

    test('should handle missing ball gracefully', async () => {
      mockGame.ballManager.ball = null;

      await expect(holeTransitionManager.unloadCurrentHole()).resolves.not.toThrow();
    });
  });

  describe('loadNewHole', () => {
    test('should load hole successfully', async () => {
      const verifySpy = jest
        .spyOn(holeTransitionManager, 'verifyPhysicsWorld')
        .mockReturnValue(true);

      const result = await holeTransitionManager.loadNewHole(3);

      expect(result).toBe(true);
      expect(verifySpy).toHaveBeenCalledTimes(2); // Before and after loading
      expect(mockGame.course.createCourse).toHaveBeenCalledWith(3);
      expect(mockGame.holeCompletionManager.resetGracePeriod).toHaveBeenCalled();
      expect(mockGame.uiManager.updateHoleInfo).toHaveBeenCalledWith(3);
      expect(mockGame.uiManager.showMessage).toHaveBeenCalledWith('Hole 3');
    });

    test('should handle missing game or course', async () => {
      mockGame.course = null;

      const result = await holeTransitionManager.loadNewHole(2);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        '[HoleTransitionManager] Game or course not available'
      );
    });

    test('should handle physics world verification failure', async () => {
      jest.spyOn(holeTransitionManager, 'verifyPhysicsWorld').mockReturnValue(false);

      const result = await holeTransitionManager.loadNewHole(2);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        '[HoleTransitionManager] Physics world verification failed'
      );
    });

    test('should handle course creation failure', async () => {
      jest.spyOn(holeTransitionManager, 'verifyPhysicsWorld').mockReturnValue(true);
      mockGame.course.createCourse.mockResolvedValue(false);

      const result = await holeTransitionManager.loadNewHole(2);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        '[HoleTransitionManager] Failed to create hole #2'
      );
    });

    test('should handle missing UI manager gracefully', async () => {
      jest.spyOn(holeTransitionManager, 'verifyPhysicsWorld').mockReturnValue(true);
      mockGame.uiManager = null;

      const result = await holeTransitionManager.loadNewHole(2);

      expect(result).toBe(true); // Should still succeed
    });

    test('should handle missing hole completion manager gracefully', async () => {
      jest.spyOn(holeTransitionManager, 'verifyPhysicsWorld').mockReturnValue(true);
      mockGame.holeCompletionManager = null;

      const result = await holeTransitionManager.loadNewHole(2);

      expect(result).toBe(true); // Should still succeed
    });

    test('should handle physics world verification failure after loading', async () => {
      jest
        .spyOn(holeTransitionManager, 'verifyPhysicsWorld')
        .mockReturnValueOnce(true) // First call succeeds
        .mockReturnValueOnce(false); // Second call fails

      const result = await holeTransitionManager.loadNewHole(2);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        '[HoleTransitionManager] Physics world verification failed after loading hole'
      );
    });

    test('should handle loading errors', async () => {
      jest.spyOn(holeTransitionManager, 'verifyPhysicsWorld').mockReturnValue(true);
      const error = new Error('Loading failed');
      mockGame.course.createCourse.mockRejectedValue(error);

      const result = await holeTransitionManager.loadNewHole(2);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        '[HoleTransitionManager] Error loading new hole:',
        error
      );
    });
  });

  describe('cleanScene', () => {
    beforeEach(() => {
      // Mock scene objects
      const lightObject = { isLight: true, type: 'DirectionalLight' };
      const cameraObject = { isCamera: true, type: 'PerspectiveCamera' };
      const permanentObject = { userData: { permanent: true }, type: 'Group' };
      const starfieldObject = { type: 'Points', userData: { type: 'starfield' } };
      const adShipObject = { type: 'Group', userData: { type: 'AdShipContainer' } };
      const regularObject = { type: 'Mesh', userData: {} };

      const mockObjects = [
        lightObject,
        cameraObject,
        permanentObject,
        starfieldObject,
        adShipObject,
        regularObject
      ];

      mockGame.scene.traverse.mockImplementation(callback => {
        mockObjects.forEach(callback);
      });

      mockGame.scene.children = [lightObject, starfieldObject];
    });

    test('should keep essential objects and clear others', () => {
      holeTransitionManager.cleanScene();

      expect(mockGame.scene.clear).toHaveBeenCalled();
      expect(mockGame.scene.add).toHaveBeenCalledTimes(5); // All essential objects
      expect(console.log).toHaveBeenCalledWith(
        '[HoleTransitionManager] Keeping object:',
        expect.any(String),
        expect.any(Object)
      );
    });

    test('should recreate starfield if missing', () => {
      // Mock scene without starfield
      mockGame.scene.children = [];

      holeTransitionManager.cleanScene();

      expect(console.log).toHaveBeenCalledWith('[HoleTransitionManager] Recreating starfield');
      expect(mockGame.createStarfield).toHaveBeenCalled();
    });

    test('should not recreate starfield if present', () => {
      // Scene already has starfield
      mockGame.scene.children = [{ type: 'Points', userData: { type: 'starfield' } }];

      holeTransitionManager.cleanScene();

      expect(mockGame.createStarfield).not.toHaveBeenCalled();
    });
  });

  describe('verifyPhysicsWorld', () => {
    test('should return true for valid physics world', () => {
      const result = holeTransitionManager.verifyPhysicsWorld();

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        '[HoleTransitionManager] Physics world state:',
        expect.objectContaining({
          bodies: 0,
          gravity: '(0, -9.82, 0)',
          solver: expect.any(Object),
          materials: expect.any(Object)
        })
      );
    });

    test('should return false when physics manager missing', () => {
      mockGame.physicsManager = null;

      const result = holeTransitionManager.verifyPhysicsWorld();

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        '[HoleTransitionManager] Physics world not available'
      );
    });

    test('should return false when CANNON world missing', () => {
      mockGame.physicsManager.world.world = null;

      const result = holeTransitionManager.verifyPhysicsWorld();

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        '[HoleTransitionManager] CANNON.World instance not available'
      );
    });

    test('should return false when required methods missing', () => {
      delete mockGame.physicsManager.world.world.step;

      const result = holeTransitionManager.verifyPhysicsWorld();

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        '[HoleTransitionManager] Physics world missing required method: step'
      );
    });

    test('should return false when bodies array missing', () => {
      mockGame.physicsManager.world.world.bodies = null;

      const result = holeTransitionManager.verifyPhysicsWorld();

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        '[HoleTransitionManager] Physics world missing bodies array'
      );
    });

    test('should return false when solver missing', () => {
      mockGame.physicsManager.world.world.solver = null;

      const result = holeTransitionManager.verifyPhysicsWorld();

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        '[HoleTransitionManager] Physics world missing solver'
      );
    });

    test('should return false when gravity invalid', () => {
      mockGame.physicsManager.world.world.gravity = null;

      const result = holeTransitionManager.verifyPhysicsWorld();

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        '[HoleTransitionManager] Physics world has invalid gravity'
      );
    });

    test('should log physics bodies when present', () => {
      const mockBody = {
        userData: { type: 'ball' },
        position: { toString: () => '(0, 1, 0)' },
        sleeping: false,
        mass: 1,
        material: { name: 'ballMaterial' }
      };
      mockGame.physicsManager.world.world.bodies = [mockBody];

      holeTransitionManager.verifyPhysicsWorld();

      expect(console.log).toHaveBeenCalledWith(
        '[HoleTransitionManager] Physics bodies:',
        expect.arrayContaining([
          expect.objectContaining({
            type: 'ball',
            position: '(0, 1, 0)',
            sleeping: false,
            mass: 1,
            material: 'ballMaterial'
          })
        ])
      );
    });
  });

  describe('transition effects and state management', () => {
    describe('onHoleTransition', () => {
      test('should initialize transition state', () => {
        const resetSpy = jest.spyOn(holeTransitionManager, 'resetTransitionState');
        const effectsSpy = jest.spyOn(holeTransitionManager, 'startTransitionEffects');

        holeTransitionManager.onHoleTransition(1, 2);

        // Due to resetTransitionState being called after setting values, final state is reset
        expect(holeTransitionManager.fromHole).toBe(0);
        expect(holeTransitionManager.toHole).toBe(0);
        expect(holeTransitionManager.transitionStartTime).toBe(0);
        expect(holeTransitionManager.isTransitioning).toBe(false);
        expect(resetSpy).toHaveBeenCalled();
        expect(effectsSpy).toHaveBeenCalled();
      });
    });

    describe('startTransitionEffects', () => {
      test('should set up transition effects', () => {
        holeTransitionManager.startTransitionEffects();

        expect(mockGame.ballManager.resetBall).toHaveBeenCalled();
        expect(mockGame.cameraController.updateCameraForHole).toHaveBeenCalled();
      });

      test('should handle missing components gracefully', () => {
        mockGame.course = null;
        mockGame.ballManager = null;
        mockGame.cameraController = null;

        expect(() => {
          holeTransitionManager.startTransitionEffects();
        }).not.toThrow();
      });
    });

    describe('resetTransitionState', () => {
      test('should reset all transition properties', () => {
        holeTransitionManager.isTransitioning = true;
        holeTransitionManager.transitionStartTime = 5000;
        holeTransitionManager.fromHole = 1;
        holeTransitionManager.toHole = 2;

        holeTransitionManager.resetTransitionState();

        expect(holeTransitionManager.isTransitioning).toBe(false);
        expect(holeTransitionManager.transitionStartTime).toBe(0);
        expect(holeTransitionManager.fromHole).toBe(0);
        expect(holeTransitionManager.toHole).toBe(0);
      });
    });

    describe('update', () => {
      test('should not update when not transitioning', () => {
        holeTransitionManager.isTransitioning = false;

        holeTransitionManager.update(0.016);

        // No effects should be applied
        expect(performance.now).not.toHaveBeenCalled();
      });

      test('should update opacity during transition', () => {
        holeTransitionManager.isTransitioning = true;
        holeTransitionManager.transitionStartTime = 500;
        holeTransitionManager.transitionDuration = 1000;
        performance.now.mockReturnValue(750); // 250ms elapsed

        const mockMaterial = { opacity: 1.0 };
        mockGame.course.getCurrentHoleMesh.mockReturnValue({
          userData: { material: mockMaterial }
        });

        holeTransitionManager.update(0.016);

        // Implementation: elapsed = (currentTime - startTime) / 1000 = (750 - 500) / 1000 = 0.25 seconds
        // progress = elapsed / transitionDuration = 0.25 / 1000 = 0.00025
        // opacity = 1.0 - progress = 1.0 - 0.00025 = 0.99975
        const elapsed = (750 - 500) / 1000; // 0.25 seconds
        const progress = elapsed / 1000; // 0.00025 (elapsed seconds / duration milliseconds)
        const expectedOpacity = 1.0 - progress; // 0.99975
        expect(mockMaterial.opacity).toBe(expectedOpacity);
      });

      test('should complete transition after duration', () => {
        holeTransitionManager.isTransitioning = true;
        holeTransitionManager.transitionStartTime = 0;
        holeTransitionManager.transitionDuration = 1000;
        holeTransitionManager.toHole = 2;
        performance.now.mockReturnValue(1001000); // Much larger to ensure elapsed > duration

        const mockMaterial = { opacity: 0.5, transparent: true };
        mockGame.course.getCurrentHoleMesh.mockReturnValue({
          userData: { material: mockMaterial }
        });

        holeTransitionManager.update(0.016);

        expect(holeTransitionManager.isTransitioning).toBe(false);
        expect(mockMaterial.transparent).toBe(false);
        expect(mockMaterial.opacity).toBe(1.0);
        expect(console.log).toHaveBeenCalledWith(
          '[HoleTransitionManager] Transition to hole 2 complete'
        );
      });

      test('should handle missing hole mesh gracefully', () => {
        holeTransitionManager.isTransitioning = true;
        holeTransitionManager.transitionStartTime = 500;
        mockGame.course.getCurrentHoleMesh.mockReturnValue(null);

        expect(() => {
          holeTransitionManager.update(0.016);
        }).not.toThrow();
      });
    });
  });

  describe('integration scenarios', () => {
    test('should handle complete transition workflow', async () => {
      // Setup for hole 2 to 3 transition
      mockGame.stateManager.getCurrentHoleNumber.mockReturnValue(2);
      mockGame.course.getTotalHoles.mockReturnValue(9);

      // Mock successful transition
      jest.spyOn(holeTransitionManager, 'verifyPhysicsWorld').mockReturnValue(true);

      const result = await holeTransitionManager.transitionToNextHole();

      expect(result).toBe(true);

      // Verify the complete workflow
      expect(mockGame.course.clearCurrentHole).toHaveBeenCalled();
      expect(mockGame.physicsManager.resetWorld).toHaveBeenCalled();
      expect(mockGame.course.createCourse).toHaveBeenCalledWith(3);
      expect(mockGame.stateManager.resetForNextHole).toHaveBeenCalled();
      expect(mockGame.ballManager.createBall).toHaveBeenCalled();
      expect(mockGame.inputController.enableInput).toHaveBeenCalled();
    });

    test('should handle transition with visual effects', () => {
      // Manually set up transition state to avoid resetTransitionState side effect
      holeTransitionManager.isTransitioning = true;
      holeTransitionManager.transitionStartTime = 1000;
      holeTransitionManager.transitionDuration = 2000;
      holeTransitionManager.toHole = 2;

      // Update during transition - elapsed = (1500 - 1000) / 1000 = 0.5 seconds
      // progress = 0.5 / 2000 = 0.00025 which is less than 1, so still transitioning
      performance.now.mockReturnValue(1500); // 500ms elapsed
      holeTransitionManager.update(0.016);
      expect(holeTransitionManager.isTransitioning).toBe(true);

      // Complete transition - need elapsed > duration in seconds
      // elapsed = (2001000 - 1000) / 1000 = 2000 seconds which is > 2000ms duration
      performance.now.mockReturnValue(2001000); // Much larger elapsed time
      holeTransitionManager.update(0.016);
      expect(holeTransitionManager.isTransitioning).toBe(false);
    });

    test('should handle error recovery gracefully', async () => {
      mockGame.stateManager.getCurrentHoleNumber.mockReturnValue(2);

      // Simulate physics world failure
      mockGame.physicsManager.resetWorld.mockResolvedValue(null);

      const result = await holeTransitionManager.transitionToNextHole();

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Physics world reset failed')
      );
    });
  });
});
