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
        this.state.currentGameState = newState;
        
        // Notify listeners of state change
        this.game.eventManager.publish(
            EventTypes.GAME_STATE_CHANGED,
            {
                oldState: oldState,
                newState: newState
            },
            this
        );
        
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
        this.state.holeCompleted = false;
        this.state.ballInMotion = false;
        this.state.currentHoleNumber++;
        this.setGameState(GameState.AIMING);
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