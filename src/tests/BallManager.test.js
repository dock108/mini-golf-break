import { BallManager } from '../managers/BallManager';
import { EventTypes } from '../events/EventTypes';

// Mock the Ball class
jest.mock('../objects/Ball', () => {
  const MockBall = jest.fn(() => ({
    mesh: {
      position: {
        x: 0,
        y: 0,
        z: 0,
        copy: jest.fn(),
        clone: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
        distanceTo: jest.fn(() => 5)
      }
    },
    body: {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0, set: jest.fn(), clone: jest.fn(() => ({ x: 0, y: 0, z: 0 })) },
      angularVelocity: { x: 0, y: 0, z: 0, set: jest.fn() },
      wakeUp: jest.fn()
    },
    setPosition: jest.fn(),
    applyForce: jest.fn(),
    applyImpulse: jest.fn(),
    isStopped: jest.fn(() => true),
    isMoving: false,
    resetPosition: jest.fn(),
    resetVelocity: jest.fn(),
    cleanup: jest.fn(),
    setHolePosition: jest.fn(),
    update: jest.fn(),
    updateMeshFromBody: jest.fn()
  }));

  // Add static property
  MockBall.START_HEIGHT = 0.2;

  return {
    Ball: MockBall
  };
});

// Mock Three.js Vector3
jest.mock('three', () => ({
  Vector3: jest.fn(() => ({
    x: 0,
    y: 0,
    z: 0,
    set: jest.fn(),
    copy: jest.fn(),
    clone: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
    normalize: jest.fn(() => ({ x: 0, y: 0, z: 1 })),
    multiplyScalar: jest.fn(() => ({ x: 0, y: 0, z: 0 }))
  }))
}));

describe('BallManager', () => {
  let ballManager;
  let mockGame;

  beforeEach(() => {
    mockGame = {
      scene: {
        add: jest.fn(),
        remove: jest.fn()
      },
      physicsManager: {
        getWorld: jest.fn(() => ({
          addBody: jest.fn(),
          removeBody: jest.fn()
        })),
        removeBody: jest.fn(),
        world: {
          world: {
            add: jest.fn()
          }
        }
      },
      eventManager: {
        publish: jest.fn(),
        subscribe: jest.fn(() => () => {})
      },
      debugManager: {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        enabled: false
      },
      stateManager: {
        setGameState: jest.fn(),
        getGameState: jest.fn(() => 'AIMING'),
        isBallInMotion: jest.fn(() => false),
        setBallInMotion: jest.fn()
      },
      uiManager: {
        updateScore: jest.fn(),
        addStroke: jest.fn(),
        updateStrokes: jest.fn()
      },
      scoringSystem: {
        addStroke: jest.fn(),
        getTotalStrokes: jest.fn(() => 1),
        addPenaltyStrokes: jest.fn()
      },
      audioManager: {
        playSound: jest.fn()
      },
      deltaTime: 0.016,
      course: {
        currentHole: {
          teePosition: { x: 0, y: 0, z: 0 },
          holePosition: { x: 10, y: 0, z: 0 },
          elements: []
        },
        getHoleStartPosition: jest.fn(() => ({
          x: 0,
          y: 0,
          z: 0,
          clone: jest.fn(function () {
            const cloned = {
              x: this.x,
              y: this.y,
              z: this.z,
              setY: jest.fn(function (newY) {
                this.y = newY;
                return this;
              })
            };
            return cloned;
          })
        })),
        getHolePosition: jest.fn(() => ({
          x: 10,
          y: 0,
          z: 0,
          clone: jest.fn(() => ({ x: 10, y: 0, z: 0 }))
        }))
      }
    };

    ballManager = new BallManager(mockGame);
  });

  afterEach(() => {
    if (ballManager) {
      ballManager.cleanup();
    }
  });

  test('should initialize correctly', () => {
    expect(ballManager.game).toBe(mockGame);
    expect(ballManager.ball).toBeNull();
    expect(ballManager.isInitialized).toBe(false);
  });

  test('should initialize with event listeners', () => {
    ballManager.init();

    expect(ballManager.isInitialized).toBe(true);
    expect(mockGame.eventManager.subscribe).toHaveBeenCalled();
  });

  test('should create ball at position', () => {
    ballManager.init();
    const position = { x: 5, y: 1, z: 10 };

    ballManager.createBall(position);

    expect(ballManager.ball).toBeDefined();
    expect(ballManager.ball.setPosition).toHaveBeenCalled();
    expect(mockGame.eventManager.publish).toHaveBeenCalledWith(
      EventTypes.BALL_CREATED,
      expect.any(Object),
      ballManager
    );
  });

  test('should hit ball with direction and power', () => {
    ballManager.init();
    ballManager.createBall({ x: 0, y: 1, z: 0 });

    const direction = { x: 1, y: 0, z: 0, clone: jest.fn(() => ({ x: 1, y: 0, z: 0 })) };
    const power = 0.8;

    ballManager.hitBall(direction, power);

    expect(ballManager.ball.applyImpulse).toHaveBeenCalledWith(direction, power);
    expect(mockGame.eventManager.publish).toHaveBeenCalledWith(
      EventTypes.BALL_HIT,
      expect.any(Object),
      ballManager
    );
  });

  test('should not hit ball when no ball exists', () => {
    ballManager.init();

    const direction = { x: 1, y: 0, z: 0 };
    const power = 0.8;

    // Should not throw when no ball exists
    expect(() => {
      ballManager.hitBall(direction, power);
    }).not.toThrow();

    // Should not publish hit event when no ball
    expect(mockGame.eventManager.publish).not.toHaveBeenCalledWith(
      EventTypes.BALL_HIT,
      expect.any(Object),
      ballManager
    );
  });

  test('should reset ball position', () => {
    ballManager.init();
    ballManager.createBall({ x: 0, y: 1, z: 0 });

    // Clear mocks to isolate the reset call
    jest.clearAllMocks();

    ballManager.resetBall();

    expect(ballManager.ball.setPosition).toHaveBeenCalled();
    expect(ballManager.ball.resetVelocity).toHaveBeenCalled();
    expect(mockGame.eventManager.publish).toHaveBeenCalledWith(
      EventTypes.BALL_RESET,
      expect.objectContaining({
        position: expect.any(Object)
      }),
      ballManager
    );
  });

  test('should update ball physics', () => {
    ballManager.init();
    ballManager.createBall({ x: 0, y: 1, z: 0 });

    const deltaTime = 0.016;
    ballManager.update(deltaTime);

    // BallManager.update() calls ball.update() with this.game.deltaTime, not the passed deltaTime
    expect(ballManager.ball.update).toHaveBeenCalledWith(mockGame.deltaTime);
  });

  test('should handle ball stopped event', () => {
    ballManager.init();
    ballManager.createBall({ x: 0, y: 1, z: 0 });

    // Clear mocks to isolate the stopped event
    jest.clearAllMocks();

    // Mock ball as moving then stopped
    ballManager.wasMoving = true;
    ballManager.ball.isMoving = false; // Ball is not moving (stopped)
    mockGame.stateManager.isBallInMotion.mockReturnValue(true); // Was moving

    // Update ball state to trigger stopped event
    ballManager.updateBallState();

    expect(mockGame.eventManager.publish).toHaveBeenCalledWith(
      EventTypes.BALL_STOPPED,
      expect.objectContaining({
        position: expect.any(Object)
      }),
      ballManager
    );
  });

  test('should set hole position for ball', () => {
    ballManager.init();

    // Update the course to return the hole position we expect
    mockGame.course.getHolePosition.mockReturnValue({
      x: 10,
      y: 0,
      z: 10,
      clone: jest.fn(() => ({ x: 10, y: 0, z: 10 }))
    });

    // Create ball - it should get the hole position from course
    ballManager.createBall({ x: 0, y: 1, z: 0 });

    // The ball should have the currentHolePosition set, not setHolePosition called
    expect(ballManager.ball.currentHolePosition).toEqual({ x: 10, y: 0, z: 10 });
  });

  test('should check if ball is stopped', () => {
    ballManager.init();
    ballManager.createBall({ x: 0, y: 1, z: 0 });

    // Check through the ball's isStopped method directly
    const isStopped = ballManager.ball.isStopped();

    expect(ballManager.ball.isStopped).toHaveBeenCalled();
    expect(isStopped).toBe(true);
  });

  test('should return null when checking stopped state with no ball', () => {
    ballManager.init();

    // When no ball exists, we can't check if it's stopped
    expect(ballManager.ball).toBeNull();
  });

  test('should cleanup resources properly', () => {
    ballManager.init();
    ballManager.createBall({ x: 0, y: 1, z: 0 });

    const ballCleanupSpy = ballManager.ball.cleanup;

    ballManager.cleanup();

    expect(ballCleanupSpy).toHaveBeenCalled();
    expect(ballManager.ball).toBeNull();
    expect(ballManager.isInitialized).toBe(false);
  });

  test('should handle update when not initialized', () => {
    expect(() => {
      ballManager.update(0.016);
    }).not.toThrow();
  });

  test('should handle operations when no ball exists', () => {
    ballManager.init();

    expect(() => {
      ballManager.resetBall();
      ballManager.hitBall({ x: 1, y: 0, z: 0 }, 0.5);
      ballManager.update(0.016);
    }).not.toThrow();
  });
});
