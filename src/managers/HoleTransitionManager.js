import * as THREE from 'three';
import { EventTypes } from '../events/EventTypes';
import { GameState } from '../states/GameState';

/**
 * HoleTransitionManager - Handles loading and unloading of holes
 */
export class HoleTransitionManager {
    constructor(game) {
        this.game = game;
        this.transitionDuration = 2000; // Assuming a default transition duration
    }

    /**
     * Initialize the manager
     */
    init() {
        return this;
    }

    /**
     * Load the next hole
     */
    async transitionToNextHole() {
        // Get current hole number from state manager BEFORE unloading
        const currentHoleNumber = this.game.stateManager.getCurrentHoleNumber();
        const totalHoles = this.game.course.getTotalHoles();
        
        console.log(`[HoleTransitionManager] Checking transition from hole ${currentHoleNumber} (Total holes: ${totalHoles})`);
        
        // Check if we have more holes - using zero-based indexing internally
        // Only check if we're PAST the last hole, not AT it
        if (currentHoleNumber >= totalHoles) {
            console.warn(`[HoleTransitionManager] No more holes available (current: ${currentHoleNumber}, total: ${totalHoles})`);
            this.game.stateManager.setGameState(GameState.GAME_COMPLETED);
            return false;
        }

        console.log(`[HoleTransitionManager] Starting transition to hole ${currentHoleNumber + 1} of ${totalHoles}`);

        try {
            // First clean up the current hole completely
            await this.unloadCurrentHole();
            
            // Initialize physics world through the physics manager's reset method
            if (this.game.physicsManager?.resetWorld) {
                await this.game.physicsManager.resetWorld();
                console.log('[HoleTransitionManager] Physics world reset for new hole');
            } else {
                console.warn('[HoleTransitionManager] Physics world reset not available');
            }
            
            // Load the new hole BEFORE updating state
            await this.loadNewHole();
            
            // Verify hole was created successfully
            const holePosition = this.game.course.getHolePosition();
            const startPosition = this.game.course.getHoleStartPosition();
            
            if (!holePosition || !startPosition) {
                console.error('[HoleTransitionManager] Failed to get valid positions for new hole');
                return false;
            }
            
            // Only update state after successful hole load
            this.game.stateManager.resetForNextHole();
            
            // Log the actual hole number after state update
            const newHoleNumber = this.game.stateManager.getCurrentHoleNumber();
            console.log(`[HoleTransitionManager] Successfully transitioned to hole ${newHoleNumber} of ${totalHoles}`);
            console.log(`[HoleTransitionManager] New hole position:`, holePosition);
            console.log(`[HoleTransitionManager] New start position:`, startPosition);
            
            // Step physics world after hole creation (if available)
            if (this.game.physicsManager?.world?.step) {
                this.game.physicsManager.world.step(1/60);
                console.log('[HoleTransitionManager] Physics world stepped after hole creation');
            }
            
            // Preserve debug mode state
            const debugMode = this.game.stateManager.state.debugMode;
            if (debugMode) {
                console.log('[HoleTransitionManager] Preserving debug mode state:', debugMode);
                this.game.stateManager.state.debugMode = debugMode;
            }
            
            return true;
        } catch (error) {
            console.error('[HoleTransitionManager] Error during hole transition:', error);
            return false;
        }
    }

    /**
     * Completely unload the current hole and all its resources
     */
    async unloadCurrentHole() {
        console.log('[HoleTransitionManager] Starting hole cleanup');
        
        // Remove all meshes and physics objects
        if (this.game.course) {
            this.game.course.clearCurrentHole();
        }

        // Remove the ball
        if (this.game.ballManager?.ball) {
            this.game.ballManager.removeBall();
        }

        // Clear the scene except for lights and camera
        this.cleanScene();
        
        console.log('[HoleTransitionManager] Hole cleanup complete');
    }

    /**
     * Load the new hole
     * @private
     */
    async loadNewHole() {
        console.log('[HoleTransitionManager] Loading new hole');
        
        // Get the next hole number (1-based)
        const currentHoleNumber = this.game.stateManager.getCurrentHoleNumber();
        console.log(`[HoleTransitionManager] Loading hole ${currentHoleNumber + 1}`);
        
        // Reset hole completion state
        this.game.stateManager.setHoleCompleted(false);
        this.game.stateManager.setGameState(GameState.AIMING);
        this.isTransitioning = false; // Reset transition flag

        // Create the new hole through the course manager
        if (!this.game.course) {
            console.error('[HoleTransitionManager] Course not available');
            return false;
        }

        // Ensure physics world exists before creating the hole
        if (!this.game.physicsManager?.world) {
            console.error('[HoleTransitionManager] Physics world not available');
            return false;
        }

        // Create the new hole
        try {
            await this.game.course.createCourse();
            console.log(`[HoleTransitionManager] Course created successfully for hole ${currentHoleNumber + 1}`);
            
            // Verify physics bodies were created
            if (this.game.physicsManager?.world?.bodies) {
                const bodyCount = this.game.physicsManager.world.bodies.length;
                console.log(`[HoleTransitionManager] Physics world contains ${bodyCount} bodies after hole creation`);
            }
        } catch (error) {
            console.error(`[HoleTransitionManager] Error creating course:`, error);
            throw error;
        }

        // Create a new ball at the start position
        try {
            const ball = await this.game.ballManager.createBall();
            if (!ball) {
                console.error(`[HoleTransitionManager] Failed to create ball`);
            } else {
                console.log(`[HoleTransitionManager] Ball created successfully`);
            }
        } catch (error) {
            console.error(`[HoleTransitionManager] Error creating ball:`, error);
            throw error;
        }

        // Position camera
        try {
            this.game.cameraController.positionCameraForHole();
            console.log(`[HoleTransitionManager] Camera positioned successfully`);
        } catch (error) {
            console.error(`[HoleTransitionManager] Error positioning camera:`, error);
            throw error;
        }

        // Update UI
        this.game.uiManager.updateHoleInfo();
        this.game.uiManager.updateScore();
        this.game.uiManager.updateStrokes();

        // Reset hole detection grace period
        if (this.game.holeCompletionManager?.resetGracePeriod) {
            this.game.holeCompletionManager.resetGracePeriod();
            console.log(`[HoleTransitionManager] Reset hole detection grace period`);
        }

        // Add a small delay to ensure everything is properly initialized
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log(`[HoleTransitionManager] Hole ${currentHoleNumber + 1} loaded successfully`);
        return true;
    }

    /**
     * Clean the scene except for essential objects
     */
    cleanScene() {
        const scene = this.game.scene;
        const objectsToKeep = [];

        // Keep track of essential objects (lights, camera, starfield, etc)
        scene.traverse((object) => {
            if (object.isLight || 
                object.isCamera || 
                object.userData.permanent || 
                (object.type === 'Points' && object.userData.type === 'starfield')) {
                objectsToKeep.push(object);
                console.log('[HoleTransitionManager] Keeping object:', object.type, object.userData);
            }
        });

        // Clear the scene
        scene.clear();

        // Add back essential objects
        objectsToKeep.forEach(obj => scene.add(obj));
        
        // Recreate starfield if it's missing
        const hasStarfield = scene.children.some(child => 
            child.type === 'Points' && child.userData.type === 'starfield'
        );
        
        if (!hasStarfield) {
            console.log('[HoleTransitionManager] Recreating starfield');
            this.game.createStarfield();
        }
    }

    /**
     * Handle hole transition
     * @param {number} fromHole - The hole number we're transitioning from
     * @param {number} toHole - The hole number we're transitioning to
     */
    onHoleTransition(fromHole, toHole) {
        console.log(`[HoleTransitionManager] Handling transition from hole ${fromHole} to ${toHole}`);
        
        // Store transition info
        this.fromHole = fromHole;
        this.toHole = toHole;
        this.transitionStartTime = performance.now();
        this.isTransitioning = true;
        
        // Reset transition state
        this.resetTransitionState();
        
        // Start transition effects
        this.startTransitionEffects();
        
        console.log(`[HoleTransitionManager] Transition started from hole ${fromHole} to ${toHole}`);
    }

    /**
     * Start transition effects
     * @private
     */
    startTransitionEffects() {
        // Fade out current hole
        if (this.game.course) {
            const currentHole = this.game.course.getCurrentHoleMesh();
            if (currentHole && currentHole.userData.material) {
                currentHole.userData.material.transparent = true;
                currentHole.userData.material.opacity = 1.0;
            }
        }
        
        // Reset ball position
        if (this.game.ballManager) {
            this.game.ballManager.resetBall();
        }
        
        // Update camera for new hole
        if (this.game.cameraController) {
            this.game.cameraController.updateCameraForHole();
        }
    }

    /**
     * Reset transition state
     * @private
     */
    resetTransitionState() {
        this.isTransitioning = false;
        this.transitionStartTime = 0;
        this.fromHole = 0;
        this.toHole = 0;
    }

    /**
     * Update loop for the transition manager
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this.isTransitioning) return;
        
        const currentTime = performance.now();
        const elapsed = (currentTime - this.transitionStartTime) / 1000;
        
        // Handle fade out
        if (elapsed < this.transitionDuration) {
            const progress = elapsed / this.transitionDuration;
            if (this.game.course) {
                const currentHole = this.game.course.getCurrentHoleMesh();
                if (currentHole && currentHole.userData.material) {
                    currentHole.userData.material.opacity = 1.0 - progress;
                }
            }
        } else {
            // Transition complete
            this.isTransitioning = false;
            console.log(`[HoleTransitionManager] Transition to hole ${this.toHole} complete`);
            
            // Reset material opacity
            if (this.game.course) {
                const currentHole = this.game.course.getCurrentHoleMesh();
                if (currentHole && currentHole.userData.material) {
                    currentHole.userData.material.transparent = false;
                    currentHole.userData.material.opacity = 1.0;
                }
            }
        }
    }
} 