import { EventManager } from '../managers/EventManager';
import { EventTypes } from '../events/EventTypes';

describe('EventManager', () => {
  let eventManager;
  let mockGame;

  beforeEach(() => {
    mockGame = {
      debugManager: {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      }
    };
    eventManager = new EventManager(mockGame);
  });

  afterEach(() => {
    eventManager.cleanup();
  });

  test('should subscribe and publish events correctly', () => {
    const mockCallback = jest.fn();
    const testData = { message: 'test' };

    eventManager.subscribe(EventTypes.BALL_HIT, mockCallback);
    eventManager.publish(EventTypes.BALL_HIT, testData);

    expect(mockCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: EventTypes.BALL_HIT,
        data: testData
      })
    );
  });

  test('should handle multiple subscribers', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    eventManager.subscribe(EventTypes.BALL_HIT, callback1);
    eventManager.subscribe(EventTypes.BALL_HIT, callback2);
    eventManager.publish(EventTypes.BALL_HIT, { test: true });

    expect(callback1).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
  });

  test('should unsubscribe correctly', () => {
    const mockCallback = jest.fn();

    const unsubscribe = eventManager.subscribe(EventTypes.BALL_HIT, mockCallback);
    unsubscribe();
    eventManager.publish(EventTypes.BALL_HIT, {});

    expect(mockCallback).not.toHaveBeenCalled();
  });

  test('should handle error in event listener gracefully', () => {
    const errorCallback = jest.fn(() => {
      throw new Error('Test error');
    });
    const normalCallback = jest.fn();

    eventManager.subscribe(EventTypes.BALL_HIT, errorCallback);
    eventManager.subscribe(EventTypes.BALL_HIT, normalCallback);

    expect(() => {
      eventManager.publish(EventTypes.BALL_HIT, {});
    }).not.toThrow();

    expect(normalCallback).toHaveBeenCalled();
  });
});
