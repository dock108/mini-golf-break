import * as THREE from 'three';
import * as CANNON from 'cannon-es';
// Import the physics utility functions
import { calculateImpactAngle, isLipOut } from '../physics/utils';

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
        
        // Damping values
        this.defaultLinearDamping = 0.7; // Store the default
        this.bunkerLinearDamping = 0.95; // Higher value for sand effect (Tune this)
        
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
            linearDamping: this.defaultLinearDamping, // Use stored default
            angularDamping: 0.3,
            collisionFilterGroup: 4,
            collisionFilterMask: -1,
            allowSleep: true, // Ensure sleep is allowed
            sleepSpeedLimit: 0.05, // Sleep if speed drops below this (more aggressive)
            sleepTimeLimit: 0.5    // Time required below speed limit to sleep (seconds)
        });
        
        // Log assigned material ID
        console.log(`[Ball.createPhysicsBody] Assigned Material ID: ${this.body.material?.id}, Name: ${this.body.material?.name}`);

        // Define thresholds for hole entry logic (make these easily configurable)
        this.holeEntryThresholds = {
            MAX_SAFE_SPEED: 1.5,          // Speed (m/s) below which the ball safely drops in.
            LIP_OUT_SPEED_THRESHOLD: 2.5, // Speed (m/s) above which lip-outs become more likely.
            LIP_OUT_ANGLE_THRESHOLD: 60   // Angle (degrees, 0-180, 180=direct) below which is considered a glancing blow.
        };

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
        if (!event.body) return; // Safety check
        
        const otherBody = event.body;
        const otherUserData = otherBody.userData;

        // REMOVE Hole Trigger Collision Check block
        /*
        if (otherUserData?.type === 'holeTrigger') {
            if (!this.isHoleCompleted) {
                console.log(`[Ball.onCollide] Collision with holeTrigger detected.`);
                const shouldEnterHole = checkHoleEntry(
                    this.body, 
                    otherBody, 
                    this.holeEntryThresholds
                );

                if (shouldEnterHole) {
                    console.log(`[Ball.onCollide] checkHoleEntry returned true. Triggering success.`);
                    this.isHoleCompleted = true; 
                    this.handleHoleSuccess(); 
                } else {
                    console.log(`[Ball.onCollide] checkHoleEntry returned false (lip-out or missed).`);
                    // Optional: Add lip-out effect (e.g., small impulse)
                }
            }
            return; // Collision handled
        }
        */
        // --- End REMOVED Hole Trigger Check ---

        // --- Other Collision Logic (Walls, Bumpers) --- 
        if (!event.contact) return; // Contact info needed for physical collisions
        
        this.body.wakeUp(); // Wake up on physical contact

        const otherMatName = otherBody.material?.name || 'unknown';
        if (otherMatName === 'bumper' || otherUserData?.type?.startsWith('wall')) {
             if (this.game && this.game.audioManager) {
                const contactInfo = event.contact; 
                const impactSpeed = contactInfo.getImpactVelocityAlongNormal();
                const volume = Math.min(0.8, Math.max(0.1, Math.abs(impactSpeed) / 5.0)); // Use Math.abs
                this.game.audioManager.playSound('bump', volume);
            }
        } 
        // Add other collision handling (e.g., sand traps) here if needed
    }
    
    /**
     * Update the ball's physics and visuals
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (this.body && this.mesh) {
            this.mesh.position.copy(this.body.position);
            this.mesh.quaternion.copy(this.body.quaternion);
            
            if (this.ballLight) {
                this.ballLight.position.copy(this.mesh.position);
            }
            
            // Log current hole position status before check
            if (!this.isHoleCompleted) {
                // console.log(`[Ball.update] Checking hole entry. currentHolePosition:`, this.currentHolePosition);
            }
            
            // --- Check for Hole Entry --- 
            if (this.currentHolePosition && !this.isHoleCompleted) {
                // Define the physical radius of the hole for entry check
                const holePhysicalRadius = 0.21; 

                // Calculate horizontal distance to hole center
                const dx = this.body.position.x - this.currentHolePosition.x;
                const dz = this.body.position.z - this.currentHolePosition.z;
                const distanceFromHoleCenter = Math.sqrt(dx * dx + dz * dz);
                
                // Check if ball center is within the hole radius
                if (distanceFromHoleCenter <= holePhysicalRadius) {
                    const ballSpeed = this.body.velocity.length();
                    console.log(`[Ball.update] Near hole: Dist=${distanceFromHoleCenter.toFixed(3)}, Speed=${ballSpeed.toFixed(3)}`);
                    
                    let shouldEnter = false;
                    // Check for safe entry (slow speed)
                    if (ballSpeed <= this.holeEntryThresholds.MAX_SAFE_SPEED) {
                        console.log(`[Ball.update] Hole Entry: Slow speed.`);
                        shouldEnter = true;
                    } else {
                        // Faster speed, check for lip-out
                        const angleDeg = calculateImpactAngle(this.body.velocity, this.currentHolePosition, this.body.position);
                        console.log(`[Ball.update] Hole Check (Fast): Angle=${angleDeg.toFixed(1)}`);
                        if (!isLipOut(ballSpeed, angleDeg, this.holeEntryThresholds)) {
                           console.log(`[Ball.update] Hole Entry: Fast but direct.`);
                           shouldEnter = true; // Fast but not a lip-out
                        } else {
                           console.log(`[Ball.update] Lip Out Occurred.`);
                           // Optional: Add visual/physics effect for lip-out here?
                        }
                    }
                    
                    // Trigger success if conditions met
                    if (shouldEnter) {
                        this.isHoleCompleted = true;
                        this.handleHoleSuccess();
                    }
                }
            }
            // --- End Check for Hole Entry ---
            
            const outOfBoundsThreshold = -50; 
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
        console.log('[Ball.handleHoleSuccess] Hole completed!');
        this.mesh.material = this.successMaterial;
        this.body.sleep(); 
        this.body.velocity.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);

        if (this.game && this.game.audioManager) {
            this.game.audioManager.playSound('success', 0.7);
        }

        if (this.game && this.game.eventManager) {
            const EventTypes = this.game.eventManager.getEventTypes();
            this.game.eventManager.publish(EventTypes.BALL_IN_HOLE, {
                ballBody: this.body,
                holeIndex: this.game.course?.currentHoleIndex ?? -1 
            }, this);
        } else {
            console.error('[Ball.handleHoleSuccess] Cannot publish BALL_IN_HOLE event: Missing game or eventManager.');
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
        console.log(`[Ball] Ball out of bounds at y=${this.body.position.y.toFixed(2)}, resetting.`);
        this.resetToStartPosition(); 
        if (this.game && this.game.audioManager) {
            this.game.audioManager.playSound('outOfBounds', 0.6);
        }
    }
    
    /**
     * Resets the ball to the current hole's start position.
     * (This might exist in BallManager, ensure consistency or move logic)
     * For now, assuming it gets the start position from the game/course.
     */
    resetToStartPosition() {
        if (!this.game || !this.game.course || !this.game.course.startPosition) {
            console.error('[Ball.resetToStartPosition] Cannot reset ball: Missing game/course/startPosition info.');
            this.body.position.set(0, Ball.START_HEIGHT + 0.2, 0);
            return;
        }

        const startPos = this.game.course.startPosition;
        this.body.position.set(startPos.x, startPos.y + Ball.START_HEIGHT + 0.2, startPos.z); 
        this.body.velocity.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);
        this.body.wakeUp();
        this.isHoleCompleted = false; 
        this.mesh.material = this.defaultMaterial; 
        console.log('[Ball] Ball reset to position:', this.body.position.clone());
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
