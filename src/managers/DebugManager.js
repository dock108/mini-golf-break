import * as THREE from 'three';

/**
 * Configuration for debug functionality
 */
export const DEBUG_CONFIG = {
    enabled: false,         // Set to true to enable debugging in production
    enableKey: 'd',         // Key to toggle debug mode
    showHelpers: true,      // Show axis and grid helpers
    showLightHelpers: true, // Show light helpers
    logVelocity: true,      // Log ball velocity
    showPhysicsDebug: false // Show physics debug visualizations
};

/**
 * DebugManager - Handles debug functionality, visualizations, and logging
 * Extracts debug management from Game.js to improve modularity
 */
export class DebugManager {
    constructor(game) {
        // Reference to the main game
        this.game = game;
        
        // Debug state
        this.enabled = DEBUG_CONFIG.enabled;
        
        // Track debug objects for easy removal
        this.debugObjects = [];
        
        // Velocity logging data
        this.velocityHistory = [];
        this.maxHistoryLength = 10;
    }
    
    /**
     * Initialize debug functionality
     */
    init() {
        // Listen for debug key press only if not in production
        if (process.env.NODE_ENV !== 'production' || DEBUG_CONFIG.enabled) {
            window.addEventListener('keydown', this.handleKeyPress.bind(this));
            console.log("Debug mode available - press '" + DEBUG_CONFIG.enableKey + "' to toggle");
        }
        
        // Set up initial debug state if enabled
        if (this.enabled) {
            this.setupDebugHelpers();
        }
        
        return this;
    }
    
    /**
     * Handle key press for debug toggle
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyPress(e) {
        if (e.key === DEBUG_CONFIG.enableKey) {
            this.toggleDebugMode();
        }
    }
    
    /**
     * Toggle debug mode on/off
     */
    toggleDebugMode() {
        this.enabled = !this.enabled;
        console.log("Debug mode:", this.enabled ? "ON" : "OFF");
        
        // Update debug mode for components that need it
        if (this.game.cameraController) {
            this.game.cameraController.setDebugMode(this.enabled);
        }
        
        // Toggle debug visuals
        if (this.enabled) {
            this.setupDebugHelpers();
            
            // Enable physics debug if needed
            if (DEBUG_CONFIG.showPhysicsDebug && this.game.physicsManager) {
                this.game.physicsManager.enableDebug(this.game.scene);
            }
        } else {
            this.removeDebugHelpers();
            
            // Disable physics debug
            if (this.game.physicsManager) {
                this.game.physicsManager.disableDebug();
            }
        }
        
        return this;
    }
    
    /**
     * Set up debug visual helpers
     */
    setupDebugHelpers() {
        // Only proceed if debug helpers are enabled in config
        if (!DEBUG_CONFIG.showHelpers) return;
        
        // Clear existing debug helpers
        this.removeDebugHelpers();
        
        // Only add helpers if we have a scene
        if (!this.game || !this.game.scene) return;
        
        // Add axes helper
        const axesHelper = new THREE.AxesHelper(5);
        this.game.scene.add(axesHelper);
        this.debugObjects.push(axesHelper);
        
        // Add grid helper
        const gridHelper = new THREE.GridHelper(20, 20);
        this.game.scene.add(gridHelper);
        this.debugObjects.push(gridHelper);
        
        // Add light helpers if configured and lights exist
        if (DEBUG_CONFIG.showLightHelpers && this.game.lights) {
            if (this.game.lights.directionalLight) {
                const lightHelper = new THREE.DirectionalLightHelper(this.game.lights.directionalLight, 1);
                this.game.scene.add(lightHelper);
                this.debugObjects.push(lightHelper);
                
                // Add shadow camera helper
                const shadowHelper = new THREE.CameraHelper(this.game.lights.directionalLight.shadow.camera);
                this.game.scene.add(shadowHelper);
                this.debugObjects.push(shadowHelper);
            }
        }
        
        // Enable physics debug visualization if configured
        if (DEBUG_CONFIG.showPhysicsDebug && this.game.physicsManager) {
            this.game.physicsManager.enableDebug(this.game.scene);
        }
        
        return this;
    }
    
    /**
     * Remove debug visual helpers
     */
    removeDebugHelpers() {
        // Only remove if we have a scene
        if (!this.game || !this.game.scene) return;
        
        // Remove all debug objects from the scene
        this.debugObjects.forEach(obj => {
            if (obj && obj.parent) {
                this.game.scene.remove(obj);
            }
        });
        
        // Clear the array
        this.debugObjects = [];
        
        // Disable physics debug visualization
        if (this.game.physicsManager) {
            this.game.physicsManager.disableDebug();
        }
        
        return this;
    }
    
    /**
     * Log ball velocity if enabled
     * @param {THREE.Vector3} velocity - Ball velocity vector
     */
    logBallVelocity(velocity) {
        if (!this.enabled || !DEBUG_CONFIG.logVelocity) return;
        
        const speed = velocity.length();
        
        // Add to history
        this.velocityHistory.push(speed);
        
        // Keep history at max length
        if (this.velocityHistory.length > this.maxHistoryLength) {
            this.velocityHistory.shift();
        }
        
        // Log to console
        console.log(`Ball speed: ${speed.toFixed(2)} m/s`);
        
        return this;
    }
    
    /**
     * Log debug message if debug mode is enabled
     * @param {string} message - Message to log
     * @param {any} data - Optional data to log
     */
    log(message, data = null) {
        if (!this.enabled) return;
        
        if (data !== null) {
            console.log(message, data);
        } else {
            console.log(message);
        }
        
        return this;
    }
    
    /**
     * Get debug info object for UI display
     * @returns {object} Object with debug properties
     */
    getDebugInfo() {
        if (!this.enabled) return {};
        
        const info = {
            FPS: Math.round(1 / this.game.deltaTime),
            'Debug Mode': this.enabled ? 'ON' : 'OFF'
        };
        
        // Add ball info if available
        if (this.game.ball && this.game.ball.body) {
            const velocity = this.game.ball.body.velocity;
            const position = this.game.ball.mesh.position;
            
            info['Ball Position'] = `X: ${position.x.toFixed(2)}, Y: ${position.y.toFixed(2)}, Z: ${position.z.toFixed(2)}`;
            info['Ball Velocity'] = `${velocity.length().toFixed(2)} m/s`;
        }
        
        return info;
    }
    
    /**
     * Clean up debug resources
     */
    cleanup() {
        // Remove debug key listener
        window.removeEventListener('keydown', this.handleKeyPress);
        
        // Remove debug helpers
        this.removeDebugHelpers();
        
        return this;
    }
} 