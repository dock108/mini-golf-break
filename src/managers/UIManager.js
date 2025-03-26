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
        this.scoreScreen = null;
        
        // New UI elements for enhanced display
        this.holeInfoElement = null;
        this.scorecardElement = null;
    }
    
    /**
     * Initialize the UI manager
     */
    init() {
        this.createUI();
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
    createUI() {
        // Clean up any existing UI elements first
        this.cleanup();
        
        // Create main UI container
        this.uiContainer = document.createElement('div');
        this.uiContainer.id = 'ui-container';
        this.uiContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1000;
        `;
        document.body.appendChild(this.uiContainer);

        // Create top-right info container
        const topRightContainer = document.createElement('div');
        topRightContainer.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 10px;
            pointer-events: auto;
        `;
        this.uiContainer.appendChild(topRightContainer);

        // Create score element
        this.scoreElement = document.createElement('div');
        this.scoreElement.style.cssText = `
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 15px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 16px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        topRightContainer.appendChild(this.scoreElement);

        // Create strokes element
        this.strokesElement = document.createElement('div');
        this.strokesElement.style.cssText = `
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 15px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 16px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        topRightContainer.appendChild(this.strokesElement);

        // Create message container (center)
        this.messageElement = document.createElement('div');
        this.messageElement.id = 'message-container';
        this.messageElement.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            text-align: center;
            display: none;
            pointer-events: auto;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            font-size: 16px;
        `;
        this.uiContainer.appendChild(this.messageElement);
        
        // Initial UI updates
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
        
        // Update all UI elements
        this.updateHoleInfo();
        this.updateScorecard();
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
        
        // Update all UI elements
        this.updateHoleInfo();
        this.updateScorecard();
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
        // Update both score and strokes display
        this.updateScore();
        this.updateStrokes();
    }
    
    /**
     * Handle ball in hole event
     * @param {GameEvent} event - Ball in hole event
     */
    handleBallInHole(event) {
        // No need to show continue button anymore as transition is automatic
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
        const currentStrokes = this.game.scoringSystem.getCurrentStrokes();
        
        this.scoreElement.textContent = `Hole: ${holeNumber} | Stroke: ${currentStrokes}`;
    }
    
    /**
     * Update hole information display
     */
    updateHoleInfo() {
        if (!this.holeInfoElement) return;
        
        const holeNumber = this.game.course ? this.game.course.getCurrentHoleNumber() : 1;
        const par = this.game.holeStateManager.getHolePar(holeNumber - 1);
        const strokes = this.game.scoringSystem.getCurrentStrokes();
        
        this.holeInfoElement.innerHTML = `
            <div style="font-size: 1.2em; margin-bottom: 5px;">Hole ${holeNumber}</div>
            <div>Par: ${par}</div>
            <div>Strokes: ${strokes}</div>
        `;
    }
    
    /**
     * Update scorecard display
     */
    updateScorecard() {
        if (!this.scorecardElement) return;
        
        const scorecard = this.game.holeStateManager.getAllHoleStates();
        const totalHoles = this.game.course ? this.game.course.getTotalHoles() : 1;
        
        let html = '<div style="font-size: 1.2em; margin-bottom: 10px;">Scorecard</div>';
        
        for (let i = 0; i < totalHoles; i++) {
            const state = scorecard.get(i) || { par: 3, strokes: null, completed: false };
            const strokeDisplay = state.strokes !== null ? state.strokes : '-';
            const status = state.completed ? '✓' : '';
            
            html += `
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Hole ${i + 1}</span>
                    <span>Par: ${state.par}</span>
                    <span>${strokeDisplay}</span>
                    <span>${status}</span>
                </div>
            `;
        }
        
        this.scorecardElement.innerHTML = html;
    }
    
    /**
     * Update strokes display
     */
    updateStrokes() {
        if (!this.strokesElement) return;
        
        const totalStrokes = this.game.scoringSystem.getTotalStrokes();
        this.strokesElement.textContent = `Total Strokes: ${totalStrokes}`;
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
     * Clean up UI resources
     */
    cleanup() {
        // Remove the entire UI container and all its children
        if (this.uiContainer) {
            this.uiContainer.remove();
            this.uiContainer = null;
        }
        
        // Remove any standalone elements that might have been created
        const elementsToRemove = [
            'score-container',
            'strokes-display',
            'debug-display',
            'power-indicator',
            'score-screen',
            'message-container',
            'error-overlay'
        ];
        
        elementsToRemove.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.remove();
            }
        });
        
        // Reset all element references
        this.holeInfoElement = null;
        this.scorecardElement = null;
        this.messageElement = null;
        this.scoreElement = null;
        this.strokesElement = null;
        this.debugElement = null;
        this.powerIndicator = null;
        this.scoreScreen = null;
        
        // Clear any existing message timeout
        if (this.messageTimeoutId) {
            clearTimeout(this.messageTimeoutId);
            this.messageTimeoutId = null;
        }
        
        // Reset state
        this.isShowingMessage = false;
        
        return this;
    }
} 