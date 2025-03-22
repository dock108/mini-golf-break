/**
 * ScoringSystem class
 * Handles score tracking, calculation, and display for Mini Golf Break
 */
export class ScoringSystem {
    constructor() {
        this.score = 0;              // Current hole score
        this.holeScores = [];        // Scores for each hole
        this.currentHole = 1;        // Current hole number
        this.totalHoles = 1;         // Total number of holes (now only 1)
        
        // UI Elements
        this.scoreElement = document.getElementById('score-value');
        this.scoreDisplayElement = document.getElementById('score');
        
        // Game mode is always course
        this.gameMode = 'course';
    }
    
    /**
     * Initialize the scoring system
     */
    init(gameMode = 'course', totalHoles = 1) {
        this.gameMode = 'course'; // Always use course mode
        this.totalHoles = totalHoles;
        this.score = 0;
        
        // Initialize hole scores array
        this.holeScores = new Array(totalHoles).fill(0);
        this.currentHole = 1;
        this.updateHoleDisplay(1);
        
        this.updateScoreDisplay();
        
        return this;
    }
    
    /**
     * Set current hole number
     */
    setCurrentHole(holeNumber) {
        this.currentHole = holeNumber;
        this.updateHoleDisplay(holeNumber);
        return this;
    }
    
    /**
     * Set total number of holes
     */
    setTotalHoles(totalHoles) {
        this.totalHoles = totalHoles;
        
        // Update hole scores array if needed
        if (this.holeScores.length !== totalHoles) {
            // Preserve existing scores
            const newHoleScores = new Array(totalHoles).fill(0);
            for (let i = 0; i < Math.min(this.holeScores.length, totalHoles); i++) {
                newHoleScores[i] = this.holeScores[i];
            }
            this.holeScores = newHoleScores;
        }
        
        return this;
    }
    
    /**
     * Add a stroke to the current hole score
     */
    addStroke() {
        this.score++;
        this.updateScoreDisplay();
        return this.score;
    }
    
    /**
     * Get the current score for this hole
     */
    getCurrentHoleStrokes() {
        return this.score;
    }
    
    /**
     * Reset the score for the current hole
     */
    resetHoleScore() {
        this.score = 0;
        this.updateScoreDisplay();
        return this;
    }
    
    /**
     * Get the current total score (sum of all hole scores)
     */
    getTotalScore() {
        // Calculate total score (sum of all completed holes plus current hole)
        let totalScore = 0;
        
        // Add scores from completed holes
        for (let i = 0; i < this.holeScores.length; i++) {
            totalScore += this.holeScores[i] || 0;
        }
        
        // Add current hole score if not yet completed
        if (this.currentHole <= this.totalHoles && this.holeScores[this.currentHole - 1] === 0) {
            totalScore += this.score;
        }
        
        return totalScore;
    }
    
    /**
     * Complete the current hole with given stroke count
     */
    completeHole(strokeCount = null) {
        // If strokes provided, use that value, otherwise use current score
        const finalScore = strokeCount !== null ? strokeCount : this.score;
        
        // Store the current hole score
        this.holeScores[this.currentHole - 1] = finalScore;
        
        // Return true if this was the final hole
        return this.currentHole >= this.totalHoles;
    }
    
    /**
     * Advance to the next hole
     */
    advanceToNextHole() {
        // Check if we can advance
        if (this.currentHole < this.totalHoles) {
            this.currentHole++;
            this.score = 0;
            this.updateHoleDisplay(this.currentHole);
            this.updateScoreDisplay();
            return true;
        }
        
        return false;
    }
    
    /**
     * Load a specific hole
     */
    loadHole(holeNumber) {
        if (holeNumber <= this.totalHoles) {
            this.currentHole = holeNumber;
            this.score = 0; // Reset score for the new hole
            this.updateHoleDisplay(holeNumber);
            this.updateScoreDisplay();
            return true;
        }
        return false;
    }
    
    /**
     * Reset the current hole score (used for restarting the single hole)
     */
    resetCurrentHoleScore() {
        this.score = 0;
        this.holeScores[this.currentHole - 1] = 0;
        this.updateScoreDisplay();
        return this;
    }
    
    /**
     * Update the hole display with current hole and total score
     */
    updateHoleDisplay(holeNumber) {
        if (!this.scoreDisplayElement) return;
        
        // Update the score display to show the current hole and total score
        const totalScore = this.getTotalScore();
        
        // For single hole course, simplify the display
        if (this.totalHoles === 1) {
            this.scoreDisplayElement.innerHTML = `Score: ${this.score}`;
        } else {
            this.scoreDisplayElement.innerHTML = `Hole: ${holeNumber}/${this.totalHoles} | Current: ${this.score} | Total: ${totalScore}`;
        }
    }
    
    /**
     * Update the score display with current score
     */
    updateScoreDisplay() {
        // Update simple score element if available
        if (this.scoreElement) {
            this.scoreElement.textContent = this.score.toString();
        }
        
        // Update the hole display
        this.updateHoleDisplay(this.currentHole);
    }
} 