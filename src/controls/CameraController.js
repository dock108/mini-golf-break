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
        
        // Setup camera and controls
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.controls = null;
        
        // Game references
        this.course = null;
        this.ball = null;
        
        // Debug mode
        this.debugMode = false;
        
        // Initialization state tracking
        this.isInitialized = false;
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
        try {
            // Guard against multiple initialization
            if (this.isInitialized) {
                if (this.game.debugManager) {
                    this.game.debugManager.warn('CameraController.init', 'Already initialized');
                }
                return this;
            }
            
            // Ensure we have a renderer
            if (!this.renderer) {
                if (this.game.debugManager) {
                    this.game.debugManager.warn('CameraController.init', 'Initialized without renderer, orbit controls will be disabled');
                } else {
                    console.warn("CameraController initialized without renderer, orbit controls will be disabled");
                }
            }
            
            // Setup camera initial position - higher up for better space view
            this.camera.position.set(0, 15, 15);
            this.camera.lookAt(0, 0, 0);
            
            // Initialize orbit controls if we have a renderer
            if (this.renderer) {
                try {
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
                } catch (error) {
                    if (this.game.debugManager) {
                        this.game.debugManager.error('CameraController.init', 'Failed to initialize orbit controls', error);
                    } else {
                        console.error("Failed to initialize orbit controls:", error);
                    }
                }
            } else if (this.game.debugManager) {
                this.game.debugManager.warn('CameraController.init', 'Orbit controls disabled - no renderer available');
            }
            
            // Set up resize event listener
            try {
                // Use a bound method for the event handler
                this.handleResize = this.handleResize.bind(this);
                window.addEventListener('resize', this.handleResize);
            } catch (error) {
                if (this.game.debugManager) {
                    this.game.debugManager.warn('CameraController.init', 'Failed to add resize listener', error);
                }
            }
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Mark as initialized
            this.isInitialized = true;
            
            if (this.game.debugManager) {
                this.game.debugManager.log('CameraController initialized');
            }
        } catch (error) {
            if (this.game.debugManager) {
                this.game.debugManager.error('CameraController.init', 'Failed to initialize camera controller', error);
            } else {
                console.error('Failed to initialize camera controller:', error);
            }
        }
        
        return this;
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        if (!this.game.eventManager) {
            if (this.game.debugManager) {
                this.game.debugManager.warn('CameraController.setupEventListeners', 'EventManager not available, skipping event subscriptions');
            }
            return;
        }
        
        try {
            // Initialize event subscriptions array if not already created
            this.eventSubscriptions = this.eventSubscriptions || [];
            
            // Store subscription functions to simplify cleanup
            this.eventSubscriptions = [
                // Listen for ball movement to follow with camera
                this.game.eventManager.subscribe(
                    EventTypes.BALL_MOVED,
                    this.handleBallMoved,
                    this
                ),
                
                // Listen for hole started events
                this.game.eventManager.subscribe(
                    EventTypes.HOLE_STARTED,
                    this.handleHoleStarted,
                    this
                ),
                
                // Listen for ball creation events
                this.game.eventManager.subscribe(
                    EventTypes.BALL_CREATED,
                    this.handleBallCreated,
                    this
                )
            ];
            
            if (this.game.debugManager) {
                this.game.debugManager.log('CameraController event listeners initialized');
            }
        } catch (error) {
            if (this.game.debugManager) {
                this.game.debugManager.error('CameraController.setupEventListeners', 'Failed to set up event listeners', error);
            } else {
                console.error('Failed to set up event listeners:', error);
            }
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
     * Handle hole started events
     * @param {GameEvent} event - The hole started event
     */
    handleHoleStarted(event) {
        // Position camera for the new hole
        this.positionCameraForHole();
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
        
        // Calculate direction from tee to hole
        const direction = new THREE.Vector3().subVectors(holePosition, startPosition).normalize();
        
        // Position camera at an angle to see both tee and hole
        const distance = startPosition.distanceTo(holePosition);
        const cameraOffset = new THREE.Vector3(
            direction.z * distance * 0.7, // Offset perpendicular to hole direction
            distance * 0.8,               // Height based on distance
            -direction.x * distance * 0.7  // Offset perpendicular to hole direction
        );
        
        // Set camera position relative to midpoint
        this.camera.position.copy(midpoint.clone().add(cameraOffset));
        
        // Look at midpoint
        this.camera.lookAt(midpoint);
        
        // Update orbit controls target if they exist
        if (this.controls) {
            this.controls.target.copy(midpoint);
            this.controls.update();
        }
        
        return this;
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
        
        // Only follow the ball if it's moving
        if (this.game.stateManager && this.game.stateManager.isBallInMotion()) {
            if (this.controls) {
                // Update the orbit controls target to follow the ball
                this.controls.target.lerp(ballPosition, 0.2);
                this.controls.update();
            } else {
                // If no controls, update camera position directly to follow the ball
                const cameraTargetPosition = ballPosition.clone().add(new THREE.Vector3(10, 10, 10));
                this.camera.position.lerp(cameraTargetPosition, 0.1);
                this.camera.lookAt(ballPosition);
            }
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
} 