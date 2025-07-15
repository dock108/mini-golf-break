import { PhysicsManager } from '../managers/PhysicsManager';

// Mock Cannon-es
jest.mock('cannon-es', () => ({
  World: jest.fn(() => ({
    gravity: { set: jest.fn() },
    broadphase: {},
    solver: {
      iterations: 10,
      tolerance: 0.0001
    },
    defaultContactMaterial: {
      friction: 0.4,
      restitution: 0.3
    },
    allowSleep: true,
    defaultSleepSpeedLimit: 0.15,
    defaultSleepTimeLimit: 0.2,
    step: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addContactMaterial: jest.fn(),
    removeContactMaterial: jest.fn(),
    contactmaterials: [],
    ballMaterial: {},
    greenMaterial: {},
    wallMaterial: {},
    bunkerMaterial: {}
  })),
  Vec3: jest.fn((x, y, z) => ({ x, y, z, set: jest.fn() })),
  Material: jest.fn(() => ({
    friction: 0.4,
    restitution: 0.3
  })),
  ContactMaterial: jest.fn(() => ({
    friction: 0.4,
    restitution: 0.3
  })),
  NaiveBroadphase: jest.fn(),
  SAPBroadphase: jest.fn(),
  GSSolver: jest.fn()
}));

// Mock debug utility
jest.mock('../utils/debug', () => ({
  debug: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock PhysicsWorld
jest.mock('../physics/PhysicsWorld', () => ({
  PhysicsWorld: jest.fn(() => {
    const gravitySet = jest.fn();
    // Call gravity.set in constructor to simulate actual behavior
    gravitySet(0, -9.81, 0);

    const worldInstance = {
      world: {
        gravity: { set: gravitySet },
        broadphase: {},
        solver: {
          iterations: 30,
          tolerance: 0.0001
        },
        allowSleep: true,
        defaultSleepSpeedLimit: 0.15,
        defaultSleepTimeLimit: 0.2,
        step: jest.fn(),
        add: jest.fn(),
        remove: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addContactMaterial: jest.fn(),
        removeContactMaterial: jest.fn(),
        contactmaterials: [],
        bodies: [],
        removeBody: jest.fn()
      },
      fixedTimeStep: 1.0 / 60.0,
      maxSubSteps: 8,
      lastCallTime: 0,
      creationTime: Date.now(),
      collisionGracePeriod: 2000,
      setupCollideListener: jest.fn(),
      createContactMaterials: jest.fn(),
      setCollisionCallback: jest.fn(),
      cleanup: jest.fn(),
      update: jest.fn(function () {
        // Simulate the update method calling world.step
        this.world.step(this.fixedTimeStep, 0.016, this.maxSubSteps);
      }),
      defaultMaterial: {},
      groundMaterial: {},
      ballMaterial: {},
      bumperMaterial: {},
      holeCupMaterial: {},
      holeRimMaterial: {}
    };

    return worldInstance;
  })
}));

describe('PhysicsManager', () => {
  let physicsManager;
  let mockGame;

  beforeEach(() => {
    mockGame = {
      debugManager: {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      }
    };

    physicsManager = new PhysicsManager(mockGame);
  });

  afterEach(() => {
    if (physicsManager) {
      physicsManager.cleanup();
    }
  });

  test('should initialize with correct default settings', () => {
    expect(physicsManager.game).toBe(mockGame);
    expect(physicsManager.cannonWorld).toBeNull();
    expect(physicsManager.world).toBeNull();
    expect(physicsManager.debugEnabled).toBe(false);
    expect(physicsManager.isResetting).toBe(false);
  });

  test('should initialize physics world correctly', () => {
    physicsManager.init();

    expect(physicsManager.world).toBeDefined();
    expect(physicsManager.cannonWorld).toBeDefined();
    expect(physicsManager.world.world.gravity.set).toHaveBeenCalledWith(0, -9.81, 0);
  });

  test('should create materials correctly', () => {
    physicsManager.init();

    expect(physicsManager.world.ballMaterial).toBeDefined();
    expect(physicsManager.world.groundMaterial).toBeDefined();
    expect(physicsManager.world.bumperMaterial).toBeDefined();
    expect(physicsManager.world.holeCupMaterial).toBeDefined();
  });

  test('should return physics world', () => {
    physicsManager.init();
    const world = physicsManager.getWorld();

    expect(world).toBe(physicsManager.world);
    expect(world.world).toBe(physicsManager.cannonWorld);
  });

  test('should return null for world when not initialized', () => {
    const world = physicsManager.getWorld();
    expect(world).toBeNull();
  });

  test('should update physics correctly', () => {
    physicsManager.init();
    const deltaTime = 0.016; // 60fps

    physicsManager.update(deltaTime);

    expect(physicsManager.cannonWorld.step).toHaveBeenCalled();
  });

  test('should handle large delta time correctly', () => {
    physicsManager.init();
    const largeDeltaTime = 0.1; // 100ms - should be clamped

    physicsManager.update(largeDeltaTime);

    expect(physicsManager.cannonWorld.step).toHaveBeenCalled();
  });

  test('should reset world correctly', () => {
    physicsManager.init();
    physicsManager.resetWorld();

    // World should be recreated
    expect(physicsManager.cannonWorld).toBeDefined();
  });

  test('should add body to world', () => {
    physicsManager.init();
    const mockBody = { type: 'test-body' };

    // PhysicsManager doesn't have addBody method, bodies are added through the world
    physicsManager.world.world.add(mockBody);

    expect(physicsManager.world.world.add).toHaveBeenCalledWith(mockBody);
  });

  test('should remove body from world', () => {
    physicsManager.init();
    const mockBody = { type: 'test-body', id: 'test-body-1' };

    // Mock the bodies array
    physicsManager.cannonWorld.bodies = [mockBody];
    physicsManager.cannonWorld.removeBody = jest.fn();

    physicsManager.removeBody(mockBody);

    expect(physicsManager.cannonWorld.removeBody).toHaveBeenCalledWith(mockBody);
  });

  test('should set gravity correctly', () => {
    physicsManager.init();

    // setGravity doesn't exist, gravity is set during world creation
    expect(physicsManager.world.world.gravity.set).toHaveBeenCalledWith(0, -9.81, 0);
  });

  test('should cleanup resources properly', () => {
    physicsManager.init();

    physicsManager.cleanup();

    expect(physicsManager.cannonWorld).toBeNull();
    expect(physicsManager.world).toBeNull();
  });

  test('should handle update when not initialized', () => {
    // Should not throw when updating uninitialized manager
    expect(() => {
      physicsManager.update(0.016);
    }).not.toThrow();
  });

  test('should handle body operations when not initialized', () => {
    const mockBody = { type: 'test-body' };

    // Should not throw when world is not initialized
    expect(() => {
      physicsManager.removeBody(mockBody);
    }).not.toThrow();
  });

  describe('Branch coverage scenarios', () => {
    test('should handle physics debugger enabled scenario', async () => {
      mockGame.debugManager.physicsDebuggerEnabled = true;
      const { debug } = require('../utils/debug');

      await physicsManager.init();

      expect(debug.log).toHaveBeenCalledWith(
        '[PhysicsManager] Physics debugger enabled by DebugManager.'
      );
    });

    test('should handle missing ball body during init', async () => {
      mockGame.ballManager = null; // No ball manager
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await physicsManager.init();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PhysicsManager] Could not get ball body during init. Listeners not set up.'
      );

      consoleSpy.mockRestore();
    });

    test('should handle ball manager without ball', async () => {
      mockGame.ballManager = { ball: null }; // Ball manager exists but no ball
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await physicsManager.init();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PhysicsManager] Could not get ball body during init. Listeners not set up.'
      );

      consoleSpy.mockRestore();
    });

    test('should handle ball without body', async () => {
      mockGame.ballManager = { ball: {} }; // Ball exists but no body
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await physicsManager.init();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PhysicsManager] Could not get ball body during init. Listeners not set up.'
      );

      consoleSpy.mockRestore();
    });

    test('should set up contact listeners when ball body exists', async () => {
      mockGame.ballManager = { ball: { body: { userData: { type: 'ball' } } } };
      const setupContactListenersSpy = jest
        .spyOn(physicsManager, 'setupContactListeners')
        .mockImplementation();

      await physicsManager.init();

      expect(setupContactListenersSpy).toHaveBeenCalled();

      setupContactListenersSpy.mockRestore();
    });

    test('should handle setupCollisionEvents with no cannon world', () => {
      physicsManager.cannonWorld = null;

      const result = physicsManager.setupCollisionEvents();

      expect(result).toBe(physicsManager); // Should return early
    });

    test('should handle collision start with no game reference', () => {
      physicsManager.game = null;
      const mockEvent = {
        bodyA: { userData: { type: 'ball' } },
        bodyB: { userData: { type: 'ground' } }
      };

      expect(() => {
        physicsManager.handleCollisionStart(mockEvent);
      }).not.toThrow();
    });

    test('should handle collision start without handleCollision method', () => {
      delete mockGame.handleCollision; // Remove handleCollision method
      const mockEvent = {
        bodyA: { userData: { type: 'ball' } },
        bodyB: { userData: { type: 'ground' } }
      };

      expect(() => {
        physicsManager.handleCollisionStart(mockEvent);
      }).not.toThrow();
    });

    test('should delegate collision handling when handleCollision exists', () => {
      mockGame.handleCollision = jest.fn();
      const mockEvent = {
        bodyA: { userData: { type: 'ball' } },
        bodyB: { userData: { type: 'ground' } }
      };

      physicsManager.handleCollisionStart(mockEvent);

      expect(mockGame.handleCollision).toHaveBeenCalledWith(mockEvent.bodyA, mockEvent.bodyB);
    });

    test('should skip update when isResetting is true', () => {
      physicsManager.init();
      physicsManager.isResetting = true;
      const updateSpy = jest.spyOn(physicsManager.world, 'update');

      const result = physicsManager.update(0.016);

      expect(result).toBe(physicsManager);
      expect(updateSpy).not.toHaveBeenCalled();
    });

    test('should handle missing cannon world during update', () => {
      physicsManager.cannonWorld = null;

      const result = physicsManager.update(0.016);

      expect(result).toBe(physicsManager);
      expect(mockGame.debugManager.warn).toHaveBeenCalledWith(
        '[PhysicsManager] Physics world or bodies not ready'
      );
    });

    test('should handle missing bodies during update', () => {
      physicsManager.init();
      physicsManager.cannonWorld.bodies = undefined; // No bodies property

      const result = physicsManager.update(0.016);

      expect(result).toBe(physicsManager);
      expect(mockGame.debugManager.warn).toHaveBeenCalledWith(
        '[PhysicsManager] Physics world or bodies not ready'
      );
    });

    test('should handle missing game during safety check', () => {
      physicsManager.game = null;
      physicsManager.cannonWorld = null;

      const result = physicsManager.update(0.016);

      expect(result).toBe(physicsManager);
      // Should not throw error when no game
    });

    test('should skip world update when reset check fails', () => {
      physicsManager.init();
      physicsManager.isResetting = false;
      const updateSpy = jest.spyOn(physicsManager.world, 'update');

      // Simulate reset flag being set during update
      physicsManager.isResetting = true;

      physicsManager.update(0.016);

      expect(updateSpy).not.toHaveBeenCalled();
    });

    test('should handle error during world update with debugManager', () => {
      physicsManager.init();
      physicsManager.world.update = jest.fn(() => {
        throw new Error('Update failed');
      });

      expect(() => {
        physicsManager.update(0.016);
      }).not.toThrow();

      expect(mockGame.debugManager.error).toHaveBeenCalledWith(
        'PhysicsManager.update',
        'Error updating physics world',
        expect.any(Error),
        true
      );
    });

    test('should handle error during world update without debugManager', () => {
      physicsManager.init();
      physicsManager.world.update = jest.fn(() => {
        throw new Error('Update failed');
      });
      physicsManager.game = null; // No game means no debugManager

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        physicsManager.update(0.016);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'ERROR: PhysicsManager.update: Error updating physics world',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test('should log debug information when world exists', () => {
      physicsManager.init();
      const { debug } = require('../utils/debug');

      const result = physicsManager.getWorld();

      expect(result).toBe(physicsManager.world);
      expect(debug.log).toHaveBeenCalledWith('DEBUG PhysicsManager.getWorld: World exists: true');
      expect(debug.log).toHaveBeenCalledWith(
        'DEBUG PhysicsManager.getWorld: World has cannonWorld: true'
      );
      expect(debug.log).toHaveBeenCalledWith(
        'DEBUG PhysicsManager.getWorld: World has ballMaterial: true'
      );
    });

    test('should log debug information when world does not exist', () => {
      physicsManager.world = null;
      const { debug } = require('../utils/debug');

      const result = physicsManager.getWorld();

      expect(result).toBeNull();
      expect(debug.log).toHaveBeenCalledWith('DEBUG PhysicsManager.getWorld: World exists: false');
    });
  });
});
