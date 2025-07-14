/**
 * Integration tests for Game initialization
 * Tests that all managers initialize and work together correctly
 */

import { Game } from '../../scenes/Game';
import { GameState } from '../../states/GameState';

// Mock Three.js and other dependencies
jest.mock('three/examples/jsm/controls/OrbitControls', () => ({
  OrbitControls: jest.fn(() => ({
    enableDamping: true,
    dampingFactor: 0.1,
    enableZoom: true,
    enablePan: true,
    maxPolarAngle: Math.PI / 2,
    minDistance: 2,
    maxDistance: 50,
    target: { set: jest.fn() },
    update: jest.fn(),
    dispose: jest.fn()
  }))
}));

describe('Game Initialization Integration', () => {
  let game;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '<div id="game-container"></div>';
    
    // Create game instance
    game = new Game();
  });

  afterEach(() => {
    // Cleanup
    if (game && game.cleanup) {
      game.cleanup();
    }
    jest.clearAllMocks();
  });

  test('should initialize all core managers in correct order', async () => {
    // Initialize game
    await game.init();

    // Verify all managers are created
    expect(game.debugManager).toBeDefined();
    expect(game.eventManager).toBeDefined();
    expect(game.performanceManager).toBeDefined();
    expect(game.stateManager).toBeDefined();
    expect(game.uiManager).toBeDefined();
    expect(game.physicsManager).toBeDefined();
    expect(game.audioManager).toBeDefined();
    expect(game.visualEffectsManager).toBeDefined();

    // Verify scene setup
    expect(game.scene).toBeDefined();
    expect(game.renderer).toBeDefined();
    expect(game.camera).toBeDefined();

    // Verify game state
    const gameState = game.stateManager.getGameState();
    expect(gameState).toBe(GameState.PLAYING);
  });

  test('should initialize game-specific managers after core managers', async () => {
    await game.init();

    // Verify game managers are created
    expect(game.ballManager).toBeDefined();
    expect(game.hazardManager).toBeDefined();
    expect(game.holeStateManager).toBeDefined();
    expect(game.holeTransitionManager).toBeDefined();
    expect(game.holeCompletionManager).toBeDefined();
    expect(game.gameLoopManager).toBeDefined();

    // Verify controllers
    expect(game.inputController).toBeDefined();
    expect(game.cameraController).toBeDefined();

    // Verify course and decorations
    expect(game.course).toBeDefined();
    expect(game.spaceDecorations).toBeDefined();
  });

  test('should handle manager dependencies correctly', async () => {
    await game.init();

    // Verify physics manager has world
    expect(game.physicsManager.world).toBeDefined();
    expect(game.physicsManager.cannonWorld).toBeDefined();

    // Verify ball manager has physics reference
    expect(game.ballManager.physicsManager).toBe(game.physicsManager);

    // Verify UI manager has renderer reference
    expect(game.uiManager.renderer).toBe(game.renderer);

    // Verify camera controller has camera reference
    expect(game.cameraController.camera).toBe(game.camera);
  });

  test('should publish initialization events in correct sequence', async () => {
    const publishedEvents = [];
    
    // Mock event publishing to track sequence
    game.eventManager = {
      init: jest.fn(),
      publish: jest.fn((eventType) => {
        publishedEvents.push(eventType);
      }),
      subscribe: jest.fn(() => () => {})
    };

    await game.init();

    // Verify critical events were published
    expect(publishedEvents).toContain('GAME_INITIALIZED');
    expect(publishedEvents).toContain('PHYSICS_INITIALIZED');
    
    // Verify event order (physics should be before game)
    const physicsIndex = publishedEvents.indexOf('PHYSICS_INITIALIZED');
    const gameIndex = publishedEvents.indexOf('GAME_INITIALIZED');
    expect(physicsIndex).toBeLessThan(gameIndex);
  });

  test('should create initial game objects', async () => {
    await game.init();

    // Verify course is loaded
    expect(game.course).toBeDefined();
    expect(game.course.totalHoles).toBeGreaterThan(0);

    // Verify ball is created
    expect(game.ballManager.ball).toBeDefined();
    expect(game.ballManager.ball.mesh).toBeDefined();
    expect(game.ballManager.ball.body).toBeDefined();

    // Verify ball is in scene and physics world
    expect(game.scene.children).toContain(game.ballManager.ball.mesh);
    expect(game.physicsManager.world.world.bodies).toContain(game.ballManager.ball.body);
  });

  test('should handle initialization errors gracefully', async () => {
    // Mock a manager to throw error
    game.physicsManager = {
      init: jest.fn(() => {
        throw new Error('Physics initialization failed');
      })
    };

    // Game should handle error without crashing
    await expect(game.init()).resolves.not.toThrow();

    // Error should be logged
    expect(game.debugManager.error).toHaveBeenCalledWith(
      expect.stringContaining('Physics initialization failed')
    );
  });

  test('should setup event subscriptions between managers', async () => {
    await game.init();

    // Track subscriptions
    const subscriptions = [];
    game.eventManager.subscribe = jest.fn((event, handler) => {
      subscriptions.push({ event, handler });
      return () => {};
    });

    // Re-initialize to capture subscriptions
    await game.setupEventSubscriptions();

    // Verify key event subscriptions exist
    const eventTypes = subscriptions.map(s => s.event);
    expect(eventTypes).toContain('BALL_HIT');
    expect(eventTypes).toContain('BALL_STOPPED');
    expect(eventTypes).toContain('HOLE_COMPLETED');
    expect(eventTypes).toContain('RESET_BALL');
  });

  test('should start game loop after initialization', async () => {
    // Mock game loop manager
    const startLoopMock = jest.fn();
    game.gameLoopManager = {
      init: jest.fn(),
      startLoop: startLoopMock
    };

    await game.init();

    // Verify game loop was started
    expect(startLoopMock).toHaveBeenCalled();
  });

  test('should handle window resize events', async () => {
    await game.init();

    const initialWidth = window.innerWidth;
    const initialHeight = window.innerHeight;

    // Simulate window resize
    window.innerWidth = 1024;
    window.innerHeight = 768;
    window.dispatchEvent(new Event('resize'));

    // Verify renderer was resized
    expect(game.renderer.setSize).toHaveBeenCalledWith(1024, 768);

    // Restore window size
    window.innerWidth = initialWidth;
    window.innerHeight = initialHeight;
  });

  test('should cleanup all managers on game cleanup', async () => {
    await game.init();

    // Mock cleanup methods
    const cleanupMocks = {
      physicsManager: jest.spyOn(game.physicsManager, 'cleanup'),
      eventManager: jest.spyOn(game.eventManager, 'cleanup'),
      audioManager: jest.spyOn(game.audioManager, 'cleanup'),
      gameLoopManager: jest.spyOn(game.gameLoopManager, 'cleanup')
    };

    // Cleanup game
    game.cleanup();

    // Verify all managers were cleaned up
    Object.values(cleanupMocks).forEach(mock => {
      expect(mock).toHaveBeenCalled();
    });

    // Verify resources were disposed
    expect(game.renderer.dispose).toHaveBeenCalled();
    expect(game.scene).toBeNull();
    expect(game.camera).toBeNull();
  });
});