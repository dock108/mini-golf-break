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
        try {
            if (this.isInitialized) {
                if (this.game.debugManager) {
                    this.game.debugManager.warn('BallManager.init', 'Already initialized');
                }
                return this;
            }
            
            // Don't create ball here - it will be created by Game.createCourse()
            this.setupEventListeners();
            
            this.isInitialized = true;
            
            if (this.game.debugManager) {
                this.game.debugManager.log('BallManager initialized');
            }
        } catch (error) {
            if (this.game.debugManager) {
                this.game.debugManager.error('BallManager.init', 'Failed to initialize ball manager', error);
            } else {
                console.error('Failed to initialize ball manager:', error);
            }
        }
        
        return this;
    }
    
    /**
     * Set up event subscriptions
     */
    setupEventListeners() {
        if (!this.game.eventManager) {
            if (this.game.debugManager) {
                this.game.debugManager.warn('BallManager.setupEventListeners', 'EventManager not available, skipping event subscriptions');
            }
            return;
        }
        
        try {
            // Store subscription functions to simplify cleanup
            this.eventSubscriptions = [
                // Listen for hazard events to reset ball
                this.game.eventManager.subscribe(
                    EventTypes.HAZARD_DETECTED,
                    this.handleHazardDetected,
                    this
                ),
                
                // Listen for game state changes
                this.game.eventManager.subscribe(
                    EventTypes.HOLE_STARTED,
                    this.handleHoleStarted,
                    this
                )
            ];
            
            if (this.game.debugManager) {
                this.game.debugManager.log('BallManager event listeners initialized');
            }
        } catch (error) {
            if (this.game.debugManager) {
                this.game.debugManager.error('BallManager.setupEventListeners', 'Failed to set up event listeners', error);
            } else {
                console.error('Failed to set up event listeners:', error);
            }
        }
    }
    
    /**
     * Handle the start of a new hole
     * @param {GameEvent} event - The hole started event
     */
    handleHoleStarted(event) {
        try {
            // Reset ball position at the start of a new hole
            const startPosition = this.getStartPosition();
            if (this.ball && startPosition) {
                this.ball.setPosition(startPosition.x, startPosition.y, startPosition.z);
                this.ball.resetVelocity();
                
                // Publish ball reset event
                if (this.game.eventManager) {
                    this.game.eventManager.publish(
                        EventTypes.BALL_RESET,
                        { position: startPosition.clone() },
                        this
                    );
                }
            }
        } catch (error) {
            if (this.game.debugManager) {
                this.game.debugManager.error('BallManager.handleHoleStarted', 'Error handling hole started event', error);
            }
        }
    }
    
    /**
     * Create a new ball
     * @private
     */
    createBall() {
        console.log('[BallManager] Creating new ball');
        
        // Get starting position from course
        const startPosition = this.getStartPosition();
        console.log('[BallManager] Ball start position:', startPosition);
        
        // Create the ball
        this.ball = new Ball(this.game.scene, this.game.physicsManager.world, this.game);
        
        // Position the ball at the start position with a higher Y offset to ensure it's above the floor
        // Using Ball.START_HEIGHT to ensure consistency
        this.ball.setPosition(startPosition.x, startPosition.y + Ball.START_HEIGHT, startPosition.z);
        
        console.log('[BallManager] Ball positioned at:', this.ball.mesh.position);
        
        // Get hole position for distance calculation
        const holePosition = this.game.course ? this.game.course.getHolePosition() : null;
        if (holePosition) {
            const distance = this.ball.mesh.position.distanceTo(holePosition);
            console.log(`[BallManager] Ball created at distance ${distance.toFixed(2)} from hole`);
        }
        
        // Wake up the ball's physics body to ensure it's active in the physics world
        if (this.ball.body) {
            this.ball.body.wakeUp();
            console.log('[BallManager] Ball body woken up with position:', this.ball.body.position);
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
     * Get the starting position for the current hole
     */
    getStartPosition() {
        // If we have a course with a specific tee position, use that
        if (this.game.course) {
            const startPos = this.game.course.getHoleStartPosition();
            if (startPos) {
                this.game.debugManager.log(`[DEBUG] Getting start position from course: (${startPos.x.toFixed(2)}, ${startPos.y.toFixed(2)}, ${startPos.z.toFixed(2)})`);
                return startPos;
            } else {
                this.game.debugManager.warn(`[DEBUG] Course returned null start position`);
            }
        }
        
        // Default starting position
        this.game.debugManager.log(`[DEBUG] Using default start position: (0, ${Ball.START_HEIGHT}, 0)`);
        return new THREE.Vector3(0, Ball.START_HEIGHT, 0);
    }
    
    /**
     * Update ball motion state
     */
    updateBallState() {
        if (!this.ball) return;
        
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
            this.updateTeeMarker();
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
        if (!this.ball) return;
        
        // Update ball physics and rendering
        this.ball.update(this.game.deltaTime);
        
        // Check if ball has fallen below the course
        const outOfBoundYThreshold = -5; // Consider anything below -5 as out of bounds
        if (this.ball.mesh.position.y < outOfBoundYThreshold) {
            console.log(`[BallManager] Ball out of bounds at y=${this.ball.mesh.position.y.toFixed(2)}, resetting to start position`);
            
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
                if (this.game.hazardManager && typeof this.game.hazardManager.setLastSafePosition === 'function') {
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
        if (!this.ball) return;
        
        // Save last safe position before hitting
        this.lastBallPosition.copy(this.ball.mesh.position);
        
        // Hit the ball
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
                power: power,
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
        if (!this.ball) return;
        
        // If no position provided, use last safe position or get new start position
        const resetPosition = position || this.lastSafePosition || this.getStartPosition();
        
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
        console.log(`[BallManager] Ball reset to position:`, resetPosition);
    }
    
    /**
     * Handle hazard detection
     */
    handleHazardDetected(event) {
        const hazardType = event.get('hazardType');
        const penalty = event.get('penalty', 1);
        
        // Add penalty strokes
        this.game.scoringSystem.addPenaltyStrokes(penalty);
        
        // Reset ball to safe position
        this.resetBall();
    }
    
    /**
     * Update tee marker position to current ball position
     */
    updateTeeMarker() {
        if (!this.game.teeMarker || !this.ball) return;
        
        const ballPos = this.ball.mesh.position;
        this.game.teeMarker.setPosition(ballPos.x, ballPos.y, ballPos.z);
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
    handleBallInHole(event) {
        if (!this.ball) return;
        
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

            // Clear the reference
            this.ball = null;
        }
    }
} 