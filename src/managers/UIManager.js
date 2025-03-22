/**
 * UIManager - Handles all UI elements and interactions for the game
 * Extracts UI management from Game.js to improve modularity
 */
export class UIManager {
    constructor(game) {
        // Reference to the main game
        this.game = game;
        
        // Track UI elements
        this.elements = {
            messageElement: null,
            scoreDisplay: null,
            scorecardContainer: null
        };
        
        // Track state
        this.isShowingMessage = false;
        this.messageTimeoutId = null;
    }
    
    /**
     * Initialize the UI elements
     */
    init() {
        // Create base UI container if needed
        this.createUIContainer();
        return this;
    }
    
    /**
     * Create the main UI container
     */
    createUIContainer() {
        // Check if UI container exists
        let container = document.getElementById('game-ui-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'game-ui-container';
            container.style.position = 'absolute';
            container.style.top = '0';
            container.style.left = '0';
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.pointerEvents = 'none'; // Don't block interaction with game
            container.style.zIndex = '100';
            document.body.appendChild(container);
        }
        
        return container;
    }
    
    /**
     * Add the renderer to the DOM
     * @param {THREE.WebGLRenderer} renderer - The Three.js renderer
     */
    attachRenderer(renderer) {
        if (!renderer || !renderer.domElement) {
            console.error("Cannot attach renderer: Renderer or domElement is null");
            return this;
        }
        
        const container = document.getElementById('game-container') || document.body;
        container.appendChild(renderer.domElement);
        
        return this;
    }
    
    /**
     * Show a temporary message to the player
     * @param {string} text - Message text to display
     * @param {number} duration - Duration in milliseconds
     * @param {Function} onHide - Callback when message is hidden
     */
    showMessage(text, duration = 2000, onHide = null) {
        // Find or create message element
        if (!this.elements.messageElement) {
            this.elements.messageElement = document.getElementById('game-message');
            
            if (!this.elements.messageElement) {
                this.elements.messageElement = document.createElement('div');
                this.elements.messageElement.id = 'game-message';
                this.elements.messageElement.style.position = 'absolute';
                this.elements.messageElement.style.top = '30%';
                this.elements.messageElement.style.left = '50%';
                this.elements.messageElement.style.transform = 'translate(-50%, -50%)';
                this.elements.messageElement.style.fontSize = '32px';
                this.elements.messageElement.style.fontWeight = 'bold';
                this.elements.messageElement.style.color = 'white';
                this.elements.messageElement.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
                this.elements.messageElement.style.textAlign = 'center';
                this.elements.messageElement.style.zIndex = '1000';
                this.elements.messageElement.style.opacity = '0';
                this.elements.messageElement.style.transition = 'opacity 0.5s ease-in-out';
                this.createUIContainer().appendChild(this.elements.messageElement);
            }
        }
        
        // Clear any existing timeout
        if (this.messageTimeoutId) {
            clearTimeout(this.messageTimeoutId);
            this.messageTimeoutId = null;
        }
        
        // Update and show message
        this.elements.messageElement.textContent = text;
        this.elements.messageElement.style.opacity = '1';
        this.isShowingMessage = true;
        
        // Disable input during message display if game provides inputController
        if (this.game && this.game.inputController) {
            this.game.inputController.disableInput();
        }
        
        // Hide message after duration and reactivate input
        this.messageTimeoutId = setTimeout(() => {
            this.elements.messageElement.style.opacity = '0';
            this.isShowingMessage = false;
            
            // Re-enable input if game provides inputController
            if (this.game && this.game.inputController) {
                this.game.inputController.enableInput();
            }
            
            // Call onHide callback if provided
            if (onHide && typeof onHide === 'function') {
                onHide();
            }
        }, duration);
        
        return this;
    }
    
    /**
     * Display the end of hole scorecard
     * @param {object} scoreData - Score data to display
     * @param {Function} onContinue - Callback when player continues
     */
    showScorecard(scoreData, onContinue) {
        // Create scorecard container
        const scorecardContainer = document.createElement('div');
        scorecardContainer.id = 'hole-scorecard';
        scorecardContainer.style.position = 'absolute';
        scorecardContainer.style.top = '50%';
        scorecardContainer.style.left = '50%';
        scorecardContainer.style.transform = 'translate(-50%, -50%)';
        scorecardContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        scorecardContainer.style.color = 'white';
        scorecardContainer.style.padding = '20px';
        scorecardContainer.style.borderRadius = '10px';
        scorecardContainer.style.minWidth = '300px';
        scorecardContainer.style.boxShadow = '0 0 20px rgba(0, 200, 255, 0.6)';
        scorecardContainer.style.zIndex = '1000';
        
        // Create header
        const headerDiv = document.createElement('div');
        headerDiv.style.textAlign = 'center';
        headerDiv.style.marginBottom = '20px';
        
        const title = document.createElement('h2');
        title.textContent = 'Hole Complete!';
        title.style.color = '#4CAF50';
        title.style.margin = '0';
        title.style.fontSize = '28px';
        
        headerDiv.appendChild(title);
        scorecardContainer.appendChild(headerDiv);
        
        // Create content div
        const contentDiv = document.createElement('div');
        contentDiv.style.marginBottom = '20px';
        
        // Create table for score
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginBottom = '15px';
        
        // Score row
        const scoreRow = document.createElement('tr');
        
        const scoreLabel = document.createElement('td');
        scoreLabel.textContent = 'Your Score:';
        scoreLabel.style.padding = '8px';
        scoreLabel.style.textAlign = 'left';
        
        const scoreValue = document.createElement('td');
        scoreValue.textContent = `${scoreData.strokes} stroke${scoreData.strokes !== 1 ? 's' : ''}`;
        scoreValue.style.padding = '8px';
        scoreValue.style.textAlign = 'right';
        scoreValue.style.fontWeight = 'bold';
        scoreValue.style.fontSize = '20px';
        
        scoreRow.appendChild(scoreLabel);
        scoreRow.appendChild(scoreValue);
        table.appendChild(scoreRow);
        
        contentDiv.appendChild(table);
        scorecardContainer.appendChild(contentDiv);
        
        // Continue button
        const continuePrompt = document.createElement('div');
        continuePrompt.textContent = 'Click anywhere to continue';
        continuePrompt.style.textAlign = 'center';
        continuePrompt.style.cursor = 'pointer';
        continuePrompt.style.padding = '10px';
        continuePrompt.style.backgroundColor = 'rgba(76, 175, 80, 0.6)';
        continuePrompt.style.borderRadius = '5px';
        
        scorecardContainer.appendChild(continuePrompt);
        
        // Add to document
        document.body.appendChild(scorecardContainer);
        this.elements.scorecardContainer = scorecardContainer;
        
        // Add click handler to continue
        const handleClick = () => {
            // Remove scorecard
            if (scorecardContainer.parentNode) {
                scorecardContainer.parentNode.removeChild(scorecardContainer);
            }
            
            // Remove event listener
            document.removeEventListener('click', handleClick);
            
            // Call continue callback
            if (onContinue && typeof onContinue === 'function') {
                onContinue();
            }
        };
        
        // Add listener with slight delay to prevent immediate closing
        setTimeout(() => {
            document.addEventListener('click', handleClick);
        }, 300);
        
        return this;
    }
    
    /**
     * Show debug information
     * @param {object} debugInfo - Debug info to display
     */
    updateDebugDisplay(debugInfo) {
        // Find or create debug display element
        let debugElement = document.getElementById('debug-display');
        if (!debugElement) {
            debugElement = document.createElement('div');
            debugElement.id = 'debug-display';
            debugElement.style.position = 'absolute';
            debugElement.style.top = '10px';
            debugElement.style.left = '10px';
            debugElement.style.fontSize = '12px';
            debugElement.style.fontFamily = 'monospace';
            debugElement.style.color = 'white';
            debugElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            debugElement.style.padding = '5px';
            debugElement.style.zIndex = '1000';
            debugElement.style.pointerEvents = 'none';
            document.body.appendChild(debugElement);
        }
        
        // Build debug text
        let debugText = '';
        for (const [key, value] of Object.entries(debugInfo)) {
            debugText += `${key}: ${value}\n`;
        }
        
        // Update debug display
        debugElement.textContent = debugText;
        
        return this;
    }
    
    /**
     * Clean up UI elements
     */
    cleanup() {
        // Clear any message timeout
        if (this.messageTimeoutId) {
            clearTimeout(this.messageTimeoutId);
            this.messageTimeoutId = null;
        }
        
        // Remove scorecard if showing
        if (this.elements.scorecardContainer && this.elements.scorecardContainer.parentNode) {
            this.elements.scorecardContainer.parentNode.removeChild(this.elements.scorecardContainer);
        }
        
        return this;
    }
} 