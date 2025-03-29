import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Ball {
    // Constants for ball properties
    static START_HEIGHT = 0.2; // Reduced to match green surface height

    constructor(scene, physicsWorld, game) {
        this.scene = scene;
        this.game = game;
        this.physicsWorld = physicsWorld;
        
        if (!this.physicsWorld) {
            throw new Error('[Ball] Physics world not available');
        }
        
        // Initialize ball properties
        this.radius = 0.2;
        this.segments = 32;
        this.mass = 1;
        this.body = null;
        this.mesh = null;
        this.isBallActive = true;
        
        // Store hole information
        this.currentHolePosition = null;
        this.shotCount = 0;
        this.isMoving = false;
        this.hasBeenHit = false;
        
        // Create materials for the ball
        this.defaultMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFFFFF, // Pure white golf ball
            roughness: 0.3,
            metalness: 0.2,
            emissive: 0x333333, // Slight glow to be visible in space
            emissiveIntensity: 0.3
        });
        
        this.successMaterial = new THREE.MeshStandardMaterial({
            color: 0x00FF00, // Green for success
            roughness: 0.2,
            metalness: 0.3,
            emissive: 0x00FF00, // Strong green glow
            emissiveIntensity: 0.8 // Brighter glow for success
        });
        
        // Create the ball
        this.createMesh();
        this.createPhysicsBody();
        
        console.log('[Ball] Initialized with physics world:', {
            exists: !!this.physicsWorld,
            bodyAdded: !!this.body
        });
    }
    
    createMesh() {
        // Create golf ball with dimples
        this.createGolfBallWithDimples();
        
        // Set initial position - REMOVED - Position is set by BallManager after creation
        // this.mesh.position.copy(this.position);
        
        // Enable shadows
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Add to scene
        if (this.scene) {
            this.scene.add(this.mesh);
        }
        
        // Add a small light to the ball to make it stand out
        this.ballLight = new THREE.PointLight(0xFFFFFF, 0.4, 3);
        // Set initial position - REMOVED - Position is set by BallManager after creation
        // this.ballLight.position.copy(this.position);
        if (this.scene) {
            this.scene.add(this.ballLight);
        }
        
        return this.mesh;
    }
    
    /**
     * Create a golf ball mesh with dimples
     */
    createGolfBallWithDimples() {
        // Create base sphere for the golf ball
        const baseGeometry = new THREE.SphereGeometry(this.radius, this.segments, this.segments);
        
        // Create the ball mesh
        this.mesh = new THREE.Mesh(baseGeometry, this.defaultMaterial);
        
        // Create dimples using displacement map
        const textureLoader = new THREE.TextureLoader();
        const createDimpleTexture = () => {
            // Create a canvas for the dimple texture
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const context = canvas.getContext('2d');
            
            // Fill with white
            context.fillStyle = 'white';
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw dimples
            context.fillStyle = 'black';
            
            // Number of dimples and their size
            const numDimples = 120;
            const dimpleRadius = 8;
            
            // Draw randomly positioned dimples
            for (let i = 0; i < numDimples; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                
                context.beginPath();
                context.arc(x, y, dimpleRadius, 0, Math.PI * 2);
                context.fill();
            }
            
            // Create texture from canvas
            const texture = new THREE.CanvasTexture(canvas);
            return texture;
        };
        
        // Create and apply the dimple texture as a bump map
        const dimpleTexture = createDimpleTexture();
        this.defaultMaterial.bumpMap = dimpleTexture;
        this.defaultMaterial.bumpScale = 0.005; // Adjust dimple depth
        this.defaultMaterial.needsUpdate = true;
        
        // Apply the same texture to success material
        this.successMaterial.bumpMap = dimpleTexture;
        this.successMaterial.bumpScale = 0.005;
        this.successMaterial.needsUpdate = true;
    }
    
    createPhysicsBody() {
        if (!this.physicsWorld) {
            console.error('[Ball] Cannot create physics body: physics world not available');
            return;
        }
        
        // Create the physics body
        this.body = new CANNON.Body({
            mass: this.mass,
            shape: new CANNON.Sphere(this.radius),
            material: this.game.physicsManager.ballMaterial || this.physicsWorld.defaultMaterial,
            linearDamping: 0.3,
            angularDamping: 0.3,
            collisionFilterGroup: 4,
            collisionFilterMask: -1
        });
        
        // Add event listener
        if (this.body) {
            this.body.addEventListener('collide', this.onCollide.bind(this));
            console.log('[Ball] Added collide event listener');
        } else {
            console.error('[Ball] Failed to add collide listener: body not created.');
        }
        
        // Add body to physics world
        this.physicsWorld.addBody(this.body);
        console.log('[Ball] Added physics body to world');
    }
    
    onCollide(event) {
        // Handle collision events
        if (!event.body) return;
        
        // Check if we collided with a bumper obstacle
        if (event.body.material && event.body.material.name === 'bumper') {
            // Play sound for bumper hit via AudioManager
            if (this.game && this.game.audioManager) {
                this.game.audioManager.playSound('bump', 0.5);
            }
            
            // Ensure the ball stays awake after a collision
            this.body.wakeUp();
        }
        
        // Check if the ball collided with a hole
        if (event.body.userData && event.body.userData.type === 'hole') {
            // Stop the ball's movement
            this.resetVelocity();
            
            // Trigger the ball in hole event
            if (this.game && this.game.eventManager) {
                const EventTypes = this.game.eventManager.getEventTypes();
                this.game.eventManager.publish(EventTypes.BALL_IN_HOLE, {
                    ballBody: this.body,
                    holeBody: event.body,
                    holeIndex: event.body.userData.holeIndex
                });
            }

            // Start transition to next hole after a short delay
            setTimeout(async () => {
                if (this.game && this.game.holeTransitionManager) {
                    await this.game.holeTransitionManager.transitionToNextHole();
                }
            }, 500);
        }
    }
    
    /**
     * Update the ball's physics and visuals
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        // If the ball has a body and mesh, update the mesh position to match the body
        if (this.body && this.mesh) {
            // Update mesh position from physics body
            this.mesh.position.copy(this.body.position);
            
            // Update quaternion/rotation
            this.mesh.quaternion.copy(this.body.quaternion);
            
            // Update the attached light position
            if (this.ballLight) {
                this.ballLight.position.copy(this.mesh.position);
            }
            
            // Check if ball is out of bounds (fell off course) and reset if needed
            const outOfBoundsThreshold = -50; // Consider ball out of bounds if it falls below this Y position
            if (this.body.position.y < outOfBoundsThreshold) {
                this.handleOutOfBounds();
            }
        }
    }
    
    setPosition(x, y, z) {
        // Make sure y is at least ball radius + start height to avoid ground penetration
        const safeY = Math.max(y, this.radius + Ball.START_HEIGHT);
        
        // Set mesh position
        if (this.mesh) {
            this.mesh.position.set(x, safeY, z);
        }
        
        // Set body position
        if (this.body) {
            // Position the ball at the safe height
            this.body.position.set(x, safeY, z);
            
            // Reset velocity and forces when repositioning
            this.resetVelocity();
            
            // Make sure the body is awake after repositioning
            this.body.wakeUp();
            
            if (this.game && this.game.debugManager) {
                this.game.debugManager.log(`Ball position set to (${x}, ${safeY}, ${z})`);
            }
        }
    }
    
    resetVelocity() {
        if (this.body) {
            this.body.velocity.set(0, 0, 0);
            this.body.angularVelocity.set(0, 0, 0);
            this.body.force.set(0, 0, 0);
            this.body.torque.set(0, 0, 0);
            
            // Explicitly wake up the body to ensure physics are applied
            this.body.wakeUp();
        }
    }
    
    isStopped() {
        if (!this.body) return true;
        
        // Get current linear and angular velocity
        const velocity = this.body.velocity;
        const angularVelocity = this.body.angularVelocity;
        
        // More aggressive thresholds for the final roll
        const speedThreshold = 0.15;    // Increased to match sleepSpeedLimit
        const rotationThreshold = 0.15;  // Increased to match
        
        // Add additional check for very slow movement
        const isVerySlowMovement = (
            Math.abs(velocity.x) < speedThreshold * 0.5 &&
            Math.abs(velocity.z) < speedThreshold * 0.5
        );
        
        const isStopped = (
            Math.abs(velocity.x) < speedThreshold &&
            Math.abs(velocity.y) < speedThreshold &&
            Math.abs(velocity.z) < speedThreshold &&
            Math.abs(angularVelocity.x) < rotationThreshold &&
            Math.abs(angularVelocity.y) < rotationThreshold &&
            Math.abs(angularVelocity.z) < rotationThreshold
        );
        
        // If very slow or stopped, actively kill motion
        if (isStopped || isVerySlowMovement) {
            this.body.velocity.set(0, 0, 0);
            this.body.angularVelocity.set(0, 0, 0);
            
            // Apply additional damping for very slow movement
            if (isVerySlowMovement && !isStopped) {
                this.body.linearDamping = 0.9; // Temporary high damping
            } else {
                this.body.linearDamping = 0.6; // Reset to normal damping
                this.body.sleep();
            }
        }
        
        return isStopped;
    }
    
    /**
     * Apply impulse to the ball (alias for applyForce for backward compatibility)
     * @param {THREE.Vector3} direction - Direction vector for the force 
     * @param {number} power - Power of the force (0-1)
     */
    applyImpulse(direction, power) {
        // Simply call the existing applyForce method
        this.applyForce(direction, power);
    }
    
    /**
     * Apply force to the ball
     * @param {THREE.Vector3} direction - Direction vector for the force 
     * @param {number} power - Power of the force (0-1)
     */
    applyForce(direction, power) {
        // Enhanced error handling with detailed context
        if (!this.body) {
            if (this.game && this.game.debugManager) {
                this.game.debugManager.error(
                    'Ball.applyForce', 
                    'Failed - Ball physics body is null or undefined!',
                    { direction, power },
                    true // Show in UI as this is a critical gameplay issue
                );
            } else {
                console.error(`ERROR: Ball.applyForce: Failed - Ball physics body is null or undefined!`);
            }
            return;
        }
        
        // Scale power for reasonable force (reduced multiplier)
        const forceMagnitude = power * 15; // Reduced for better control
        
        // Apply horizontal force only
        const force = new CANNON.Vec3(
            direction.x * forceMagnitude,
            0,
            direction.z * forceMagnitude
        );
        
        // Apply force at the center of the ball
        this.body.applyImpulse(force);
        
        // Wake up the physics body
        this.body.wakeUp();
        
        // Use improved debug logging
        if (this.game && this.game.debugManager) {
            this.game.debugManager.info(
                'Ball.applyForce',
                `Applied force with power ${power.toFixed(2)}`,
                { 
                    direction: `(${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}, ${direction.z.toFixed(2)})`,
                    forceMagnitude: forceMagnitude
                }
            );
        }
    }
    
    /**
     * Check if the ball is in a hole
     */
    isInHole() {
        // Check distance to hole position
        if (!this.currentHolePosition) return false;
        
        const ballPosition = new THREE.Vector3();
        this.mesh.getWorldPosition(ballPosition);
        
        const distanceToHole = ballPosition.distanceTo(this.currentHolePosition);
        const isNearHole = distanceToHole < 0.25; // Slightly smaller than hole radius for better detection
        
        // Also check if ball is at rest or nearly at rest
        const isAtRest = this.isStopped();
        
        return isNearHole && isAtRest;
    }
    
    /**
     * Handle when ball goes in hole
     */
    handleHoleSuccess() {
        // Delegate to the VisualEffectsManager
        if (this.game && this.game.visualEffectsManager) {
            this.game.visualEffectsManager.playBallSuccessEffect(this.mesh.position, this);
        }
        
        // Play success sound
        if (this.game && this.game.audioManager) {
            this.game.audioManager.playSound('success');
        }
    }
    
    /**
     * Reset ball visuals to default state
     */
    resetVisuals() {
        if (this.game && this.game.visualEffectsManager) {
            this.game.visualEffectsManager.resetBallVisuals(this);
        } else {
            // Fallback if the manager isn't available
            this.mesh.material = this.defaultMaterial;
            this.mesh.scale.set(1, 1, 1);
        }
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        if (this.physicsWorld && this.body) {
            console.log('[Ball] Removing physics body');
            this.physicsWorld.removeBody(this.body);
            this.body = null;
        } else if (this.body && !this.physicsWorld) {
            console.warn('[Ball] Could not remove physics body: physicsWorld is null');
        }
        
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
        
        console.log('[Ball] Cleanup complete');
    }
    
    /**
     * Debug method to test force application with fixed values
     * This bypasses the hitBall flow to test physics directly
     */
    debugTestForce() {
        console.log("DEBUG: Testing force application directly on ball");
        if (!this.body) {
            console.error("DEBUG: Can't test force - ball body is null");
            return;
        }
        
        // Create a fixed test force
        const testDirection = new THREE.Vector3(1, 0, 0); // Move in positive X direction
        const testPower = 0.5; // Medium power
        
        console.log(`DEBUG: Applying test force with direction: (${testDirection.x}, ${testDirection.y}, ${testDirection.z}), power: ${testPower}`);
        
        // Apply the test force using the regular method
        this.applyForce(testDirection, testPower);
        
        // Log the result
        console.log(`DEBUG: Test force applied. Ball velocity: (${this.body.velocity.x.toFixed(2)}, ${this.body.velocity.y.toFixed(2)}, ${this.body.velocity.z.toFixed(2)})`);
    }
    
    /**
     * Reset the sucking-into-hole effect and prepare ball for next hole
     */
    resetSuckingEffect() {
        // Reset the flag
        this.isSuckedIntoHole = false;
        this.holePosition = null;
        
        // Reset the ball scale back to normal
        if (this.mesh) {
            this.mesh.scale.set(1, 1, 1);
        }
    }
    
    /**
     * Handle ball out of bounds
     */
    handleOutOfBounds() {
        // Implement the logic to handle ball out of bounds
        console.log("Ball out of bounds");
    }
    
    /**
     * Get the ball's current position
     * @returns {THREE.Vector3} The current position
     */
    getPosition() {
        if (this.body) {
            return new THREE.Vector3(
                this.body.position.x,
                this.body.position.y,
                this.body.position.z
            );
        }
        return this.position.clone();
    }
} 