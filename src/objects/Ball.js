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
        this.isHoleCompleted = false; // Added completion flag
        this.wasStopped = true; // Initialize as stopped
        
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
            material: this.game.physicsManager.world.ballMaterial,
            linearDamping: 0.7, // Significantly increased base damping (was 0.4)
            angularDamping: 0.3,
            collisionFilterGroup: 4,
            collisionFilterMask: -1,
            allowSleep: true, // Ensure sleep is allowed
            sleepSpeedLimit: 0.05, // Sleep if speed drops below this (more aggressive)
            sleepTimeLimit: 0.5    // Time required below speed limit to sleep (seconds)
        });
        
        // Log assigned material ID
        console.log(`[Ball.createPhysicsBody] Assigned Material ID: ${this.body.material?.id}, Name: ${this.body.material?.name}`);

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
        if (!event.body || !event.contact) return; // Ensure contact info exists
        
        const vel = this.body.velocity;
        const contactInfo = event.contact; // Get the contact equation info
        const ballMatId = this.body.material?.id;
        const otherBody = event.body;
        const otherMatId = otherBody.material?.id;
        const otherMatName = otherBody.material?.name || 'unknown';
        const otherUserData = otherBody.userData; // Get userData
        console.log(
            `[Ball.onCollide] Collision with ${otherMatName} (userData type: ${otherUserData?.type || 'none'}). ` + // Log userData type
            `Velocity: (${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}, ${vel.z.toFixed(2)}). ` + 
            `Contact Friction: ${contactInfo?.friction?.toFixed(2)}, Restitution: ${contactInfo?.restitution?.toFixed(2)}. ` + 
            `Ball Mat ID: ${ballMatId}, Other Mat ID: ${otherMatId}` // Renamed for clarity
        );

        // Generic wake up on any collision
        this.body.wakeUp();

        // Handle specific materials
        if (otherMatName === 'bumper') {
            // Play sound for bumper hit via AudioManager
            if (this.game && this.game.audioManager) {
                this.game.audioManager.playSound('bump', 0.5);
            }
        } 
        // Handle collision with the physical hole cup wall
        else if (otherMatName === 'holeCup') {
             // We will check Y position in update now
        }
        /* // Remove floor trigger check
        else if (otherBody.userData?.type === 'holeFloorTrigger') { 
            // ... removed logic ...
        }
        */
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

            /* // Remove old flag-based completion check
            // Log state if potentially in hole cup
            if (this.isInHoleCup) {
                // ... removed logging ...
            }
            // Check for hole completion condition
            if (this.isInHoleCup && this.isStopped()) {
                // ... removed completion logic ...
            }
            */
           
           // --- NEW COMPLETION LOGIC BASED ON Y POSITION ---
           // Define a threshold slightly above the cup bottom
           const holeCompletionThresholdY = -0.5; // Example: If ball Y drops below this, it's in.
           if (!this.isHoleCompleted && this.body.position.y < holeCompletionThresholdY) {
               this.isHoleCompleted = true; // Prevent multiple triggers
               console.log(`[Ball.update] Ball Y (${this.body.position.y.toFixed(2)}) below threshold (${holeCompletionThresholdY}) - Hole complete!`);
               
               // Stop the ball completely
               this.resetVelocity(); 

               // Trigger the ball in hole event manager sequence
               if (this.game && this.game.eventManager) {
                    const EventTypes = this.game.eventManager.getEventTypes();
                    this.game.eventManager.publish(EventTypes.BALL_IN_HOLE, {
                        ballBody: this.body,
                        holeBody: null, // No specific trigger body involved now
                        holeIndex: this.game.course?.currentHoleIndex
                    });
               }
           }
           // --- END NEW COMPLETION LOGIC ---
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
        
        const velocity = this.body.velocity;
        const angularVelocity = this.body.angularVelocity;
     
        // Thresholds for determining if stopped or very slow
        const speedThreshold = 0.25;    // Increased threshold for applying high damping (was 0.15)
        const rotationThreshold = 0.25;  // Increased threshold for applying high damping (was 0.15)
        const verySlowFactor = 1.0;      // Apply high damping below speedThreshold

        const isEffectivelyZero = (
            Math.abs(velocity.x) < speedThreshold &&
            Math.abs(velocity.y) < speedThreshold &&
            Math.abs(velocity.z) < speedThreshold &&
            Math.abs(angularVelocity.x) < rotationThreshold &&
            Math.abs(angularVelocity.y) < rotationThreshold &&
            Math.abs(angularVelocity.z) < rotationThreshold
        );
        
        const isVerySlow = (
            Math.abs(velocity.x) < speedThreshold * verySlowFactor &&
            Math.abs(velocity.z) < speedThreshold * verySlowFactor
        );
        
        // --- Simplified Stop Logic --- 
        // Check if the ball is either stopped OR moving very slowly.
        const shouldBeStopped = isEffectivelyZero || isVerySlow;

        if (shouldBeStopped) {
            // Log stopping event only once
            if (!this.wasStopped) { 
                 const pos = this.body.position;
                 console.log(`[Ball.isStopped] Ball considered stopped at (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`);
                 this.wasStopped = true; 
            }
        } else {
             // Reset wasStopped flag if moving faster
            this.wasStopped = false; 
        }
        
        // Return the state - rely on damping/sleep params to actually stop the body
        return shouldBeStopped; 
    }
    
    /**
     * Apply impulse to the ball
     * @param {THREE.Vector3} direction - Direction vector for the impulse 
     * @param {number} power - Power of the impulse (0-1, scaled internally)
     */
    applyImpulse(direction, power) {
        // Enhanced error handling with detailed context
        if (!this.body) {
            if (this.game && this.game.debugManager) {
                this.game.debugManager.error(
                    'Ball.applyImpulse', // Updated context
                    'Failed - Ball physics body is null or undefined!',
                    { direction, power },
                    true // Show in UI as this is a critical gameplay issue
                );
            } else {
                console.error(`ERROR: Ball.applyImpulse: Failed - Ball physics body is null or undefined!`); // Updated context
            }
            return;
        }
        
        // Scale power for reasonable impulse magnitude
        const impulseMagnitude = power * 32.5; // Increased base impulse (was 26.25)
        
        // Apply horizontal impulse only
        const impulse = new CANNON.Vec3(
            direction.x * impulseMagnitude,
            0,
            direction.z * impulseMagnitude
        );
        
        // Apply impulse at the center of the ball
        this.body.applyImpulse(impulse);
        
        // Wake up the physics body
        this.body.wakeUp();
        
        // Use improved debug logging
        if (this.game && this.game.debugManager) {
            this.game.debugManager.info(
                'Ball.applyImpulse', // Updated context
                `Applied impulse with power ${power.toFixed(2)}`,
                { 
                    direction: `(${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}, ${direction.z.toFixed(2)})`,
                    impulseMagnitude: impulseMagnitude // Log the new magnitude
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
        // Add a flag to prevent re-triggering success effects
        this.isHoleCompleted = true; 
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
     * Clean up resources for this ball
     */
    cleanup() {
        console.log('[Ball] Cleaning up...');
        
        // Remove mesh from scene
        if (this.mesh && this.scene) {
            this.scene.remove(this.mesh);
        }
        
        // Remove light from scene
        if (this.ballLight && this.scene) {
            this.scene.remove(this.ballLight);
        }
        
        // Remove physics body from world
        if (this.body && this.physicsWorld) {
            this.physicsWorld.removeBody(this.body);
        }
        
        // Dispose of geometry and materials
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.defaultMaterial.dispose();
            this.successMaterial.dispose();
            
            // Dispose of bump map texture if it exists
            if (this.defaultMaterial.bumpMap) {
                this.defaultMaterial.bumpMap.dispose();
            }
        }
        
        // Clear references
        this.mesh = null;
        this.body = null;
        this.scene = null;
        this.physicsWorld = null;
        this.ballLight = null;
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