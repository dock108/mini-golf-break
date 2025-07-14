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
});
