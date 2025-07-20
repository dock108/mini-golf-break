import { describe, it, expect, beforeEach } from '@jest/globals';
import { ObstacleRegistry } from '../../../objects/obstacles/ObstacleRegistry';
import { Obstacle } from '../../../objects/obstacles/Obstacle';
import { TeleporterPad } from '../../../objects/obstacles/TeleporterPad';
import { SpeedBoostStrip } from '../../../objects/obstacles/SpeedBoostStrip';

describe('ObstacleRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new ObstacleRegistry();
  });

  describe('Registration', () => {
    it('should register obstacle types', () => {
      class CustomObstacle extends Obstacle {}

      registry.register('custom', CustomObstacle);

      expect(registry.getTypes()).toContain('custom');
    });

    it('should throw error when registering invalid type', () => {
      expect(() => registry.register(null, Obstacle)).toThrow(
        'Type and class are required for registration'
      );
      expect(() => registry.register('', Obstacle)).toThrow(
        'Type and class are required for registration'
      );
    });

    it('should throw error when registering invalid class', () => {
      expect(() => registry.register('test', null)).toThrow(
        'Type and class are required for registration'
      );
      expect(() => registry.register('test')).toThrow(
        'Type and class are required for registration'
      );
    });

    it('should override existing registration', () => {
      class ObstacleV1 extends Obstacle {}
      class ObstacleV2 extends Obstacle {}

      registry.register('test', ObstacleV1);
      registry.register('test', ObstacleV2);

      const config = { type: 'test' };
      const instance = registry.create(config);

      expect(instance).toBeInstanceOf(ObstacleV2);
    });
  });

  describe('Creation', () => {
    it('should create registered obstacle types', () => {
      registry.register('teleporter', TeleporterPad);

      const config = { id: 'test-teleporter', type: 'teleporter' };
      const obstacle = registry.create(config);

      expect(obstacle).toBeInstanceOf(TeleporterPad);
      expect(obstacle.id).toBe('test-teleporter');
    });

    it('should throw error for unregistered type', () => {
      expect(() => registry.create({ type: 'unknown' })).toThrow('Unknown obstacle type: unknown');
    });

    it('should pass config to obstacle constructor', () => {
      registry.register('speedboost', SpeedBoostStrip);

      const config = {
        id: 'boost-1',
        type: 'speedboost',
        boostDirection: { x: 0, y: 0, z: 1 },
        boostMagnitude: 10
      };

      const obstacle = registry.create(config);

      expect(obstacle.id).toBe('boost-1');
      expect(obstacle.boostDirection).toBeDefined();
      expect(obstacle.boostMagnitude).toBe(10);
    });
  });

  describe('Type Management', () => {
    it('should return all registered types', () => {
      registry.register('type1', Obstacle);
      registry.register('type2', Obstacle);
      registry.register('type3', Obstacle);

      const types = registry.getTypes();

      expect(types).toHaveLength(3);
      expect(types).toContain('type1');
      expect(types).toContain('type2');
      expect(types).toContain('type3');
    });

    it('should return empty array when no types registered', () => {
      expect(registry.getTypes()).toEqual([]);
    });

    it('should check if type is registered', () => {
      registry.register('teleporter', TeleporterPad);

      expect(registry.has('teleporter')).toBe(true);
      expect(registry.has('unknown')).toBe(false);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = ObstacleRegistry.getInstance();
      const instance2 = ObstacleRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});
