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
            
            this.createBall();
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
     * Create a new ball at the starting position
     * @returns {Ball} The created ball
     */
    createBall() {
        try {
            // Clean up existing ball if present
            if (this.ball) {
                this.cleanup();
            }
            
            // Create new ball
            this.ball = new Ball(this.game.scene, this.game.physicsManager.world, this.game);
            
            // Position the ball at the starting position
            const startPosition = this.getStartPosition();
            if (startPosition) {
                this.ball.setPosition(startPosition.x, startPosition.y, startPosition.z);
            } else if (this.game.debugManager) {
                this.game.debugManager.warn('BallManager.createBall', 'No valid start position found, using default');
            }
            
            // Initial reset of velocity
            this.ball.resetVelocity();
            
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
        } catch (error) {
            if (this.game.debugManager) {
                this.game.debugManager.error('BallManager.createBall', 'Failed to create ball', error);
            } else {
                console.error('Failed to create ball:', error);
            }
            return null;
        }
    }
    
    /**
     * Get the starting position for the current hole
     */
    getStartPosition() {
        // If we have a course with a specific tee position, use that
        if (this.game.course) {
            return this.game.course.getTeePosition();
        }
        
        // Default starting position
        return new THREE.Vector3(0, 0.5, 0);
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
        
        // Update the ball
        this.ball.update();
        
        // Update state based on ball motion
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
     * @param {THREE.Vector3} position - Position to reset the ball to
     */
    resetBall(position) {
        if (!this.ball) return;
        
        // Reset ball position
        this.ball.setPosition(position.x, position.y, position.z);
        this.ball.resetVelocity();
        
        // Update last ball position
        this.lastBallPosition.copy(position);
        
        // Publish ball reset event
        if (this.game.eventManager) {
            this.game.eventManager.publish(
                EventTypes.BALL_RESET,
                { position: position.clone() },
                this
            );
        }
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
} 