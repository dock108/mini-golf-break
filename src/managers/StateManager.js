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
     * Reset the game state to default values
     */
    resetState() {
        this.state.ballInMotion = false;
        this.state.holeCompleted = false;
        this.state.resetBall = false;
        this.state.gameOver = false;
        
        this._notifyStateChange();
        return this;
    }
    
    /**
     * Set a specific state property
     * @param {string} property - The property to set
     * @param {any} value - The value to set
     */
    setState(property, value) {
        if (this.state.hasOwnProperty(property)) {
            const oldValue = this.state[property];
            this.state[property] = value;
            
            // Notify listeners if value changed
            if (oldValue !== value) {
                this._notifyStateChange(property, value, oldValue);
            }
        }
        return this;
    }
    
    /**
     * Get a specific state property
     * @param {string} property - The property to get
     * @returns {any} The value of the property
     */
    getState(property) {
        return this.state[property];
    }
    
    /**
     * Mark the ball as in motion
     */
    setBallInMotion(isMoving) {
        const wasMoving = this.state.ballInMotion;
        this.state.ballInMotion = isMoving;
        
        // If ball just stopped moving and hole is not completed
        if (wasMoving && !isMoving) {
            this._notifyBallStopped();
        }
        
        return this;
    }
    
    /**
     * Mark the current hole as completed
     */
    setHoleCompleted() {
        this.state.holeCompleted = true;
        this._notifyHoleCompleted();
        return this;
    }
    
    /**
     * Check if the ball is in motion
     */
    isBallInMotion() {
        return this.state.ballInMotion;
    }
    
    /**
     * Check if the hole is completed
     */
    isHoleCompleted() {
        return this.state.holeCompleted;
    }
    
    /**
     * Register callback for hole completed event
     * @param {Function} callback - Function to call when hole is completed
     */
    onHoleCompleted(callback) {
        this.eventCallbacks.onHoleCompleted.push(callback);
        return this;
    }
    
    /**
     * Register callback for ball stopped event
     * @param {Function} callback - Function to call when ball stops moving
     */
    onBallStopped(callback) {
        this.eventCallbacks.onBallStopped.push(callback);
        return this;
    }
    
    /**
     * Register callback for ball hit event
     * @param {Function} callback - Function to call when ball is hit
     */
    onBallHit(callback) {
        this.eventCallbacks.onBallHit.push(callback);
        return this;
    }
    
    /**
     * Register callback for general state changes
     * @param {Function} callback - Function to call when state changes
     */
    onStateChange(callback) {
        this.eventCallbacks.onStateChange.push(callback);
        return this;
    }
    
    /**
     * Notify listeners that ball has stopped
     * @private
     */
    _notifyBallStopped() {
        this.eventCallbacks.onBallStopped.forEach(callback => callback());
    }
    
    /**
     * Notify listeners that hole has been completed
     * @private
     */
    _notifyHoleCompleted() {
        this.eventCallbacks.onHoleCompleted.forEach(callback => callback());
    }
    
    /**
     * Notify listeners that ball has been hit
     * @private
     */
    _notifyBallHit() {
        this.eventCallbacks.onBallHit.forEach(callback => callback());
    }
    
    /**
     * Notify listeners that state has changed
     * @private
     */
    _notifyStateChange(property = null, newValue = null, oldValue = null) {
        this.eventCallbacks.onStateChange.forEach(callback => 
            callback(property, newValue, oldValue)
        );
    }
    
    /**
     * Get the current hole number
     * @returns {number} Current hole number (1-based index)
     */
    getCurrentHoleNumber() {
        return this.state.currentHoleNumber;
    }
    
    /**
     * Increment the hole number
     * @returns {StateManager} this for chaining
     */
    incrementHoleNumber() {
        this.state.currentHoleNumber++;
        this._notifyStateChange('currentHoleNumber', this.state.currentHoleNumber);
        return this;
    }
    
    /**
     * Reset the hole number to 1
     * @returns {StateManager} this for chaining
     */
    resetHoleNumber() {
        this.state.currentHoleNumber = 1;
        this._notifyStateChange('currentHoleNumber', this.state.currentHoleNumber);
        return this;
    }
} 