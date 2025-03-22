import * as THREE from 'three';

export class InputController {
    constructor(game) {
        this.game = game;
        this.camera = game.camera;
        this.renderer = game.renderer;
        this.ball = game.ball;
        
        // Track input state
        this.isInputEnabled = true;
        this.isPointerDown = false;
        this.isDragging = false;
        
        // Track intersection point when clicking on the ground
        this.intersectionPoint = null;
        
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
        
        // Initialize event listeners
        this.initEventListeners();
    }
    
    initEventListeners() {
        // Add event listeners to document (so we capture events even outside the canvas)
        document.addEventListener('mousedown', this.onMouseDown.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));
        
        // Touch events
        document.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.onTouchEnd.bind(this));
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
        // Skip if input is not enabled
        if (!this.isInputEnabled) return;
        
        // Only handle left mouse button
        if (event.button !== 0) return;
        
        // Check if mouse is over the canvas
        if (!this.isEventInsideCanvas(event)) return;
        
        // When starting a drag, store the current orbit controls state and disable them
        if (this.game.cameraController && this.game.cameraController.controls) {
            this.controlsWereEnabled = this.game.cameraController.controls.enabled;
            this.game.cameraController.controls.enabled = false;
        }
        
        // Set pointer down flag
        this.isPointerDown = true;
        
        // Update mouse position
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Cast ray into the scene
        this.raycaster.setFromCamera(this.pointer, this.camera);
        
        // Create a plane at ball height for consistent dragging
        const ballPosition = this.ball.mesh.position.clone();
        const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -ballPosition.y);
        
        // Find intersection with the drag plane
        const intersection = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(dragPlane, intersection);
        
        if (intersection) {
            this.intersectionPoint = intersection.clone();
            
            // Initially no direction or power
            this.hitDirection = new THREE.Vector3(0, 0, 0);
            this.hitPower = 0;
            
            // Show power indicator
            if (this.powerIndicator) {
                this.powerIndicator.style.display = 'block';
                this.updatePowerIndicator(0);
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
        const ballPosition = this.ball.mesh.position.clone();
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
            
            // Debugging stats
            if (this.game && this.game.debugMode) {
                console.log(`Direction: ${this.hitDirection.x.toFixed(2)}, ${this.hitDirection.z.toFixed(2)}, Power: ${this.hitPower.toFixed(2)}`);
            }
        }
        
        // Prevent default behavior
        event.preventDefault();
    }
    
    onMouseUp(event) {
        // Skip if input is not enabled or if no dragging started
        if (!this.isInputEnabled || !this.isPointerDown) return;
        
        // Restore orbit controls to previous state
        if (this.game.cameraController && this.game.cameraController.controls) {
            this.game.cameraController.controls.enabled = this.controlsWereEnabled;
        }
        
        // Only process if we were dragging
        if (this.isDragging && this.hitPower > 0.05) {
            // Hit the ball with calculated direction and power
            this.game.hitBall(this.hitDirection, this.hitPower);
        }
        
        // Reset flags
        this.isPointerDown = false;
        this.isDragging = false;
        this.intersectionPoint = null;
        
        // Hide direction line
        this.removeAimLine();
        
        // Hide power indicator
        if (this.powerIndicator) {
            this.powerIndicator.style.display = 'none';
        }
        
        // Prevent default behavior
        event.preventDefault();
    }
    
    onTouchStart(event) {
        if (!this.isInputEnabled || event.touches.length !== 1) return;
        
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
                
                // Apply force to ball
                this.ball.applyForce(direction, this.dragPower);
                
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
        const ballPosition = this.ball.mesh.position.clone();
        
        // Create a plane at the ball's height
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -ballPosition.y);
        
        // Raycast from camera through drag direction to get world position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Create a 3D vector for the direction
        const direction = new THREE.Vector3();
        
        // Intuitive direction: drag away from the ball
        // Find the point where the ray from the camera through the mouse intersects the horizontal plane
        this.raycaster.ray.intersectPlane(plane, this.intersection);
        
        // Direction vector from the ball to the intersection point (reversed for pull effect)
        direction.subVectors(ballPosition, this.intersection).normalize();
        direction.y = 0; // Force horizontal direction
        
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
        if (!this.directionLine || !this.ball.mesh) return;
        
        // Get ball position
        const ballPosition = this.ball.mesh.position.clone();
        
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
    
    enableInput() {
        this.isInputEnabled = true;
        
        // Reset the drag state to ensure we can draw the line again for the next shot
        this.isDragging = false;
        this.dragPower = 0;
        
        // Make sure the direction line is removed
        this.removeDirectionLine();
        
        // Show the ready indicator
        const readyIndicator = document.getElementById('ready-indicator');
        if (readyIndicator) {
            readyIndicator.classList.add('visible');
            // Auto-hide after 2 seconds
            setTimeout(() => {
                readyIndicator.classList.remove('visible');
            }, 2000);
        }
    }
    
    disableInput() {
        this.isInputEnabled = false;
        this.isDragging = false;
        this.removeDirectionLine();
        this.resetPowerIndicator();
        
        // Hide the ready indicator
        const readyIndicator = document.getElementById('ready-indicator');
        if (readyIndicator) {
            readyIndicator.classList.remove('visible');
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
} 