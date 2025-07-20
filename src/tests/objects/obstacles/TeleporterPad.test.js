import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { TeleporterPad } from '../../../objects/obstacles/TeleporterPad';
import { EventTypes } from '../../../events/EventTypes';

describe('TeleporterPad', () => {
  let teleporter;
  let mockGame;
  let mockWorld;
  let mockScene;
  let mockEventManager;

  beforeEach(() => {
    // Mock physics world
    mockWorld = {
      addBody: jest.fn(),
      removeBody: jest.fn()
    };

    // Mock scene
    mockScene = {
      add: jest.fn(),
      remove: jest.fn()
    };

    // Mock event manager
    mockEventManager = {
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    };

    // Mock game
    mockGame = {
      physicsWorld: mockWorld,
      scene: mockScene,
      eventManager: mockEventManager,
      camera: new THREE.PerspectiveCamera()
    };
  });

  afterEach(() => {
    if (teleporter) {
      teleporter.dispose();
    }
  });

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      teleporter = new TeleporterPad();

      expect(teleporter.type).toBe('teleporter');
      expect(teleporter.exitPosition).toEqual(new THREE.Vector3(0, 0, 10));
      expect(teleporter.teleportDelay).toBe(0.5);
      expect(teleporter.cooldownTime).toBe(2);
      expect(teleporter.color).toBe(0x00ffff);
      expect(teleporter.particleColor).toBe(0x00ffff);
      expect(teleporter.particleCount).toBe(50);
    });

    it('should initialize with custom config', () => {
      const config = {
        exitPosition: { x: 5, y: 1, z: 15 },
        teleportDelay: 1,
        cooldownTime: 3,
        color: 0xff00ff,
        particleColor: 0xffff00
      };

      teleporter = new TeleporterPad(config);

      expect(teleporter.exitPosition).toEqual(new THREE.Vector3(5, 1, 15));
      expect(teleporter.teleportDelay).toBe(1);
      expect(teleporter.cooldownTime).toBe(3);
      expect(teleporter.color).toBe(0xff00ff);
      expect(teleporter.particleColor).toBe(0xffff00);
    });
  });

  describe('Mesh Creation', () => {
    it('should create visual components', () => {
      teleporter = new TeleporterPad();
      teleporter.init(mockGame);

      // Check base pad
      expect(teleporter.padMesh).toBeInstanceOf(THREE.Mesh);
      expect(teleporter.padMesh.geometry).toBeInstanceOf(THREE.CylinderGeometry);

      // Check rings
      expect(teleporter.rings).toHaveLength(3);
      teleporter.rings.forEach(ring => {
        expect(ring).toBeInstanceOf(THREE.Mesh);
        expect(ring.geometry).toBeInstanceOf(THREE.TorusGeometry);
      });

      // Check portal plane
      expect(teleporter.portalPlane).toBeInstanceOf(THREE.Mesh);
      expect(teleporter.portalPlane.material.uniforms).toBeDefined();
    });
  });

  describe('Physics Body', () => {
    it('should create trigger body', () => {
      teleporter = new TeleporterPad();
      teleporter.init(mockGame);

      expect(teleporter.body).toBeInstanceOf(CANNON.Body);
      expect(teleporter.body.mass).toBe(0);
      expect(teleporter.body.isTrigger).toBe(true);
      expect(teleporter.body.userData.obstacle).toBe(teleporter);
      expect(teleporter.body.userData.type).toBe('teleporter');
      expect(mockWorld.addBody).toHaveBeenCalledWith(teleporter.body);
    });
  });

  describe('Ball Contact', () => {
    beforeEach(() => {
      teleporter = new TeleporterPad({
        exitPosition: { x: 10, y: 0, z: 20 }
      });
      teleporter.init(mockGame);
    });

    it('should teleport ball after delay', async () => {
      const mockBall = {
        mesh: new THREE.Mesh(),
        getPosition: () => new THREE.Vector3(0, 0, 0),
        setPosition: jest.fn(),
        physics: {
          velocity: new CANNON.Vec3(1, 0, 1)
        }
      };

      const mockBallBody = {
        position: new CANNON.Vec3(0, 0, 0),
        velocity: new CANNON.Vec3(1, 0, 1),
        userData: { ball: mockBall }
      };

      teleporter.onBallContact(mockBallBody);

      // Ball should be marked as teleporting
      expect(teleporter.teleportingBalls.has(mockBall)).toBe(true);

      // Wait for teleport delay
      await new Promise(resolve => setTimeout(resolve, 600));

      // Ball should have been teleported
      expect(mockBall.setPosition).toHaveBeenCalledWith(10, 0.5, 20);
      expect(mockBallBody.position.x).toBe(10);
      expect(mockBallBody.position.y).toBe(0.5);
      expect(mockBallBody.position.z).toBe(20);

      // Event should have been published
      expect(mockEventManager.publish).toHaveBeenCalledWith(EventTypes.OBSTACLE_ACTIVATED, {
        obstacle: teleporter,
        type: 'teleporter',
        ball: mockBall,
        from: expect.any(Object),
        to: expect.any(Object)
      });
    });

    it('should respect cooldown period', () => {
      const mockBall = {
        mesh: new THREE.Mesh(),
        getPosition: () => new THREE.Vector3(0, 0, 0),
        setPosition: jest.fn()
      };

      const mockBallBody = {
        userData: { ball: mockBall }
      };

      // First contact
      teleporter.onBallContact(mockBallBody);
      expect(teleporter.teleportingBalls.has(mockBall)).toBe(true);

      // Second contact (should be ignored due to cooldown)
      teleporter.teleportingBalls.delete(mockBall);
      teleporter.cooldownBalls.add(mockBall);
      teleporter.onBallContact(mockBallBody);
      expect(teleporter.teleportingBalls.has(mockBall)).toBe(false);
    });
  });

  describe('Animation', () => {
    it('should update portal animation', () => {
      teleporter = new TeleporterPad();
      teleporter.init(mockGame);

      const initialTime = teleporter.portalPlane.material.uniforms.time.value;

      teleporter.updateAnimation(0.016);

      expect(teleporter.portalPlane.material.uniforms.time.value).toBeGreaterThan(initialTime);
    });

    it('should rotate rings', () => {
      teleporter = new TeleporterPad();
      teleporter.init(mockGame);

      const initialRotations = teleporter.rings.map(ring => ring.rotation.z);

      teleporter.updateAnimation(0.016);

      teleporter.rings.forEach((ring, index) => {
        expect(ring.rotation.z).not.toBe(initialRotations[index]);
      });
    });

    it('should update particles', () => {
      teleporter = new TeleporterPad();
      teleporter.init(mockGame);

      // Create teleport effect to generate particles
      teleporter.createTeleportEffect(new THREE.Vector3(0, 0, 0));

      const particleCount = teleporter.particles.length;
      expect(particleCount).toBeGreaterThan(0);

      // Update animation
      teleporter.updateAnimation(0.016);

      // Particles should have been updated
      teleporter.particles.forEach(particle => {
        if (particle.update) {
          expect(particle.life).toBeLessThan(1);
        }
      });
    });
  });

  describe('Visual Effects', () => {
    it('should create entrance portal effect', () => {
      teleporter = new TeleporterPad();
      teleporter.init(mockGame);

      const position = new THREE.Vector3(1, 2, 3);
      teleporter.createEntrancePortal(position);

      // Should have added particles
      expect(teleporter.particles.length).toBeGreaterThan(0);

      // Check particles are added to scene
      const addedMeshes = mockScene.add.mock.calls
        .map(call => call[0])
        .filter(obj => obj.type === 'Mesh' && obj.material.color);

      expect(addedMeshes.length).toBeGreaterThan(0);
    });

    it('should create exit portal effect', () => {
      teleporter = new TeleporterPad();
      teleporter.init(mockGame);

      const position = new THREE.Vector3(10, 0, 20);
      teleporter.createExitPortal(position);

      // Should have added particles
      expect(teleporter.particles.length).toBeGreaterThan(0);
    });
  });

  describe('Disposal', () => {
    it('should clean up all resources', () => {
      teleporter = new TeleporterPad();
      teleporter.init(mockGame);

      // Create some particles
      teleporter.createTeleportEffect(new THREE.Vector3(0, 0, 0));

      const padGeometryDispose = jest.spyOn(teleporter.padMesh.geometry, 'dispose');
      const padMaterialDispose = jest.spyOn(teleporter.padMesh.material, 'dispose');
      const portalGeometryDispose = jest.spyOn(teleporter.portalPlane.geometry, 'dispose');
      const portalMaterialDispose = jest.spyOn(teleporter.portalPlane.material, 'dispose');

      teleporter.dispose();

      expect(padGeometryDispose).toHaveBeenCalled();
      expect(padMaterialDispose).toHaveBeenCalled();
      expect(portalGeometryDispose).toHaveBeenCalled();
      expect(portalMaterialDispose).toHaveBeenCalled();
      expect(mockWorld.removeBody).toHaveBeenCalledWith(teleporter.body);
      expect(teleporter.teleportingBalls.size).toBe(0);
      expect(teleporter.cooldownBalls.size).toBe(0);
    });
  });
});
