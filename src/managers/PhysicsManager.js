import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { PhysicsWorld } from '../physics/PhysicsWorld';

/**
 * PhysicsManager - Handles physics setup, updates, and debugging
 * Extracts physics management from Game.js to improve modularity
 */
export class PhysicsManager {
    constructor(game) {
        // Reference to the main game
        this.game = game;
        
        // Physics world instance
        this.world = null;
        this.cannonWorld = null;
        
        // Debug visualization
        this.debugEnabled = false;
        this.debugMeshes = [];

        // Flag to track if world is being reset
        this.isResetting = false;

        // Reference to the ball's physics body
        this.ballBody = null;
        this.isInBunker = false;
    }
    
    /**
     * Initialize the physics system
     */
    async init() {
        // Create physics world
        this.world = new PhysicsWorld();
        this.cannonWorld = this.world.world; // Access the inner CANNON.World instance
        
        // Set up collision event handling
        this.setupCollisionEvents();
        
        console.log('[PhysicsManager] Physics world created and initialized.');

        // Additional setup (e.g., debug renderer)
        if (this.game.debugManager && this.game.debugManager.physicsDebuggerEnabled) {
            console.log('[PhysicsManager] Physics debugger enabled by DebugManager.');
            // Assuming DebugManager handles the renderer creation and update
        }

        // Get reference to ball body AFTER ball is created
        // This assumes BallManager.init() runs before this listener setup
        // Or we might need a dedicated method called later
        this.ballBody = this.game.ballManager?.ball?.body;

        if (this.ballBody) {
            this.setupContactListeners();
        } else {
            console.warn('[PhysicsManager] Could not get ball body during init. Listeners not set up.');
            // Consider setting up listeners later, e.g., after course creation
        }

        return this.world;
    }
    
    /**
     * Get the underlying physics world
     * @returns {PhysicsWorld} The physics world instance
     */
    getWorld() {
        console.log(`DEBUG PhysicsManager.getWorld: World exists: ${!!this.world}`);
        if (this.world) {
            console.log(`DEBUG PhysicsManager.getWorld: World has cannonWorld: ${!!this.world.world}`);
            console.log(`DEBUG PhysicsManager.getWorld: World has ballMaterial: ${!!this.world.ballMaterial}`);
        }
        return this.world;
    }
    
    /**
     * Set up collision event handling
     */
    setupCollisionEvents() {
        if (!this.cannonWorld) return this;
        
        // Store bound handlers
        this.boundCollisionStart = this.handleCollisionStart.bind(this);
        this.boundCollisionEnd = this.handleCollisionEnd.bind(this);
        
        // Add collision event handlers and store them in the physics world
        this.world.setCollisionCallback(this.boundCollisionStart);
        this.cannonWorld.addEventListener('endContact', this.boundCollisionEnd);
        
        return this;
    }
    
    /**
     * Handle collision start events
     * @param {object} event - Collision event
     */
    handleCollisionStart(event) {
        // Only handle events if game exists
        if (!this.game) return;
        
        // Check what objects are colliding using userData
        const bodyA = event.bodyA;
        const bodyB = event.bodyB;
        
        // Delegate collision handling to game if needed
        if (this.game.handleCollision) {
            this.game.handleCollision(bodyA, bodyB);
        }
    }
    
    /**
     * Handle collision end events
     * @param {object} event - Collision event
     */
    handleCollisionEnd(event) {
        // Handle end of collision if needed
    }
    
    /**
     * Update the physics simulation
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Skip update if we're in the middle of resetting
        if (this.isResetting) {
            return this;
        }

        // Safety check for world and bodies
        if (!this.cannonWorld || !this.cannonWorld.bodies) {
            if (this.game && this.game.debugManager) {
                this.game.debugManager.warn('[PhysicsManager] Physics world or bodies not ready');
            }
            return this;
        }

        // Update the physics world
        try {
            if (!this.isResetting) {
                this.world.update();
            }
        } catch (error) {
            if (this.game && this.game.debugManager) {
                this.game.debugManager.error(
                    'PhysicsManager.update', 
                    'Error updating physics world',
                    error,
                    true // Show in UI
                );
            } else {
                console.error("ERROR: PhysicsManager.update: Error updating physics world", error);
            }
        }
        
        return this;
    }
    
    /**
     * Enable physics debug visualization
     * @param {THREE.Scene} scene - Three.js scene to add debug meshes to
     */
    enableDebug(scene) {
        if (!this.world || !scene) return this;
        
        this.debugEnabled = true;
        
        // Create debug visualization since PhysicsWorld doesn't have it
        this.createDebugMeshes(scene);
        
        return this;
    }
    
    /**
     * Create debug visualization meshes for physics bodies
     * @param {THREE.Scene} scene - Three.js scene to add debug meshes to
     */
    createDebugMeshes(scene) {
        if (!this.cannonWorld || !scene) return;
        
        // Remove any existing debug meshes
        this.removeDebugMeshes(scene);
        
        // Create a mesh for each body in the physics world
        this.cannonWorld.bodies.forEach(body => {
            const bodyMesh = this.createBodyDebugMesh(body);
            if (bodyMesh) {
                scene.add(bodyMesh);
                this.debugMeshes.push(bodyMesh);
            }
        });
    }
    
    /**
     * Create a debug mesh for a physics body
     * @param {CANNON.Body} body - Physics body to create a mesh for
     * @returns {THREE.Object3D} Debug mesh for the body
     */
    createBodyDebugMesh(body) {
        const object = new THREE.Object3D();
        
        // Set position and rotation
        object.position.copy(this.cannonVec3ToThree(body.position));
        object.quaternion.copy(this.cannonQuatToThree(body.quaternion));
        
        // Create a mesh for each shape in the body
        body.shapes.forEach((shape, index) => {
            let geometry;
            let material = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                wireframe: true,
                transparent: true,
                opacity: 0.5
            });
            
            // Create geometry based on shape type
            if (shape instanceof CANNON.Box) {
                geometry = new THREE.BoxGeometry(
                    shape.halfExtents.x * 2,
                    shape.halfExtents.y * 2,
                    shape.halfExtents.z * 2
                );
            } else if (shape instanceof CANNON.Sphere) {
                geometry = new THREE.SphereGeometry(shape.radius, 16, 16);
            } else if (shape instanceof CANNON.Plane) {
                geometry = new THREE.PlaneGeometry(10, 10);
            } else if (shape instanceof CANNON.Cylinder) {
                geometry = new THREE.CylinderGeometry(
                    shape.radiusTop,
                    shape.radiusBottom,
                    shape.height,
                    16
                );
            } else {
                // Unsupported shape
                return null;
            }
            
            const mesh = new THREE.Mesh(geometry, material);
            
            // Set offset position and rotation if needed
            if (body.shapeOffsets[index]) {
                mesh.position.copy(this.cannonVec3ToThree(body.shapeOffsets[index]));
            }
            
            if (body.shapeOrientations[index]) {
                mesh.quaternion.copy(this.cannonQuatToThree(body.shapeOrientations[index]));
            }
            
            object.add(mesh);
        });
        
        return object;
    }
    
    /**
     * Convert CANNON.Vec3 to THREE.Vector3
     * @param {CANNON.Vec3} cannonVec - CANNON vector
     * @returns {THREE.Vector3} THREE vector
     */
    cannonVec3ToThree(cannonVec) {
        return new THREE.Vector3(cannonVec.x, cannonVec.y, cannonVec.z);
    }
    
    /**
     * Convert CANNON.Quaternion to THREE.Quaternion
     * @param {CANNON.Quaternion} cannonQuat - CANNON quaternion
     * @returns {THREE.Quaternion} THREE quaternion
     */
    cannonQuatToThree(cannonQuat) {
        return new THREE.Quaternion(cannonQuat.x, cannonQuat.y, cannonQuat.z, cannonQuat.w);
    }
    
    /**
     * Disable physics debug visualization
     */
    disableDebug() {
        this.debugEnabled = false;
        
        // Remove debug meshes from the scene if we have a reference to it
        if (this.game && this.game.scene) {
            this.removeDebugMeshes(this.game.scene);
        }
        
        return this;
    }
    
    /**
     * Remove debug meshes from the scene
     * @param {THREE.Scene} scene - Three.js scene to remove meshes from
     */
    removeDebugMeshes(scene) {
        this.debugMeshes.forEach(mesh => {
            if (mesh.parent) {
                scene.remove(mesh);
            }
        });
        
        this.debugMeshes = [];
    }
    
    /**
     * Update debug visualization meshes
     */
    updateDebugMeshes() {
        if (!this.cannonWorld || !this.debugEnabled || this.debugMeshes.length === 0) return this;
        
        // Update debug mesh positions and rotations
        let meshIndex = 0;
        
        this.cannonWorld.bodies.forEach(body => {
            if (meshIndex < this.debugMeshes.length) {
                const mesh = this.debugMeshes[meshIndex++];
                
                // Update position and rotation
                mesh.position.copy(this.cannonVec3ToThree(body.position));
                mesh.quaternion.copy(this.cannonQuatToThree(body.quaternion));
            }
        });
        
        return this;
    }
    
    /**
     * Clean up physics resources
     */
    cleanup() {
        // Disable debug visualization
        this.disableDebug();
        
        // Clean up physics world
        if (this.cannonWorld) {
            // Remove event listeners
            this.cannonWorld.removeEventListener('beginContact', this.boundCollisionStart);
            this.cannonWorld.removeEventListener('endContact', this.boundCollisionEnd);
        }
        
        this.world = null;
        this.cannonWorld = null;
        
        return this;
    }
    
    /**
     * Remove a body from the physics world
     * @param {CANNON.Body} body - The physics body to remove
     */
    removeBody(body) {
        if (!this.cannonWorld || !body) return this;
        
        // Check if body is still in the world before removing
        if (this.cannonWorld.bodies.includes(body)) {
            // Remove from world
            this.cannonWorld.removeBody(body);
            
            // Log removal for debugging
            if (this.game && this.game.debugManager) {
                this.game.debugManager.log(`[PhysicsManager] Removed body: ${body.id}`);
            }
        }
        
        return this;
    }
    
    /**
     * Resets the entire physics world. Clears all bodies and recreates the world.
     * @returns {Promise<PhysicsWorld>} The new physics world instance.
     */
    async resetWorld() {
        console.log('[PhysicsManager] Starting physics world reset');
        this.isResetting = true;

        try {
            // Log current state
            console.log('[PhysicsManager] Current world state:', {
                hasWorld: !!this.world,
                hasCannonWorld: !!this.cannonWorld,
                bodyCount: this.cannonWorld?.bodies?.length ?? 'N/A'
            });

            // Cleanup existing world if it exists
            if (this.world) {
                this.world.cleanup();
            }
            if (this.cannonWorld) {
                // Remove event listeners properly
                if (this.boundCollisionStart) {
                    this.cannonWorld.removeEventListener('beginContact', this.boundCollisionStart);
                }
                if (this.boundCollisionEnd) {
                    this.cannonWorld.removeEventListener('endContact', this.boundCollisionEnd);
                }
                // Clear bodies (optional, cleanup should handle this)
                while(this.cannonWorld.bodies.length > 0) {
                    this.cannonWorld.removeBody(this.cannonWorld.bodies[0]);
                }
            }
            this.world = null;
            this.cannonWorld = null;

            // Create a new world
            this.world = new PhysicsWorld(); // Re-create the wrapper
            this.cannonWorld = this.world.world; // Get the new inner CANNON.World

            // Set up collision event handling for the new world
            this.setupCollisionEvents();
            
            // Re-acquire ball body reference (might be null if ball is recreated later)
            this.ballBody = this.game.ballManager?.ball?.body;
            if (this.ballBody) {
                this.setupContactListeners();
            } else {
                console.warn('[PhysicsManager] Ball body not available after world reset. Listeners not set up.');
            }
            
            console.log('[PhysicsManager] New world created:', {
                hasWorld: !!this.world,
                hasCannonWorld: !!this.cannonWorld,
                hasStep: !!this.world.step,
                bodyCount: this.cannonWorld?.bodies?.length
            });

            return this.world; // Return the new world instance

        } catch (error) {
            console.error('[PhysicsManager] Error during physics world reset:', error);
            return null; // Return null on error
        } finally {
            this.isResetting = false;
            console.log('[PhysicsManager] Finished physics world reset');
        }
    }

    // Method to set up listeners, can be called later if ball isn't ready during init
    setupContactListeners() {
        if (!this.ballBody) {
            console.error('[PhysicsManager] Cannot set up listeners: ballBody is null.');
            return;
        }

        console.log('[PhysicsManager] Setting up beginContact/endContact listeners for ball.');

        // Use bound functions to maintain 'this' context
        this.handleBeginContact = this.handleBeginContact.bind(this);
        this.handleEndContact = this.handleEndContact.bind(this);

        this.ballBody.addEventListener('beginContact', this.handleBeginContact);
        this.ballBody.addEventListener('endContact', this.handleEndContact);
    }

    // Handler for when contact begins
    handleBeginContact(event) {
        const otherBody = event.body;
        if (otherBody.userData?.isBunkerZone && !this.isInBunker) {
            const ball = this.game.ballManager?.ball;
            if (ball && this.ballBody) {
                this.isInBunker = true;
                this.ballBody.linearDamping = ball.bunkerLinearDamping;
                console.log(`%c[PhysicsManager] Ball entered bunker zone. Damping increased to ${this.ballBody.linearDamping}`, 'color: orange;');
                // Optional: Add sound effect
                // this.game.audioManager?.playSound('sand_enter');
            }
        }
    }

    // Handler for when contact ends
    handleEndContact(event) {
        const otherBody = event.body;
        // Check if we are ending contact with a bunker *while* we thought we were in one
        if (otherBody.userData?.isBunkerZone && this.isInBunker) {
            const ball = this.game.ballManager?.ball;
            if (ball && this.ballBody) {
                this.isInBunker = false;
                this.ballBody.linearDamping = ball.defaultLinearDamping;
                console.log(`%c[PhysicsManager] Ball exited bunker zone. Damping restored to ${this.ballBody.linearDamping}`, 'color: green;');
                // Optional: Add sound effect
                // this.game.audioManager?.playSound('sand_exit');
            }
        }
    }
} 