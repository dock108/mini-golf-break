import * as THREE from 'three';
import { Ball } from '../objects/Ball';
import { EventTypes } from '../events/EventTypes';

/**
 * BallManager - Handles ball creation, physics, and movement
 */
export class BallManager {
    constructor(game) {
        this.game = game;
        this.ball = null;
        this.lastBallPosition = new THREE.Vector3();
        this.wasMoving = false;
        this.followLerp = 0.1; // Controls how quickly the camera follows the ball
    }
    
    /**
     * Initialize the ball manager
     */
    init() {
        this.createBall();
        this.setupEventListeners();
        return this;
    }
    
    /**
     * Set up event subscriptions
     */
    setupEventListeners() {
        // Listen for hazard events to reset ball
        this.game.eventManager.subscribe(
            EventTypes.HAZARD_DETECTED,
            this.handleHazardDetected,
            this
        );
    }
    
    /**
     * Create a new ball at the starting position
     */
    createBall() {
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
        }
        
        // Initial reset of velocity
        this.ball.resetVelocity();
        
        // Store initial safe position
        this.lastBallPosition.copy(this.ball.mesh.position);
        
        // Publish the ball created event
        this.game.eventManager.publish(
            EventTypes.BALL_CREATED, 
            { ball: this.ball, position: this.ball.mesh.position.clone() },
            this
        );
        
        return this.ball;
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
                strokes: this.game.scoringSystem.getCurrentHoleStrokes()
            },
            this
        );
    }
    
    /**
     * Reset ball to last safe position
     */
    resetBall() {
        if (!this.ball) return;
        
        // Reset the ball's physics
        this.ball.resetVelocity();
        
        // Move ball to last safe position
        this.ball.setPosition(
            this.lastBallPosition.x,
            this.lastBallPosition.y,
            this.lastBallPosition.z
        );
        
        // Set the state to not in motion
        this.game.stateManager.setBallInMotion(false);
        
        // Clear the reset ball state flag
        this.game.stateManager.setState('resetBall', false);
        
        // Publish ball reset event
        this.game.eventManager.publish(
            EventTypes.BALL_RESET, 
            { position: this.ball.mesh.position.clone() },
            this
        );
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
        if (this.ball) {
            this.ball.cleanup();
            this.ball = null;
        }
    }
} 