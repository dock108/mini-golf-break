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
        this.showMessage("Course Completed!", 5000); 
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
     * Creates and displays the final scorecard overlay.
     */
    showFinalScorecard() {
        console.log('[UIManager] Showing final scorecard...');
        
        // --- Get Score Data --- 
        if (!this.game.scoringSystem) {
            console.error('[UIManager] ScoringSystem not available!');
            return;
        }
        // We only need the total strokes for the simplified card
        const totalStrokes = this.game.scoringSystem.getTotalStrokes();

        // --- Check for existing scorecard, remove if present ---
        const existingScorecard = document.getElementById('final-scorecard-overlay');
        if (existingScorecard) {
            existingScorecard.remove();
        }

        // --- Create Overlay Element --- 
        const overlay = document.createElement('div');
        overlay.id = 'final-scorecard-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.color = 'white';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '1000'; // Ensure it's on top
        overlay.style.fontFamily = 'monospace, sans-serif';

        // --- Create Content Container --- 
        const container = document.createElement('div');
        container.style.padding = '40px'; // Increased padding
        container.style.background = 'rgba(50, 50, 50, 0.9)';
        container.style.borderRadius = '10px';
        container.style.textAlign = 'center';
        container.style.minWidth = '300px'; // Ensure minimum width
        overlay.appendChild(container);

        // --- Title --- 
        const title = document.createElement('h2');
        title.textContent = 'Course Complete!';
        title.style.marginBottom = '30px'; // Increased margin
        title.style.fontSize = '2em'; // Larger title
        container.appendChild(title);

        // --- Total Strokes Display --- 
        const totalStrokesEl = document.createElement('p');
        totalStrokesEl.textContent = `Total Strokes: ${totalStrokes}`;
        totalStrokesEl.style.fontSize = '1.5em'; // Larger score text
        totalStrokesEl.style.margin = '20px 0';
        container.appendChild(totalStrokesEl);

        // --- Back Button --- 
        const backButton = document.createElement('button');
        backButton.textContent = 'Back to Main Menu';
        backButton.style.marginTop = '30px'; // Increased margin
        backButton.style.padding = '12px 24px'; // Larger button
        backButton.style.fontSize = '1.1em';
        backButton.style.cursor = 'pointer';
        backButton.style.backgroundColor = '#337ab7';
        backButton.style.color = 'white';
        backButton.style.border = 'none';
        backButton.style.borderRadius = '5px';
        backButton.onclick = this.handleBackToMenuClick.bind(this); // Bind the handler
        container.appendChild(backButton);

        // --- Add Overlay to DOM --- 
        document.body.appendChild(overlay);
        this.finalScorecardElement = overlay; // Store reference for hiding
        console.log('[UIManager] Simplified final scorecard displayed.');
    }

    /**
     * Hides the final scorecard overlay.
     */
    hideFinalScorecard() {
        console.log('[UIManager] Hiding final scorecard...');
        if (this.finalScorecardElement) {
            this.finalScorecardElement.remove();
            this.finalScorecardElement = null;
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