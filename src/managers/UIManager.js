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
        console.log('[UIManager.init] Starting...');
        try {
            console.log('[UIManager.init] Creating UI elements...');
            this.createUI();
            console.log('[UIManager.init] UI elements created.');
            console.log('[UIManager.init] Setting up event listeners...');
            this.setupEventListeners();
            console.log('[UIManager.init] Event listeners setup finished.');
            console.log('[UIManager.init] Finished.');
        } catch (error) {
            console.error('[UIManager.init] Failed:', error);
        }
        return this;
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        console.log('[UIManager.setupEventListeners] Starting...');
        if (!this.game.eventManager) {
             console.warn('[UIManager.setupEventListeners] EventManager not available, skipping.');
            return;
        }
        try {
            this.eventSubscriptions = []; // Initialize as empty array

            console.log('[UIManager.setupEventListeners] Subscribing to HOLE_COMPLETED...');
            this.eventSubscriptions.push(this.game.eventManager.subscribe(EventTypes.HOLE_COMPLETED, this.handleHoleCompleted, this));

            console.log('[UIManager.setupEventListeners] Subscribing to HOLE_STARTED...');
            this.eventSubscriptions.push(this.game.eventManager.subscribe(EventTypes.HOLE_STARTED, this.handleHoleStarted, this));

            console.log('[UIManager.setupEventListeners] Subscribing to GAME_COMPLETED...');
            this.eventSubscriptions.push(this.game.eventManager.subscribe(EventTypes.GAME_COMPLETED, this.handleGameCompleted, this));

            console.log('[UIManager.setupEventListeners] Subscribing to BALL_HIT...');
            this.eventSubscriptions.push(this.game.eventManager.subscribe(EventTypes.BALL_HIT, this.handleBallHit, this));

            console.log('[UIManager.setupEventListeners] Subscribing to BALL_IN_HOLE...');
            this.eventSubscriptions.push(this.game.eventManager.subscribe(EventTypes.BALL_IN_HOLE, this.handleBallInHole, this));

            console.log('[UIManager.setupEventListeners] Subscribing to HAZARD_DETECTED...');
            this.eventSubscriptions.push(this.game.eventManager.subscribe(EventTypes.HAZARD_DETECTED, this.handleHazardDetected, this));

            console.log('[UIManager.setupEventListeners] Finished.');
        } catch (error) {
             console.error('[UIManager.setupEventListeners] Failed:', error);
        }
    }
    
    /**
     * Create UI elements
     */
    createUI() {
        console.log('[UIManager.createUI] Starting...');
        // Clean up any existing UI elements first
        this.cleanup();
        
        // Create main UI container
        this.uiContainer = document.createElement('div');
        this.uiContainer.id = 'ui-container';
        this.uiContainer.classList.add('ui-container');
        document.body.appendChild(this.uiContainer);

        // Create top-right info container
        const topRightContainer = document.createElement('div');
        topRightContainer.classList.add('top-right-container');
        this.uiContainer.appendChild(topRightContainer);

        // Create score element
        this.scoreElement = document.createElement('div');
        this.scoreElement.classList.add('info-box');
        topRightContainer.appendChild(this.scoreElement);

        // Create strokes element
        this.strokesElement = document.createElement('div');
        this.strokesElement.classList.add('info-box');
        topRightContainer.appendChild(this.strokesElement);

        // Create message container (center)
        this.messageElement = document.createElement('div');
        this.messageElement.id = 'message-container';
        this.messageElement.classList.add('message-container');
        this.uiContainer.appendChild(this.messageElement);
        
        // Create power indicator
        this.powerIndicator = document.createElement('div');
        this.powerIndicator.classList.add('power-indicator');
        const powerFill = document.createElement('div');
        powerFill.classList.add('power-indicator-fill');
        this.powerIndicator.appendChild(powerFill);
        this.uiContainer.appendChild(this.powerIndicator);
        
        // Create debug display element
        this.debugElement = document.createElement('div');
        this.debugElement.classList.add('debug-overlay');
        this.uiContainer.appendChild(this.debugElement);

        console.log('[UIManager.createUI] Calling initial UI updates...');
        this.updateScore();
        this.updateStrokes();
        console.log('[UIManager.createUI] Finished.');
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
        console.log(`[UIManager.handleHoleStarted] Event received. isInitialized: ${this.isInitialized}, game initialized?: ${this.game.isInitialized}`);
        const holeNumber = event.get('holeNumber');
        
        // Show message
        console.log(`[UIManager.handleHoleStarted] Showing message for hole ${holeNumber}`);
        this.showMessage(`Hole ${holeNumber}`, 2000);
        
        // Update all UI elements
        console.log(`[UIManager.handleHoleStarted] Updating UI elements...`);
        this.updateHoleInfo();
        this.updateScorecard();
        this.updateScore();
        console.log(`[UIManager.handleHoleStarted] Finished.`);
    }
    
    /**
     * Handle game completed event
     * @param {GameEvent} event - Game completed event
     */
    handleGameCompleted(event) {
        console.log(`[UIManager.handleGameCompleted] Event received. isInitialized: ${this.isInitialized}`);
        // Show a final message and the scorecard
        this.showFinalScorecard();
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
        if (hazardType === EventTypes.HAZARD_OUT_OF_BOUNDS) {
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
     * Show the final scorecard after the game is completed
     * (Displays total strokes only)
     */
    showFinalScorecard() {
        console.log('[UIManager.showFinalScorecard] Attempting to display scorecard...');

        // Ensure no duplicate score screen exists
        this.hideFinalScorecard(); 

        // const holeStates = this.game.holeStateManager ? this.game.holeStateManager.getAllHoleStates() : null; // Don't need per-hole state
        // const courseHoles = this.game.course ? this.game.course.holes : null; // Don't need course details
        const totalStrokes = this.game.scoringSystem ? this.game.scoringSystem.getTotalStrokes() : null;

        // if (!holeStates || !courseHoles) {
        if (totalStrokes === null) { // Check if we got the total strokes
            // console.error('[UIManager.showFinalScorecard] Missing hole state or course holes array.');
            console.error('[UIManager.showFinalScorecard] Could not retrieve total strokes from ScoringSystem.');
            return;
        }

        // --- Create DOM Elements ---
        // Create overlay container (covers the whole screen)
        this.scoreScreen = document.createElement('div');
        this.scoreScreen.id = 'score-screen';
        this.scoreScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1001;
            font-family: Arial, sans-serif;
            color: white;
        `;

        // Create the main content box within the overlay
        const contentBox = document.createElement('div');
        contentBox.style.cssText = `
            background-color: #222;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
            text-align: center;
            max-width: 600px;
            width: 90%;
            max-height: 80%;
            overflow-y: auto;
        `;

        // --- Populate Content Box ---
        // Title
        const title = document.createElement('h2');
        title.textContent = 'Course Complete!';
        title.style.marginBottom = '20px';
        contentBox.appendChild(title);

        // Scorecard Table - REMOVED
        // Create the table structure
        // const table = document.createElement('table');
        // ... (Removed all table, thead, tbody, tfoot creation logic) ...
        
        // --- Display Total Strokes --- 
        const totalStrokesEl = document.createElement('p');
        totalStrokesEl.textContent = `Total Strokes: ${totalStrokes}`;
        totalStrokesEl.style.fontSize = '1.5em'; // Larger score text
        totalStrokesEl.style.margin = '20px 0';
        contentBox.appendChild(totalStrokesEl);
        // --- End Display Total Strokes --- 

        // Back to Menu Button
        const backButton = document.createElement('button');
        backButton.textContent = 'Back to Menu';
        backButton.style.cssText = `
            padding: 10px 20px;
            font-size: 16px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s ease;
        `;
        backButton.onmouseover = () => backButton.style.backgroundColor = '#45a049';
        backButton.onmouseout = () => backButton.style.backgroundColor = '#4CAF50';
        backButton.onclick = this.handleBackToMenuClick.bind(this);
        contentBox.appendChild(backButton);

        // Append content box to overlay
        this.scoreScreen.appendChild(contentBox);

        // Append overlay to body
        document.body.appendChild(this.scoreScreen);
        // --- End of Scorecard Creation ---
        console.log('[UIManager.showFinalScorecard] Scorecard displayed.');
    }

    /**
     * Hides the final scorecard overlay.
     */
    hideFinalScorecard() {
        console.log('[UIManager] Hiding final scorecard...');
        if (this.scoreScreen) {
            this.scoreScreen.remove();
            this.scoreScreen = null;
        }
    }

    /**
     * Handles the click event for the "Back to Main Menu" button.
     */
    handleBackToMenuClick() {
        console.log('[UIManager] Back to Main Menu clicked.');
        this.hideFinalScorecard();
        // TODO: Call the method on the App instance to return to the menu
        // Example: this.game.app.showMainMenu(); (Requires game to have app ref)
        // Or: window.location.reload(); // Simple page reload as a fallback
        window.location.reload(); // Using reload for simplicity for now
    }
    
    /**
     * Clean up UI elements and event listeners
     */
    cleanup() {
        console.log('[UIManager.cleanup] Cleaning up UI and listeners...');

        // Remove main UI container (should remove all children)
        if (this.uiContainer && this.uiContainer.parentNode) {
            this.uiContainer.parentNode.removeChild(this.uiContainer);
        }
        this.uiContainer = null;

        // Unsubscribe from events
        if (this.eventSubscriptions && this.game.eventManager) {
            this.eventSubscriptions.forEach(unsubscribe => {
                try {
                    unsubscribe();
                } catch (error) {
                    console.error('[UIManager.cleanup] Error unsubscribing from event:', error);
                }
            });
            this.eventSubscriptions = [];
        }

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
        
        console.log('[UIManager.cleanup] Finished.');
        return this;
    }

    /**
     * Sets up the initial UI state after the first hole is confirmed ready.
     */
    setupInitialUI() {
        console.log('[UIManager.setupInitialUI] Starting...');
        try {
            // Now it's safe to update UI elements that depend on the course/hole state
            this.updateHoleInfo(); // Example: Update hole number, par display
            this.updateScorecard(); // Example: Display initial scorecard
            console.log('[UIManager.setupInitialUI] Finished.');
        } catch (error) {
            console.error('[UIManager.setupInitialUI] Failed:', error);
        }
    }
} 