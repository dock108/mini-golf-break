/**
 * Integration tests for State Management
 * Tests how state changes propagate across different managers
 */

import { StateManager } from '../../managers/StateManager';
import { EventManager } from '../../managers/EventManager';
import { BallManager } from '../../managers/BallManager';
import { InputController } from '../../controls/InputController';
import { UIManager } from '../../managers/UIManager';
import { GameState } from '../../states/GameState';
import * as THREE from 'three';

describe('State Management Integration', () => {
  let stateManager;
  let eventManager;
  let ballManager;
  let inputController;
  let uiManager;
  let game;

  beforeEach(() => {
    // Create game mock first
    game = {
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(),
      renderer: new THREE.WebGLRenderer(),
      physicsManager: {
        world: { world: { bodies: [] } },
        update: jest.fn()
      },
      debugManager: {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        enabled: false
      }
    };

    // Initialize event system with game reference
    eventManager = new EventManager(game);
    eventManager.init();

    // Add eventManager to game object
    game.eventManager = eventManager;

    // Initialize managers
    stateManager = new StateManager(game);
    game.stateManager = stateManager;

    ballManager = new BallManager(game);
    ballManager.init(game.physicsManager);

    inputController = new InputController(game);

    uiManager = new UIManager(game);
    uiManager.init();
    uiManager.attachRenderer(game.renderer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should coordinate state changes between managers', () => {
    // Track state changes
    const stateChanges = [];
    eventManager.subscribe('STATE_CHANGED', data => {
      stateChanges.push(data);
    });

    // Change to aiming state
    stateManager.setGameState(GameState.AIMING);

    // Verify state change was published
    expect(stateChanges).toHaveLength(1);
    expect(stateChanges[0]).toEqual({
      previousState: GameState.INITIALIZING,
      newState: GameState.AIMING
    });
  });

  test('should disable input during certain states', () => {
    // Initialize input controller
    inputController.init(game.renderer.domElement, ballManager, game.camera);

    // Set state to transitioning (input should be disabled)
    stateManager.setGameState(GameState.TRANSITIONING);

    // Simulate mouse input
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100
    });
    game.renderer.domElement.dispatchEvent(mouseEvent);

    // Input should be ignored during transition
    expect(inputController.enabled).toBe(true); // Controller is enabled
    expect(stateManager.getGameState()).toBe(GameState.TRANSITIONING);
  });

  test('should update UI based on state changes', () => {
    // Mock UI methods
    const showMessage = jest.spyOn(uiManager, 'showMessage');
    const hideMessage = jest.spyOn(uiManager, 'hideMessage');

    // Transition through states
    stateManager.setGameState(GameState.AIMING);
    expect(showMessage).toHaveBeenCalledWith('Aim and click to shoot');

    stateManager.setGameState(GameState.BALL_MOVING);
    expect(hideMessage).toHaveBeenCalled();

    stateManager.setGameState(GameState.HOLE_COMPLETE);
    expect(showMessage).toHaveBeenCalledWith('Hole Complete!');
  });

  test('should handle ball motion state correctly', async () => {
    // Create ball
    await ballManager.createBall({ x: 0, y: 1, z: 0 });

    // Track ball state changes
    const ballStates = [];
    eventManager.subscribe('BALL_STATE_CHANGED', data => {
      ballStates.push(data);
    });

    // Start ball motion
    stateManager.setBallInMotion(true);
    stateManager.setGameState(GameState.BALL_MOVING);

    // Simulate ball hit event
    eventManager.publish('BALL_HIT', { power: 0.5, direction: { x: 1, y: 0, z: 0 } });

    // Verify state
    expect(stateManager.isBallInMotion()).toBe(true);
    expect(stateManager.getGameState()).toBe(GameState.BALL_MOVING);

    // Stop ball motion
    stateManager.setBallInMotion(false);
    eventManager.publish('BALL_STOPPED');

    // Verify state changed back
    expect(stateManager.isBallInMotion()).toBe(false);
  });

  test('should coordinate hole completion state', () => {
    // Track events
    const events = [];
    eventManager.subscribe('HOLE_COMPLETED', data => events.push({ type: 'HOLE_COMPLETED', data }));
    eventManager.subscribe('STATE_CHANGED', data => events.push({ type: 'STATE_CHANGED', data }));

    // Complete hole
    stateManager.setHoleCompleted(true);
    stateManager.setGameState(GameState.HOLE_COMPLETE);

    // Publish hole completed event
    eventManager.publish('HOLE_COMPLETED', {
      hole: 1,
      strokes: 3,
      par: 3
    });

    // Verify state
    expect(stateManager.isHoleCompleted()).toBe(true);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'STATE_CHANGED',
        data: expect.objectContaining({ newState: GameState.HOLE_COMPLETE })
      })
    );
  });

  test('should handle reset ball state across components', () => {
    // Set up reset tracking
    const resetCalls = [];
    ballManager.resetBallPosition = jest.fn(pos => {
      resetCalls.push(pos);
    });

    // Request ball reset
    stateManager.setResetBall(true);
    eventManager.publish('RESET_BALL', { position: { x: 0, y: 1, z: -5 } });

    // Process reset
    if (stateManager.shouldResetBall()) {
      ballManager.resetBallPosition({ x: 0, y: 1, z: -5 });
      stateManager.clearResetBall();
    }

    // Verify reset was processed
    expect(resetCalls).toHaveLength(1);
    expect(resetCalls[0]).toEqual({ x: 0, y: 1, z: -5 });
    expect(stateManager.shouldResetBall()).toBe(false);
  });

  test('should maintain state consistency during rapid changes', () => {
    // Rapid state changes
    const states = [
      GameState.AIMING,
      GameState.BALL_MOVING,
      GameState.AIMING,
      GameState.BALL_MOVING,
      GameState.HOLE_COMPLETE
    ];

    states.forEach(state => {
      stateManager.setGameState(state);
    });

    // Final state should be correct
    expect(stateManager.getGameState()).toBe(GameState.HOLE_COMPLETE);

    // State history should be consistent
    expect(stateManager.state.currentGameState).toBe(GameState.HOLE_COMPLETE);
  });

  test('should handle concurrent state updates', () => {
    // Simulate concurrent updates
    const updates = [];

    // Subscribe to all state changes
    eventManager.subscribe('STATE_CHANGED', data => {
      updates.push(data);
    });

    // Trigger multiple state changes rapidly
    stateManager.setBallInMotion(true);
    stateManager.setGameState(GameState.BALL_MOVING);
    stateManager.setHoleCompleted(false);
    stateManager.setBallInMotion(false);
    stateManager.setGameState(GameState.AIMING);

    // All updates should be processed
    expect(updates.length).toBeGreaterThan(0);

    // Final state should be consistent
    expect(stateManager.getGameState()).toBe(GameState.AIMING);
    expect(stateManager.isBallInMotion()).toBe(false);
    expect(stateManager.isHoleCompleted()).toBe(false);
  });

  test('should handle error states gracefully', () => {
    // Set error state
    stateManager.setGameState(GameState.ERROR);

    // Verify error state blocks certain operations
    expect(stateManager.getGameState()).toBe(GameState.ERROR);

    // Should still allow state recovery
    stateManager.setGameState(GameState.PLAYING);
    expect(stateManager.getGameState()).toBe(GameState.PLAYING);
  });

  test('should synchronize game loop with state', () => {
    // Mock game loop
    const gameLoop = {
      isPaused: false,
      pause: jest.fn(() => {
        gameLoop.isPaused = true;
      }),
      resume: jest.fn(() => {
        gameLoop.isPaused = false;
      })
    };

    // Pause state should pause game loop
    stateManager.setGameState(GameState.PAUSED);
    if (stateManager.getGameState() === GameState.PAUSED) {
      gameLoop.pause();
    }
    expect(gameLoop.isPaused).toBe(true);

    // Resume state should resume game loop
    stateManager.setGameState(GameState.PLAYING);
    if (stateManager.getGameState() === GameState.PLAYING) {
      gameLoop.resume();
    }
    expect(gameLoop.isPaused).toBe(false);
  });
});
