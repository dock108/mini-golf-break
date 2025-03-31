import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EventTypes } from '../events/EventTypes';

/**
 * CameraController class
 * Handles camera initialization, positioning, and behavior for Mini Golf Break
 */
export class CameraController {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.renderer = null;
        
        // Setup camera and controls with a narrower FOV for better course visibility
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.controls = null;
        
        // Game references
        this.course = null;
        this.ball = null;
        
        // Debug mode
        this.debugMode = false;
        
        // Initialization state tracking
        this.isInitialized = false;
        
        this.isTransitioning = false;
        this._isRepositioning = false; // Flag to track camera repositioning
        this._userAdjustedCamera = false; // Flag to track if user manually adjusted camera
        this._lastManualControlTime = 0; // Track when user last manually adjusted camera
    }
    
    /**
     * Set the renderer after it's initialized
     * @param {THREE.WebGLRenderer} renderer - The renderer
     */
    setRenderer(renderer) {
        this.renderer = renderer;
        return this;
    }
    
    /**
     * Initialize camera and controls
     */
    init() {
        console.log('[CameraController.init] Starting...');
        try {
            // Guard against multiple initialization
            if (this.isInitialized) {
                 console.warn('[CameraController.init] Already initialized, skipping.');
                return this;
            }
            
            // Setup camera
            console.log('[CameraController.init] Setting up camera...');
            this.setupCamera();
            console.log('[CameraController.init] Camera setup finished.');
            
            // Setup controls if renderer is available
            if (this.renderer) {
                 console.log('[CameraController.init] Setting up controls...');
                this.setupControls();
                 console.log('[CameraController.init] Controls setup finished.');
            } else {
                 console.warn('[CameraController.init] Initialized without renderer, orbit controls will be disabled');
            }
            
            // Set up event listeners
             console.log('[CameraController.init] Setting up event listeners...');
            this.setupEventListeners();
             console.log('[CameraController.init] Event listeners setup finished.');
            
            // Set up resize event listener
            try {
                 console.log('[CameraController.init] Adding resize listener...');
                this.handleResize = this.handleResize.bind(this);
                window.addEventListener('resize', this.handleResize);
                 console.log('[CameraController.init] Resize listener added.');
            } catch (error) {
                 console.warn('[CameraController.init] Failed to add resize listener:', error);
            }
            
            // Mark as initialized
            this.isInitialized = true;
             console.log('[CameraController.init] Finished.');
        } catch (error) {
             console.error('[CameraController.init] Failed:', error);
        }
        
        return this;
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
         console.log('[CameraController.setupEventListeners] Starting...');
        if (!this.game.eventManager) {
             console.warn('[CameraController.setupEventListeners] EventManager not available, skipping.');
            return;
        }
        
        try {
            this.eventSubscriptions = this.eventSubscriptions || [];

            console.log('[CameraController.setupEventListeners] Subscribing to BALL_MOVED...');
            this.eventSubscriptions.push(this.game.eventManager.subscribe(EventTypes.BALL_MOVED, this.handleBallMoved, this));

            console.log('[CameraController.setupEventListeners] Subscribing to HOLE_STARTED...');
            this.eventSubscriptions.push(this.game.eventManager.subscribe(EventTypes.HOLE_STARTED, this.handleHoleStarted, this));

            console.log('[CameraController.setupEventListeners] Subscribing to BALL_CREATED...');
            this.eventSubscriptions.push(this.game.eventManager.subscribe(EventTypes.BALL_CREATED, this.handleBallCreated, this));
            
            console.log('[CameraController.setupEventListeners] Subscribing to BALL_HIT...');
            this.eventSubscriptions.push(this.game.eventManager.subscribe(EventTypes.BALL_HIT, this.handleBallHit, this));
            
            console.log('[CameraController.setupEventListeners] Finished.');
        } catch (error) {
             console.error('[CameraController.setupEventListeners] Failed:', error);
        }
    }
    
    /**
     * Handle ball movement events
     * @param {GameEvent} event - The ball moved event
     */
    handleBallMoved(event) {
        // This method is left empty as the camera already follows the ball in updateCameraFollowBall()
    }
    
    /**
     * Handle hole started events - Defer initial positioning
     * @param {GameEvent} event - The hole started event
     */
    handleHoleStarted(event) {
        console.log(`[CameraController.handleHoleStarted] Event received. isInitialized: ${this.isInitialized}, game initialized?: ${this.game.isInitialized}`);
        // We no longer position the camera immediately on HOLE_STARTED
        // during initial load. Subsequent hole starts might trigger positioning,
        // but initial setup is handled after course creation.
        console.log('[CameraController.handleHoleStarted] Initial positioning deferred.');
    }
    
    /**
     * Handle ball created events
     * @param {GameEvent} event - The ball created event
     */
    handleBallCreated(event) {
        // Update the ball reference
        this.ball = event.get('ball');
    }
    
    /**
     * Handle ball hit event - reset camera adjustment flag when ball is hit
     * @param {GameEvent} event - The ball hit event
     */
    handleBallHit(event) {
        // Reset user adjustment flag when ball is hit, so camera follows the shot
        this._userAdjustedCamera = false;
        console.log('[CameraController.handleBallHit] Ball hit, resetting camera adjustment flag');
    }
    
    /**
     * Handle window resize event
     */
    handleResize() {
        if (!this.camera) return;
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }
    
    /**
     * Enable/disable debug mode
     * @param {boolean} enabled - Whether to enable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        
        // In debug mode, allow more camera freedom
        if (this.controls) {
            this.controls.maxPolarAngle = enabled ? Math.PI : Math.PI / 2;
            this.controls.minDistance = enabled ? 0.5 : 2;
            
            if (this.game.debugManager) {
                this.game.debugManager.log(
                    `Camera debug mode ${enabled ? 'enabled' : 'disabled'}`
                );
            }
        }
        
        return this;
    }

    /**
     * Set the ball for the camera to follow
     * @param {Ball} ball - The ball object
     */
    setBall(ball) {
        this.ball = ball;
        
        if (!ball && this.game.debugManager) {
            this.game.debugManager.warn('CameraController.setBall', 'Ball reference cleared');
        }
        
        return this;
    }
    
    /**
     * Set reference to game course
     * @param {Course} course - The course object
     */
    setCourse(course) {
        this.course = course;
        return this;
    }
    
    /**
     * Update camera position and controls
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Update controls if they exist
        if (this.controls) {
            this.controls.update();
        }
        
        // Update camera to follow the ball if it exists and is moving
        this.updateCameraFollowBall();
    }
    
    /**
     * Position camera to view the current hole
     */
    positionCameraForHole() {
        if (!this.course) {
            console.warn("Cannot position camera: Course not available");
            return this;
        }
        
        // Get the hole position
        const holePosition = this.course.getHolePosition();
        if (!holePosition) {
            console.warn("Cannot position camera: Hole position not available");
            return this;
        }
        
        // Get the start position
        const startPosition = this.course.getHoleStartPosition();
        if (!startPosition) {
            console.warn("Cannot position camera: Start position not available");
            return this;
        }
        
        console.log(`Positioning camera for hole at ${holePosition.x.toFixed(2)}, ${holePosition.y.toFixed(2)}, ${holePosition.z.toFixed(2)}`);
        
        // Calculate midpoint between tee and hole
        const midpoint = new THREE.Vector3().addVectors(startPosition, holePosition).multiplyScalar(0.5);
        
        // Temporarily adjust controls to allow more flexible camera placement
        let originalMaxPolarAngle = Math.PI / 2;
        if (this.controls) {
            originalMaxPolarAngle = this.controls.maxPolarAngle;
            this.controls.maxPolarAngle = Math.PI; // Allow full rotation for initial positioning
        }

        // --- Calculate course dimensions ---
        const width = Math.abs(startPosition.x - holePosition.x);
        const length = Math.abs(startPosition.z - holePosition.z);
        const diagonal = Math.sqrt(width * width + length * length);
        
        // --- Calculate viewing parameters ---
        // Camera properties
        const fovYRad = THREE.MathUtils.degToRad(this.camera.fov);
        
        // Increased height for a more pulled-back, overhead view
        const minHeight = 12.0; // Significantly increased minimum height
        const baseHeight = Math.max((diagonal * 1.0), minHeight); // Further increased height multiplier
        
        // Calculate direction from tee to hole
        const courseDirection = new THREE.Vector3().subVectors(holePosition, startPosition).normalize();
        
        // Pull camera back much further and higher to see the entire hole
        // Use increased offset to ensure there's room to pull back on the ball
        const cameraOffset = new THREE.Vector3(
            -courseDirection.z * 0.6, // Increased perpendicular component for more sideview
            baseHeight,                // Much higher elevation
            courseDirection.x * 0.6    // Increased perpendicular component for more sideview
        ).normalize().multiplyScalar(diagonal * 1.2); // Increased scale for a more pulled-back view
        
        // Shift the weighted midpoint further back from the ball to see more space behind it
        const weightToStart = 0.65; // Increased from 0.55 to 0.65 (more weight to start position)
        const weightedMidpoint = new THREE.Vector3().lerpVectors(
            midpoint,
            startPosition,
            weightToStart
        );
        
        // Add extra space behind the ball to ensure room for aiming
        const behindBallDirection = new THREE.Vector3().subVectors(startPosition, holePosition).normalize();
        const behindBallOffset = behindBallDirection.multiplyScalar(diagonal * 0.2); // Add space behind ball
        const adjustedMidpoint = weightedMidpoint.clone().add(behindBallOffset);
        
        // Calculate final camera position
        const cameraPosition = adjustedMidpoint.clone().add(cameraOffset);
        
        // Set camera position
        this.camera.position.copy(cameraPosition);
        
        // Look at a point that ensures we can see the entire hole
        // Center more between the midpoint and start position to ensure ball aiming space is visible
        const lookAtPoint = new THREE.Vector3().lerpVectors(
            midpoint,
            startPosition,
            0.2 // 20% weight toward start position - ensures we see most of the hole
        );
        
        this.camera.lookAt(lookAtPoint);
        
        // Update orbit controls target
        if (this.controls) {
            this.controls.target.copy(lookAtPoint);
            this.controls.update(); // Apply the new position/target
            
            // Restore original angle limit AFTER update
            this.controls.maxPolarAngle = originalMaxPolarAngle;
        }
        
        return this;
    }
    
    /**
     * Set transition mode for camera
     * @param {boolean} enabled - Whether transition mode should be enabled
     */
    setTransitionMode(enabled) {
        this.isTransitioning = enabled;
    }

    /**
     * Update camera position to follow the ball
     */
    updateCameraFollowBall() {
        // Get the ball reference from the ball manager
        const ball = this.game.ballManager ? this.game.ballManager.ball : null;
        if (!ball || !ball.mesh) return;
        
        // Get the ball's position
        const ballPosition = ball.mesh.position.clone();
        
        // During transition, always follow the ball regardless of user adjustment
        if (this.isTransitioning) {
            // Position camera slightly above and behind ball with high angle
            const cameraPosition = ballPosition.clone().add(new THREE.Vector3(1, 8, 3));
            this.camera.position.lerp(cameraPosition, 0.1);
            this.camera.lookAt(ballPosition);
            
            if (this.controls) {
                this.controls.target.copy(ballPosition);
                this.controls.update();
            }
            return;
        }
        
        // Always reset user adjustment flag when ball is moving
        // This ensures that after a shot, the camera starts following again
        if (this.game.stateManager && this.game.stateManager.isBallInMotion()) {
            // Reset the user adjustment flag when ball starts moving
            this._userAdjustedCamera = false;
            
            if (this.controls) {
                // Calculate target point slightly ahead of the ball
                let targetPosition = ballPosition; // Default to ball position
                const velocity = ball.body.velocity;
                const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
                const lookAheadDistance = 1.5; // Increased from 0.5
                const minSpeedForLookAhead = 0.1; // Only look ahead if moving fast enough

                if (speed > minSpeedForLookAhead) {
                    const lookAheadDirection = new THREE.Vector3(velocity.x, 0, velocity.z).normalize();
                    targetPosition = ballPosition.clone().add(lookAheadDirection.multiplyScalar(lookAheadDistance));
                }

                // Update the orbit controls target to smoothly follow the calculated target position
                this.controls.target.lerp(targetPosition, 0.1); // Reduced from 0.2 for smoother follow
                this.controls.update();
            } else {
                // If no controls, update camera position directly to follow the ball
                // Use higher angle for better visibility
                const cameraTargetPosition = ballPosition.clone().add(new THREE.Vector3(3, 15, 8));
                this.camera.position.lerp(cameraTargetPosition, 0.1);
                this.camera.lookAt(ballPosition);
            }
        } else {
            // When ball is stopped, only reposition if user hasn't manually adjusted
            if (!this._userAdjustedCamera && this.controls && this.course) {
                const holePosition = this.course.getHolePosition();
                if (holePosition) {
                    // Get direction from ball to hole
                    const directionToHole = new THREE.Vector3().subVectors(holePosition, ballPosition).normalize();
                    
                    // Calculate a target point that keeps both the ball and enough of the hole in view
                    // Weight less toward the hole to ensure more space is visible behind the ball
                    const weightedMidpoint = new THREE.Vector3().lerpVectors(
                        ballPosition,
                        holePosition,
                        0.4 // 40% weight toward hole position - ensure more space behind ball
                    );
                    
                    // Gradually shift target toward this point when stopped
                    this.controls.target.lerp(weightedMidpoint, 0.03); // Slower to avoid jarring changes
                    
                    // When ball is stopped, we should also ensure camera is positioned
                    // to provide good viewing angle for the next shot
                    if (this.camera && !this._isRepositioning) {
                        // Calculate distance to hole for scaling
                        const distanceToHole = ballPosition.distanceTo(holePosition);
                        
                        // Calculate reversed direction (from hole to ball)
                        const reversedDirection = directionToHole.clone().negate().normalize();
                        
                        // Calculate ideal position with higher elevation and further back
                        const idealOffset = new THREE.Vector3(
                            -directionToHole.z * 0.4, // Perpendicular component for side view 
                            Math.max(12, distanceToHole * 0.8), // Higher elevation
                            directionToHole.x * 0.4  // Perpendicular component for side view
                        ).normalize().multiplyScalar(distanceToHole * 1.2);
                        
                        // Position further behind ball for more aiming space
                        // Use a larger multiplier to pull back more
                        const behindBallOffset = reversedDirection.multiplyScalar(Math.max(4, distanceToHole * 0.3));
                        
                        // Calculate final desired camera position
                        const desiredCameraPos = ballPosition.clone().add(behindBallOffset).add(idealOffset);
                        
                        // Smooth camera movement to this position when ball stops
                        this.camera.position.lerp(desiredCameraPos, 0.02); // Very slow transition
                    }
                } else {
                    // Fallback: If hole position isn't available, target the ball itself
                    // Only if user hasn't manually adjusted
                    this.controls.target.lerp(ballPosition, 0.1);
                }
            } else if (this.controls && !this._userAdjustedCamera) {
                // Fallback: If course isn't available but user hasn't adjusted camera
                this.controls.target.lerp(ballPosition, 0.1);
            }
            // If user has adjusted camera, do nothing - let them control it
        }
    }
    
    /**
     * Position camera behind ball pointing toward hole
     */
    positionCameraBehindBall() {
        // Get the ball reference from the ball manager
        const ball = this.game.ballManager ? this.game.ballManager.ball : null;
        if (!ball || !ball.mesh) return;
        
        // Get the ball's position
        const ballPosition = ball.mesh.position.clone();
        
        // Get hole position
        const holePosition = this.course ? this.course.getHolePosition() : null;
        if (!holePosition) return;
        
        // Calculate direction from ball to hole
        const direction = new THREE.Vector3().subVectors(holePosition, ballPosition).normalize();
        
        // Determine camera position behind the ball
        const cameraPosition = ballPosition.clone().sub(direction.clone().multiplyScalar(4));
        cameraPosition.y += 2; // Raise the camera a bit for better view
        
        // Set camera position and look at the ball
        this.camera.position.copy(cameraPosition);
        this.camera.lookAt(ballPosition);
        
        // Update orbit controls if they exist
        if (this.controls) {
            this.controls.target.copy(ballPosition);
            this.controls.update();
        }
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        try {
            // Remove window resize event listener
            try {
                window.removeEventListener('resize', this.handleResize);
            } catch (error) {
                if (this.game.debugManager) {
                    this.game.debugManager.warn('CameraController.cleanup', 'Error removing resize listener', error);
                }
            }
            
            // Clean up event subscriptions
            if (this.eventSubscriptions) {
                this.eventSubscriptions.forEach(unsubscribe => unsubscribe());
                this.eventSubscriptions = [];
            }
            
            // Dispose of orbit controls if they exist
            if (this.controls) {
                this.controls.dispose();
                this.controls = null;
            }
            
            // Clear references
            this.ball = null;
            this.course = null;
            this.renderer = null;
            
            // Reset initialization state
            this.isInitialized = false;
            
            // Log cleanup
            if (this.game.debugManager) {
                this.game.debugManager.log('CameraController cleaned up');
            }
        } catch (error) {
            // Log cleanup errors
            if (this.game.debugManager) {
                this.game.debugManager.error('CameraController.cleanup', 'Error during cleanup', error);
            } else {
                console.error('Error during CameraController cleanup:', error);
            }
        }
    }

    /**
     * Set up the camera with initial configuration
     */
    setupCamera() {
        try {
            // Position camera much higher and further back for a better overview
            // This ensures more space behind the ball for aiming
            this.camera.position.set(0, 15, 10); // Higher elevation and further back
            this.camera.lookAt(0, 0, -5); // Look further ahead to show more of the course
            
            if (this.game.debugManager) {
                this.game.debugManager.log('Camera setup complete');
            }
        } catch (error) {
            if (this.game.debugManager) {
                this.game.debugManager.error('CameraController.setupCamera', 'Failed to setup camera', error);
            } else {
                console.error('Failed to setup camera:', error);
            }
        }
    }

    /**
     * Set up the orbit controls
     */
    setupControls() {
        try {
            if (!this.renderer) {
                if (this.game.debugManager) {
                    this.game.debugManager.warn('CameraController.setupControls', 'No renderer available, skipping controls setup');
                }
                return;
            }

            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            
            // Configure controls
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.1;
            this.controls.rotateSpeed = 0.7;
            this.controls.zoomSpeed = 1.2;
            this.controls.minDistance = 2;
            this.controls.maxDistance = 30;
            this.controls.maxPolarAngle = Math.PI / 2; // Limit vertical rotation
            
            // Enable target movement with middle mouse
            this.controls.enablePan = true;
            this.controls.panSpeed = 0.8;
            this.controls.screenSpacePanning = true;

            // Add event listeners to detect manual camera adjustments
            this.controls.addEventListener('start', () => {
                this._userAdjustedCamera = true;
                this._lastManualControlTime = Date.now();
                console.log('[CameraController] User manually adjusted camera');
            });

            if (this.game.debugManager) {
                this.game.debugManager.log('Controls setup complete');
            }
        } catch (error) {
            if (this.game.debugManager) {
                this.game.debugManager.error('CameraController.setupControls', 'Failed to setup controls', error);
            } else {
                console.error('Failed to setup controls:', error);
            }
        }
    }

    /**
     * Sets the initial camera position after the first hole is confirmed ready.
     */
    setupInitialCameraPosition() {
        console.log('[CameraController] Setting up initial camera position.');
        // Reset manual adjustment flag
        this._userAdjustedCamera = false;
        // Now it's safe to position the camera for the initial hole
        this.positionCameraForHole(); 
    }
} 