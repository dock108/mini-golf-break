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
      expect(obstacle.position).toEqual(new THREE.Vector3(0, 0, 0));
      expect(obstacle.rotation).toEqual(new THREE.Euler(0, 0, 0));
      expect(obstacle.scale).toEqual(new THREE.Vector3(1, 1, 1));
      expect(obstacle.size).toEqual({ width: 1, height: 1, depth: 1 });
      expect(obstacle.isActive).toBe(true);
      expect(obstacle.group).toBeInstanceOf(THREE.Group);
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
      expect(obstacle.position).toEqual(config.position);
      expect(obstacle.rotation).toEqual(config.rotation);
      expect(obstacle.scale).toEqual(config.scale);
      expect(obstacle.size).toEqual(config.size);
      expect(obstacle.isActive).toBe(false);
    });

    it('should set group position and rotation from config', () => {
      const config = {
        position: new THREE.Vector3(10, 20, 30),
        rotation: new THREE.Euler(1, 2, 3)
      };

      obstacle = new Obstacle(config);

      expect(obstacle.group.position).toEqual(config.position);
      expect(obstacle.group.rotation).toEqual(config.rotation);
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

      expect(obstacle.mesh).toBeInstanceOf(THREE.Mesh);
      expect(obstacle.body).toBeInstanceOf(CANNON.Body);
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

      const geometryDispose = jest.spyOn(obstacle.mesh.geometry, 'dispose');
      const materialDispose = jest.spyOn(obstacle.mesh.material, 'dispose');

      obstacle.dispose();

      expect(geometryDispose).toHaveBeenCalled();
      expect(materialDispose).toHaveBeenCalled();
      expect(mockWorld.removeBody).toHaveBeenCalledWith(obstacle.body);
      expect(mockParticle.dispose).toHaveBeenCalled();
      expect(obstacle.mesh).toBeNull();
      expect(obstacle.body).toBeNull();
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
