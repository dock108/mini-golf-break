import * as THREE from 'three';
import { Ball } from '../objects/Ball';
import { EventTypes } from '../events/EventTypes';

/**
 * BallManager - Handles ball creation, physics, and movement
 * Manages the golf ball's lifecycle and interactions
 */
export class BallManager {
  constructor(game) {
    this.game = game;
    this.ball = null;
    this.lastBallPosition = new THREE.Vector3();
    this.wasMoving = false;
    this.followLerp = 0.1; // Controls how quickly the camera follows the ball

    // Initialization state tracking
    this.isInitialized = false;
    this.eventSubscriptions = [];
  }

  /**
   * Initialize the ball manager
   * @returns {BallManager} this instance for chaining
   */
  init() {
    console.log('[BallManager.init] Starting...');
    try {
      if (this.isInitialized) {
        console.warn('[BallManager.init] Already initialized, skipping.');
        return this;
      }

      // Don't create ball here - it will be created by Game.createCourse()
      console.log('[BallManager.init] Setting up event listeners...');
      this.setupEventListeners();
      console.log('[BallManager.init] Event listeners setup finished.');

      this.isInitialized = true;
      console.log('[BallManager.init] Finished.');
    } catch (error) {
      console.error('[BallManager.init] Failed:', error);
    }

    return this;
  }

  /**
   * Set up event subscriptions
   */
  setupEventListeners() {
    console.log('[BallManager.setupEventListeners] Starting...');
    if (!this.game.eventManager) {
      console.warn('[BallManager.setupEventListeners] EventManager not available, skipping.');
      return;
    }

    try {
      this.eventSubscriptions = []; // Initialize as empty array

      console.log('[BallManager.setupEventListeners] Subscribing to HAZARD_DETECTED...');
      this.eventSubscriptions.push(
        this.game.eventManager.subscribe(
          EventTypes.HAZARD_DETECTED,
          this.handleHazardDetected,
          this
        )
      );

      console.log('[BallManager.setupEventListeners] Subscribing to HOLE_STARTED...');
      this.eventSubscriptions.push(
        this.game.eventManager.subscribe(EventTypes.HOLE_STARTED, this.handleHoleStarted, this)
      );

      console.log('[BallManager.setupEventListeners] Finished.');
    } catch (error) {
      console.error('[BallManager.setupEventListeners] Failed:', error);
    }
  }

  /**
   * Handle the start of a new hole
   * @param {GameEvent} event - The hole started event
   */
  handleHoleStarted(_event) {
    console.log(
      `[BallManager.handleHoleStarted] Event received. isInitialized: ${this.isInitialized}, game initialized?: ${this.game.isInitialized}`
    );
    try {
      // Get the WORLD start position for the new hole
      const worldStartPosition = this.game.course.getHoleStartPosition(); // Now returns WORLD coords
      if (this.ball && worldStartPosition) {
        console.log('[BallManager.handleHoleStarted] Resetting existing ball position.');
        this.ball.setPosition(
          worldStartPosition.x,
          worldStartPosition.y + Ball.START_HEIGHT,
          worldStartPosition.z
        );
        this.ball.resetVelocity();

        // Publish ball reset event with the elevated position
        const resetPosition = worldStartPosition
          .clone()
          .setY(worldStartPosition.y + Ball.START_HEIGHT);
        if (this.game.eventManager) {
          this.game.eventManager.publish(EventTypes.BALL_RESET, { position: resetPosition }, this);
        }
      } else {
        console.log('[BallManager.handleHoleStarted] No ball exists yet or startPosition invalid.');
      }
    } catch (error) {
      console.error('[BallManager.handleHoleStarted] Failed:', error);
    }
  }

  /**
   * Create a new ball at the correct world start position
   * @param {THREE.Vector3} worldStartPosition - The WORLD position where the ball should be created
   * @private
   */
  createBall(worldStartPosition) {
    // --- GUARD CLAUSE ---
    if (!this.game || !this.game.course || !this.game.course.currentHole) {
      console.warn('[BallManager.createBall] Aborting: Course/hole not ready.');
      return null;
    }
    // --- END GUARD CLAUSE ---

    console.log('[BallManager] Creating new ball (Course seems ready)');

    // Validate start position (passed argument - should be world coords)
    if (!worldStartPosition || !(worldStartPosition instanceof THREE.Vector3)) {
      console.error(
        '[BallManager] Invalid worldStartPosition argument provided:',
        worldStartPosition
      );
      // Try getting from course config as fallback
      worldStartPosition = this.game.course?.getHoleStartPosition();
      console.warn('[BallManager] Using course start position as fallback.');
      if (!worldStartPosition) {
        // If fallback also fails
        worldStartPosition = new THREE.Vector3(0, 0, 0); // Use 0,0,0 base, height added later
        console.error(
          '[BallManager] Fallback start position also invalid! Using absolute default (0,0,0).'
        );
      }
    }

    // Clean up existing ball if any
    this.removeBall();

    // Get physics world
    const physicsWorld = this.game.physicsManager.getWorld();
    if (!physicsWorld) {
      console.error('[BallManager] Physics world not available for ball creation.');
      return null;
    }

    // Create the Ball instance
    this.ball = new Ball(this.game.scene, physicsWorld, this.game);

    // --- Assign current WORLD Hole Position to the Ball instance ---
    const worldHolePosition = this.game.course?.getHolePosition(); // Already returns WORLD coords

    if (worldHolePosition) {
      this.ball.currentHolePosition = worldHolePosition.clone(); // Store WORLD position
      console.log('[BallManager] Assigned WORLD holePosition to Ball:', worldHolePosition);
    } else {
      console.error('[BallManager] Failed to get world hole position to assign to ball!');
      this.ball.currentHolePosition = null;
    }
    // --- End Assignment ---

    // Position the ball at the start position, slightly elevated
    const finalPosition = worldStartPosition.clone().setY(worldStartPosition.y + Ball.START_HEIGHT);
    this.ball.setPosition(finalPosition.x, finalPosition.y, finalPosition.z);

    console.log('[BallManager] Ball positioned at world:', this.ball.mesh.position);

    // Log distance (now using world coordinates)
    if (worldHolePosition) {
      const distance = this.ball.mesh.position.distanceTo(worldHolePosition);
      console.log(`[BallManager] Ball created at distance ${distance.toFixed(2)} from hole`);
    }

    // Wake up the ball's physics body
    if (this.ball.body) {
      this.ball.body.wakeUp();
      console.log('[BallManager] Ball body woken up with world position:', this.ball.body.position);
    } else {
      console.error('[BallManager] Ball body not created or available after instantiation.');
      this.removeBall(); // Clean up partial creation
      return null;
    }

    // Store initial safe position
    this.lastBallPosition.copy(this.ball.mesh.position);

    // Publish the ball created event
    if (this.game.eventManager) {
      this.game.eventManager.publish(
        EventTypes.BALL_CREATED,
        { ball: this.ball, position: this.ball.mesh.position.clone() },
        this
      );
    }

    // Update camera to follow new ball
    if (this.game.cameraController) {
      this.game.cameraController.setBall(this.ball);
    }

    return this.ball;
  }

  /**
   * Update ball motion state
   */
  updateBallState() {
    if (!this.ball) {
      return;
    }

    // Previous state
    this.wasMoving = this.game.stateManager.isBallInMotion();

    // Update state based on ball motion
    const isMoving = this.ball.isMoving;
    this.game.stateManager.setBallInMotion(isMoving);

    // If ball is moving, publish ball moved event
    if (isMoving) {
      this.game.eventManager.publish(
        EventTypes.BALL_MOVED,
        {
          position: this.ball.mesh.position.clone(),
          velocity: this.ball.body.velocity.clone()
        },
        this
      );
    }

    // If ball has just stopped and hole not completed
    if (this.wasMoving && !isMoving) {
      // Publish ball stopped event
      this.game.eventManager.publish(
        EventTypes.BALL_STOPPED,
        { position: this.ball.mesh.position.clone() },
        this
      );

      // Update the tee marker at the current ball position
      // this.updateTeeMarker();
    }

    // Debug log for ball physics
    if (this.game.debugManager.enabled && this.ball.body) {
      const velocity = this.ball.body.velocity;
      this.game.debugManager.logBallVelocity(new THREE.Vector3(velocity.x, velocity.y, velocity.z));
    }
  }

  /**
   * Update the ball each frame
   */
  update() {
    if (!this.ball) {
      return;
    }

    // Update ball physics and rendering
    this.ball.update(this.game.deltaTime);

    // Check if ball has fallen below the course
    const outOfBoundYThreshold = -5; // Consider anything below -5 as out of bounds
    if (this.ball.mesh.position.y < outOfBoundYThreshold) {
      console.log(
        `[BallManager] Ball out of bounds at y=${this.ball.mesh.position.y.toFixed(2)}, resetting to start position`
      );

      // Reset ball to last safe position or start position
      this.resetBall();

      // Publish out of bounds event
      if (this.game.eventManager) {
        this.game.eventManager.publish(
          EventTypes.BALL_OUT_OF_BOUNDS,
          { position: this.ball.mesh.position.clone() },
          this
        );
      }

      // Play sound for out of bounds
      if (this.game.audioManager) {
        this.game.audioManager.playSound('outOfBounds', 0.5);
      }

      return; // Skip remaining update after reset
    }

    // Store last position if ball is safely on the course
    if (this.ball.mesh.position.y > 0) {
      this.lastBallPosition.copy(this.ball.mesh.position);

      // If ball is close to the ground and not in a hazard or falling,
      // store the position as safe
      if (this.ball.mesh.position.y < 0.5) {
        // Store safe position locally
        this.lastSafePosition = this.ball.mesh.position.clone();

        // If hazard manager exists and has the method, update it too
        if (
          this.game.hazardManager &&
          typeof this.game.hazardManager.setLastSafePosition === 'function'
        ) {
          this.game.hazardManager.setLastSafePosition(this.ball.mesh.position.clone());
        }
      }
    }

    // Update UI stroke counter if game is in putting state
    if (this.game.uiManager) {
      this.game.uiManager.updateStrokes();
    }

    // Update ball motion state (moving or stopped)
    this.updateBallState();
  }

  /**
   * Handle a hit on the ball with given direction and power
   * @param {THREE.Vector3} direction - Direction vector
   * @param {number} power - Power of the hit (0-1)
   */
  hitBall(direction, power) {
    if (!this.ball) {
      return;
    }

    // Save last safe position before hitting
    this.lastBallPosition.copy(this.ball.mesh.position);

    // Hit the ball
    console.log(
      `[BallManager.hitBall] Ball position before impulse: (${this.ball.body.position.x.toFixed(2)}, ${this.ball.body.position.y.toFixed(2)}, ${this.ball.body.position.z.toFixed(2)})`
    ); // Log position
    this.ball.applyImpulse(direction, power);

    // Increment stroke count
    this.game.scoringSystem.addStroke();

    // Update UI
    this.game.uiManager.updateStrokes();

    // Play hit sound
    this.game.audioManager.playSound('hit');

    // Set ball in motion state
    this.game.stateManager.setBallInMotion(true);

    // Publish ball hit event
    this.game.eventManager.publish(
      EventTypes.BALL_HIT,
      {
        direction: direction.clone(),
        power,
        position: this.ball.mesh.position.clone(),
        strokes: this.game.scoringSystem.getTotalStrokes()
      },
      this
    );
  }

  /**
   * Reset the ball to a specific position
   * @param {THREE.Vector3} [position] - Optional position to reset the ball to. If not provided, uses last safe position or start position.
   */
  resetBall(position) {
    if (!this.ball) {
      return;
    }

    // If no position provided, use last safe position or get world start position from course
    const startPosition = this.game.course?.getHoleStartPosition();
    const resetPosition =
      position ||
      this.lastSafePosition ||
      startPosition ||
      new THREE.Vector3(0, Ball.START_HEIGHT, 0);

    // Elevate Y if using startPosition fallback (which is base Y)
    if (!position && !this.lastSafePosition && startPosition) {
      resetPosition.y += Ball.START_HEIGHT;
    }

    // Reset ball position
    this.ball.setPosition(resetPosition.x, resetPosition.y, resetPosition.z);
    this.ball.resetVelocity();

    // Update last ball position
    this.lastBallPosition.copy(resetPosition);

    // Publish ball reset event
    if (this.game.eventManager) {
      this.game.eventManager.publish(
        EventTypes.BALL_RESET,
        { position: resetPosition.clone() },
        this
      );
    }

    // Log the reset
    console.log('[BallManager] Ball reset to position:', resetPosition);
  }

  /**
   * Handle hazard detection
   */
  handleHazardDetected(event) {
    const _hazardType = event.get('hazardType');
    const penalty = event.get('penalty', 1);

    // Add penalty strokes
    this.game.scoringSystem.addPenaltyStrokes(penalty);

    // Reset ball to safe position
    this.resetBall();
  }

  /**
   * Clean up resources
   */
  cleanup() {
    try {
      // Clean up event subscriptions
      if (this.eventSubscriptions) {
        this.eventSubscriptions.forEach(unsubscribe => unsubscribe());
        this.eventSubscriptions = [];
      }

      // Clean up ball
      if (this.ball) {
        this.ball.cleanup();
        this.ball = null;
      }

      // Reset properties
      this.lastBallPosition.set(0, 0, 0);
      this.wasMoving = false;

      // Reset initialization state
      this.isInitialized = false;

      // Log cleanup
      if (this.game.debugManager) {
        this.game.debugManager.log('BallManager cleaned up');
      }
    } catch (error) {
      // Log cleanup errors
      if (this.game.debugManager) {
        this.game.debugManager.error('BallManager.cleanup', 'Error during cleanup', error);
      } else {
        console.error('Error during BallManager cleanup:', error);
      }
    }
  }

  /**
   * Handle ball in hole event
   * @param {GameEvent} event - The ball in hole event
   */
  handleBallInHole(_event) {
    if (!this.ball) {
      return;
    }

    // Play ball success effect
    this.ball.handleHoleSuccess();

    // Notify game about ball in hole
    if (this.game.handleBallInHole) {
      this.game.handleBallInHole();
    }
  }

  /**
   * Get current score data
   * @returns {Object} Score data object
   */
  getScoreData() {
    return {
      strokes: this.game.scoringSystem.getTotalStrokes()
    };
  }

  /**
   * Remove the current ball and clean up its resources
   */
  removeBall() {
    if (this.ball) {
      // Remove from physics world
      if (this.ball.body && this.game.physicsManager) {
        this.game.physicsManager.removeBody(this.ball.body);
      }

      // Remove from scene and dispose resources
      if (this.ball.mesh) {
        if (this.ball.mesh.geometry) {
          this.ball.mesh.geometry.dispose();
        }
        if (this.ball.mesh.material) {
          if (Array.isArray(this.ball.mesh.material)) {
            this.ball.mesh.material.forEach(mat => mat.dispose());
          } else {
            this.ball.mesh.material.dispose();
          }
        }
        this.game.scene.remove(this.ball.mesh);
      }

      // --- REMOVE BALL LIGHT ---
      if (this.ball.ballLight) {
        this.game.scene.remove(this.ball.ballLight);
        // No need to dispose PointLight geometry/material usually
        console.log('[BallManager] Removed ballLight from scene');
      }
      // --- END REMOVE BALL LIGHT ---

      // Clear the reference
      this.ball = null;
      console.log('[BallManager] Ball removed and cleaned up'); // Add log
    } else {
      console.log('[BallManager] No ball to remove.'); // Add log
    }
  }
}
