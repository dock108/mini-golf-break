import * as THREE from 'three';
import { EventTypes } from '../events/EventTypes';

/**
 * HazardManager - Handles hazard detection and responses (water, out-of-bounds)
 * Extracts hazard management from Game.js to improve modularity
 */
export class HazardManager {
    constructor(game) {
        // Reference to the main game
        this.game = game;
        
        // Safe position reference
        this.lastSafePosition = new THREE.Vector3();
        this.waterHazards = [];
        this.boundaryLimits = {
            minX: -50,
            maxX: 50,
            minZ: -50,
            maxZ: 50,
            minY: -10 // Below this height, ball is considered lost
        };
    }
    
    /**
     * Initialize the hazard manager
     */
    init() {
        // Initialize last safe position with a default value
        this.lastSafePosition = new THREE.Vector3(0, 0, 0);
        this.setupEventListeners();
        return this;
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for ball hit events to update the last safe position
        this.game.eventManager.subscribe(
            EventTypes.BALL_STOPPED,
            this.handleBallStopped,
            this
        );
        
        // Listen for ball created events
        this.game.eventManager.subscribe(
            EventTypes.BALL_CREATED,
            this.handleBallCreated,
            this
        );
        
        // Listen for ball moved events to check hazards
        this.game.eventManager.subscribe(
            EventTypes.BALL_MOVED,
            this.handleBallMoved,
            this
        );
    }
    
    /**
     * Handle ball stopped event
     * @param {GameEvent} event - Ball stopped event
     */
    handleBallStopped(event) {
        const position = event.get('position');
        if (position) {
            this.updateLastSafePosition(position);
        }
    }
    
    /**
     * Handle ball created event
     * @param {GameEvent} event - Ball created event
     */
    handleBallCreated(event) {
        const position = event.get('position');
        if (position) {
            this.updateLastSafePosition(position);
        }
    }
    
    /**
     * Handle ball moved event
     * @param {GameEvent} event - Ball moved event
     */
    handleBallMoved(event) {
        // Check if the ball is in a hazard
        this.checkHazards();
    }
    
    /**
     * Update the last safe position
     * @param {THREE.Vector3} position - Safe position to store
     */
    updateLastSafePosition(position) {
        // Don't update if position is in a hazard
        if (this.isPositionInHazard(position)) {
            return;
        }
        
        this.lastSafePosition.copy(position);
    }
    
    /**
     * Check if the position is in any hazard
     * @param {THREE.Vector3} position - Position to check
     * @returns {boolean} True if in a hazard
     */
    isPositionInHazard(position) {
        return this.isPositionInWater(position) || this.isPositionOutOfBounds(position);
    }
    
    /**
     * Check if the ball is in any hazards
     */
    checkHazards() {
        if (!this.game.ballManager || !this.game.ballManager.ball) {
            return false;
        }
        
        const ball = this.game.ballManager.ball;
        const position = ball.mesh.position;
        
        // Check if ball is below minimum height (lost ball)
        if (position.y < this.boundaryLimits.minY) {
            this.handleBallOutOfBounds();
            return true;
        }
        
        // Check if ball is out of bounds
        if (this.isPositionOutOfBounds(position)) {
            this.handleBallOutOfBounds();
            return true;
        }
        
        // Check if ball is in water
        if (this.isPositionInWater(position)) {
            this.handleBallInWater();
            return true;
        }
        
        return false;
    }
    
    /**
     * Check if the ball is in water
     * @param {THREE.Vector3} position - Position to check
     * @returns {boolean} True if in water
     */
    isPositionInWater(position) {
        for (const waterHazard of this.waterHazards) {
            if (position.x > waterHazard.minX && position.x < waterHazard.maxX &&
                position.z > waterHazard.minZ && position.z < waterHazard.maxZ &&
                position.y < waterHazard.height) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Check if position is outside the course boundaries
     * @param {THREE.Vector3} position - Position to check
     * @returns {boolean} True if out of bounds
     */
    isPositionOutOfBounds(position) {
        return (
            position.x < this.boundaryLimits.minX ||
            position.x > this.boundaryLimits.maxX ||
            position.z < this.boundaryLimits.minZ ||
            position.z > this.boundaryLimits.maxZ
        );
    }
    
    /**
     * Handle the ball going out of bounds
     */
    handleBallOutOfBounds() {
        this.game.debugManager.log("Ball out of bounds - applying penalty");
        
        // Show message to player
        this.game.uiManager.showMessage("Out of bounds! +1 stroke penalty.", 2000);
        
        // Publish hazard detected event
        this.game.eventManager.publish(
            EventTypes.HAZARD_DETECTED,
            {
                hazardType: EventTypes.HAZARD_OUT_OF_BOUNDS,
                penalty: 1,
                lastSafePosition: this.lastSafePosition.clone()
            },
            this
        );
    }
    
    /**
     * Handle the ball going in water
     */
    handleBallInWater() {
        this.game.debugManager.log("Ball in water - applying penalty");
        
        // Show message to player
        this.game.uiManager.showMessage("Water hazard! +1 stroke penalty.", 2000);
        
        // Publish hazard detected event
        this.game.eventManager.publish(
            EventTypes.HAZARD_DETECTED,
            {
                hazardType: EventTypes.HAZARD_WATER,
                penalty: 1,
                lastSafePosition: this.lastSafePosition.clone()
            },
            this
        );
    }
    
    /**
     * Add a water hazard to the course
     * @param {object} bounds - The bounds of the water hazard
     */
    addWaterHazard(bounds) {
        this.waterHazards.push(bounds);
    }
    
    /**
     * Set course boundary limits
     * @param {object} limits - The boundary limits
     */
    setBoundaryLimits(limits) {
        Object.assign(this.boundaryLimits, limits);
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        // Nothing to clean up for now
    }
} 