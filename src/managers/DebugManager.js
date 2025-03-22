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
    showPhysicsDebug: false, // Show physics debug visualizations
    logCriticalErrors: true, // Always log critical errors, even when debug is disabled
    errorTracking: {
        maxErrors: 50,      // Maximum number of errors to track
        suppressRepeated: true, // Suppress repeated identical errors
        maxRepeats: 3       // Number of times an identical error is logged before suppression
    }
};

/**
 * Error levels for the logging system
 */
export const ERROR_LEVELS = {
    ERROR: 'ERROR',      // Critical errors that prevent proper functionality
    WARNING: 'WARNING',  // Non-critical issues that may affect gameplay
    INFO: 'INFO',        // General information logs
    DEBUG: 'DEBUG'       // Detailed debug information
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
        
        // Error tracking
        this.errorHistory = new Map(); // Maps error messages to count
        this.errorsByLevel = {
            [ERROR_LEVELS.ERROR]: 0,
            [ERROR_LEVELS.WARNING]: 0,
            [ERROR_LEVELS.INFO]: 0,
            [ERROR_LEVELS.DEBUG]: 0
        };
        
        // UI elements for displaying errors
        this.errorOverlay = null;
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
        
        // Create error overlay container (hidden initially)
        this.createErrorOverlay();
        
        return this;
    }
    
    /**
     * Create the error overlay for displaying critical errors to the user
     */
    createErrorOverlay() {
        if (document.getElementById('error-overlay')) {
            this.errorOverlay = document.getElementById('error-overlay');
            return;
        }
        
        this.errorOverlay = document.createElement('div');
        this.errorOverlay.id = 'error-overlay';
        this.errorOverlay.style.position = 'fixed';
        this.errorOverlay.style.bottom = '10px';
        this.errorOverlay.style.left = '10px';
        this.errorOverlay.style.right = '10px';
        this.errorOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
        this.errorOverlay.style.color = 'white';
        this.errorOverlay.style.padding = '10px';
        this.errorOverlay.style.fontFamily = 'monospace';
        this.errorOverlay.style.fontSize = '14px';
        this.errorOverlay.style.zIndex = '1000';
        this.errorOverlay.style.display = 'none';
        this.errorOverlay.style.borderRadius = '5px';
        this.errorOverlay.style.maxHeight = '30%';
        this.errorOverlay.style.overflowY = 'auto';
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'X';
        closeButton.style.position = 'absolute';
        closeButton.style.right = '5px';
        closeButton.style.top = '5px';
        closeButton.style.background = 'transparent';
        closeButton.style.border = 'none';
        closeButton.style.color = 'white';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontSize = '18px';
        closeButton.addEventListener('click', () => {
            this.errorOverlay.style.display = 'none';
        });
        
        this.errorOverlay.appendChild(closeButton);
        document.body.appendChild(this.errorOverlay);
    }
    
    /**
     * Display a critical error in the UI error overlay
     * @param {string} message - Error message to display
     */
    showErrorInUI(message) {
        if (!this.errorOverlay) {
            this.createErrorOverlay();
        }
        
        // Create error message element
        const errorElement = document.createElement('div');
        errorElement.textContent = message;
        errorElement.style.marginBottom = '5px';
        errorElement.style.borderBottom = '1px solid rgba(255,255,255,0.3)';
        errorElement.style.paddingBottom = '5px';
        
        // Add to overlay
        this.errorOverlay.appendChild(errorElement);
        this.errorOverlay.style.display = 'block';
        
        // Auto-hide after 10 seconds if not interacted with
        setTimeout(() => {
            if (errorElement.parentNode) {
                errorElement.parentNode.removeChild(errorElement);
                
                // Hide overlay if no more errors
                if (this.errorOverlay.children.length <= 1) { // Only close button remaining
                    this.errorOverlay.style.display = 'none';
                }
            }
        }, 10000);
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
     * Log a message with a specified error level
     * @param {string} level - Error level (ERROR, WARNING, INFO, DEBUG)
     * @param {string} source - Source of the error (class or method name)
     * @param {string} message - Message to log
     * @param {any} data - Optional data to log
     * @param {boolean} showInUI - Whether to show critical errors in the UI
     * @returns {DebugManager} this for chaining
     */
    logWithLevel(level, source, message, data = null, showInUI = false) {
        // Always log critical errors, otherwise respect debug mode
        if (level !== ERROR_LEVELS.ERROR && !this.enabled) return this;
        
        // Format message with source
        const formattedMessage = `[${level}] ${source}: ${message}`;
        
        // Track error frequency
        this.trackError(level, formattedMessage);
        
        // Check if we should suppress this error (repeated too many times)
        if (this.shouldSuppressError(formattedMessage)) {
            return this;
        }
        
        // Log to console with appropriate method
        switch (level) {
            case ERROR_LEVELS.ERROR:
                console.error(formattedMessage, data !== null ? data : '');
                break;
            case ERROR_LEVELS.WARNING:
                console.warn(formattedMessage, data !== null ? data : '');
                break;
            case ERROR_LEVELS.INFO:
            case ERROR_LEVELS.DEBUG:
            default:
                console.log(formattedMessage, data !== null ? data : '');
                break;
        }
        
        // Show in UI if requested and it's a critical error
        if (showInUI && level === ERROR_LEVELS.ERROR) {
            this.showErrorInUI(formattedMessage);
        }
        
        return this;
    }
    
    /**
     * Log a critical error (always logged, even when debug is disabled)
     * @param {string} source - Source of the error (class or method name)
     * @param {string} message - Error message
     * @param {any} data - Optional data related to the error
     * @param {boolean} showInUI - Whether to show in the UI error overlay
     * @returns {DebugManager} this for chaining
     */
    error(source, message, data = null, showInUI = false) {
        return this.logWithLevel(ERROR_LEVELS.ERROR, source, message, data, showInUI);
    }
    
    /**
     * Log a warning (only when debug is enabled)
     * @param {string} source - Source of the warning
     * @param {string} message - Warning message
     * @param {any} data - Optional data to include
     * @returns {DebugManager} this for chaining
     */
    warn(source, message, data = null) {
        return this.logWithLevel(ERROR_LEVELS.WARNING, source, message, data);
    }
    
    /**
     * Log an informational message (only when debug is enabled)
     * @param {string} source - Source of the info
     * @param {string} message - Info message
     * @param {any} data - Optional data to include
     * @returns {DebugManager} this for chaining
     */
    info(source, message, data = null) {
        return this.logWithLevel(ERROR_LEVELS.INFO, source, message, data);
    }
    
    /**
     * Log debug message if debug mode is enabled (legacy method for compatibility)
     * @param {string} message - Message to log
     * @param {any} data - Optional data to log
     */
    log(message, data = null) {
        return this.logWithLevel(ERROR_LEVELS.DEBUG, 'Debug', message, data);
    }
    
    /**
     * Track error frequency
     * @param {string} level - Error level
     * @param {string} message - Error message to track
     */
    trackError(level, message) {
        // Increment error count for this level
        this.errorsByLevel[level]++;
        
        // Track unique error message frequency
        const currentCount = this.errorHistory.get(message) || 0;
        this.errorHistory.set(message, currentCount + 1);
        
        // Prevent memory leaks by limiting the size of the error history
        if (this.errorHistory.size > DEBUG_CONFIG.errorTracking.maxErrors) {
            // Remove the oldest entries
            const iterator = this.errorHistory.keys();
            this.errorHistory.delete(iterator.next().value);
        }
    }
    
    /**
     * Check if an error should be suppressed (repeated too many times)
     * @param {string} message - Error message to check
     * @returns {boolean} Whether to suppress the error
     */
    shouldSuppressError(message) {
        if (!DEBUG_CONFIG.errorTracking.suppressRepeated) {
            return false;
        }
        
        const count = this.errorHistory.get(message) || 0;
        return count > DEBUG_CONFIG.errorTracking.maxRepeats;
    }
    
    /**
     * Get error statistics for the UI
     * @returns {object} Error statistics
     */
    getErrorStats() {
        return {
            totalErrors: this.errorsByLevel[ERROR_LEVELS.ERROR],
            totalWarnings: this.errorsByLevel[ERROR_LEVELS.WARNING],
            uniqueErrors: this.errorHistory.size
        };
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
        
        // Add error statistics
        const errorStats = this.getErrorStats();
        if (errorStats.totalErrors > 0 || errorStats.totalWarnings > 0) {
            info['Errors'] = errorStats.totalErrors;
            info['Warnings'] = errorStats.totalWarnings;
        }
        
        // Add ball info if available
        if (this.game.ballManager && this.game.ballManager.ball && this.game.ballManager.ball.body) {
            const ball = this.game.ballManager.ball;
            const velocity = ball.body.velocity;
            const position = ball.mesh.position;
            
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
        
        // Remove error overlay
        if (this.errorOverlay && this.errorOverlay.parentNode) {
            this.errorOverlay.parentNode.removeChild(this.errorOverlay);
        }
        
        return this;
    }
} 