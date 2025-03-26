import { EventTypes } from '../events/EventTypes';
import { GameState } from '../states/GameState';

/**
 * HoleTransitionManager - Handles loading and unloading of holes
 */
export class HoleTransitionManager {
    constructor(game) {
        this.game = game;
        this.currentHoleNumber = 1;
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
        // First clean up the current hole completely
        await this.unloadCurrentHole();
        
        // Increment hole number
        this.currentHoleNumber++;
        
        // Check if we have more holes
        if (this.currentHoleNumber > this.game.course.totalHoles) {
            this.game.uiManager.showMessage("Course Complete!", 3000);
            return false;
        }

        // Load the new hole
        await this.loadNewHole();
        return true;
    }

    /**
     * Completely unload the current hole and all its resources
     */
    async unloadCurrentHole() {
        // Remove all meshes and physics objects
        if (this.game.course) {
            this.game.course.clearCurrentHole();
        }

        // Remove the ball
        if (this.game.ballManager && this.game.ballManager.ball) {
            this.game.ballManager.removeBall();
        }

        // Reset physics world and wait for it to complete
        if (this.game.physicsManager) {
            await this.game.physicsManager.resetWorld();
        }

        // Clear the scene except for lights and camera
        this.cleanScene();
    }

    /**
     * Load a fresh new hole
     */
    async loadNewHole() {
        // Create the new hole
        this.game.course.createCourse();

        // Create a new ball at the start position
        this.game.ballManager.createBall();

        // Position camera
        this.game.cameraController.positionCameraForHole();

        // Reset game state
        this.game.stateManager.setGameState(GameState.AIMING);

        // Update UI
        this.game.uiManager.updateHoleInfo();
        this.game.uiManager.updateScore();
        this.game.uiManager.updateStrokes();
    }

    /**
     * Clean the scene except for essential objects
     */
    cleanScene() {
        const scene = this.game.scene;
        const objectsToKeep = [];

        // Keep track of essential objects (lights, camera, etc)
        scene.traverse((object) => {
            if (object.isLight || object.isCamera || object.userData.permanent) {
                objectsToKeep.push(object);
            }
        });

        // Clear the scene
        scene.clear();

        // Add back essential objects
        objectsToKeep.forEach(obj => scene.add(obj));
    }
} 