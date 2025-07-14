import { Ball } from '../objects/Ball';

// Mock Cannon-es classes
jest.mock('cannon-es', () => ({
  Body: jest.fn(() => ({
    position: {
      x: 0,
      y: 0,
      z: 0,
      copy: jest.fn(),
      set: jest.fn(function (x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
      })
    },
    velocity: {
      x: 0,
      y: 0,
      z: 0,
      set: jest.fn(function (x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
      }),
      lengthSquared: jest.fn(() => 0)
    },
    force: {
      x: 0,
      y: 0,
      z: 0,
      set: jest.fn(function (x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
      })
    },
    torque: {
      x: 0,
      y: 0,
      z: 0,
      set: jest.fn(function (x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
      })
    },
    angularVelocity: {
      x: 0,
      y: 0,
      z: 0,
      set: jest.fn(function (x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
      }),
      lengthSquared: jest.fn(() => 0)
    },
    quaternion: { x: 0, y: 0, z: 0, w: 1 },
    linearDamping: 0,
    angularDamping: 0,
    material: {},
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    applyForce: jest.fn(),
    applyImpulse: jest.fn(),
    wakeUp: jest.fn()
  })),
  Sphere: jest.fn(),
  Vec3: jest.fn((x, y, z) => ({ x, y, z })),
  Material: jest.fn(() => ({}))
}));

// Mock Three.js classes
jest.mock('three', () => ({
  SphereGeometry: jest.fn(),
  MeshStandardMaterial: jest.fn(() => ({
    color: { setHex: jest.fn() },
    emissive: { setHex: jest.fn() },
    roughness: 0.3,
    metalness: 0.2,
    map: null,
    bumpMap: null,
    dispose: jest.fn()
  })),
  Mesh: jest.fn(() => ({
    position: { x: 0, y: 0, z: 0, copy: jest.fn(), set: jest.fn() },
    quaternion: { x: 0, y: 0, z: 0, w: 1, copy: jest.fn() },
    rotation: { x: 0, y: 0, z: 0 },
    castShadow: false,
    receiveShadow: false,
    geometry: { dispose: jest.fn() },
    material: { dispose: jest.fn() }
  })),
  Vector3: jest.fn(() => ({
    x: 0,
    y: 0,
    z: 0,
    set: jest.fn(),
    copy: jest.fn(),
    multiplyScalar: jest.fn(),
    lengthSquared: jest.fn(() => 0)
  })),
  Group: jest.fn(() => ({
    add: jest.fn(),
    remove: jest.fn()
  })),
  TextureLoader: jest.fn(() => ({
    load: jest.fn()
  })),
  CanvasTexture: jest.fn(() => ({
    needsUpdate: true
  })),
  PointLight: jest.fn(() => ({
    position: { x: 0, y: 0, z: 0, copy: jest.fn() },
    castShadow: false
  }))
}));

// Mock the physics world
const mockPhysicsWorld = {
  addBody: jest.fn(),
  removeBody: jest.fn(),
  addEventListener: jest.fn(),
  ballMaterial: {} // Add this for the physics material
};

describe('Ball', () => {
  let ball;
  let mockScene;
  let mockGame;

  beforeEach(() => {
    // Set up DOM environment for Ball texture creation
    if (!global.document) {
      global.document = {};
    }

    // Mock DOM elements for canvas texture creation
    global.document.createElement = jest.fn(tag => {
      if (tag === 'canvas') {
        return {
          width: 512,
          height: 512,
          getContext: jest.fn(() => ({
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 1,
            beginPath: jest.fn(),
            arc: jest.fn(),
            fill: jest.fn(),
            stroke: jest.fn(),
            setTransform: jest.fn(),
            createRadialGradient: jest.fn(() => ({
              addColorStop: jest.fn()
            })),
            fillRect: jest.fn(),
            getImageData: jest.fn(() => ({
              data: new Uint8ClampedArray(512 * 512 * 4)
            })),
            putImageData: jest.fn()
          }))
        };
      }
      return {};
    });

    mockScene = {
      add: jest.fn(),
      remove: jest.fn()
    };

    mockGame = {
      debugManager: {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      },
      physicsManager: {
        world: mockPhysicsWorld,
        getWorld: jest.fn(() => mockPhysicsWorld)
      },
      eventManager: {
        publish: jest.fn()
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
    expect(ball.mesh).toBeDefined();
    expect(ball.body).toBeDefined();
    expect(ball.radius).toBe(0.2);
    expect(ball.mass).toBe(1);
    expect(ball.isBallActive).toBe(true);
  });

  test('should apply force correctly', () => {
    const direction = { x: 1, y: 0, z: 0 };
    const power = 10;

    ball.applyForce(direction, power);

    expect(ball.body.applyImpulse).toHaveBeenCalled();
  });

  test('should handle position updates', () => {
    ball.setPosition(5, 2, 3);

    expect(ball.body.position.set).toHaveBeenCalledWith(5, 2, 3);
  });

  test('should detect when ball is stopped', () => {
    // Mock velocity for stopped state (below threshold)
    ball.body.velocity = { x: 0.01, y: 0.01, z: 0.01 }; // Below 0.15 threshold
    ball.body.angularVelocity = { x: 0.01, y: 0.01, z: 0.01 };
    expect(ball.isStopped()).toBe(true);

    // Mock velocity for moving state (above threshold)
    ball.body.velocity = { x: 1.0, y: 0.5, z: 0.8 }; // Above 0.15 threshold
    ball.body.angularVelocity = { x: 0.5, y: 0.3, z: 0.2 };
    expect(ball.isStopped()).toBe(false);
  });

  test('should cleanup resources properly', () => {
    const removeSpy = jest.spyOn(mockScene, 'remove');
    const removeBodySpy = jest.spyOn(mockPhysicsWorld, 'removeBody');

    ball.cleanup();

    // Check that cleanup methods were called (they clean up internal resources)
    expect(removeSpy).toHaveBeenCalled();
    expect(removeBodySpy).toHaveBeenCalled();
  });
});
