import { EventTypes } from '../events/EventTypes';

/**
 * UIManager - Handles all UI elements and interactions for the game
 * Extracts UI management from Game.js to improve modularity
 */
export class UIManager {
    constructor(game) {
        // Reference to the main game
        this.game = game;
        
        // Track state and UI elements
        this.isShowingMessage = false;
        this.messageTimeoutId = null;
        this.messageTimeout = null;
        this.messageElement = null;
        this.scoreElement = null;
        this.strokesElement = null;
        this.debugElement = null;
        this.powerIndicator = null;
        this.continueButton = null;
        this.scoreScreen = null;
    }
    
    /**
     * Initialize the UI elements
     */
    init() {
        this.createUIElements();
        this.setupEventListeners();
        return this;
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for hole completed events
        this.game.eventManager.subscribe(
            EventTypes.HOLE_COMPLETED,
            this.handleHoleCompleted,
            this
        );
        
        // Listen for hole started events
        this.game.eventManager.subscribe(
            EventTypes.HOLE_STARTED,
            this.handleHoleStarted,
            this
        );
        
        // Listen for game completed events
        this.game.eventManager.subscribe(
            EventTypes.GAME_COMPLETED,
            this.handleGameCompleted,
            this
        );
        
        // Listen for ball hit events to update strokes
        this.game.eventManager.subscribe(
            EventTypes.BALL_HIT,
            this.handleBallHit,
            this
        );
        
        // Listen for ball in hole events
        this.game.eventManager.subscribe(
            EventTypes.BALL_IN_HOLE,
            this.handleBallInHole,
            this
        );
        
        // Listen for hazard events
        this.game.eventManager.subscribe(
            EventTypes.HAZARD_DETECTED,
            this.handleHazardDetected,
            this
        );
    }
    
    /**
     * Create UI elements
     */
    createUIElements() {
        // Create message element
        this.messageElement = document.getElementById('message-container');
        if (!this.messageElement) {
            this.messageElement = document.createElement('div');
            this.messageElement.id = 'message-container';
            document.body.appendChild(this.messageElement);
        }
        
        // Create score elements
        this.scoreElement = document.getElementById('score-container');
        if (!this.scoreElement) {
            this.scoreElement = document.createElement('div');
            this.scoreElement.id = 'score-container';
            document.body.appendChild(this.scoreElement);
            
            this.strokesElement = document.createElement('div');
            this.strokesElement.id = 'strokes-display';
            this.scoreElement.appendChild(this.strokesElement);
        }
        
        // Create debug display
        this.debugElement = document.getElementById('debug-display');
        if (!this.debugElement && this.game.debugManager.enabled) {
            this.debugElement = document.createElement('div');
            this.debugElement.id = 'debug-display';
            document.body.appendChild(this.debugElement);
        }
        
        // Create power indicator
        this.powerIndicator = document.getElementById('power-indicator');
        if (!this.powerIndicator) {
            this.powerIndicator = document.createElement('div');
            this.powerIndicator.id = 'power-indicator';
            this.powerIndicator.innerHTML = '<div id="power-level"></div>';
            document.body.appendChild(this.powerIndicator);
        }
        
        // Create continue button
        this.continueButton = document.getElementById('continue-button');
        if (!this.continueButton) {
            this.continueButton = document.createElement('button');
            this.continueButton.id = 'continue-button';
            this.continueButton.textContent = 'Continue';
            this.continueButton.style.display = 'none';
            document.body.appendChild(this.continueButton);
            
            // Add event listener
            this.continueButton.addEventListener('click', () => {
                // Publish button click event
                this.game.eventManager.publish(
                    EventTypes.UI_BUTTON_CLICKED,
                    { buttonId: 'continue-button' },
                    this
                );
                
                // Hide the button
                this.continueButton.style.display = 'none';
            });
        }
        
        // Create final score screen
        this.scoreScreen = document.getElementById('score-screen');
        if (!this.scoreScreen) {
            this.scoreScreen = document.createElement('div');
            this.scoreScreen.id = 'score-screen';
            this.scoreScreen.innerHTML = `
                <div id="final-score-container">
                    <h2>Game Complete!</h2>
                    <div id="final-score"></div>
                    <button id="restart-button">Play Again</button>
                </div>
            `;
            this.scoreScreen.style.display = 'none';
            document.body.appendChild(this.scoreScreen);
            
            // Add event listener to restart button
            const restartButton = this.scoreScreen.querySelector('#restart-button');
            if (restartButton) {
                restartButton.addEventListener('click', () => {
                    // Publish button click event
                    this.game.eventManager.publish(
                        EventTypes.UI_BUTTON_CLICKED,
                        { buttonId: 'restart-button' },
                        this
                    );
                    
                    // Hide the score screen
                    this.scoreScreen.style.display = 'none';
                    
                    // Reload the page to restart
                    window.location.reload();
                });
            }
        }
        
        // Initial UI update
        this.updateScore();
        this.updateStrokes();
    }
    
    /**
     * Handle hole completed event
     * @param {GameEvent} event - Hole completed event
     */
    handleHoleCompleted(event) {
        const holeNumber = event.get('holeNumber');
        const totalStrokes = this.game.scoringSystem.getTotalStrokes();
        
        // Show message with total strokes
        const message = `Hole ${holeNumber} completed! Total strokes so far: ${totalStrokes}`;
        this.showMessage(message, 3000);
        
        // Update score display
        this.updateScore();
    }
    
    /**
     * Handle hole started event
     * @param {GameEvent} event - Hole started event
     */
    handleHoleStarted(event) {
        const holeNumber = event.get('holeNumber');
        
        // Show message
        this.showMessage(`Hole ${holeNumber}`, 2000);
        
        // Update UI
        this.updateHoleNumber();
        this.updateScore();
    }
    
    /**
     * Handle game completed event
     * @param {GameEvent} event - Game completed event
     */
    handleGameCompleted(event) {
        const totalStrokes = event.get('totalStrokes');
        
        // Show message
        const message = `Game completed! Final score: ${totalStrokes}`;
        this.showMessage(message, 5000);
        
        // Show final score screen
        this.showFinalScore(totalStrokes);
    }
    
    /**
     * Handle ball hit event
     * @param {GameEvent} event - Ball hit event
     */
    handleBallHit(event) {
        // Update strokes display
        this.updateStrokes();
    }
    
    /**
     * Handle ball in hole event
     * @param {GameEvent} event - Ball in hole event
     */
    handleBallInHole(event) {
        // Show continue button after delay
        setTimeout(() => {
            if (this.game.stateManager.isHoleCompleted()) {
                this.showContinueButton();
            }
        }, 1500);
    }
    
    /**
     * Handle hazard detected event
     * @param {GameEvent} event - Hazard detected event
     */
    handleHazardDetected(event) {
        const hazardType = event.get('hazardType');
        
        // Show appropriate message based on hazard type
        if (hazardType === EventTypes.HAZARD_WATER) {
            this.showMessage("Water hazard! +1 stroke penalty.", 2000);
        } else if (hazardType === EventTypes.HAZARD_OUT_OF_BOUNDS) {
            this.showMessage("Out of bounds! +1 stroke penalty.", 2000);
        }
        
        // Update strokes
        this.updateStrokes();
    }
    
    /**
     * Attach WebGL renderer to DOM
     * @param {THREE.WebGLRenderer} renderer - The Three.js renderer
     */
    attachRenderer(renderer) {
        if (!renderer) return;
        
        const container = document.getElementById('game-container');
        if (container) {
            container.appendChild(renderer.domElement);
        } else {
            document.body.appendChild(renderer.domElement);
        }
    }
    
    /**
     * Show a message to the player
     * @param {string} message - Message to show
     * @param {number} duration - Duration in milliseconds
     */
    showMessage(message, duration = 2000) {
        if (!this.messageElement) return;
        
        // Clear existing timeout
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }
        
        // Set message
        this.messageElement.textContent = message;
        this.messageElement.classList.add('visible');
        
        // Set timeout to hide message
        this.messageTimeout = setTimeout(() => {
            this.messageElement.classList.remove('visible');
        }, duration);
    }
    
    /**
     * Update score display
     */
    updateScore() {
        if (!this.scoreElement) return;
        
        const holeNumber = this.game.course ? this.game.course.getCurrentHoleNumber() : 1;
        const totalStrokes = this.game.scoringSystem.getTotalStrokes();
        
        this.scoreElement.innerHTML = `<div>Hole: ${holeNumber}</div><div>Total Strokes: ${totalStrokes}</div>`;
    }
    
    /**
     * Update current hole number display
     */
    updateHoleNumber() {
        if (!this.scoreElement) return;
        
        // Get hole number directly from the course
        const holeNumber = this.game.course ? this.game.course.getCurrentHoleNumber() : 1;
        const holeElement = this.scoreElement.querySelector('div:first-child');
        
        if (holeElement) {
            holeElement.textContent = `Hole: ${holeNumber}`;
        }
    }
    
    /**
     * Update strokes display
     */
    updateStrokes() {
        if (!this.strokesElement) return;
        
        const strokes = this.game.scoringSystem.getTotalStrokes();
        this.strokesElement.textContent = `Total Strokes: ${strokes}`;
    }
    
    /**
     * Update debug display
     * @param {object} debugInfo - Debug information to display
     */
    updateDebugDisplay(debugInfo) {
        if (!this.debugElement || !debugInfo) return;
        
        let html = '<div class="debug-title">Debug Info</div>';
        
        for (const [key, value] of Object.entries(debugInfo)) {
            html += `<div><strong>${key}:</strong> ${value}</div>`;
        }
        
        this.debugElement.innerHTML = html;
    }
    
    /**
     * Show continue button
     */
    showContinueButton() {
        if (!this.continueButton) return;
        
        this.continueButton.style.display = 'block';
    }
    
    /**
     * Show final score screen
     * @param {number} score - Final score
     */
    showFinalScore(score) {
        if (!this.scoreScreen) return;
        
        const finalScoreElement = this.scoreScreen.querySelector('#final-score');
        if (finalScoreElement) {
            finalScoreElement.textContent = `Final Score: ${score}`;
        }
        
        this.scoreScreen.style.display = 'flex';
    }
    
    /**
     * Show scorecard at the end of hole
     * @param {Object} scoreData - Data with score (strokes, par)
     * @param {Function} onContinue - Callback when player clicks to continue
     */
    showScorecard(scoreData, onContinue) {
        // Simplified scorecard display as an alternative to the removed component
        if (!this.scoreScreen) return;
        
        const finalScoreElement = this.scoreScreen.querySelector('#final-score');
        if (finalScoreElement) {
            finalScoreElement.textContent = `Total Strokes: ${scoreData.strokes}`;
        }
        
        this.scoreScreen.style.display = 'flex';
    }
    
    /**
     * Clean up UI resources
     */
    cleanup() {
        // Hide and clean up any message
        if (this.messageElement && this.messageElement.parentNode) {
            this.messageElement.parentNode.removeChild(this.messageElement);
        }
        
        // Clear any existing message timeout
        if (this.messageTimeoutId) {
            clearTimeout(this.messageTimeoutId);
            this.messageTimeoutId = null;
        }
        
        // Clean up other UI elements
        if (this.scoreElement && this.scoreElement.parentNode) {
            this.scoreElement.parentNode.removeChild(this.scoreElement);
        }
        
        // Reset state
        this.isShowingMessage = false;
        
        return this;
    }
} 