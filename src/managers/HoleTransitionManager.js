import { EventTypes } from '../events/EventTypes';
import * as CANNON from 'cannon-es';
import { GameState } from '../states/GameState';

/**
 * HoleTransitionManager - Handles transitions between holes
 */
export class HoleTransitionManager {
    constructor(game) {
        this.game = game;
        this.transitionInProgress = false;
    }

    /**
     * Initialize the hole transition manager
     */
    init() {
        this.setupEventListeners();
        return this;
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for hole started events
        this.game.eventManager.subscribe(
            EventTypes.HOLE_STARTED,
            this.handleHoleStarted,
            this
        );
    }

    /**
     * Handle hole started event
     */
    handleHoleStarted(event) {
        this.setupNewHole();
    }

    /**
     * Transition to the next hole
     * @returns {boolean} Whether the transition was successful
     */
    async transitionToNextHole() {
        if (this.transitionInProgress || !this.game.course.hasNextHole()) {
            return false;
        }

        this.transitionInProgress = true;
        
        // Get next hole
        const nextHole = this.game.course.getNextHole();
        if (!nextHole) {
            console.error('Invalid hole configuration for transition');
            this.transitionInProgress = false;
            return false;
        }

        // Get the ball
        const ball = this.game.ballManager.ball;
        if (!ball) {
            console.error('No ball found for transition');
            this.transitionInProgress = false;
            return false;
        }

        // Stop ball physics
        ball.body.velocity.set(0, 0, 0);
        ball.body.angularVelocity.set(0, 0, 0);
        
        // Load next hole immediately
        this.game.course.loadNextHole();
        
        // Reset ball position to new tee
        const newTeePosition = nextHole.startPosition.clone();
        newTeePosition.y += 0.2; // Lift slightly above the tee
        ball.setPosition(newTeePosition.x, newTeePosition.y, newTeePosition.z);
        
        // Reset ball physics
        ball.body.collisionFilterMask = 1 | 2; // Collide with ground and triggers
        ball.isSuckedIntoHole = false;
        if (ball.body.gravity) {
            ball.body.gravity.set(0, -9.81, 0);
        }
        
        // Update game state
        this.game.stateManager.setGameState(GameState.AIMING);
        this.transitionInProgress = false;

        return true;
    }

    /**
     * Clean up current hole
     */
    cleanupCurrentHole() {
        // Remove current ball
        if (this.game.ballManager.ball) {
            this.game.ballManager.removeBall();
        }

        // Reset physics world
        this.game.physicsWorld.reset();

        // Clean up temporary objects
        this.cleanupTemporaryObjects();

        // Reset state
        this.game.stateManager.resetForNextHole();
    }

    /**
     * Clean up temporary objects
     */
    cleanupTemporaryObjects() {
        // Remove objects marked as temporary
        this.game.scene.traverse((object) => {
            if (object.userData && object.userData.temporary) {
                // Dispose of any materials or textures
                if (object.material) {
                    if (object.material.map) object.material.map.dispose();
                    if (object.material.normalMap) object.material.normalMap.dispose();
                    if (object.material.roughnessMap) object.material.roughnessMap.dispose();
                    if (object.material.metalnessMap) object.material.metalnessMap.dispose();
                    object.material.dispose();
                }
                
                // Remove from scene
                this.game.scene.remove(object);
            }
        });

        // Clear any temporary data from the game state
        if (this.game.stateManager.state.temporaryObjects) {
            this.game.stateManager.state.temporaryObjects = [];
        }
    }

    /**
     * Setup a new hole
     */
    setupNewHole() {
        // Get the new hole's start position
        const startPosition = this.game.course.getHoleStartPosition();

        // Recreate ball at the new start position
        this.game.ballManager.createBall();
        
        // Position ball for new hole
        if (this.game.ballManager.ball) {
            this.game.ballManager.ball.setPosition(
                startPosition.x,
                startPosition.y,
                startPosition.z
            );
            this.game.ballManager.ball.resetVelocity();
        }

        // Update camera
        this.updateCameraForHole();

        // Reset any temporary state
        this.game.stateManager.state.temporaryObjects = [];
        this.game.stateManager.state.activeEffects = [];

        // Publish hole started event
        const holeNumber = this.game.stateManager.getCurrentHoleNumber();
        this.game.eventManager.publish(
            EventTypes.HOLE_STARTED,
            {
                holeNumber: holeNumber
            },
            this
        );
    }

    /**
     * Update camera for the new hole
     */
    updateCameraForHole() {
        if (this.game.cameraController) {
            this.game.cameraController.positionCameraForHole();
        }
    }

    /**
     * Handle game completion
     */
    completeGame() {
        // Set game over state
        this.game.stateManager.setGameOver(true);

        // Get final score data
        const totalStrokes = this.game.scoringSystem.getTotalStrokes();

        // Publish game completed event
        this.game.eventManager.publish(
            EventTypes.GAME_COMPLETED,
            {
                totalStrokes: totalStrokes
            },
            this
        );
    }

    /**
     * Clean up resources
     */
    cleanup() {
        // Clean up any remaining temporary objects
        this.cleanupTemporaryObjects();
        
        // Reset transition state
        this.transitionInProgress = false;
    }
} 