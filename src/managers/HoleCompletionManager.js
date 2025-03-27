import { EventTypes } from '../events/EventTypes';
import { GameState } from '../states/GameState';

/**
 * HoleCompletionManager - Handles hole completion logic and effects
 */
export class HoleCompletionManager {
    constructor(game) {
        this.game = game;
        this.completionDelay = 1500; // Delay before showing continue button
        this.detectionGracePeriod = 2000; // Grace period after hole creation (ms) - increased from 1000
        this.holeCreationTime = Date.now(); // Track when the hole was created
        this.isTransitioning = false; // Track if we're currently transitioning
    }

    /**
     * Initialize the hole completion manager
     */
    init() {
        this.setupEventListeners();
        this.resetGracePeriod(); // Reset the grace period on init
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
     * Reset the grace period timer
     */
    resetGracePeriod() {
        this.holeCreationTime = Date.now();
        this.isTransitioning = false;
        this.game.debugManager.log(`[DEBUG] Hole detection grace period reset at ${this.holeCreationTime}`);
    }

    /**
     * Check if the ball is in the hole
     * @returns {boolean} Whether the ball went in the hole
     */
    checkBallInHole() {
        // Skip detection if we're transitioning
        if (this.isTransitioning) {
            console.log('[HoleCompletionManager] Skipping hole check - transition in progress');
            return false;
        }

        // Early exit if conditions aren't met
        if (!this.game.ballManager.ball || !this.game.course || this.game.stateManager.isHoleCompleted()) {
            return false;
        }

        // Check if we're still in the grace period
        const timeSinceCreation = Date.now() - this.holeCreationTime;
        if (timeSinceCreation < this.detectionGracePeriod) {
            console.log(`[HoleCompletionManager] In grace period (${timeSinceCreation}ms < ${this.detectionGracePeriod}ms), skipping hole detection`);
            return false;
        }

        // Get the current hole position
        const holePosition = this.game.course.getHolePosition();
        if (!holePosition) {
            console.warn(`[HoleCompletionManager] No hole position found, skipping detection`);
            return false;
        }

        // Get ball position and velocity
        const ballBody = this.game.ballManager.ball.body;
        if (!ballBody) {
            return false;
        }

        const ballPos = ballBody.position;
        const ballVel = ballBody.velocity;
        
        // Calculate distance to hole
        const distanceToHole = Math.sqrt(
            Math.pow(ballPos.x - holePosition.x, 2) +
            Math.pow(ballPos.z - holePosition.z, 2)
        );

        // Ball must be:
        // 1. Close to hole horizontally (within hole radius)
        // 2. Near ground level
        // 3. Moving slowly
        const isNearHole = distanceToHole < 0.35; // Hole radius
        const isNearGround = ballPos.y < 0.3; // Height threshold
        const isMovingSlow = Math.sqrt(
            ballVel.x * ballVel.x +
            ballVel.y * ballVel.y +
            ballVel.z * ballVel.z
        ) < 1.0; // Speed threshold

        // Log detection details
        console.log(`[HoleCompletionManager] Ball check:`, {
            distanceToHole,
            height: ballPos.y,
            speed: Math.sqrt(ballVel.x * ballVel.x + ballVel.y * ballVel.y + ballVel.z * ballVel.z),
            isNearHole,
            isNearGround,
            isMovingSlow
        });

        if (isNearHole && isNearGround && isMovingSlow) {
            console.log(`[HoleCompletionManager] Ball in hole! Success!`);
            this.handleBallInHole();
            return true;
        }

        return false;
    }

    /**
     * Handle the ball going in the hole
     */
    handleBallInHole() {
        // Get current state
        const currentHoleNumber = this.game.stateManager.getCurrentHoleNumber();
        const totalHoles = this.game.course.getTotalHoles();
        
        console.log(`[HoleCompletionManager] Ball in hole for hole ${currentHoleNumber} of ${totalHoles}`);
        
        // Prevent multiple triggers
        if (this.game.stateManager.isHoleCompleted() || this.isTransitioning) {
            console.log(`[HoleCompletionManager] Hole already completed or transitioning, ignoring ball in hole event`);
            return;
        }

        // Mark that we're starting a transition
        this.isTransitioning = true;

        // Set game state to hole completed
        this.game.stateManager.setHoleCompleted(true);

        // Get score data
        const totalStrokes = this.game.scoringSystem.getTotalStrokes();

        // Update score
        this.updateScore(currentHoleNumber, totalStrokes);

        // Check if this was the last hole
        if (currentHoleNumber >= totalHoles) {
            console.log(`[HoleCompletionManager] Final hole ${currentHoleNumber} completed`);
            this.game.stateManager.setGameState(GameState.GAME_COMPLETED);
            this.isTransitioning = false;
            return;
        }

        // Add a delay before transitioning to allow for visual feedback
        setTimeout(() => {
            if (!this.isTransitioning) {
                console.log(`[HoleCompletionManager] Transition already handled, skipping`);
                return;
            }
            
            console.log(`[HoleCompletionManager] Scheduling transition to next hole`);
            this.game.holeTransitionManager.transitionToNextHole();
            this.isTransitioning = false;
        }, 1500);
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

    /**
     * Handle hole transition
     * @param {number} fromHole - The hole number we're transitioning from
     * @param {number} toHole - The hole number we're transitioning to
     */
    onHoleTransition(fromHole, toHole) {
        console.log(`[HoleCompletionManager] Handling transition from hole ${fromHole} to ${toHole}`);
        
        // Reset completion state
        this.resetCompletionState();
        
        // Update current hole number
        this.currentHoleNumber = toHole;
        
        // Update par for new hole
        if (this.game.course) {
            this.currentPar = this.game.course.getHolePar(toHole);
        }
        
        // Update UI
        if (this.game.uiManager) {
            this.game.uiManager.updateHoleNumber(toHole);
            this.game.uiManager.updatePar(this.currentPar);
        }
        
        console.log(`[HoleCompletionManager] Transition to hole ${toHole} complete`);
    }

    /**
     * Reset completion state
     * @private
     */
    resetCompletionState() {
        this.isHoleComplete = false;
        this.completionTime = 0;
        this.strokes = 0;
        this.currentPar = 0;
    }

    /**
     * Update loop for the hole completion manager
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this.game.course || !this.game.ballManager) return;
        
        // Check if ball is in hole
        if (!this.isHoleComplete) {
            const ball = this.game.ballManager.getBall();
            const holePosition = this.game.course.getHolePosition();
            
            if (ball && holePosition) {
                const distance = ball.position.distanceTo(holePosition);
                if (distance < this.holeRadius) {
                    this.completeHole();
                }
            }
        }
    }

    /**
     * Complete the current hole
     * @private
     */
    completeHole() {
        this.isHoleComplete = true;
        this.completionTime = performance.now();
        
        // Calculate score
        const score = this.calculateScore();
        
        // Update UI
        if (this.game.uiManager) {
            this.game.uiManager.updateScore(score);
        }
        
        // Log completion
        console.log(`[HoleCompletionManager] Hole ${this.currentHoleNumber} completed in ${this.strokes} strokes (Par: ${this.currentPar})`);
        
        // Check if there's a next hole
        if (this.game.course && this.game.course.hasNextHole()) {
            // Wait a moment before transitioning
            setTimeout(() => {
                this.game.course.loadNextHole();
            }, 2000);
        } else {
            // Course complete
            console.log('[HoleCompletionManager] Course complete!');
            if (this.game.uiManager) {
                this.game.uiManager.showCourseComplete();
            }
        }
    }
} 