/**
 * Integration tests for PhysicsManager and BallManager
 * Tests the interaction between physics engine and ball behavior
 */

import { PhysicsManager } from '../../managers/PhysicsManager';
import { BallManager } from '../../managers/BallManager';
import { EventManager } from '../../managers/EventManager';
import { StateManager } from '../../managers/StateManager';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

describe('Physics and Ball Integration', () => {
  let game;
  let physicsManager;
  let ballManager;
  let eventManager;
  let stateManager;
  let scene;

  beforeEach(() => {
    // Create minimal game mock with required dependencies
    scene = new THREE.Scene();

    // Create game mock first
    game = {
      scene,
      debugManager: {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        enabled: false
      },
      course: {
        currentHole: {
          teePosition: { x: 0, y: 0, z: 0 },
          holePosition: { x: 10, y: 0, z: 0 }
        },
        getHoleStartPosition: jest.fn(() => new THREE.Vector3(0, 0, 0)),
        getHolePosition: jest.fn(() => new THREE.Vector3(10, 0, 0))
      }
    };

    // Initialize managers with game reference
    eventManager = new EventManager(game);
    eventManager.init();

    stateManager = new StateManager(game);

    // Add managers to game object
    game.eventManager = eventManager;
    game.stateManager = stateManager;

    // Initialize managers
    physicsManager = new PhysicsManager(game);
    physicsManager.init();

    // Add physicsManager to game object
    game.physicsManager = physicsManager;

    ballManager = new BallManager(game);
    ballManager.init();
  });

  afterEach(() => {
    // Cleanup
    if (physicsManager) {
      physicsManager.cleanup();
    }
    jest.clearAllMocks();
  });

  test('should create ball with physics body correctly synchronized', async () => {
    // Create ball at specific position
    const startPosition = { x: 0, y: 1, z: -5 };
    const ball = await ballManager.createBall(startPosition);

    // Verify ball was created
    expect(ball).toBeDefined();
    expect(ball.mesh).toBeDefined();
    expect(ball.body).toBeDefined();

    // Verify physics body exists in world
    expect(physicsManager.getWorld().world.bodies).toContain(ball.body);

    // Verify ball has valid positions (Ball may adjust position internally)
    expect(ball.mesh.position.x).toBeDefined();
    expect(ball.mesh.position.y).toBeGreaterThan(0); // Should be elevated above ground
    expect(ball.mesh.position.z).toBeDefined();

    expect(ball.body.position.x).toBeDefined();
    expect(ball.body.position.y).toBeGreaterThan(0); // Should be elevated above ground
    expect(ball.body.position.z).toBeDefined();

    // Mesh and body should be synchronized
    expect(ball.mesh.position.x).toBeCloseTo(ball.body.position.x);
    expect(ball.mesh.position.y).toBeCloseTo(ball.body.position.y);
    expect(ball.mesh.position.z).toBeCloseTo(ball.body.position.z);
  });

  test('should apply impulse and update positions correctly', async () => {
    // Create ball
    const ball = await ballManager.createBall({ x: 0, y: 1, z: 0 });

    // Apply impulse using Ball's method
    const direction = new THREE.Vector3(1, 0, 0);
    const power = 0.8;
    ball.applyImpulse(direction, power);

    // Simulate physics steps
    for (let i = 0; i < 10; i++) {
      physicsManager.update(16); // 60fps
      ball.update(16); // Update ball which should sync mesh with body
    }

    // Ball should have moved in X direction
    expect(ball.mesh.position.x).toBeGreaterThan(0);
    expect(ball.body.position.x).toBeGreaterThan(0);

    // Mesh and body should stay synchronized
    expect(ball.mesh.position.x).toBeCloseTo(ball.body.position.x);
    expect(ball.mesh.position.y).toBeCloseTo(ball.body.position.y);
    expect(ball.mesh.position.z).toBeCloseTo(ball.body.position.z);
  });

  test('should handle ball reset correctly', async () => {
    // Create ball and move it
    const initialPos = { x: 0, y: 1, z: 0 };
    const ball = await ballManager.createBall(initialPos);

    // Apply impulse to move ball using Ball's method
    const direction = new THREE.Vector3(1, 0.5, 0).normalize();
    ball.applyImpulse(direction, 1.0);

    // Update physics
    for (let i = 0; i < 20; i++) {
      physicsManager.update(16);
      ball.update(16);
    }

    // Verify ball has moved
    expect(ball.body.position.x).not.toBeCloseTo(initialPos.x);

    // Reset ball
    ballManager.resetBall();

    // Verify ball is back at initial position
    expect(ball.mesh.position.x).toBeCloseTo(initialPos.x);
    expect(ball.mesh.position.y).toBeCloseTo(initialPos.y);
    expect(ball.mesh.position.z).toBeCloseTo(initialPos.z);

    // Verify velocity is reset
    expect(ball.body.velocity.x).toBeCloseTo(0);
    expect(ball.body.velocity.y).toBeCloseTo(0);
    expect(ball.body.velocity.z).toBeCloseTo(0);
  });

  test('should detect when ball stops moving', async () => {
    const ball = await ballManager.createBall({ x: 0, y: 1, z: 0 });

    // Apply initial impulse to get ball moving
    const direction = new THREE.Vector3(1, 0, 0);
    ball.applyImpulse(direction, 0.5);

    let ballStopped = false;
    let frameCount = 0;
    const maxFrames = 300; // 5 seconds at 60fps

    // Simulate until ball stops or timeout
    while (!ballStopped && frameCount < maxFrames) {
      physicsManager.update(16);
      ball.update(16);

      const velocity = ball.body.velocity;
      const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);

      if (speed < 0.1) {
        ballStopped = true;
      }

      frameCount++;
    }

    // Ball should eventually stop due to friction/damping
    expect(ballStopped).toBe(true);
    expect(frameCount).toBeLessThan(maxFrames);
  });

  test('should handle collision events between physics and ball manager', async () => {
    const ball = await ballManager.createBall({ x: 0, y: 5, z: 0 });

    // Create ground body
    const groundShape = new CANNON.Box(new CANNON.Vec3(10, 0.1, 10));
    const groundBody = new CANNON.Body({
      mass: 0, // Static
      shape: groundShape,
      position: new CANNON.Vec3(0, 0, 0)
    });
    physicsManager.getWorld().addBody(groundBody);

    let collisionDetected = false;
    ball.body.addEventListener('collide', () => {
      collisionDetected = true;
    });

    // Simulate ball falling
    for (let i = 0; i < 60; i++) {
      // 1 second
      physicsManager.update(16);
      ball.update(16);
    }

    // Ball should have collided with ground
    expect(collisionDetected).toBe(true);
    expect(ball.body.position.y).toBeLessThan(2); // Should be near ground
  });
});
