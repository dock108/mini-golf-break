import { EventTypes } from '../events/EventTypes';

/**
 * HoleCompletionManager - Handles hole completion logic and effects
 */
export class HoleCompletionManager {
    constructor(game) {
        this.game = game;
        this.completionDelay = 1500; // Delay before showing continue button
    }

    /**
     * Initialize the hole completion manager
     */
    init() {
        this.setupEventListeners();
        return this;
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for ball in hole events
        this.game.eventManager.subscribe(
            EventTypes.BALL_IN_HOLE,
            this.handleBallInHole,
            this
        );
    }

    /**
     * Check if the ball is in the hole
     * @returns {boolean} Whether the ball went in the hole
     */
    checkBallInHole() {
        // Early exit if conditions aren't met
        if (!this.game.ballManager.ball || !this.game.course || this.game.stateManager.isHoleCompleted()) {
            return false;
        }

        // Get the current hole position
        const holePosition = this.game.course.getHolePosition();
        if (!holePosition) {
            return false;
        }

        // Update the ball's current hole position reference
        this.updateBallHoleReference(holePosition);

        // Check if ball meets hole-in criteria
        if (this.isBallInHole(holePosition)) {
            this.game.debugManager.log(`Ball in hole! Success!`);
            this.handleBallInHole();
            return true;
        }

        return false;
    }

    /**
     * Update the ball's reference to the current hole position
     * @param {THREE.Vector3} holePosition - Current hole position
     */
    updateBallHoleReference(holePosition) {
        const ball = this.game.ballManager.ball;
        if (!ball) return;

        if (ball.currentHolePosition) {
            ball.currentHolePosition.copy(holePosition);
        } else {
            ball.currentHolePosition = holePosition.clone();
        }
    }

    /**
     * Determines if the ball is in the hole based on position and movement
     * @param {THREE.Vector3} holePosition - Current hole position
     * @returns {boolean} Whether the ball is in the hole
     */
    isBallInHole(holePosition) {
        const ball = this.game.ballManager.ball;
        const ballPosition = ball.mesh.position.clone();

        // Calculate distance from ball to hole center
        const distanceToHole = ballPosition.distanceTo(holePosition);

        // Check hole entry conditions:
        // 1. Ball is close enough to hole center
        const isCloseToHole = distanceToHole < 0.3; // Slightly smaller than hole radius

        // 2. Ball is either stopped or fallen below surface level
        const isStopped = ball.isStopped();
        const isBelowSurface = ballPosition.y < holePosition.y - 0.1;

        return (isCloseToHole && (isStopped || isBelowSurface));
    }

    /**
     * Handle the ball going in the hole
     * @param {GameEvent} event - Ball in hole event
     */
    handleBallInHole(event) {
        const ball = this.game.ballManager.ball;
        if (!ball) return;

        // Set game state to hole completed
        this.game.stateManager.setHoleCompleted(true);

        // Get score data
        const totalStrokes = this.game.scoringSystem.getTotalStrokes();
        const holeNumber = this.game.stateManager.getCurrentHoleNumber();

        // Show completion effects
        this.showCompletionEffects();

        // Update score
        this.updateScore(holeNumber, totalStrokes);

        // Trigger transition to next hole after delay
        setTimeout(() => {
            if (this.game.stateManager.isHoleCompleted()) {
                this.game.holeTransitionManager.transitionToNextHole();
            }
        }, this.completionDelay);
    }

    /**
     * Show completion effects
     */
    showCompletionEffects() {
        // Get current hole mesh
        const currentHole = this.game.course.getCurrentHoleMesh();
        if (!currentHole) return;

        // Animate hole disappearing
        const duration = 1000; // 1 second
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Fade out opacity
            if (currentHole.material) {
                currentHole.material.opacity = 1 - progress;
                currentHole.material.transparent = true;
            }

            // Scale down
            const scale = 1 - progress;
            currentHole.scale.set(scale, scale, scale);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Remove hole from scene
                this.game.scene.remove(currentHole);
            }
        };

        animate();

        // Update score display
        this.updateScore();
    }

    /**
     * Update score for the completed hole
     * @param {number} holeNumber - Number of the completed hole
     * @param {number} totalStrokes - Total strokes taken
     */
    updateScore(holeNumber, totalStrokes) {
        // Publish hole completed event
        this.game.eventManager.publish(
            EventTypes.HOLE_COMPLETED,
            {
                holeNumber: holeNumber,
                totalStrokes: totalStrokes
            },
            this
        );

        // Update UI
        this.game.uiManager.updateScore();
    }

    /**
     * Update score
     */
    updateScore() {
        const holeNumber = this.game.stateManager.getCurrentHoleNumber();
        const strokes = this.game.scoringSystem.getCurrentStrokes();
        const par = this.game.course.getHolePar(holeNumber);

        // Update UI with score
        this.game.uiManager.updateScorecard();
        this.game.uiManager.showMessage(`Hole ${holeNumber} completed in ${strokes} strokes! (Par: ${par})`);
    }

    /**
     * Clean up resources
     */
    cleanup() {
        // Nothing specific to clean up
    }
} 