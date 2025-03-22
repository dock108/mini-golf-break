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
    }
    
    /**
     * Initialize the physics system
     */
    init() {
        // Create physics world
        this.world = new PhysicsWorld();
        this.cannonWorld = this.world.world; // Access the inner CANNON.World instance
        
        // Set up collision event handling
        this.setupCollisionEvents();
        
        return this;
    }
    
    /**
     * Get the underlying physics world
     * @returns {PhysicsWorld} The physics world instance
     */
    getWorld() {
        return this.world;
    }
    
    /**
     * Set up collision event handling
     */
    setupCollisionEvents() {
        if (!this.cannonWorld) return this;
        
        // Add collision event handlers if needed
        this.cannonWorld.addEventListener('beginContact', this.handleCollisionStart.bind(this));
        this.cannonWorld.addEventListener('endContact', this.handleCollisionEnd.bind(this));
        
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
        if (!this.world) return;
        
        // Update the physics world
        this.world.update();
        
        // Update debug visualization if enabled
        if (this.debugEnabled) {
            this.updateDebugMeshes();
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
            this.cannonWorld.removeEventListener('beginContact', this.handleCollisionStart);
            this.cannonWorld.removeEventListener('endContact', this.handleCollisionEnd);
        }
        
        this.world = null;
        this.cannonWorld = null;
        
        return this;
    }
} 