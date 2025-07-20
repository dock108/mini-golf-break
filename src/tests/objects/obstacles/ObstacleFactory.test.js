import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as THREE from 'three';
import { ObstacleFactory } from '../../../objects/obstacles/ObstacleFactory';
import { ObstacleRegistry } from '../../../objects/obstacles/ObstacleRegistry';
import { TeleporterPad } from '../../../objects/obstacles/TeleporterPad';
import { SpeedBoostStrip } from '../../../objects/obstacles/SpeedBoostStrip';

describe('ObstacleFactory', () => {
  let factory;
  let mockGame;
  let mockScene;
  let mockWorld;
  let mockEventManager;
  let registry;

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

    // Get registry and register test obstacles
    registry = ObstacleRegistry.getInstance();
    registry.register('teleporter', TeleporterPad);
    registry.register('speedboost', SpeedBoostStrip);

    factory = new ObstacleFactory(mockGame);
  });

  afterEach(() => {
    factory.disposeAll();
  });

  describe('Constructor', () => {
    it('should initialize with game reference', () => {
      expect(factory.game).toBe(mockGame);
      expect(factory.obstacles).toBeInstanceOf(Map);
      expect(factory.obstacles.size).toBe(0);
    });
  });

  describe('Create Obstacle', () => {
    it('should create and initialize obstacle', () => {
      const config = {
        id: 'teleporter-1',
        exitPosition: { x: 10, y: 0, z: 10 }
      };

      const obstacle = factory.createObstacle('teleporter', config);

      expect(obstacle).toBeInstanceOf(TeleporterPad);
      expect(obstacle.id).toBe('teleporter-1');
      expect(obstacle.game).toBe(mockGame);
      expect(mockScene.add).toHaveBeenCalledWith(obstacle.group);
      expect(factory.obstacles.has('teleporter-1')).toBe(true);
    });

    it('should handle creation without explicit id', () => {
      const config = {
        exitPosition: { x: 10, y: 0, z: 10 }
      };

      const obstacle = factory.createObstacle('teleporter', config);

      expect(obstacle.id).toMatch(/^obstacle_[a-z0-9]+$/);
      expect(factory.obstacles.has(obstacle.id)).toBe(true);
    });

    it('should return null for unknown type', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const obstacle = factory.createObstacle('unknown', {});

      expect(obstacle).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create obstacle'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle creation errors gracefully', () => {
      // Mock registry to throw error
      registry.create = jest.fn().mockImplementation(() => {
        throw new Error('Creation failed');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const obstacle = factory.createObstacle('teleporter', {});

      expect(obstacle).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Get Obstacle', () => {
    it('should retrieve obstacle by id', () => {
      const obstacle = factory.createObstacle('teleporter', { id: 'test-1' });

      expect(factory.getObstacle('test-1')).toBe(obstacle);
    });

    it('should return undefined for non-existent id', () => {
      expect(factory.getObstacle('non-existent')).toBeUndefined();
    });
  });

  describe('Remove Obstacle', () => {
    it('should remove and dispose obstacle', () => {
      const obstacle = factory.createObstacle('speedboost', { id: 'boost-1' });
      const disposeSpy = jest.spyOn(obstacle, 'dispose');

      factory.removeObstacle('boost-1');

      expect(disposeSpy).toHaveBeenCalled();
      expect(mockScene.remove).toHaveBeenCalledWith(obstacle.group);
      expect(factory.obstacles.has('boost-1')).toBe(false);
    });

    it('should handle removal of non-existent obstacle', () => {
      // Should not throw
      expect(() => factory.removeObstacle('non-existent')).not.toThrow();
    });
  });

  describe('Update', () => {
    it('should update all active obstacles', () => {
      const obstacle1 = factory.createObstacle('teleporter', { id: 'obs-1' });
      const obstacle2 = factory.createObstacle('speedboost', { id: 'obs-2' });

      obstacle1.update = jest.fn();
      obstacle2.update = jest.fn();

      factory.update(0.016);

      expect(obstacle1.update).toHaveBeenCalledWith(0.016);
      expect(obstacle2.update).toHaveBeenCalledWith(0.016);
    });

    it('should handle obstacles without update method', () => {
      const obstacle = factory.createObstacle('teleporter', { id: 'obs-1' });
      obstacle.update = undefined;

      // Should not throw
      expect(() => factory.update(0.016)).not.toThrow();
    });
  });

  describe('Dispose All', () => {
    it('should dispose all obstacles', () => {
      const obstacle1 = factory.createObstacle('teleporter', { id: 'obs-1' });
      const obstacle2 = factory.createObstacle('speedboost', { id: 'obs-2' });

      const dispose1Spy = jest.spyOn(obstacle1, 'dispose');
      const dispose2Spy = jest.spyOn(obstacle2, 'dispose');

      factory.disposeAll();

      expect(dispose1Spy).toHaveBeenCalled();
      expect(dispose2Spy).toHaveBeenCalled();
      expect(mockScene.remove).toHaveBeenCalledTimes(2);
      expect(factory.obstacles.size).toBe(0);
    });
  });

  describe('Integration', () => {
    it('should handle complete obstacle lifecycle', () => {
      // Create
      const config = {
        id: 'lifecycle-test',
        boostDirection: { x: 0, y: 0, z: 1 },
        boostMagnitude: 10
      };

      const obstacle = factory.createObstacle('speedboost', config);
      expect(factory.obstacles.size).toBe(1);
      expect(mockScene.add).toHaveBeenCalledWith(obstacle.group);

      // Update
      obstacle.update = jest.fn();
      factory.update(0.016);
      expect(obstacle.update).toHaveBeenCalled();

      // Remove
      const disposeSpy = jest.spyOn(obstacle, 'dispose');
      factory.removeObstacle('lifecycle-test');
      expect(disposeSpy).toHaveBeenCalled();
      expect(mockScene.remove).toHaveBeenCalledWith(obstacle.group);
      expect(factory.obstacles.size).toBe(0);
    });
  });
});
