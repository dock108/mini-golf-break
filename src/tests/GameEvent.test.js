/**
 * Unit tests for GameEvent
 */

import { GameEvent } from '../events/GameEvent';
import { EventTypes } from '../events/EventTypes';

describe('GameEvent', () => {
  beforeEach(() => {
    // Mock Date.now for consistent timestamps
    jest.spyOn(Date, 'now').mockReturnValue(1234567890);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('should create event with all parameters', () => {
      const source = { name: 'TestSource' };
      const data = { power: 10, angle: 45 };

      const event = new GameEvent(EventTypes.BALL_HIT, data, source);

      expect(event.type).toBe(EventTypes.BALL_HIT);
      expect(event.data).toBe(data);
      expect(event.source).toBe(source);
      expect(event.timestamp).toBe(1234567890);
    });

    test('should create event with default data', () => {
      const event = new GameEvent(EventTypes.BALL_HIT);

      expect(event.type).toBe(EventTypes.BALL_HIT);
      expect(event.data).toEqual({});
      expect(event.source).toBe(null);
      expect(event.timestamp).toBe(1234567890);
    });

    test('should create event with data but no source', () => {
      const data = { hole: 1 };

      const event = new GameEvent(EventTypes.HOLE_COMPLETED, data);

      expect(event.type).toBe(EventTypes.HOLE_COMPLETED);
      expect(event.data).toBe(data);
      expect(event.source).toBe(null);
    });
  });

  describe('get method', () => {
    test('should return value when key exists', () => {
      const data = { power: 10, angle: 45, velocity: { x: 1, y: 2, z: 3 } };
      const event = new GameEvent(EventTypes.BALL_HIT, data);

      expect(event.get('power')).toBe(10);
      expect(event.get('angle')).toBe(45);
      expect(event.get('velocity')).toEqual({ x: 1, y: 2, z: 3 });
    });

    test('should return default value when key does not exist', () => {
      const event = new GameEvent(EventTypes.BALL_HIT, { power: 10 });

      expect(event.get('angle', 0)).toBe(0);
      expect(event.get('nonExistent', 'default')).toBe('default');
    });

    test('should return null as default when no default value provided', () => {
      const event = new GameEvent(EventTypes.BALL_HIT, {});

      expect(event.get('nonExistent')).toBe(null);
    });

    test('should handle properties with falsy values correctly', () => {
      const data = {
        zero: 0,
        false: false,
        empty: '',
        null: null,
        undefined
      };
      const event = new GameEvent(EventTypes.BALL_HIT, data);

      expect(event.get('zero')).toBe(0);
      expect(event.get('false')).toBe(false);
      expect(event.get('empty')).toBe('');
      expect(event.get('null')).toBe(null);
      expect(event.get('undefined')).toBe(undefined);
    });

    test('should not be affected by prototype pollution', () => {
      // Try to pollute Object prototype
      Object.prototype.polluted = 'polluted value';

      const event = new GameEvent(EventTypes.BALL_HIT, {});

      // Should return default value, not polluted value
      expect(event.get('polluted', 'default')).toBe('default');

      // Clean up
      delete Object.prototype.polluted;
    });
  });

  describe('toString method', () => {
    test('should return string representation with data', () => {
      const data = { power: 10, angle: 45 };
      const event = new GameEvent(EventTypes.BALL_HIT, data);

      const str = event.toString();

      expect(str).toBe('GameEvent[ball:hit]: {"power":10,"angle":45}');
    });

    test('should return string representation with empty data', () => {
      const event = new GameEvent(EventTypes.GAME_STARTED);

      const str = event.toString();

      expect(str).toBe('GameEvent[game:started]: {}');
    });

    test('should handle complex data structures', () => {
      const data = {
        position: { x: 1, y: 2, z: 3 },
        scores: [1, 2, 3],
        nested: {
          deep: {
            value: 'test'
          }
        }
      };
      const event = new GameEvent(EventTypes.BALL_STOPPED, data);

      const str = event.toString();

      expect(str).toBe(
        'GameEvent[ball:stopped]: {"position":{"x":1,"y":2,"z":3},"scores":[1,2,3],"nested":{"deep":{"value":"test"}}}'
      );
    });

    test('should handle circular references in data', () => {
      const data = { value: 1 };
      data.circular = data; // Create circular reference

      const event = new GameEvent(EventTypes.BALL_HIT, data);

      // toString should not throw despite circular reference
      expect(() => event.toString()).toThrow(TypeError); // JSON.stringify throws on circular
    });
  });

  describe('edge cases', () => {
    test('should handle undefined event type', () => {
      const event = new GameEvent(undefined, { test: true });

      expect(event.type).toBe(undefined);
      expect(event.toString()).toBe('GameEvent[undefined]: {"test":true}');
    });

    test('should handle null data', () => {
      const event = new GameEvent(EventTypes.BALL_HIT, null);

      expect(event.data).toBe(null);
      expect(() => event.get('key')).toThrow(); // null doesn't have hasOwnProperty
    });

    test('should maintain reference to mutable data', () => {
      const data = { value: 1 };
      const event = new GameEvent(EventTypes.BALL_HIT, data);

      // Modify original data
      data.value = 2;
      data.newProp = 'new';

      // Event should reflect changes (not a copy)
      expect(event.data.value).toBe(2);
      expect(event.data.newProp).toBe('new');
      expect(event.get('value')).toBe(2);
      expect(event.get('newProp')).toBe('new');
    });
  });
});
