import * as THREE from 'three';
import { EventTypes } from '../events/EventTypes';

/**
 * HoleManager - Handles hole completion and progression
 */
export class HoleManager {
    constructor(game) {
        this.game = game;
    }
    
    /**
     * Initialize the hole manager
     */
    init() {
        this.setupEventListeners();
        return this;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for UI button click events
        this.game.eventManager.subscribe(
            EventTypes.UI_BUTTON_CLICKED,
            this.handleUIButtonClick,
            this
        );
    }
    
    /**
     * Handle UI button clicks
     * @param {GameEvent} event - Button click event
     */
    handleUIButtonClick(event) {
        const buttonId = event.get('buttonId');
        
        // Handle continue button click to go to next hole
        if (buttonId === 'continue-button') {
            this.nextHole();
        }
    }
    
    /**
     * Check if the ball is in the hole
     * @returns {boolean} Whether the ball went in the hole
     */
    checkBallInHole() {
        // Early exit if conditions aren't met
        if (!this.game.ballManager.ball || !this.game.course || this.game.stateManager.isHoleCompleted()) {
            return false;
        }
        
        // Get the current hole position
        const holePosition = this.game.course.getHolePosition();
        if (!holePosition) {
            return false;
        }
        
        // Update the ball's current hole position reference
        this.updateBallHoleReference(holePosition);
        
        // Check if ball meets hole-in criteria
        if (this.isBallInHole(holePosition)) {
            this.game.debugManager.log(`Ball in hole! Success!`);
            
            // Handle hole completion effects and logic
            this.completeBallInHole();
            return true;
        }
        
        return false;
    }
    
    /**
     * Update the ball's reference to the current hole position
     * @param {THREE.Vector3} holePosition - Current hole position
     */
    updateBallHoleReference(holePosition) {
        const ball = this.game.ballManager.ball;
        if (!ball) return;
        
        if (ball.currentHolePosition) {
            ball.currentHolePosition.copy(holePosition);
        } else {
            ball.currentHolePosition = holePosition.clone();
        }
    }
    
    /**
     * Determines if the ball is in the hole based on position and movement
     * @param {THREE.Vector3} holePosition - Current hole position
     * @returns {boolean} Whether the ball is in the hole
     */
    isBallInHole(holePosition) {
        const ball = this.game.ballManager.ball;
        const ballPosition = ball.mesh.position.clone();
        
        // Calculate distance from ball to hole center
        const distanceToHole = ballPosition.distanceTo(holePosition);
        
        // Check hole entry conditions:
        // 1. Ball is close enough to hole center
        const isCloseToHole = distanceToHole < 0.3; // Slightly smaller than hole radius
        
        // 2. Ball is either stopped or fallen below surface level
        const isStopped = ball.isStopped();
        const isBelowSurface = ballPosition.y < holePosition.y - 0.1;
        
        return (isCloseToHole && (isStopped || isBelowSurface));
    }
    
    /**
     * Handle the ball going in the hole
     */
    completeBallInHole() {
        const ball = this.game.ballManager.ball;
        if (!ball) return;
        
        // Set game state to hole completed
        this.game.stateManager.setHoleCompleted(true);
        
        // Get score data
        const holeScore = this.game.scoringSystem.getCurrentHoleStrokes();
        const totalScore = this.game.scoringSystem.getTotalStrokes();
        const holeNumber = this.game.stateManager.getCurrentHoleNumber();
        
        // Trigger the ball success effect through events
        this.game.eventManager.publish(
            EventTypes.BALL_IN_HOLE,
            {
                holeNumber: holeNumber,
                holeScore: holeScore,
                totalScore: totalScore,
                position: ball.mesh.position.clone()
            },
            this
        );
        
        // Dispatch hole completed event
        this.game.eventManager.publish(
            EventTypes.HOLE_COMPLETED,
            {
                holeNumber: holeNumber,
                holeScore: holeScore,
                totalScore: totalScore
            },
            this
        );
        
        // Show continue button to move to next hole after delay
        setTimeout(() => {
            if (this.game.stateManager.isHoleCompleted()) {
                this.game.uiManager.showContinueButton();
            }
        }, 1500);
    }
    
    /**
     * Process to next hole in sequence
     */
    nextHole() {
        // Check if course has more holes
        if (this.game.course && this.game.course.hasNextHole()) {
            // Advance to next hole
            this.game.course.loadNextHole();
            
            // Reset state
            this.game.stateManager.resetForNextHole();
            
            // Recreate ball
            this.game.ballManager.createBall();
            
            // Update camera
            this.game.cameraController.positionCameraForHole();
            
            // Publish hole started event
            const holeNumber = this.game.stateManager.getCurrentHoleNumber();
            this.game.eventManager.publish(
                EventTypes.HOLE_STARTED,
                {
                    holeNumber: holeNumber
                },
                this
            );
            
            return true;
        } else {
            // No more holes, game is complete
            this.completeGame();
            return false;
        }
    }
    
    /**
     * Handle game completion
     */
    completeGame() {
        // Set game over state
        this.game.stateManager.setGameOver(true);
        
        // Get final score data
        const totalScore = this.game.scoringSystem.getTotalStrokes();
        
        // Publish game completed event
        this.game.eventManager.publish(
            EventTypes.GAME_COMPLETED,
            {
                totalScore: totalScore,
                holeScores: this.game.scoringSystem.getHoleScores()
            },
            this
        );
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        // Nothing specific to clean up for now
    }
    
    /**
     * Get the current hole number
     * @returns {number} Current hole number (1-based index)
     */
    getCurrentHoleNumber() {
        // Use the state manager to get the current hole number
        return this.game.stateManager ? this.game.stateManager.getCurrentHoleNumber() : 1;
    }
} 