/**
 * Integration tests for Course loading and hole transitions
 * Tests the interaction between Course, HoleStateManager, and HoleTransitionManager
 */

import { NineHoleCourse } from '../../objects/NineHoleCourse';
import { HoleStateManager } from '../../managers/HoleStateManager';
import { HoleTransitionManager } from '../../managers/HoleTransitionManager';
import { HoleCompletionManager } from '../../managers/HoleCompletionManager';
import { EventManager } from '../../managers/EventManager';
import { StateManager } from '../../managers/StateManager';
import { BallManager } from '../../managers/BallManager';
import { PhysicsManager } from '../../managers/PhysicsManager';
import { UIManager } from '../../managers/UIManager';
import * as THREE from 'three';

describe('Course and Hole Transitions Integration', () => {
  let game;
  let course;
  let holeStateManager;
  let holeTransitionManager;
  let holeCompletionManager;
  let scene;

  beforeEach(async () => {
    // Setup scene and game mock
    scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer();
    
    game = {
      scene,
      renderer,
      camera: new THREE.PerspectiveCamera(60, 1, 0.1, 1000),
      eventManager: new EventManager(),
      stateManager: new StateManager({ eventManager: new EventManager() }),
      physicsManager: new PhysicsManager({ debugManager: { log: jest.fn() } }),
      ballManager: null,
      uiManager: new UIManager({ 
        eventManager: new EventManager(),
        debugManager: { log: jest.fn() }
      }),
      cameraController: {
        positionCameraForHole: jest.fn(),
        resetToDefaultPosition: jest.fn()
      },
      visualEffectsManager: {
        playHoleCompletionEffect: jest.fn(),
        playCourseCompletionEffect: jest.fn()
      },
      debugManager: {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      }
    };

    // Initialize core managers
    game.eventManager.init();
    game.physicsManager.init();
    game.uiManager.init();
    game.uiManager.attachRenderer(renderer);
    
    // Initialize ball manager
    game.ballManager = new BallManager(game);
    game.ballManager.init(game.physicsManager);
    await game.ballManager.createBall({ x: 0, y: 1, z: 0 });

    // Create course
    course = await NineHoleCourse.create(scene, game.physicsManager.world);
    game.course = course;

    // Initialize hole managers
    holeStateManager = new HoleStateManager(game);
    holeTransitionManager = new HoleTransitionManager(game);
    holeCompletionManager = new HoleCompletionManager(game);

    holeStateManager.init();
    holeTransitionManager.init();
    holeCompletionManager.init();
  });

  afterEach(() => {
    // Cleanup
    if (game.physicsManager) {
      game.physicsManager.cleanup();
    }
    jest.clearAllMocks();
  });

  test('should load course with all holes properly initialized', async () => {
    // Verify course structure
    expect(course).toBeDefined();
    expect(course.totalHoles).toBe(9);
    expect(course.holes).toHaveLength(9);

    // Verify each hole has required properties
    course.holes.forEach((hole, index) => {
      expect(hole).toBeDefined();
      expect(hole.config).toBeDefined();
      expect(hole.config.index).toBe(index);
      expect(hole.config.par).toBeGreaterThan(0);
      expect(hole.elements).toBeDefined();
      expect(hole.startPosition).toBeDefined();
      expect(hole.cupPosition).toBeDefined();
    });

    // Verify first hole is loaded
    expect(course.currentHoleEntity).toBe(course.holes[0]);
  });

  test('should handle hole completion and transition to next hole', async () => {
    // Setup initial state
    const initialHole = holeStateManager.getCurrentHole();
    expect(initialHole).toBe(0);

    // Track events
    const events = [];
    game.eventManager.subscribe('HOLE_COMPLETED', (data) => events.push({ type: 'HOLE_COMPLETED', data }));
    game.eventManager.subscribe('HOLE_TRANSITION_START', (data) => events.push({ type: 'HOLE_TRANSITION_START', data }));
    game.eventManager.subscribe('HOLE_TRANSITION_END', (data) => events.push({ type: 'HOLE_TRANSITION_END', data }));

    // Simulate hole completion
    game.eventManager.publish('BALL_IN_HOLE', { hole: 0 });

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify hole completion was processed
    expect(events).toContainEqual(expect.objectContaining({ type: 'HOLE_COMPLETED' }));
    expect(game.visualEffectsManager.playHoleCompletionEffect).toHaveBeenCalled();

    // Trigger transition to next hole
    holeTransitionManager.transitionToNextHole();

    // Wait for transition
    await new Promise(resolve => setTimeout(resolve, 2500)); // Wait for transition duration

    // Verify transition events
    expect(events).toContainEqual(expect.objectContaining({ type: 'HOLE_TRANSITION_START' }));
    expect(events).toContainEqual(expect.objectContaining({ type: 'HOLE_TRANSITION_END' }));

    // Verify we're on next hole
    expect(holeStateManager.getCurrentHole()).toBe(1);
    expect(course.currentHoleEntity).toBe(course.holes[1]);
  });

  test('should update UI during hole transitions', async () => {
    // Mock UI update methods
    const updateHoleInfo = jest.spyOn(game.uiManager, 'updateHoleInfo');
    const resetStrokes = jest.spyOn(game.uiManager, 'resetStrokes');

    // Transition to hole 2
    await holeTransitionManager.transitionToHole(1);

    // Verify UI was updated
    expect(updateHoleInfo).toHaveBeenCalledWith(2, 9); // Hole 2 of 9
    expect(resetStrokes).toHaveBeenCalled();
  });

  test('should position camera correctly for each hole', async () => {
    // Test camera positioning for multiple holes
    for (let i = 0; i < 3; i++) {
      await holeTransitionManager.transitionToHole(i);
      
      expect(game.cameraController.positionCameraForHole).toHaveBeenCalledWith(
        course.holes[i],
        expect.any(Number)
      );
    }
  });

  test('should reset ball position when transitioning holes', async () => {
    // Move to hole 2
    await holeTransitionManager.transitionToHole(1);

    // Get new ball position
    const newBallPos = game.ballManager.ball.mesh.position;
    const hole2Start = course.holes[1].startPosition;

    // Verify ball was moved to new hole start
    expect(newBallPos.x).toBeCloseTo(hole2Start.x);
    expect(newBallPos.y).toBeCloseTo(hole2Start.y);
    expect(newBallPos.z).toBeCloseTo(hole2Start.z);
  });

  test('should handle course completion correctly', async () => {
    // Move to last hole
    holeStateManager.setCurrentHole(8);
    course.currentHoleEntity = course.holes[8];

    // Track completion event
    let courseCompleted = false;
    game.eventManager.subscribe('COURSE_COMPLETED', () => {
      courseCompleted = true;
    });

    // Complete last hole
    game.eventManager.publish('BALL_IN_HOLE', { hole: 8 });
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify course completion
    expect(courseCompleted).toBe(true);
    expect(game.visualEffectsManager.playCourseCompletionEffect).toHaveBeenCalled();
  });

  test('should maintain game state consistency during transitions', async () => {
    // Track state changes
    const states = [];
    game.stateManager.setGameState = jest.fn((state) => {
      states.push(state);
    });

    // Start hole transition
    await holeTransitionManager.transitionToHole(2);

    // Verify state transitions
    expect(states).toContain('TRANSITIONING');
    expect(states[states.length - 1]).toBe('PLAYING'); // Should end in playing state
  });

  test('should handle errors during transition gracefully', async () => {
    // Mock error during transition
    game.ballManager.resetBallPosition = jest.fn(() => {
      throw new Error('Failed to reset ball');
    });

    // Attempt transition
    await holeTransitionManager.transitionToHole(3);

    // Verify error was logged but transition continued
    expect(game.debugManager.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to reset ball')
    );
    
    // Game should still be playable
    expect(game.stateManager.getGameState()).not.toBe('ERROR');
  });

  test('should properly clean up previous hole elements', async () => {
    // Get initial hole elements
    const hole1Elements = course.holes[0].elements;

    // Transition to next hole
    await holeTransitionManager.transitionToHole(1);

    // Previous hole elements should be removed
    hole1Elements.forEach(element => {
      if (element.mesh) {
        expect(scene.children).not.toContain(element.mesh);
      }
    });

    // New hole elements should be added
    const hole2Elements = course.holes[1].elements;
    hole2Elements.forEach(element => {
      if (element.mesh) {
        expect(scene.children).toContain(element.mesh);
      }
    });
  });
});