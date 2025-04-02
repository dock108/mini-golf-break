import { GameState } from '../states/GameState';
import { EventTypes } from '../events/EventTypes';

/**
 * StateManager - Handles game state and provides a central point for state changes
 * Extracts state management from Game.js to improve modularity
 */
export class StateManager {
    constructor(game) {
        // Reference to the main game
        this.game = game;
        
        // Initialize game state
        this.state = {
            // Ball state
            ballInMotion: false,
            
            // Hole state
            holeCompleted: false,
            currentHoleNumber: 1,
            
            // Game flow
            resetBall: false,
            gameOver: false,
            gameStarted: false,
            currentGameState: GameState.INITIALIZING,
            
            // UI state
            showingMessage: false,
            
            // Debug state
            debugMode: false
        };
        
        // Event callbacks
        this.eventCallbacks = {
            onHoleCompleted: [],
            onBallStopped: [],
            onBallHit: [],
            onStateChange: []
        };
    }
    
    /**
     * Set the current game state
     * @param {GameState} newState - The new game state to set
     */
    setGameState(newState) {
        const oldState = this.state.currentGameState;
        console.log(`[StateManager.setGameState] Changing state from ${oldState} to ${newState}`);
        this.state.currentGameState = newState;
        
        // Notify listeners of state change
        this.game.eventManager.publish(
            EventTypes.STATE_CHANGED,
            {
                oldState: oldState,
                newState: newState
            },
            this
        );
        
        // Also publish specific game completed event if applicable
        if (newState === GameState.GAME_COMPLETED) {
            this.game.eventManager.publish(EventTypes.GAME_COMPLETED, { timestamp: Date.now() }, this);
            console.log(`[StateManager.setGameState] Published GAME_COMPLETED event.`);
        }
        
        return this;
    }
    
    /**
     * Get the current game state
     * @returns {GameState} The current game state
     */
    getGameState() {
        return this.state.currentGameState;
    }
    
    /**
     * Check if the game is in a specific state
     * @param {GameState} state - The state to check
     * @returns {boolean} Whether the game is in the specified state
     */
    isInState(state) {
        return this.state.currentGameState === state;
    }
    
    /**
     * Set whether the ball is in motion
     * @param {boolean} isMoving - Whether the ball is moving
     */
    setBallInMotion(isMoving) {
        this.state.ballInMotion = isMoving;
        return this;
    }
    
    /**
     * Check if the ball is in motion
     * @returns {boolean} Whether the ball is moving
     */
    isBallInMotion() {
        return this.state.ballInMotion;
    }
    
    /**
     * Set whether the current hole is completed
     * @param {boolean} isCompleted - Whether the hole is completed
     */
    setHoleCompleted(isCompleted) {
        this.state.holeCompleted = isCompleted;
        if (isCompleted) {
            this.setGameState(GameState.HOLE_COMPLETED);
            this._notifyHoleCompleted();
        }
        return this;
    }
    
    /**
     * Check if the current hole is completed
     * @returns {boolean} Whether the hole is completed
     */
    isHoleCompleted() {
        return this.state.holeCompleted;
    }
    
    /**
     * Get the current hole number
     * @returns {number} The current hole number
     */
    getCurrentHoleNumber() {
        return this.state.currentHoleNumber;
    }
    
    /**
     * Set the game as over
     * @param {boolean} isOver - Whether the game is over
     */
    setGameOver(isOver) {
        this.state.gameOver = isOver;
        if (isOver) {
            this.setGameState(GameState.GAME_COMPLETED);
        }
        return this;
    }
    
    /**
     * Check if the game is over
     * @returns {boolean} Whether the game is over
     */
    isGameOver() {
        return this.state.gameOver;
    }
    
    /**
     * Reset state for the next hole
     */
    resetForNextHole() {
        // Get total holes from course and current hole
        const totalHoles = this.game.course.getTotalHoles();
        const currentHole = this.state.currentHoleNumber;
        
        console.log(`[StateManager] Current hole: ${currentHole}, Total holes: ${totalHoles}`);
        
        // Check if we're PAST the last hole (not AT it)
        if (currentHole > totalHoles) {
            console.warn('[StateManager] No more holes available - past last hole');
            this.setGameState(GameState.GAME_COMPLETED);
            return this;
        }
        
        // Only increment if we're not at or past the last hole
        if (currentHole < totalHoles) {
            this.state.currentHoleNumber++;
            console.log(`[StateManager] Incremented hole number to ${this.state.currentHoleNumber}`);
        }
        
        // Reset hole state
        this.state.holeCompleted = false;
        this.state.ballInMotion = false;
        
        // Reset current strokes in scoring system
        if (this.game.scoringSystem) {
            this.game.scoringSystem.resetCurrentStrokes();
            console.log('[StateManager] Called scoringSystem.resetCurrentStrokes()');
        } else {
            console.warn('[StateManager] ScoringSystem not found, cannot reset strokes.');
        }
        
        // Set game state to aiming
        this.setGameState(GameState.AIMING);
        
        // Log the transition
        console.log(`[StateManager] Reset for hole ${this.state.currentHoleNumber} of ${totalHoles}`);
        
        // --- Publish HOLE_STARTED event --- 
        if (this.game.eventManager) {
            this.game.eventManager.publish(
                EventTypes.HOLE_STARTED,
                { holeNumber: this.state.currentHoleNumber }, // Pass the updated hole number
                this
            );
            console.log(`[StateManager] Published HOLE_STARTED event for hole ${this.state.currentHoleNumber}`);
        } else {
            console.error('[StateManager] EventManager not found, cannot publish HOLE_STARTED.');
        }
        // --- End Publish --- 

        return this;
    }
    
    /**
     * Reset all game state to initial values
     */
    resetState() {
        // Reset ball state
        this.state.ballInMotion = false;
        
        // Reset hole state
        this.state.holeCompleted = false;
        this.state.currentHoleNumber = 1;
        
        // Reset game flow
        this.state.resetBall = false;
        this.state.gameOver = false;
        this.state.gameStarted = false;
        
        // Set initial game state
        this.setGameState(GameState.INITIALIZING);
        
        // Reset UI state
        this.state.showingMessage = false;
        
        return this;
    }
    
    /**
     * Notify listeners that a hole was completed
     * @private
     */
    _notifyHoleCompleted() {
        this.eventCallbacks.onHoleCompleted.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Error in hole completed callback:', error);
            }
        });
    }
} 