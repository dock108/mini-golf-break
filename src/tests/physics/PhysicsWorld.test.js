/**
 * Unit tests for PhysicsWorld
 */

import { PhysicsWorld } from '../../physics/PhysicsWorld';
import * as CANNON from 'cannon-es';

// Mock CANNON
jest.mock('cannon-es', () => ({
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
    bodies: [],
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
  Vec3: jest.fn((x, y, z) => ({ x, y, z, set: jest.fn() }))
}));

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

    test('should debounce collision callbacks', () => {
      jest.useFakeTimers();

      // Simulate multiple rapid collisions
      const collisionHandler = physicsWorld.world.addEventListener.mock.calls[0][1];
      const mockEvent = {
        contact: {
          bi: { userData: { type: 'ball' } },
          bj: { userData: { type: 'hole' } }
        }
      };

      collisionHandler(mockEvent);
      collisionHandler(mockEvent);
      collisionHandler(mockEvent);

      expect(mockCreationCallback).toHaveBeenCalledTimes(1);

      jest.runAllTimers();
      jest.useRealTimers();
    });
  });

  describe('step', () => {
    test('should step physics simulation', () => {
      physicsWorld.step(0.016);

      expect(physicsWorld.world.step).toHaveBeenCalledWith(0.016666666666666666, 0.016, 3);
    });

    test('should use fixed timestep', () => {
      physicsWorld.step(0.033); // Double frame time

      expect(physicsWorld.world.step).toHaveBeenCalledWith(
        0.016666666666666666, // Still fixed
        0.033,
        3
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
      const mockBody = { id: 1 };

      physicsWorld.addBody(mockBody);

      expect(physicsWorld.world.addBody).toHaveBeenCalledWith(mockBody);
    });

    test('should remove body from world', () => {
      const mockBody = { id: 1 };

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

      expect(ballMaterial).toBe(physicsWorld.materials.ball);
    });

    test('should return undefined for invalid material', () => {
      const invalidMaterial = physicsWorld.getMaterial('invalid');

      expect(invalidMaterial).toBeUndefined();
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

  describe('cleanup', () => {
    test('should clear bodies on cleanup', () => {
      physicsWorld.world.bodies = [{ id: 1 }, { id: 2 }];

      physicsWorld.cleanup();

      expect(physicsWorld.world.bodies.length).toBe(0);
    });

    test('should clear callback on cleanup', () => {
      physicsWorld.cleanup();

      expect(physicsWorld._collisionCallback).toBe(null);
    });
  });
});
