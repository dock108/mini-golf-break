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
        this.stateManager = game.stateManager;
        this.adShipManager = game.adShipManager;
        
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
        this.maxDragDistance = 10;
        
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
            this.onKeyDown = this.onKeyDown.bind(this); // Bind keydown handler
            
            // Add event listeners
            domElement.addEventListener('mousedown', this.onMouseDown);
            window.addEventListener('mousemove', this.onMouseMove);
            window.addEventListener('mouseup', this.onMouseUp);
            
            // Touch events
            domElement.addEventListener('touchstart', this.onTouchStart);
            window.addEventListener('touchmove', this.onTouchMove);
            window.addEventListener('touchend', this.onTouchEnd);
            
            // Add keydown listener
            window.addEventListener('keydown', this.onKeyDown);
            
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
        const currentState = this.stateManager ? this.stateManager.getGameState() : 'UNKNOWN';
        console.log(`[InputController.onMouseUp] State: ${currentState}, PointerDown: ${this.isPointerDown}, Dragging: ${this.isDragging}`);

        // --- Ad Interaction Check --- 
        if (this.stateManager && currentState === 'AD_INSPECTING') {
            console.log('[InputController.onMouseUp] Handling click in AD_INSPECTING state...');
             // Check if the click originated inside the canvas
            if (this.isEventInsideCanvas(event)) {
                this._handleAdClick(event);
            }
            // Regardless of hit, prevent default and stop further processing in this state
            event.preventDefault(); 
            return; 
        }
        // --- End Ad Interaction Check --- 

        // Skip if not in dragging mode or pointer wasn't down
        // Check isPointerDown first, as isDragging might be false on a simple click
        if (!this.isPointerDown) {
            // Restore controls if pointer wasn't down but they were disabled
            if (this.game.cameraController && this.game.cameraController.controls && !this.controlsWereEnabled) {
                 this.game.cameraController.controls.enabled = true; // Should be restored based on controlsWereEnabled
            }
            return;
        }

        // Only handle left mouse button (or touch equivalent)
        if (event.button !== 0) return;

        // Reset pointer down flag immediately
        this.isPointerDown = false;

        // If dragging occurred and input is enabled, attempt to hit the ball
        if (this.isDragging && this.isInputEnabled && this.hitPower > 0.05) {
            // Hide direction line
            this.removeDirectionLine(); // Use removeAimLine instead? Assuming removeDirectionLine is correct
            
            // Hide power indicator
            if (this.powerIndicator) {
                this.powerIndicator.style.display = 'none';
            }
            
            // Hit ball using BallManager
            if (this.game.ballManager) {
                // Get direction in world space (should already be calculated by onMouseMove)
                const direction = this.hitDirection.clone(); // Use the stored direction
                
                // Log stroke details
                console.log(`[InputController] Applying stroke: Power=${this.hitPower.toFixed(2)}, Direction=(${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}, ${direction.z.toFixed(2)})`);
                
                this.game.ballManager.hitBall(direction, this.hitPower);
                
                // Disable input until ball stops
                this.disableInput(); // Disabling input should be sufficient, state manager handles ball motion check
                
                // Publish input event (optional, could be handled within disableInput or BallManager)
                // this.game.eventManager.publish(
                //     EventTypes.INPUT_DISABLED,
                //     {
                //         reason: 'ball_hit'
                //     },
                //     this
                // );
            }
        } else {
             // If not dragging or power too low, just remove aim line if it exists
             this.removeAimLine();
        }
        
        // Reset dragging flag AFTER checking it
        this.isDragging = false;
        
        // Restore camera controls state
        if (this.game.cameraController && this.game.cameraController.controls) {
            this.game.cameraController.controls.enabled = this.controlsWereEnabled;
        }
        
        // Reset hit parameters
        this.hitDirection.set(0, 0, 0);
        this.hitPower = 0;
        this.intersectionPoint = null;

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

        // Only handle single touch events for aiming/shooting
        if (event.touches.length === 1) {
            const touch = event.touches[0];

            // Simulate a left mouse button down event
            const simulatedMouseEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY,
                button: 0, // Simulate left mouse button
                preventDefault: () => event.preventDefault() // Pass preventDefault
            };

            // Call the existing onMouseDown logic
            this.onMouseDown(simulatedMouseEvent);
        }
        // Ignore multi-touch events for shooting mechanics
    }
    
    onTouchMove(event) {
        // Only handle single touch movements if a drag is active
        if (this.isPointerDown && event.touches.length === 1) {
            const touch = event.touches[0];

            // Simulate a mouse move event
            const simulatedMouseEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY,
                preventDefault: () => event.preventDefault() // Pass preventDefault
            };

            // Call the existing onMouseMove logic
            this.onMouseMove(simulatedMouseEvent);
        }
    }
    
    onTouchEnd(event) {
        // Check if we were actually dragging (pointer was down)
        // touchend is fired even if the touch didn't start on the canvas
        if (this.isPointerDown) {
             // Simulate a left mouse button up event
            // We don't strictly need coordinates for mouse up logic
             const simulatedMouseEvent = {
                 button: 0, // Simulate left mouse button release
                 preventDefault: () => event.preventDefault() // Pass preventDefault
             };

             // Call the existing onMouseUp logic
             this.onMouseUp(simulatedMouseEvent);
        }
        // Note: No check for event.touches.length here, as touchend signifies the end of a touch point.
        // The state (isPointerDown) determines if it corresponds to our drag action.
    }
    
    /**
     * Handles clicks specifically when in AD_INSPECTING state.
     * Performs raycast against ad banners and opens URL if hit.
     * @param {MouseEvent|TouchEvent} event - The pointer event.
     */
    _handleAdClick(event) {
        console.log('[AdClick] _handleAdClick called.'); // Log entry
        if (!this.adShipManager || !this.adShipManager.ships || this.adShipManager.ships.length === 0) {
            console.log("[AdClick] No ad ships available to check.");
            return;
        }

        // 1. Get Pointer Coordinates (Normalized Device Coordinates)
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // 2. Update Raycaster
        this.raycaster.setFromCamera(this.pointer, this.camera);

        // 3. Collect Target Meshes
        const adBannerMeshes = this.adShipManager.ships
            .map(ship => ship.bannerMesh)
            .filter(mesh => mesh);
        console.log(`[AdClick] Found ${adBannerMeshes.length} banner meshes to check.`); // Log targets

        if (adBannerMeshes.length === 0) {
            console.log("[AdClick] No ad banner meshes found.");
            return;
        }

        // 4. Perform Raycast
        const intersects = this.raycaster.intersectObjects(adBannerMeshes, false);
        console.log(`[AdClick] Raycast intersects: ${intersects.length}`); // Log intersects

        // 5. Handle Intersection
        if (intersects.length > 0) {
            const hitObject = intersects[0].object;

            if (hitObject.userData && hitObject.userData.adData && hitObject.userData.adData.url) {
                const adData = hitObject.userData.adData;
                console.log(`[AdClick] Clicked on banner for ad: "${adData.title}". Opening URL: ${adData.url}`);
                 console.log("[AdClick] Hit object userData:", hitObject.userData); // Log userData on hit
                
                try {
                    window.open(adData.url, "_blank");
                    // Optionally: Log click event for analytics
                    // this.game.eventManager.publish(EventTypes.AD_CLICKED, { adTitle: adData.title, url: adData.url }, this);
                } catch (e) {
                     console.error("[AdClick] Error opening URL:", e);
                     // Inform user? e.g., via UIManager
                }

                // Optional: Add debounce/cooldown or change game state
                // For example, switch back to normal gameplay state:
                // this.stateManager.setGameState(GameState.IDLE); // Assuming GameState enum exists
            } else {
                console.log("[AdClick] Clicked on a banner mesh, but no valid adData or URL found in userData.", hitObject.userData);
            }
        } else {
             console.log("[AdClick] Click detected in AD_INSPECTING state, but no ad banner intersected.");
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
        const lineLength = power * 8.75; // Increased from 5 to 8.75 (1.75x longer)
        
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
                window.removeEventListener('keydown', this.onKeyDown); // Remove keydown listener
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

    /**
     * Handles keydown events, primarily for toggling Ad Inspect mode.
     * @param {KeyboardEvent} event
     */
    onKeyDown(event) {
        if (event.key.toLowerCase() === 'i') {
            if (!this.stateManager || !this.game.cameraController?.controls) return;

            const currentState = this.stateManager.getGameState();

            if (currentState === GameState.AD_INSPECTING) {
                console.log("[InputController] Exiting AD_INSPECTING state.");
                // Restore controls setting from before aiming started (usually false)
                // Or simply set to false if aiming should always disable controls.
                this.game.cameraController.controls.enabled = false; 
                // Determine appropriate state to return to (AIMING if ball stopped, otherwise maybe let it be)
                // For now, assume we can always go back to AIMING when toggling off.
                this.stateManager.setGameState(GameState.AIMING);
                this.enableInput(); // Re-enable aiming input
            } else {
                // Enter AD_INSPECTING only if input is currently enabled (ball stopped)
                if(this.isInputEnabled) {
                    console.log("[InputController] Entering AD_INSPECTING state.");
                    this.disableInput(); // Disable aiming input
                    this.game.cameraController.controls.enabled = true; // Enable orbit controls
                    this.stateManager.setGameState(GameState.AD_INSPECTING);
                } else {
                     console.log("[InputController] Cannot enter AD_INSPECTING state while input is disabled (ball might be moving).");
                }
            }
        }
        // Add other key handlers here if needed (e.g., pause)
    }
} 