import { Ball } from '../objects/Ball';

// Mock the physics world
const mockPhysicsWorld = {
  addBody: jest.fn(),
  removeBody: jest.fn(),
  createSphereBody: jest.fn(() => ({
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
    linearDamping: 0,
    angularDamping: 0,
    material: {},
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }))
};

describe('Ball', () => {
  let ball;
  let mockScene;
  let mockGame;

  beforeEach(() => {
    mockScene = {
      add: jest.fn(),
      remove: jest.fn()
    };

    mockGame = {
      debugManager: {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      }
    };

    ball = new Ball(mockScene, mockPhysicsWorld, mockGame);
  });

  afterEach(() => {
    if (ball) {
      ball.cleanup();
    }
  });

  test('should initialize with correct default properties', () => {
    expect(ball.isInitialized).toBe(true);
    expect(ball.mesh).toBeDefined();
    expect(ball.body).toBeDefined();
  });

  test('should apply force correctly', () => {
    const direction = { x: 1, y: 0, z: 0 };
    const power = 10;

    ball.body.applyImpulse = jest.fn();
    ball.applyForce(direction, power);

    expect(ball.body.applyImpulse).toHaveBeenCalled();
  });

  test('should handle position updates', () => {
    const newPosition = { x: 5, y: 2, z: 3 };
    ball.setPosition(newPosition);

    expect(ball.mesh.position.x).toBe(newPosition.x);
    expect(ball.mesh.position.y).toBe(newPosition.y);
    expect(ball.mesh.position.z).toBe(newPosition.z);
  });

  test('should detect when ball is moving', () => {
    ball.body.velocity = { x: 0, y: 0, z: 0 };
    expect(ball.isMoving()).toBe(false);

    ball.body.velocity = { x: 1, y: 0, z: 0 };
    expect(ball.isMoving()).toBe(true);
  });

  test('should cleanup resources properly', () => {
    const removeSpy = jest.spyOn(mockScene, 'remove');
    const removeBodySpy = jest.spyOn(mockPhysicsWorld, 'removeBody');

    ball.cleanup();

    expect(removeSpy).toHaveBeenCalledWith(ball.mesh);
    expect(removeBodySpy).toHaveBeenCalledWith(ball.body);
  });
});
