/**
 * ScoringSystem - Manages score for the mini-golf game
 */
export class ScoringSystem {
    constructor(game) {
        this.game = game;
        this.continuousStrokeCount = 0;  // Total strokes across all holes
        this.scoreDisplayElement = null;
        
        // Create score display
        this.createScoreDisplay();
    }
    
    /**
     * Create the score display element
     */
    createScoreDisplay() {
        this.scoreDisplayElement = document.createElement('div');
        this.scoreDisplayElement.id = 'score-display';
        this.scoreDisplayElement.style.position = 'absolute';
        this.scoreDisplayElement.style.top = '20px';
        this.scoreDisplayElement.style.right = '20px';
        this.scoreDisplayElement.style.color = 'white';
        this.scoreDisplayElement.style.fontSize = '24px';
        document.body.appendChild(this.scoreDisplayElement);
        this.updateScoreDisplay();
    }
    
    /**
     * Add a stroke to the continuous counter
     */
    addStroke() {
        this.continuousStrokeCount++;
        this.updateScoreDisplay();
        return this;
    }
    
    /**
     * Get total strokes across all holes
     */
    getTotalStrokes() {
        return this.continuousStrokeCount;
    }
    
    /**
     * Get current strokes (same as total strokes in continuous counting)
     */
    getCurrentStrokes() {
        return this.continuousStrokeCount;
    }
    
    /**
     * Complete the current hole (no longer resets score)
     */
    completeHole() {
        this.updateScoreDisplay();
        return this;
    }
    
    /**
     * Update score display to show continuous stroke count
     */
    updateScoreDisplay() {
        if (this.scoreDisplayElement) {
            this.scoreDisplayElement.textContent = `Total Strokes: ${this.continuousStrokeCount}`;
        }
        return this;
    }
} 