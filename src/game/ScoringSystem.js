/**
 * ScoringSystem - Manages score for the mini-golf game
 */
export class ScoringSystem {
    constructor(game) {
        this.game = game;
        this.continuousStrokeCount = 0;  // Total strokes across all holes
    }
    
    /**
     * Add a stroke to the continuous counter
     */
    addStroke() {
        this.continuousStrokeCount++;
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
        return this;
    }
} 