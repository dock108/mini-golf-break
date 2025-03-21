import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Ball {
    constructor(scene, physicsWorld, game) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.game = game; // Store reference to game for debug mode access
        
        // Ball properties
        this.radius = 0.2;
        this.segments = 32;
        this.mass = 0.5; // Lighter ball (500g instead of 1kg)
        
        // Add position property to fix the error
        this.position = new THREE.Vector3(0, this.radius + 0.1, 0);
        
        this.body = null;
        this.mesh = null;
        this.isBallActive = true;
        
        // Create the visual mesh
        this.createMesh();
        
        // Create the physics body
        this.createBody();
        
        console.log("Ball created");
    }
    
    createMesh() {
        const geometry = new THREE.SphereGeometry(this.radius, this.segments, this.segments);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            roughness: 0.2,
            metalness: 0.1
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = false;
        
        // Add to scene
        if (this.scene) {
            this.scene.add(this.mesh);
        }
    }
    
    createBody() {
        // Create physics body for the ball
        this.body = new CANNON.Body({
            mass: 0.45,
            position: new CANNON.Vec3(0, 0.5, 0),
            shape: new CANNON.Sphere(this.radius),
            material: this.physicsWorld.ballMaterial,
            sleepSpeedLimit: 0.15, // Increased further for even quicker stopping
            sleepTimeLimit: 0.2    // Reduced further to sleep sooner
        });
        
        // Set body damping (air resistance and friction)
        this.body.linearDamping = 0.6;  // Increased damping for final roll
        this.body.angularDamping = 0.6; // Matched with linear damping
        
        // Set collision groups for the ball
        this.body.collisionFilterGroup = 4;
        this.body.collisionFilterMask = 1 | 2;
        
        // Add body to physics world
        this.physicsWorld.addBody(this.body);
        
        // Ensure the body is initially awake
        this.body.wakeUp();
        
        if (this.game && this.game.debugMode) {
            console.log("Ball physics body created");
        }
    }
    
    onCollide(event) {
        // Handle collision events
        if (!event.body) return;
        
        // Check if we collided with a bumper obstacle
        if (event.body.material && event.body.material.name === 'bumper') {
            // Play sound or visual effect for bumper hit
            if (this.game && this.game.debugMode) {
                console.log("Ball hit obstacle bumper!");
            }
            
            // Ensure the ball stays awake after a collision
            this.body.wakeUp();
        }
        
        // Check if the ball collided with a hole
        if (event.body.userData && event.body.userData.type === 'hole') {
            // Log the collision for debugging
            if (this.game && this.game.debugMode) {
                console.log("Ball collided with hole!");
            }
            
            // The actual hole completion will be handled in the Game class by the isInHole method
        }
    }
    
    update() {
        if (this.body && this.mesh) {
            // Update visual mesh to match physics body
            this.mesh.position.copy(this.body.position);
            this.mesh.quaternion.copy(this.body.quaternion);
            
            // Check if the body is falling too fast (failsafe)
            if (this.body.position.y < -10) {
                console.log("Ball fell too far, resetting position");
                this.game.handleBallInWater();
            }
            
            // Debugging - log when ball moves very fast
            const velocity = this.body.velocity;
            const speed = velocity.length();
            
            if (this.game && this.game.debugMode && speed > 5) {
                console.log(`Ball moving fast: ${speed.toFixed(2)} m/s, vel: (${velocity.x.toFixed(2)}, ${velocity.y.toFixed(2)}, ${velocity.z.toFixed(2)})`);
            }
        }
    }
    
    setPosition(x, y, z) {
        // Make sure y is at least ball radius + small buffer to avoid ground penetration
        const safeY = Math.max(y, this.radius + 0.05);
        
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
            
            console.log(`Ball position set to (${x}, ${safeY}, ${z})`);
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
    
    applyForce(direction, power) {
        if (!this.body) return;
        
        // Scale power for reasonable force (reduced multiplier)
        const forceMagnitude = power * 15; // Reduced from 20 to 15 for better control
        
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
        
        console.log(`Applying force: Direction: (${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}, ${direction.z.toFixed(2)}), Power: ${power.toFixed(2)}`);
    }
    
    reset() {
        this.resetVelocity();
        this.setPosition(0, this.radius + 0.1, 0);
    }
    
    dispose() {
        if (this.mesh) {
            if (this.mesh.parent) {
                this.mesh.parent.remove(this.mesh);
            }
            
            if (this.mesh.geometry) {
                this.mesh.geometry.dispose();
            }
            
            if (this.mesh.material) {
                this.mesh.material.dispose();
            }
        }
        
        if (this.body && this.physicsWorld) {
            this.physicsWorld.removeBody(this.body);
        }
    }
} 