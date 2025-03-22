/**
 * ScoringSystem - Manages score for the mini-golf game
 */
export class ScoringSystem {
    constructor(game) {
        this.game = game;
        this.score = 0;
        this.currentHole = 1; // Always 1 for single-hole game
        this.scoreDisplayElement = null;
        
        // Create score display
        this.createScoreDisplay();
    }
    
    /**
     * Create the score display element
     */
    createScoreDisplay() {
        this.scoreDisplayElement = document.getElementById('score-display');
        if (!this.scoreDisplayElement) {
            this.scoreDisplayElement = document.createElement('div');
            this.scoreDisplayElement.id = 'score-display';
            this.scoreDisplayElement.className = 'game-ui score-display';
            document.body.appendChild(this.scoreDisplayElement);
        }
        
        this.updateScoreDisplay();
        
        return this;
    }
    
    /**
     * Set current hole - kept for compatibility but always sets to hole 1
     */
    setCurrentHole() {
        this.currentHole = 1;
        this.updateHoleDisplay();
        return this;
    }
    
    /**
     * Add a stroke to the current score
     */
    addStroke() {
        this.score++;
        this.updateScoreDisplay();
        return this;
    }
    
    /**
     * Get current hole strokes
     */
    getCurrentHoleStrokes() {
        return this.score;
    }
    
    /**
     * Reset hole score
     */
    resetHoleScore() {
        this.score = 0;
        this.updateScoreDisplay();
        return this;
    }
    
    /**
     * Get total score - same as current score in single-hole game
     */
    getTotalScore() {
        return this.score;
    }
    
    /**
     * Complete the current hole
     * @param {number} strokeCount - Optional explicit stroke count, uses current score if not provided
     */
    completeHole(strokeCount = null) {
        // Use provided stroke count if available, otherwise use current score
        if (strokeCount !== null) {
            this.score = strokeCount;
            this.updateScoreDisplay();
        }
        
        return this;
    }
    
    /**
     * Reset current hole score
     */
    resetCurrentHoleScore() {
        this.score = 0;
        this.updateScoreDisplay();
        return this;
    }
    
    /**
     * Update hole display
     */
    updateHoleDisplay() {
        // Update hole display if needed
        if (this.scoreDisplayElement) {
            this.scoreDisplayElement.textContent = `Hole 1: `;
        }
        
        return this;
    }
    
    /**
     * Update score display
     */
    updateScoreDisplay() {
        if (this.scoreDisplayElement) {
            this.scoreDisplayElement.textContent = `Hole 1: ${this.score} strokes`;
        }
        
        return this;
    }
} 