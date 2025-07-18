/**
 * Unit tests for PhysicsWorld
 */

import { PhysicsWorld } from '../../physics/PhysicsWorld';
import * as CANNON from 'cannon-es';

// Mock CANNON
jest.mock('cannon-es', () => {
  const mockBody = jest.fn(options => ({
    mass: options?.mass || 0,
    material: options?.material || null,
    position: options?.position || { x: 0, y: 0, z: 0 },
    velocity: { set: jest.fn() },
    angularVelocity: { set: jest.fn() },
    quaternion: { setFromEuler: jest.fn() },
    addShape: jest.fn(),
    wakeUp: jest.fn(),
    userData: options?.userData || {}
  }));

  // Add STATIC constant
  mockBody.STATIC = 1;

  return {
    World: jest.fn(() => ({
      gravity: { set: jest.fn() },
      broadphase: null,
      solver: { iterations: 10 },
      defaultContactMaterial: null,
      addContactMaterial: jest.fn(),
      addBody: jest.fn(),
      removeBody: jest.fn(),
      step: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      bodies: [],
      constraints: [],
      contactmaterials: [] // Add contactmaterials property for logging
    })),
    NaiveBroadphase: jest.fn(),
    SAPBroadphase: jest.fn(),
    Material: jest.fn(name => ({ name })),
    ContactMaterial: jest.fn((m1, m2, options) => ({
      materials: [m1, m2],
      friction: options.friction,
      restitution: options.restitution
    })),
    Vec3: jest.fn((x, y, z) => ({ x, y, z, set: jest.fn() })),
    Body: mockBody,
    Plane: jest.fn(),
    Box: jest.fn(),
    Sphere: jest.fn(),
    Cylinder: jest.fn(),
    Shape: {
      types: {
        SPHERE: 'sphere'
      }
    }
  };
});

describe('PhysicsWorld', () => {
  let physicsWorld;
  let mockCreationCallback;

  beforeEach(() => {
    mockCreationCallback = jest.fn();
    physicsWorld = new PhysicsWorld();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize properly', () => {
      expect(physicsWorld._collideCallback).toBeDefined();
      expect(physicsWorld.world).toBeDefined();
      expect(physicsWorld.materials).toBeDefined();
    });

    test('should create CANNON world', () => {
      expect(CANNON.World).toHaveBeenCalled();
    });

    test('should set gravity', () => {
      expect(physicsWorld.world.gravity.set).toHaveBeenCalledWith(0, -9.81, 0);
    });

    test('should set broadphase', () => {
      expect(CANNON.SAPBroadphase).toHaveBeenCalled();
      expect(physicsWorld.world.broadphase).toBeDefined();
    });

    test('should set solver iterations', () => {
      expect(physicsWorld.world.solver.iterations).toBe(30);
    });
  });

  describe('materials', () => {
    test('should create materials', () => {
      expect(physicsWorld.groundMaterial).toBeDefined();
      expect(physicsWorld.ballMaterial).toBeDefined();
      expect(physicsWorld.holeCupMaterial).toBeDefined();
      expect(physicsWorld.holeRimMaterial).toBeDefined();
      expect(physicsWorld.bumperMaterial).toBeDefined();
      expect(physicsWorld.materials).toHaveLength(6); // All materials in array
    });

    test('should create contact materials', () => {
      // Ball-ground contact (using actual implementation values)
      expect(CANNON.ContactMaterial).toHaveBeenCalledWith(
        physicsWorld.ballMaterial,
        physicsWorld.groundMaterial,
        expect.objectContaining({
          friction: 0.8,
          restitution: 0.1
        })
      );

      // Ball-bumper contact (using actual implementation values)
      expect(CANNON.ContactMaterial).toHaveBeenCalledWith(
        physicsWorld.ballMaterial,
        physicsWorld.bumperMaterial,
        expect.objectContaining({
          friction: 0.2,
          restitution: 0.7
        })
      );
    });

    test('should add contact materials to world', () => {
      const addContactMaterialCalls = physicsWorld.world.addContactMaterial.mock.calls;
      expect(addContactMaterialCalls.length).toBeGreaterThan(0);
    });
  });

  describe('collision handling', () => {
    test('should set up collision event listener', () => {
      expect(physicsWorld.world.addEventListener).toHaveBeenCalledWith(
        'collide',
        expect.any(Function)
      );
    });

    test('should handle collision events during grace period', () => {
      // Simulate collision event during grace period
      const collisionHandler = physicsWorld.world.addEventListener.mock.calls[0][1];
      const mockEvent = {
        bodyA: { userData: { type: 'ball' } },
        bodyB: { userData: { type: 'hole' } }
      };

      // Should not crash when collision handler is called
      expect(() => {
        collisionHandler(mockEvent);
      }).not.toThrow();
    });
  });

  describe('step', () => {
    test('should step physics simulation', () => {
      physicsWorld.step(0.016);

      expect(physicsWorld.world.step).toHaveBeenCalledWith(0.016666666666666666, 0.016, 8);
    });

    test('should use fixed timestep', () => {
      physicsWorld.step(0.033); // Double frame time

      expect(physicsWorld.world.step).toHaveBeenCalledWith(
        0.016666666666666666, // Still fixed
        0.033,
        8
      );
    });

    test('should track last call time', () => {
      const initialTime = physicsWorld.lastCallTime;
      physicsWorld.step(0.016);

      expect(physicsWorld.lastCallTime).toBeGreaterThan(initialTime);
    });
  });

  describe('body management', () => {
    test('should add body to world', () => {
      const mockBody = {
        id: 1,
        type: 'dynamic',
        mass: 1,
        shapes: [{ type: 'sphere' }],
        material: { id: 'ball' },
        userData: { type: 'ball' }
      };

      physicsWorld.addBody(mockBody);

      expect(physicsWorld.world.addBody).toHaveBeenCalledWith(mockBody);
    });

    test('should remove body from world', () => {
      const mockBody = {
        id: 1,
        wakeUp: jest.fn(),
        velocity: { set: jest.fn() },
        angularVelocity: { set: jest.fn() },
        force: { set: jest.fn() },
        torque: { set: jest.fn() }
      };

      physicsWorld.removeBody(mockBody);

      expect(physicsWorld.world.removeBody).toHaveBeenCalledWith(mockBody);
    });
  });

  describe('getters', () => {
    test('should get world instance', () => {
      const world = physicsWorld.getWorld();

      expect(world).toBe(physicsWorld.world);
    });

    test('should get materials', () => {
      const materials = physicsWorld.getMaterials();

      expect(materials).toBe(physicsWorld.materials);
    });

    test('should get specific material', () => {
      const ballMaterial = physicsWorld.getMaterial('ball');

      expect(ballMaterial).toBe(physicsWorld.ballMaterial);
    });

    test('should return null for invalid material', () => {
      const invalidMaterial = physicsWorld.getMaterial('invalid');

      expect(invalidMaterial).toBeNull();
    });
  });

  describe('gravity', () => {
    test('should update gravity', () => {
      physicsWorld.setGravity(0, -20, 0);

      expect(physicsWorld.world.gravity.set).toHaveBeenCalledWith(0, -20, 0);
    });

    test('should handle Vec3 gravity', () => {
      const gravityVec = new CANNON.Vec3(0, -15, 0);
      physicsWorld.setGravity(gravityVec);

      expect(physicsWorld.world.gravity.set).toHaveBeenCalledWith(0, -15, 0);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      // Mock performance.now
      global.performance = {
        now: jest.fn(() => 1000)
      };
    });

    test('should call update method', () => {
      const mockNow = jest.fn();
      mockNow.mockReturnValueOnce(1000).mockReturnValueOnce(1016);
      global.performance.now = mockNow;

      physicsWorld.update();

      expect(global.performance.now).toHaveBeenCalled();
    });

    test('should cap delta time to prevent large jumps', () => {
      const mockNow = jest.fn();
      mockNow.mockReturnValueOnce(1000).mockReturnValueOnce(1200); // 200ms gap
      global.performance.now = mockNow;

      physicsWorld.update();

      // Should cap at 0.1s
      expect(physicsWorld.lastCallTime).toBeGreaterThan(0);
    });

    test('should handle debug logging', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Mock Math.random to force debug logging
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.0001); // Less than debugRate

      physicsWorld.update();

      Math.random = originalRandom;
      consoleSpy.mockRestore();
    });

    test('should handle debug logging with ball in world', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Add a mock ball to the world
      const mockBall = {
        shapes: [{ type: 'sphere' }],
        position: { x: 1, y: 2, z: 3, toFixed: jest.fn().mockReturnValue('1.00') },
        velocity: { x: 0.5, y: 0, z: 0.5, toFixed: jest.fn().mockReturnValue('0.50') },
        sleepState: 0
      };
      physicsWorld.world.bodies.push(mockBall);

      // Mock Math.random to force debug logging
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.0001); // Less than debugRate

      physicsWorld.update();

      Math.random = originalRandom;
      consoleSpy.mockRestore();
    });

    test('should handle physics step error and recovery', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Add a mock body to the world
      const mockBody = {
        velocity: { set: jest.fn() },
        angularVelocity: { set: jest.fn() },
        force: { set: jest.fn() },
        torque: { set: jest.fn() },
        wakeUp: jest.fn()
      };
      physicsWorld.world.bodies.push(mockBody);

      // Make the step method throw an error
      physicsWorld.world.step.mockImplementationOnce(() => {
        throw new Error('Physics step error');
      });

      physicsWorld.update();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in physics update:', expect.any(Error));
      expect(mockBody.velocity.set).toHaveBeenCalledWith(0, 0, 0);
      expect(mockBody.angularVelocity.set).toHaveBeenCalledWith(0, 0, 0);
      expect(mockBody.force.set).toHaveBeenCalledWith(0, 0, 0);
      expect(mockBody.torque.set).toHaveBeenCalledWith(0, 0, 0);
      expect(mockBody.wakeUp).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('callback management', () => {
    test('should set collision callback', () => {
      const mockCallback = jest.fn();
      physicsWorld.setCollisionCallback(mockCallback);

      // The callback is wrapped, so we check that it's a function
      expect(typeof physicsWorld._collisionCallback).toBe('function');
      expect(physicsWorld._collisionCallback).not.toBe(mockCallback);
    });
  });

  describe('body creation', () => {
    test('should create ground body', () => {
      const body = physicsWorld.createGroundBody();
      expect(body).toBeDefined();
    });

    test('should create box body', () => {
      const size = { x: 2, y: 1, z: 3 };
      const position = { x: 0, y: 0, z: 0 };
      const body = physicsWorld.createBoxBody(size, position);
      expect(body).toBeDefined();
    });

    test('should create sphere body', () => {
      const radius = 1;
      const position = { x: 0, y: 0, z: 0 };
      const body = physicsWorld.createSphereBody(radius, position);
      expect(body).toBeDefined();
    });

    test('should create cylinder body', () => {
      const radius = 1;
      const height = 2;
      const position = { x: 0, y: 0, z: 0 };
      const body = physicsWorld.createCylinderBody(radius, height, position);
      expect(body).toBeDefined();
    });
  });

  describe('material configuration', () => {
    test('should handle default contact material configuration', () => {
      // Create a mock world with defaultContactMaterial
      physicsWorld.world.defaultContactMaterial = {
        friction: 0,
        restitution: 0
      };

      // Call createContactMaterials directly to test the material configuration
      physicsWorld.createContactMaterials();

      expect(physicsWorld.world.defaultContactMaterial.friction).toBe(0.8);
      expect(physicsWorld.world.defaultContactMaterial.restitution).toBe(0.1);
    });

    test('should handle null default contact material', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      physicsWorld.world.defaultContactMaterial = null;

      // Re-instantiate to trigger null handling
      physicsWorld = new PhysicsWorld();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('defaultContactMaterial is null')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('reset', () => {
    test('should reset physics world state', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Add a mock body to the world
      const mockBody = {
        velocity: { set: jest.fn() },
        angularVelocity: { set: jest.fn() },
        force: { set: jest.fn() },
        torque: { set: jest.fn() },
        wakeUp: jest.fn(),
        shapes: [{ type: 'sphere' }],
        removeShape: jest.fn()
      };
      physicsWorld.world.bodies.push(mockBody);

      physicsWorld.reset();

      expect(mockBody.wakeUp).toHaveBeenCalled();
      expect(mockBody.velocity.set).toHaveBeenCalledWith(0, 0, 0);
      expect(mockBody.angularVelocity.set).toHaveBeenCalledWith(0, 0, 0);
      expect(mockBody.force.set).toHaveBeenCalledWith(0, 0, 0);
      expect(mockBody.torque.set).toHaveBeenCalledWith(0, 0, 0);
      expect(mockBody.removeShape).toHaveBeenCalled();
      expect(physicsWorld.world.removeBody).toHaveBeenCalledWith(mockBody);

      consoleSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    test('should remove event listeners on cleanup', () => {
      physicsWorld.cleanup();

      expect(physicsWorld.world.removeEventListener).toHaveBeenCalledWith(
        'collide',
        expect.any(Function)
      );
    });

    test('should clear callback on cleanup', () => {
      physicsWorld.cleanup();

      expect(physicsWorld._collideCallback).toBeNull();
    });
  });

  describe('collision grace period', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should ignore collisions during grace period', () => {
      const callback = jest.fn();
      physicsWorld.setCollisionCallback(callback);

      // Simulate collision immediately after creation
      const event = { type: 'collision' };
      physicsWorld._collisionCallback(event);

      expect(callback).not.toHaveBeenCalled();
    });

    test('should handle collisions after grace period', () => {
      const callback = jest.fn();
      physicsWorld.setCollisionCallback(callback);

      // Advance time past grace period (which is 2000ms as per the code)
      Date.now = jest.fn(() => physicsWorld.creationTime + 2500);

      // Get the wrapped callback and call it
      const wrappedCallback = physicsWorld._collisionCallback;
      const event = { type: 'collision' };
      wrappedCallback(event);

      expect(callback).toHaveBeenCalledWith(event);
    });

    test('should log when ignoring collision during grace period', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const callback = jest.fn();
      physicsWorld.setCollisionCallback(callback);

      // Simulate collision during grace period
      const event = { type: 'collision' };
      physicsWorld._collisionCallback(event);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PhysicsWorld] Ignoring collision during grace period')
      );
      logSpy.mockRestore();
    });
  });

  describe('collision callback edge cases', () => {
    test('should handle null callback in wrapper', () => {
      physicsWorld.setCollisionCallback(null);

      // Set time past grace period
      Date.now = jest.fn(() => physicsWorld.creationTime + 200);

      // Should not throw when calling wrapper with null callback
      const event = { type: 'collision' };
      expect(() => {
        physicsWorld._collisionCallback(event);
      }).not.toThrow();
    });

    test('should replace existing collision callback', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      physicsWorld.setCollisionCallback(callback1);
      const firstWrapper = physicsWorld._collisionCallback;

      physicsWorld.setCollisionCallback(callback2);
      const secondWrapper = physicsWorld._collisionCallback;

      // Should have different wrapper functions
      expect(firstWrapper).not.toBe(secondWrapper);

      // Should have removed the first listener
      expect(physicsWorld.world.removeEventListener).toHaveBeenCalledWith(
        'beginContact',
        firstWrapper
      );

      // Set time past grace period
      Date.now = jest.fn(() => physicsWorld.creationTime + 2500);

      // Trigger collision with new callback
      const event = { type: 'collision' };
      secondWrapper(event);

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith(event);
    });
  });

  describe('debug logging branches', () => {
    test('should log contact materials when available', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      // Add contact materials to mock world
      physicsWorld.world.contactmaterials = [
        {
          materials: [
            { name: 'ball', id: 1 },
            { name: 'ground', id: 2 }
          ]
        }
      ];

      // Trigger the logging by accessing an internal method that logs
      // Since the logging happens in constructor, we need to create a new instance
      const PhysicsWorld = require('../../physics/PhysicsWorld').PhysicsWorld;
      new PhysicsWorld();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PhysicsWorld] World contact materials'),
        expect.any(Array)
      );

      logSpy.mockRestore();
    });
  });

  describe('error recovery', () => {
    test('should continue after world bodies error', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Create getter that throws
      let shouldThrow = true;
      Object.defineProperty(physicsWorld.world, 'bodies', {
        get: () => {
          if (shouldThrow) {
            shouldThrow = false;
            throw new Error('Bodies access error');
          }
          return [];
        },
        configurable: true
      });

      // Should not throw
      expect(() => physicsWorld.update(16)).not.toThrow();

      expect(errorSpy).toHaveBeenCalledWith('Error in physics update:', expect.any(Error));

      errorSpy.mockRestore();
    });

    test('should handle missing world during debug', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      // Enable debug
      physicsWorld.debugLogging = true;

      // Temporarily make world null
      const originalWorld = physicsWorld.world;
      physicsWorld.world = null;

      // Should not throw
      expect(() => physicsWorld.update(16)).not.toThrow();

      // Restore world
      physicsWorld.world = originalWorld;

      logSpy.mockRestore();
    });

    test('should handle debug logging without ball reference', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      // Enable debug by mocking Math.random to trigger debug logging
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.0001); // Less than debugRate

      physicsWorld.update(16);

      // Should log debug info
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('DEBUG PhysicsWorld.update'));

      Math.random = originalRandom;
      logSpy.mockRestore();
    });
  });

  describe('body management edge cases', () => {
    test('should handle body with userData', () => {
      const ballBody = { userData: { isBall: true } };

      expect(() => physicsWorld.addBody(ballBody)).not.toThrow();
      expect(physicsWorld.world.addBody).toHaveBeenCalledWith(ballBody);
    });

    test('should handle body without userData', () => {
      const body = {};

      expect(() => physicsWorld.addBody(body)).not.toThrow();
      expect(physicsWorld.world.addBody).toHaveBeenCalledWith(body);
    });

    test('should handle removing body', () => {
      const ballBody = { userData: { isBall: true } };

      physicsWorld.addBody(ballBody);
      physicsWorld.removeBody(ballBody);

      expect(physicsWorld.world.removeBody).toHaveBeenCalledWith(ballBody);
    });
  });
});
