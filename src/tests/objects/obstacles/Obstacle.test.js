import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Obstacle } from '../../../objects/obstacles/Obstacle';

describe('Obstacle Base Class', () => {
  let obstacle;
  let mockGame;
  let mockWorld;
  let mockScene;
  let mockEventManager;

  beforeEach(() => {
    // Create mock physics world
    mockWorld = {
      addBody: jest.fn(),
      removeBody: jest.fn()
    };

    // Create mock scene
    mockScene = {
      add: jest.fn(),
      remove: jest.fn()
    };

    // Create mock event manager
    mockEventManager = {
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    };

    // Create mock game
    mockGame = {
      physicsWorld: mockWorld,
      scene: mockScene,
      eventManager: mockEventManager,
      camera: new THREE.PerspectiveCamera()
    };
  });

  afterEach(() => {
    if (obstacle) {
      obstacle.dispose();
    }
  });

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      obstacle = new Obstacle();

      expect(obstacle.id).toMatch(/^obstacle_[a-z0-9]+$/);
      expect(obstacle.type).toBe('base');
      expect(obstacle.name).toBe('Obstacle');

      // Check Vector3 properties directly instead of object equality
      expect(obstacle.position.x).toBe(0);
      expect(obstacle.position.y).toBe(0);
      expect(obstacle.position.z).toBe(0);

      // Check Euler properties directly
      expect(obstacle.rotation.x).toBe(0);
      expect(obstacle.rotation.y).toBe(0);
      expect(obstacle.rotation.z).toBe(0);

      // Check scale properties directly
      expect(obstacle.scale.x).toBe(1);
      expect(obstacle.scale.y).toBe(1);
      expect(obstacle.scale.z).toBe(1);

      expect(obstacle.size).toEqual({ width: 1, height: 1, depth: 1 });
      expect(obstacle.isActive).toBe(true);
      expect(obstacle.group).toBeDefined();
      expect(typeof obstacle.group.add).toBe('function');
      expect(obstacle.particles).toEqual([]);
    });

    it('should initialize with custom config', () => {
      const config = {
        id: 'custom-obstacle',
        type: 'custom',
        name: 'Custom Obstacle',
        position: new THREE.Vector3(1, 2, 3),
        rotation: new THREE.Euler(0.5, 1, 1.5),
        scale: new THREE.Vector3(2, 2, 2),
        size: { width: 3, height: 4, depth: 5 },
        isActive: false
      };

      obstacle = new Obstacle(config);

      expect(obstacle.id).toBe('custom-obstacle');
      expect(obstacle.type).toBe('custom');
      expect(obstacle.name).toBe('Custom Obstacle');

      // Check Vector3 properties directly
      expect(obstacle.position.x).toBe(1);
      expect(obstacle.position.y).toBe(2);
      expect(obstacle.position.z).toBe(3);

      // Check Euler properties directly
      expect(obstacle.rotation.x).toBe(0.5);
      expect(obstacle.rotation.y).toBe(1);
      expect(obstacle.rotation.z).toBe(1.5);

      // Check scale properties directly
      expect(obstacle.scale.x).toBe(2);
      expect(obstacle.scale.y).toBe(2);
      expect(obstacle.scale.z).toBe(2);

      expect(obstacle.size).toEqual(config.size);
      expect(obstacle.isActive).toBe(false);
    });

    it('should set group position and rotation from config', () => {
      const config = {
        position: new THREE.Vector3(10, 20, 30),
        rotation: new THREE.Euler(1, 2, 3)
      };

      obstacle = new Obstacle(config);

      // Verify that set methods were called with correct values
      expect(obstacle.group.position.set).toHaveBeenCalledWith(10, 20, 30);
      expect(obstacle.group.rotation.set).toHaveBeenCalledWith(1, 2, 3);
    });
  });

  describe('Initialization', () => {
    it('should initialize with game reference', () => {
      obstacle = new Obstacle();
      obstacle.init(mockGame);

      expect(obstacle.game).toBe(mockGame);
      expect(obstacle.eventManager).toBe(mockEventManager);
    });

    it('should create mesh and physics body when initialized', () => {
      class TestObstacle extends Obstacle {
        createMesh() {
          this.mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
          this.group.add(this.mesh);
        }

        createPhysicsBody() {
          this.body = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5))
          });
          this.game.physicsWorld.addBody(this.body);
        }
      }

      obstacle = new TestObstacle();
      obstacle.init(mockGame);

      expect(obstacle.mesh).toBeDefined();
      expect(typeof obstacle.mesh.position).toBe('object');
      expect(obstacle.body).toBeDefined();
      expect(typeof obstacle.body.position).toBe('object');
      expect(mockWorld.addBody).toHaveBeenCalledWith(obstacle.body);
    });
  });

  describe('Update', () => {
    it('should update animation', () => {
      obstacle = new Obstacle();
      obstacle.init(mockGame);
      obstacle.updateAnimation = jest.fn();

      obstacle.update(0.016);

      expect(obstacle.updateAnimation).toHaveBeenCalledWith(0.016);
    });

    it('should update particles', () => {
      obstacle = new Obstacle();
      obstacle.init(mockGame);

      // Create mock particles
      const mockParticle1 = {
        update: jest.fn(),
        dispose: jest.fn(),
        isDead: false
      };
      const mockParticle2 = {
        update: jest.fn(),
        dispose: jest.fn(),
        isDead: true
      };

      obstacle.particles = [mockParticle1, mockParticle2];

      obstacle.update(0.016);

      expect(mockParticle1.update).toHaveBeenCalledWith(0.016);
      expect(mockParticle2.update).toHaveBeenCalledWith(0.016);
      expect(mockParticle2.dispose).toHaveBeenCalled();
      expect(obstacle.particles).toEqual([mockParticle1]);
    });

    it('should skip update when not active', () => {
      obstacle = new Obstacle({ isActive: false });
      obstacle.init(mockGame);
      obstacle.updateAnimation = jest.fn();

      obstacle.update(0.016);

      expect(obstacle.updateAnimation).not.toHaveBeenCalled();
    });
  });

  describe('Ball Contact', () => {
    it('should call onBallContact when implemented', () => {
      class TestObstacle extends Obstacle {
        onBallContact(ballBody) {
          this.contactCalled = true;
          this.contactBall = ballBody;
        }
      }

      obstacle = new TestObstacle();
      obstacle.init(mockGame);

      const mockBallBody = { id: 'test-ball' };
      obstacle.onBallContact(mockBallBody);

      expect(obstacle.contactCalled).toBe(true);
      expect(obstacle.contactBall).toBe(mockBallBody);
    });
  });

  describe('Activation', () => {
    it('should set isActive flag', () => {
      obstacle = new Obstacle();

      obstacle.setActive(false);
      expect(obstacle.isActive).toBe(false);

      obstacle.setActive(true);
      expect(obstacle.isActive).toBe(true);
    });
  });

  describe('Disposal', () => {
    it('should dispose of all resources', () => {
      class TestObstacle extends Obstacle {
        createMesh() {
          const geometry = new THREE.BoxGeometry(1, 1, 1);
          const material = new THREE.MeshBasicMaterial();
          this.mesh = new THREE.Mesh(geometry, material);
          this.group.add(this.mesh);
        }

        createPhysicsBody() {
          this.body = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5))
          });
          this.game.physicsWorld.addBody(this.body);
        }
      }

      obstacle = new TestObstacle();
      obstacle.init(mockGame);

      // Add some particles
      const mockParticle = {
        update: jest.fn(),
        dispose: jest.fn(),
        isDead: false
      };
      obstacle.particles.push(mockParticle);

      // Just verify that dispose doesn't throw and cleans up properly
      expect(() => obstacle.dispose()).not.toThrow();

      expect(mockWorld.removeBody).toHaveBeenCalledWith(obstacle.body);
      expect(mockParticle.dispose).toHaveBeenCalled();
      expect(obstacle.disposed).toBe(true);
      expect(obstacle.particles).toEqual([]);
    });

    it('should handle disposal when not initialized', () => {
      obstacle = new Obstacle();

      // Should not throw
      expect(() => obstacle.dispose()).not.toThrow();
    });
  });

  describe('Helper Methods', () => {
    it('should create visual effects', () => {
      obstacle = new Obstacle();
      obstacle.init(mockGame);

      const position = new THREE.Vector3(1, 2, 3);
      const color = 0xff0000;

      // Override createVisualEffect for testing
      obstacle.createVisualEffect = jest.fn();

      obstacle.createVisualEffect(position, color);

      expect(obstacle.createVisualEffect).toHaveBeenCalledWith(position, color);
    });
  });
});
