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
        
        // Managers
        this.ballManager = null;
        this.adShipManager = null;
        
        // Setup camera and controls with increased far plane
        this.camera = new THREE.PerspectiveCamera(
            60, // Field of View (remains 60)
            window.innerWidth / window.innerHeight, // Aspect Ratio
            0.1, // Near Clipping Plane
            5000 // Far Clipping Plane (Increased significantly from 1000)
        );
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

        // --- Ad Focus Blending State --- 
        this.wasBallMovingLastFrame = false;
        this.closestAdShip = null;
        this.targetAdFocusWeight = 0.0; // Target weight (0 or 1)
        this.currentAdFocusWeight = 0.0; // Smoothed weight (0 to 1)

        // --- Ad Focus Config --- 
        this.ballMoveThresholdSq = 0.2 * 0.2; // Squared velocity threshold to consider ball moving
        this.adFocusLerpFactor = 2.0;        // Speed of blending towards target weight
        this.maxAdShipCheckDistanceSq = 70 * 70; // Don't focus on ships too far away (squared)
        this.adFocusMaxWeight = 0.35;       // Max blend amount towards ad ship (0 to 1)
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
            
            // Get manager references
            this.ballManager = this.game.ballManager;
            this.adShipManager = this.game.adShipManager;
            if (!this.ballManager || !this.adShipManager) {
                 console.warn('[CameraController.init] BallManager or AdShipManager not found!');
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
        this.updateCameraFollowBall(deltaTime);
    }
    
    /**
     * Position camera to view the current hole
     */
    positionCameraForHole() {
        // --- Force Reset Ad Focus State --- 
        this.targetAdFocusWeight = 0.0;
        this.currentAdFocusWeight = 0.0;
        this.closestAdShip = null;
        this.wasBallMovingLastFrame = false; // Ensure ball state is reset too
        console.log('[CameraController] Resetting ad focus state for new hole.');
        // --- End Reset --- 

        if (!this.course) {
            console.warn("Cannot position camera: Course not available");
            return this;
        }
        
        // Get WORLD hole and start positions directly from course manager
        const worldHolePosition = this.course.getHolePosition();
        if (!worldHolePosition) {
            console.warn("Cannot position camera: Hole position not available");
            return this;
        }
        const worldStartPosition = this.course.getHoleStartPosition();
        if (!worldStartPosition) {
            console.warn("Cannot position camera: Start position not available");
            return this;
        }
        
        console.log(`Positioning camera for hole. ` +
                    `World Start: ${worldStartPosition.toArray().join(',')}, World Hole: ${worldHolePosition.toArray().join(',')}`);
        
        // Calculate midpoint between WORLD tee and hole
        const midpoint = new THREE.Vector3().addVectors(worldStartPosition, worldHolePosition).multiplyScalar(0.5);
        
        // --- Calculate course dimensions (using WORLD coordinates) ---
        const width = Math.abs(worldStartPosition.x - worldHolePosition.x);
        const length = Math.abs(worldStartPosition.z - worldHolePosition.z);
        const diagonal = Math.sqrt(width * width + length * length);

        // Temporarily adjust controls to allow more flexible camera placement
        let originalMaxPolarAngle = Math.PI / 2;
        if (this.controls) {
            originalMaxPolarAngle = this.controls.maxPolarAngle;
            this.controls.maxPolarAngle = Math.PI; // Allow full rotation for initial positioning
        }
        
        // --- Calculate viewing parameters (using WORLD coordinates) ---
        const fovYRad = THREE.MathUtils.degToRad(this.camera.fov);
        const minHeight = 12.0;
        const baseHeight = Math.max((diagonal * 1.0), minHeight);
        const courseDirection = new THREE.Vector3().subVectors(worldHolePosition, worldStartPosition).normalize();
        const cameraOffset = new THREE.Vector3(
            -courseDirection.z * 0.6,
            baseHeight, 
            courseDirection.x * 0.6 
        ).normalize().multiplyScalar(diagonal * 1.2); 
        const weightToStart = 0.65;
        const weightedMidpoint = new THREE.Vector3().lerpVectors(
            midpoint,
            worldStartPosition,
            weightToStart
        );
        const behindBallDirection = new THREE.Vector3().subVectors(worldStartPosition, worldHolePosition).normalize();
        const behindBallOffset = behindBallDirection.multiplyScalar(diagonal * 0.2);
        const adjustedMidpoint = weightedMidpoint.clone().add(behindBallOffset);
        const cameraPosition = adjustedMidpoint.clone().add(cameraOffset);
        
        // Set camera position
        this.camera.position.copy(cameraPosition);
        
        // Look at a point that ensures we can see the entire hole (WORLD coordinates)
        const lookAtPoint = new THREE.Vector3().lerpVectors(
            midpoint,
            worldStartPosition,
            0.2
        );
        lookAtPoint.y -= 1.5; // Lower the look-at point
        
        this.camera.lookAt(lookAtPoint);
        
        // Update orbit controls target
        if (this.controls) {
            this.controls.target.copy(lookAtPoint);
            this.controls.update();
            this.controls.maxPolarAngle = originalMaxPolarAngle; // Restore angle limit
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
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateCameraFollowBall(deltaTime) {
        // Get the ball reference from the ball manager
        const ball = this.game.ballManager ? this.game.ballManager.ball : null;
        if (!ball || !ball.mesh) return;
        
        const ballPosition = ball.mesh.position.clone(); // Ball position is already WORLD

        // During transition, always follow the ball regardless of user adjustment
        if (this.isTransitioning) {
            // Position camera slightly above and behind ball with high angle
            // Calculate direction based on ball's velocity if available
            let cameraPosition;
            if (ball.body && ball.body.velocity) {
                const velocity = ball.body.velocity;
                const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
                if (speed > 0.5) {
                    // If ball is moving with speed, position camera behind the movement direction
                    const directionNormalized = new THREE.Vector3(velocity.x, 0, velocity.z).normalize();
                    cameraPosition = ballPosition.clone()
                        .sub(directionNormalized.multiplyScalar(4)) // Position behind ball
                        .add(new THREE.Vector3(0, 8, 0));           // Raise up
                } else {
                    // Default position if not moving fast
                    cameraPosition = ballPosition.clone().add(new THREE.Vector3(2, 8, 4));
                }
            } else {
                // Fallback if no velocity data
                cameraPosition = ballPosition.clone().add(new THREE.Vector3(2, 8, 4));
            }
            
            // Smooth camera movement
            this.camera.position.lerp(cameraPosition, 0.15); // Increased lerp factor for transition
            
            // Look at a point slightly below the ball to shift view down
            const lookPoint = ballPosition.clone();
            lookPoint.y -= 1.5;
            this.camera.lookAt(lookPoint);
            
            if (this.controls) {
                this.controls.target.copy(lookPoint);
                this.controls.update();
            }
            return;
        }
        
        // === Ad Focus Blending Logic ===
        let finalLookAtTarget = ballPosition.clone();
        finalLookAtTarget.y -= 1.5; // Default look-at point slightly below ball

        if (this.adShipManager && this.ballManager && this.ballManager.ball?.body) {
            const ballVelocitySq = this.ballManager.ball.body.velocity.lengthSquared();
            const isBallMoving = ballVelocitySq > this.ballMoveThresholdSq;

            // Detect state change: Ball starts moving
            if (isBallMoving && !this.wasBallMovingLastFrame) {
                this.closestAdShip = this._findClosestVisibleAdShip(ballPosition);
                if (this.closestAdShip) {
                    this.targetAdFocusWeight = 1.0;
                    // console.log(`[Camera] Ball started moving. Targeting ad ship: ${this.closestAdShip.adData.title}`);
                } else {
                    this.targetAdFocusWeight = 0.0; // No suitable ship found
                }
            }
            // Detect state change: Ball stops moving
            else if (!isBallMoving && this.wasBallMovingLastFrame) {
                this.targetAdFocusWeight = 0.0;
                // Don't clear closestAdShip immediately, let weight blend out
                // console.log("[Camera] Ball stopped moving. Blending back focus.");
            }

            // Smoothly blend the focus weight
            this.currentAdFocusWeight = THREE.MathUtils.lerp(this.currentAdFocusWeight, this.targetAdFocusWeight, this.adFocusLerpFactor * deltaTime);
            if (this.currentAdFocusWeight < 0.01) {
                 this.currentAdFocusWeight = 0.0; // Snap to zero if close enough
                 this.closestAdShip = null; // Clear target once blend is finished
            }

            // Calculate final look-at target if blending towards an ad ship
            if (this.currentAdFocusWeight > 0 && this.closestAdShip) {
                const baseTarget = ballPosition.clone(); // Start with ball position
                baseTarget.y -= 1.5; // Lower target
                const adShipTarget = this.closestAdShip.group.position.clone();
                // Blend towards the ad ship, but apply max weight limit
                const blendWeight = this.currentAdFocusWeight * this.adFocusMaxWeight;
                finalLookAtTarget.lerpVectors(baseTarget, adShipTarget, blendWeight);
                 // console.log(`[Camera] Blending focus. Weight: ${this.currentAdFocusWeight.toFixed(2)}, Blend: ${blendWeight.toFixed(2)}`);
            }

            this.wasBallMovingLastFrame = isBallMoving;
        }
        // === End Ad Focus Blending ===

        // Always reset user adjustment flag when ball is moving
        // This ensures that after a shot, the camera starts following again
        if (this.game.stateManager && this.game.stateManager.isBallInMotion()) {
            // Reset the user adjustment flag when ball starts moving
            this._userAdjustedCamera = false;
            
            if (this.controls) {
                // Calculate target point slightly ahead of the ball (WORLD)
                let targetPosition = ballPosition.clone(); // Default to ball world position
                const velocity = ball.body.velocity;
                const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
                const lookAheadDistance = 1.5;
                const minSpeedForLookAhead = 0.1;

                if (speed > minSpeedForLookAhead) {
                    const lookAheadDirection = new THREE.Vector3(velocity.x, 0, velocity.z).normalize();
                    targetPosition.add(lookAheadDirection.multiplyScalar(lookAheadDistance));
                }
                targetPosition.y -= 1.5; // Lower target
                this.controls.target.lerp(targetPosition, 0.1);

                // Calculate ideal camera position (WORLD)
                const cameraDistance = 8;
                const cameraHeight = 6;
                let idealCameraPosition;
                if (speed > minSpeedForLookAhead) {
                    const cameraOffset = new THREE.Vector3(-velocity.x, cameraHeight, -velocity.z).normalize().multiplyScalar(cameraDistance);
                    idealCameraPosition = ballPosition.clone().add(cameraOffset);
                } else {
                    const currentDir = new THREE.Vector3().subVectors(this.camera.position, ballPosition).normalize();
                    currentDir.y = 0;
                    currentDir.normalize().multiplyScalar(cameraDistance * 0.7);
                    currentDir.y = cameraHeight;
                    idealCameraPosition = ballPosition.clone().add(currentDir);
                }
                this.camera.position.lerp(idealCameraPosition, 0.05);
                this.controls.update();
            } else { 
                // Fallback if no controls (position relative to WORLD ball pos)
                const cameraTargetPosition = ballPosition.clone().add(new THREE.Vector3(3, 15, 8));
                this.camera.position.lerp(cameraTargetPosition, 0.1);
                this.camera.lookAt(ballPosition);
            }
        } else {
            // When ball is stopped, calculate target relative to WORLD hole position
            // Reset ad focus when ball is stopped
            this.targetAdFocusWeight = 0.0;
            // Smoothly blend out any remaining focus weight
             this.currentAdFocusWeight = THREE.MathUtils.lerp(this.currentAdFocusWeight, this.targetAdFocusWeight, this.adFocusLerpFactor * deltaTime);
             if (this.currentAdFocusWeight < 0.01) {
                 this.currentAdFocusWeight = 0.0;
                 this.closestAdShip = null;
             }

            if (!this._userAdjustedCamera && this.controls && this.course) {
                const worldHolePosition = this.course.getHolePosition(); // Already returns WORLD
                if (worldHolePosition) {
                    const directionToHole = new THREE.Vector3().subVectors(worldHolePosition, ballPosition).normalize();
                    const weightedMidpoint = new THREE.Vector3().lerpVectors(ballPosition, worldHolePosition, 0.4);
                    weightedMidpoint.y -= 1.5;
                    this.controls.target.lerp(weightedMidpoint, 0.03);

                    // Calculate ideal stopped camera position (using WORLD coordinates)
                    if (this.camera && !this._isRepositioning) {
                        const distanceToHole = ballPosition.distanceTo(worldHolePosition);
                        const reversedDirection = directionToHole.clone().negate().normalize();
                        const idealOffset = new THREE.Vector3(
                            -directionToHole.z * 0.4, 
                            Math.max(12, distanceToHole * 0.8), 
                            directionToHole.x * 0.4 
                        ).normalize().multiplyScalar(distanceToHole * 1.2);
                        // Increase minimum distance behind ball from 4 to 6
                        const behindBallOffset = reversedDirection.multiplyScalar(Math.max(6, distanceToHole * 0.3));
                        const desiredCameraPos = ballPosition.clone().add(behindBallOffset).add(idealOffset);
                        this.camera.position.lerp(desiredCameraPos, 0.02);
                    }
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
            this.camera.lookAt(0, -1.5, -5); // Look lower and further ahead to show more of the course
            
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

    /** Helper to find the closest ad ship within a certain distance */
    _findClosestVisibleAdShip(ballPosition) {
        if (!this.adShipManager || !this.adShipManager.ships || this.adShipManager.ships.length === 0) {
            return null;
        }

        let closestShip = null;
        let minDistanceSq = this.maxAdShipCheckDistanceSq;

        this.adShipManager.ships.forEach(ship => {
            const distanceSq = ballPosition.distanceToSquared(ship.group.position);
            if (distanceSq < minDistanceSq) {
                // Basic visibility check (could be enhanced with raycasting or frustum checks)
                // For now, just use distance
                minDistanceSq = distanceSq;
                closestShip = ship;
            }
        });

        // if (closestShip) console.log(`[Camera] Closest ship found: ${closestShip.adData.title} at dist ${Math.sqrt(minDistanceSq).toFixed(1)}`);
        return closestShip;
    }

    /**
     * Pans the camera when user aims near the edge of the screen
     * @param {THREE.Vector3} direction - Normalized direction to pan
     * @param {number} amount - Strength of the pan (0-1)
     */
    panCameraOnEdge(direction, amount) {
        // Ignore if in transition or user is manually adjusting camera
        if (this.isTransitioning || this._isRepositioning) return;
        
        // Get ball reference if available
        const ball = this.game.ballManager ? this.game.ballManager.ball : null;
        if (!ball || !ball.mesh) return;
        
        // Get current camera and target positions
        const ballPosition = ball.mesh.position.clone();
        
        // Scale direction to world space (adjust for camera's local coordinate system)
        // We need to convert screen space direction to world space
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0; // Keep horizontal
        cameraDirection.normalize();
        
        // Get the right vector of the camera (perpendicular to direction)
        const cameraRight = new THREE.Vector3(
            -cameraDirection.z,
            0,
            cameraDirection.x
        ).normalize();
        
        // Compose the pan movement using the camera's own axes
        const panMove = new THREE.Vector3();
        panMove.addScaledVector(cameraRight, direction.x);
        panMove.addScaledVector(cameraDirection, -direction.z);
        
        // Calculate pan amount with some limits to prevent moving too far from the ball
        const maxPanDistance = 5.0; // Maximum pan distance from ball
        const panAmountScaled = amount * 0.15; // Scale amount for smoother motion
        
        // Apply pan to camera position
        if (this.controls) {
            // Move the orbit controls target to pan the view
            this.controls.target.add(panMove.clone().multiplyScalar(panAmountScaled));
            
            // Keep camera at reasonable distance from ball
            const currentTargetToBallDist = this.controls.target.distanceTo(ballPosition);
            if (currentTargetToBallDist > maxPanDistance) {
                // If we've panned too far, move the target back towards ball
                const correction = new THREE.Vector3().subVectors(ballPosition, this.controls.target);
                correction.normalize().multiplyScalar(currentTargetToBallDist - maxPanDistance);
                this.controls.target.add(correction);
            }
            
            // Make sure camera updates
            this.controls.update();
        } else {
            // If no orbit controls, move camera directly
            this.camera.position.add(panMove.clone().multiplyScalar(panAmountScaled));
            this.camera.lookAt(ballPosition);
        }
    }
} 