import * as THREE from 'three';
import { EventTypes } from '../events/EventTypes';

/**
 * InputController - Handles all user input for the game
 * Manages mouse/touch interactions for aiming and hitting the ball
 */
export class InputController {
    constructor(game) {
        this.game = game;
        this.camera = game.camera;
        this.renderer = game.renderer;
        
        // Track input state
        this.isInputEnabled = true;
        this.isPointerDown = false;
        this.isDragging = false;
        
        // Track intersection point when clicking on the ground
        this.intersectionPoint = null;
        this.intersection = new THREE.Vector3();
        
        // Create raycaster for mouse intersection
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        
        // Max drag distance for power calculation (in world units)
        this.maxDragDistance = 5;
        
        // Hit parameters
        this.hitDirection = new THREE.Vector3(0, 0, 1); // Default forward
        this.hitPower = 0;
        
        // Reference to direction line
        this.directionLine = null;
        
        // Reference to power indicator
        this.powerIndicator = document.getElementById('power-indicator');
        
        // Store control state to restore later
        this.controlsWereEnabled = true;
        
        // Initialization state tracking
        this.isInitialized = false;
    }
    
    /**
     * Initialize event listeners and setup
     */
    init() {
        try {
            if (this.isInitialized) {
                if (this.game.debugManager) {
                    this.game.debugManager.warn('InputController.init', 'Already initialized');
                }
                return this;
            }
            
            this.initEventListeners();
            this.setupGameEventListeners();
            
            // Mark as initialized
            this.isInitialized = true;
            
            if (this.game.debugManager) {
                this.game.debugManager.log('InputController initialized');
            }
        } catch (error) {
            if (this.game.debugManager) {
                this.game.debugManager.error('InputController.init', 'Failed to initialize input controller', error);
            } else {
                console.error('Failed to initialize input controller:', error);
            }
        }
        
        return this;
    }
    
    /**
     * Initialize DOM event listeners
     */
    initEventListeners() {
        try {
            // Get the DOM element to attach events to
            const domElement = this.renderer ? this.renderer.domElement : window;
            
            // Bind methods to ensure 'this' context is preserved
            this.onMouseDown = this.onMouseDown.bind(this);
            this.onMouseMove = this.onMouseMove.bind(this);
            this.onMouseUp = this.onMouseUp.bind(this);
            this.onTouchStart = this.onTouchStart.bind(this);
            this.onTouchMove = this.onTouchMove.bind(this);
            this.onTouchEnd = this.onTouchEnd.bind(this);
            
            // Add event listeners
            domElement.addEventListener('mousedown', this.onMouseDown);
            window.addEventListener('mousemove', this.onMouseMove);
            window.addEventListener('mouseup', this.onMouseUp);
            
            // Touch events
            domElement.addEventListener('touchstart', this.onTouchStart);
            window.addEventListener('touchmove', this.onTouchMove);
            window.addEventListener('touchend', this.onTouchEnd);
            
            if (this.game.debugManager) {
                this.game.debugManager.log('InputController DOM event listeners initialized');
            }
        } catch (error) {
            if (this.game.debugManager) {
                this.game.debugManager.error('InputController.initEventListeners', 'Failed to initialize DOM event listeners', error);
            } else {
                console.error('Failed to initialize DOM event listeners:', error);
            }
        }
    }
    
    /**
     * Setup game event subscriptions
     */
    setupGameEventListeners() {
        if (!this.game.eventManager) {
            if (this.game.debugManager) {
                this.game.debugManager.warn('InputController.setupGameEventListeners', 'EventManager not available, skipping event subscriptions');
            }
            return;
        }
        
        try {
            // Initialize event subscriptions array if not already created
            this.eventSubscriptions = this.eventSubscriptions || [];
            
            // Store subscription functions to simplify cleanup
            this.eventSubscriptions = [
                // Listen for ball stopped to re-enable input
                this.game.eventManager.subscribe(
                    EventTypes.BALL_STOPPED,
                    this.handleBallStopped,
                    this
                ),
                
                // Listen for ball in hole to disable input
                this.game.eventManager.subscribe(
                    EventTypes.BALL_IN_HOLE,
                    this.handleBallInHole,
                    this
                ),
                
                // Listen for hole started to enable input
                this.game.eventManager.subscribe(
                    EventTypes.HOLE_STARTED,
                    this.handleHoleStarted,
                    this
                )
            ];
            
            if (this.game.debugManager) {
                this.game.debugManager.log('InputController game event listeners initialized');
            }
        } catch (error) {
            if (this.game.debugManager) {
                this.game.debugManager.error('InputController.setupGameEventListeners', 'Failed to set up game event listeners', error);
            } else {
                console.error('Failed to set up game event listeners:', error);
            }
        }
    }
    
    /**
     * Handle ball stopped event
     */
    handleBallStopped(event) {
        // Re-enable input when ball stops (if hole is not completed)
        if (!this.game.stateManager.isHoleCompleted()) {
            this.enableInput();
        }
    }
    
    /**
     * Handle ball in hole event
     */
    handleBallInHole(event) {
        // Disable input when ball goes in hole
        this.disableInput();
    }
    
    /**
     * Handle hole started event
     */
    handleHoleStarted(event) {
        // Enable input when a new hole starts
        this.enableInput();
    }
    
    isEventInsideCanvas(event) {
        const canvas = this.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        
        return (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
        );
    }
    
    onMouseDown(event) {
        // Check if input is allowed and if the ball is stopped
        const ball = this.game.ballManager?.ball;
        if (!this.isInputEnabled || (ball && !ball.isStopped())) {
             console.log(`[InputController.onMouseDown] Input ignored: InputEnabled=${this.isInputEnabled}, Ball Stopped=${ball ? ball.isStopped() : 'N/A'}`);
            return; // Ignore click if input disabled or ball is moving
        }
        
        // Only handle left mouse button
        if (event.button !== 0) return;
        
        // Check if mouse is over the canvas
        if (!this.isEventInsideCanvas(event)) return;
        
        // First, check if the ball is in motion - if so, we shouldn't allow new shots
        if (this.game.stateManager && this.game.stateManager.isBallInMotion()) {
            console.log("Ball is in motion, ignoring input");
            return;
        }
        
        // When starting a drag, store the current orbit controls state and disable them
        if (this.game.cameraController && this.game.cameraController.controls) {
            this.controlsWereEnabled = this.game.cameraController.controls.enabled;
            this.game.cameraController.controls.enabled = false;
        }
        
        // Set pointer down flag
        this.isPointerDown = true;
        this.isDragging = false; // Reset drag state
        
        // Update mouse position
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Cast ray into the scene
        this.raycaster.setFromCamera(this.pointer, this.camera);
        
        // Get ball reference from ball manager (already declared at start of function)
        // const ball = this.game.ballManager ? this.game.ballManager.ball : null;
        
        // Check if we clicked directly on the ball first
        let clickedOnBall = false;
        if (ball && ball.mesh) {
            const intersects = this.raycaster.intersectObject(ball.mesh);
            clickedOnBall = intersects.length > 0;
            
            // If we didn't click directly on the ball, check if we're close enough to the ball position
            // This makes it easier to click on the ball, especially on mobile
            if (!clickedOnBall) {
                // Create a plane at ball height for consistent dragging
                const ballPosition = ball.mesh.position.clone();
                const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -ballPosition.y);
                
                // Find intersection with the drag plane
                const intersection = new THREE.Vector3();
                this.raycaster.ray.intersectPlane(dragPlane, intersection);
                
                if (intersection) {
                    // Check if the intersection point is close enough to the ball (in world units)
                    const distanceToBall = intersection.distanceTo(ballPosition);
                    clickedOnBall = distanceToBall < ball.radius * 3; // Using 3x radius for easier clicking
                    
                    this.intersectionPoint = intersection.clone();
                    
                    // Initially no direction or power
                    this.hitDirection = new THREE.Vector3(0, 0, 0);
                    this.hitPower = 0;
                    
                    // Log start of input
                    console.log(`[InputController] Drag started on ball. Initial point: (${this.intersectionPoint.x.toFixed(2)}, ${this.intersectionPoint.z.toFixed(2)})`);
                    
                    // Show power indicator
                    if (this.powerIndicator) {
                        this.powerIndicator.style.display = 'block';
                        this.updatePowerIndicator(0);
                    }
                    
                    console.log(`Clicked at distance ${distanceToBall.toFixed(2)} from ball, clickedOnBall: ${clickedOnBall}`);
                }
            }
        }
        
        // If we didn't click on or near the ball, restore camera controls and exit
        if (!clickedOnBall) {
            this.isPointerDown = false;
            if (this.game.cameraController && this.game.cameraController.controls) {
                this.game.cameraController.controls.enabled = this.controlsWereEnabled;
            }
        }
        
        // Prevent default behavior
        event.preventDefault();
    }
    
    onMouseMove(event) {
        // Skip if input is not active or no drag started
        if (!this.isInputEnabled || !this.isPointerDown) return;
        
        // Set dragging flag
        this.isDragging = true;
        
        // Get mouse position
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Update the position in 3D space
        this.raycaster.setFromCamera(this.pointer, this.camera);
        
        // Create a plane at ball height for consistent dragging
        const ballPosition = this.game.ballManager.ball.mesh.position.clone();
        const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -ballPosition.y);
        
        // Find intersection with the drag plane
        const intersection = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(dragPlane, intersection);
        
        if (intersection) {
            // Calculate direction FROM the intersection point TO the ball
            // This way, pulling back from the ball creates a forward shot
            this.hitDirection = new THREE.Vector3().subVectors(ballPosition, intersection).normalize();
            
            // Calculate power based on distance (limit to max range)
            const dragDistance = ballPosition.distanceTo(intersection);
            this.hitPower = Math.min(dragDistance / this.maxDragDistance, 1.0);
            
            // Update indicator width
            this.updatePowerIndicator(this.hitPower);
            
            // Update or create the aim line
            this.updateAimLine(ballPosition, this.hitDirection, this.hitPower);
        }
        
        // Prevent default behavior
        event.preventDefault();
    }
    
    onMouseUp(event) {
        // Skip if not in dragging mode
        if (!this.isPointerDown || !this.isDragging) {
            this.isPointerDown = false;
            return;
        }
        
        // Only handle left mouse button
        if (event.button !== 0) return;
        
        // If dragging and input is enabled, attempt to hit the ball
        if (this.isInputEnabled && this.hitPower > 0.05) {
            // Hide direction line
            this.removeDirectionLine();
            
            // Hide power indicator
            if (this.powerIndicator) {
                this.powerIndicator.style.display = 'none';
            }
            
            // Hit ball using BallManager
            if (this.game.ballManager) {
                // Get direction in world space
                const direction = this.getWorldDirection();
                
                // Log stroke details
                console.log(`[InputController] Applying stroke: Power=${this.hitPower.toFixed(2)}, Direction=(${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}, ${direction.z.toFixed(2)})`);
                
                this.game.ballManager.hitBall(direction, this.hitPower);
                
                // Disable input until ball stops
                this.disableInput();
                
                // Publish input event
                this.game.eventManager.publish(
                    EventTypes.INPUT_DISABLED,
                    {
                        reason: 'ball_hit'
                    },
                    this
                );
            }
        }
        
        // Reset input state
        this.isPointerDown = false;
        this.isDragging = false;
        
        // Restore camera controls
        if (this.game.cameraController && this.game.cameraController.controls) {
            this.game.cameraController.controls.enabled = this.controlsWereEnabled;
        }
        
        // Prevent default behavior
        event.preventDefault();
    }
    
    onTouchStart(event) {
        // Check if input is allowed and if the ball is stopped
        const ball = this.game.ballManager?.ball;
        if (!this.isInputEnabled || (ball && !ball.isStopped())) {
             console.log(`[InputController.onTouchStart] Input ignored: InputEnabled=${this.isInputEnabled}, Ball Stopped=${ball ? ball.isStopped() : 'N/A'}`);
            return; // Ignore touch if input disabled or ball is moving
        }

        if (event.touches.length === 1) {
            const touch = event.touches[0];
            
            // Convert touch event to mouse position for ball click check
            const touchEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY
            };
            
            // Check if the touch is on the ball
            this.clickedOnBall = this.checkClickOnBall(touchEvent);
            
            if (this.clickedOnBall && !this.game.gameState.ballInMotion && !this.isDragging) {
                this.isDragging = true;
                
                // Save touch position
                this.dragStart.x = touch.clientX;
                this.dragStart.y = touch.clientY;
                this.dragCurrent.copy(this.dragStart);
                
                // Disable orbit controls during drag
                if (this.game.cameraController && this.game.cameraController.controls) {
                    this.controlsWereEnabled = this.game.cameraController.controls.enabled;
                    this.game.cameraController.controls.enabled = false;
                }
                
                // Create direction line
                this.createDirectionLine();
                
                event.preventDefault();
            }
        }
    }
    
    onTouchMove(event) {
        if (this.isDragging && this.isInputEnabled && event.touches.length === 1) {
            const touch = event.touches[0];
            
            // Update current drag position
            this.dragCurrent.x = touch.clientX;
            this.dragCurrent.y = touch.clientY;
            
            // Calculate drag direction and power
            this.calculateDragPower();
            
            // Update direction line
            this.updateDirectionLine();
            
            // Update power indicator
            this.updatePowerIndicator();
            
            event.preventDefault();
        }
    }
    
    onTouchEnd(event) {
        if (this.isDragging && this.isInputEnabled) {
            // Calculate final power and direction
            this.calculateDragPower();
            
            // Apply force to ball
            if (this.dragPower > 0.1) {
                // Get direction in world space
                const direction = this.getWorldDirection();
                
                // Log stroke details
                console.log(`[InputController] Applying stroke: Power=${this.dragPower.toFixed(2)}, Direction=(${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}, ${direction.z.toFixed(2)})`);
                
                // Apply force to ball
                this.game.ballManager.hitBall(direction, this.dragPower);
                
                // Set game state
                this.game.gameState.ballInMotion = true;
                
                // Disable input until ball stops
                this.disableInput();
            }
            
            // Remove direction line
            this.removeDirectionLine();
            
            // Reset power indicator
            this.resetPowerIndicator();
            
            // Reset drag state
            this.isDragging = false;
            this.clickedOnBall = false;
            
            // Restore orbit controls
            if (this.game.cameraController && this.game.cameraController.controls && this.controlsWereEnabled) {
                this.game.cameraController.controls.enabled = this.controlsWereEnabled;
            } else if (this.game.cameraController && this.game.cameraController.controls) {
                // Restore orbit controls if we're not dragging
                this.game.cameraController.controls.enabled = true;
            }
            
            event.preventDefault();
        }
    }
    
    calculateDragPower() {
        // Calculate direction
        const dx = this.dragStart.x - this.dragCurrent.x;
        const dy = this.dragStart.y - this.dragCurrent.y;
        
        // Calculate distance for power
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Normalize direction
        if (distance > 0) {
            this.dragDirection.x = dx / distance;
            this.dragDirection.y = dy / distance;
        } else {
            this.dragDirection.x = 0;
            this.dragDirection.y = 0;
        }
        
        // Scale and clamp power
        this.dragPower = Math.min(distance / 100, this.maxPower);
    }
    
    getWorldDirection() {
        // Get ball position in world space
        const ballPosition = this.game.ballManager.ball.mesh.position.clone();
        
        // Create a plane at the ball's height
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -ballPosition.y);
        
        // Raycast from camera through drag direction to get world position
        this.raycaster.setFromCamera(this.pointer, this.camera);
        
        // Create a 3D vector for the direction
        const direction = new THREE.Vector3();
        
        // Find the point where the ray intersects the horizontal plane
        const intersects = this.raycaster.ray.intersectPlane(plane, this.intersection);
        
        // Check if intersection occurred before calculating direction
        if (intersects) {
             // Direction vector from the ball to the intersection point (reversed for pull effect)
            direction.subVectors(ballPosition, this.intersection).normalize();
            direction.y = 0; // Force horizontal direction
        } else {
            // Default direction if no intersection (e.g., looking straight down)
            // You might want a more robust fallback here
            console.warn("[InputController] Raycaster did not intersect drag plane.");
            direction.set(0, 0, -1); // Default to backward direction relative to camera maybe?
        }
        
        return direction;
    }
    
    createDirectionLine() {
        // Remove existing line if there is one
        this.removeDirectionLine();
        
        // Create basic line geometry with initial points
        const points = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 1)
        ];
        
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // Create bright red line material - make it thicker
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0xFF0000,
            linewidth: 3 // Note: WebGL has limitations on line width
        });
        
        // Create the line object
        this.directionLine = new THREE.Line(lineGeometry, lineMaterial);
        
        // Add to scene
        if (this.game.scene) {
            this.game.scene.add(this.directionLine);
        }
    }
    
    updateDirectionLine() {
        if (!this.directionLine || !this.game.ballManager.ball.mesh) return;
        
        // Get ball position
        const ballPosition = this.game.ballManager.ball.mesh.position.clone();
        
        // Calculate direction
        const direction = this.getWorldDirection();
        
        // Scale line length based on drag power (make it longer for better visibility)
        const lineLength = Math.max(1, this.dragPower * 10);
        
        // Calculate end position - extend from ball in the direction
        const endPosition = ballPosition.clone().add(
            direction.clone().multiplyScalar(lineLength)
        );
        
        // Slightly raise line above ground to prevent z-fighting
        ballPosition.y += 0.05;
        endPosition.y += 0.05;
        
        // Update line points
        const positions = new Float32Array([
            ballPosition.x, ballPosition.y, ballPosition.z,
            endPosition.x, endPosition.y, endPosition.z
        ]);
        
        // Update geometry
        this.directionLine.geometry.setAttribute(
            'position', 
            new THREE.BufferAttribute(positions, 3)
        );
        
        // Ensure line is visible and geometry needs update
        this.directionLine.visible = true;
        this.directionLine.geometry.attributes.position.needsUpdate = true;
    }
    
    removeDirectionLine() {
        if (this.directionLine) {
            if (this.game.scene) {
                this.game.scene.remove(this.directionLine);
            }
            
            if (this.directionLine.geometry) {
                this.directionLine.geometry.dispose();
            }
            
            if (this.directionLine.material) {
                this.directionLine.material.dispose();
            }
            
            this.directionLine = null;
        }
    }
    
    updatePowerIndicator(power) {
        if (!this.powerIndicator) return;
        
        // Calculate power percentage (0-100)
        const powerPercentage = power * 100;
        
        // Update power indicator width using CSS custom property
        this.powerIndicator.style.setProperty('--power-width', `${powerPercentage}%`);
    }
    
    resetPowerIndicator() {
        if (this.powerIndicator) {
            this.powerIndicator.style.setProperty('--power-width', '0%');
        }
    }
    
    /**
     * Enable user input for hitting the ball
     */
    enableInput() {
        if (!this.isInputEnabled) {
            this.isInputEnabled = true;
            
            // Publish input enabled event
            this.game.eventManager.publish(
                EventTypes.INPUT_ENABLED,
                {},
                this
            );
            
            this.game.debugManager.log("Input enabled");
        }
    }
    
    /**
     * Disable user input for hitting the ball
     */
    disableInput() {
        if (this.isInputEnabled) {
            this.isInputEnabled = false;
            this.isPointerDown = false;
            this.isDragging = false;
            
            // Clean up any visual elements
            this.removeDirectionLine();
            this.resetPowerIndicator();
            
            // Publish input disabled event
            this.game.eventManager.publish(
                EventTypes.INPUT_DISABLED,
                {
                    reason: 'programmatic'
                },
                this
            );
            
            this.game.debugManager.log("Input disabled");
        }
    }
    
    updateAimLine(ballPosition, direction, power) {
        // Remove existing line
        if (this.directionLine) {
            this.game.scene.remove(this.directionLine);
            if (this.directionLine.geometry) {
                this.directionLine.geometry.dispose();
            }
            if (this.directionLine.material) {
                this.directionLine.material.dispose();
            }
        }
        
        // Calculate line length based on power
        const lineLength = power * 5; // Scale by 5 for better visualization
        
        // Create points for line (from ball position to desired direction * length)
        const endPoint = new THREE.Vector3().copy(ballPosition).add(
            new THREE.Vector3().copy(direction).multiplyScalar(lineLength)
        );
        
        // Create line geometry
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            ballPosition,
            endPoint
        ]);
        
        // Create line material with gradient color based on power
        const lineColor = new THREE.Color(
            Math.min(0.2 + power * 0.8, 1.0), // More red with higher power
            Math.max(1.0 - power * 0.8, 0.2), // Less green with higher power
            0.2 // Low blue component
        );
        
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: lineColor,
            linewidth: 2
        });
        
        // Create the line
        this.directionLine = new THREE.Line(lineGeometry, lineMaterial);
        
        // Raise line slightly above ground
        this.directionLine.position.y += 0.02;
        
        // Add line to scene
        this.game.scene.add(this.directionLine);
    }
    
    removeAimLine() {
        if (this.directionLine) {
            this.game.scene.remove(this.directionLine);
            if (this.directionLine.geometry) {
                this.directionLine.geometry.dispose();
            }
            if (this.directionLine.material) {
                this.directionLine.material.dispose();
            }
            this.directionLine = null;
        }
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        try {
            // Clean up DOM event listeners
            try {
                const domElement = this.renderer ? this.renderer.domElement : window;
                
                // Remove mouse events
                domElement.removeEventListener('mousedown', this.onMouseDown);
                window.removeEventListener('mousemove', this.onMouseMove);
                window.removeEventListener('mouseup', this.onMouseUp);
                
                // Remove touch events
                domElement.removeEventListener('touchstart', this.onTouchStart);
                window.removeEventListener('touchmove', this.onTouchMove);
                window.removeEventListener('touchend', this.onTouchEnd);
            } catch (error) {
                if (this.game.debugManager) {
                    this.game.debugManager.warn('InputController.cleanup', 'Error removing DOM event listeners', error);
                }
            }
            
            // Clean up event subscriptions
            if (this.eventSubscriptions) {
                this.eventSubscriptions.forEach(unsubscribe => unsubscribe());
                this.eventSubscriptions = [];
            }
            
            // Clean up direction line
            this.removeDirectionLine();
            
            // Reset power indicator
            this.resetPowerIndicator();
            
            // Clean up THREE.js objects
            if (this.raycaster) {
                this.raycaster = null;
            }
            
            // Clear references
            this.pointer = null;
            this.intersectionPoint = null;
            
            // Reset initialization state
            this.isInitialized = false;
            
            // Log cleanup
            if (this.game.debugManager) {
                this.game.debugManager.log('InputController cleaned up');
            }
        } catch (error) {
            // Log cleanup errors
            if (this.game.debugManager) {
                this.game.debugManager.error('InputController.cleanup', 'Error during cleanup', error);
            } else {
                console.error('Error during InputController cleanup:', error);
            }
        }
    }
} 