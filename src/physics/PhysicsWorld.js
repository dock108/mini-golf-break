import * as CANNON from 'cannon-es';

export class PhysicsWorld {
    constructor() {
        // Create the Cannon.js world with more iterations for stability
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.81, 0); // Earth gravity
        
        // Set solver iterations to match documentation
        this.world.solver.iterations = 30; // Increased from 20 for better contact resolution
        this.world.solver.tolerance = 0.0001;
        
        // Use SAPBroadphase for better performance with many objects
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        
        // Allow sleeping bodies for better performance
        this.world.allowSleep = true;
        
        // Set default sleep parameters to match documentation
        this.world.defaultSleepSpeedLimit = 0.15; // Updated to match documentation
        this.world.defaultSleepTimeLimit = 0.2;   // Updated to match documentation
        
        // Set default material properties
        this.defaultMaterial = new CANNON.Material('default');
        this.groundMaterial = new CANNON.Material('ground');
        this.ballMaterial = new CANNON.Material('ball');
        this.waterMaterial = new CANNON.Material('water'); // TODO: Implement water hazard physics (contact material, body assignment)
        this.sandMaterial = new CANNON.Material('sand');
        this.bumperMaterial = new CANNON.Material('bumper'); // New material for obstacles
        this.holeCupMaterial = new CANNON.Material('holeCup'); // Material for the physical hole cup
        this.holeRimMaterial = new CANNON.Material('holeRim'); // New material for the hole edge/funnel
        
        // Create contact materials
        this.createContactMaterials();
        
        // Set the timestep (fixed at 60fps)
        this.fixedTimeStep = 1.0 / 60.0;
        this.maxSubSteps = 3; // Updated to match documentation (was 8)
        
        // Last time used for calculating elapsed time
        this.lastCallTime = performance.now() / 1000;
        
        // Track when physics world was created to prevent immediate collisions
        this.creationTime = Date.now();
        this.collisionGracePeriod = 2000; // ms - increased from 500ms
        
        // Add collide event listener for hole detection
        this.setupCollideListener();
        
        console.log("Physics world initialized");
    }
    
    createContactMaterials() {
        // Set up contact between ball and ground (normal green)
        const ballGroundContact = new CANNON.ContactMaterial(
            this.ballMaterial,
            this.groundMaterial,
            {
                friction: 0.8,          // Increased friction for faster deceleration
                restitution: 0.1,       // Keep low bounce
                contactEquationStiffness: 1e7,
                contactEquationRelaxation: 3,
                frictionEquationStiffness: 1e7,
                frictionEquationRelaxation: 1    // Reduced relaxation for better friction response
            }
        );
        this.world.addContactMaterial(ballGroundContact);
        
        // Set up contact between ball and bumpers (obstacles)
        console.log(`[PhysicsWorld] Defining ballBumperContact with ballMat ID: ${this.ballMaterial?.id}, bumperMat ID: ${this.bumperMaterial?.id}`); // Log IDs before definition
        const ballBumperContact = new CANNON.ContactMaterial(
            this.ballMaterial,
            this.bumperMaterial,
            {
                friction: 0.2,          // Restored original value
                restitution: 0.4,
                contactEquationStiffness: 1e8,
                contactEquationRelaxation: 2,
                frictionEquationStiffness: 1e7,
                frictionEquationRelaxation: 1   // Reduced from 2 for firmer friction response
            }
        );
        this.world.addContactMaterial(ballBumperContact);
        console.log(`[PhysicsWorld] World contact materials after adding ballBumper:`, this.world.contactmaterials.map(cm => `${cm.materials[0]?.name}(${cm.materials[0]?.id}) <-> ${cm.materials[1]?.name}(${cm.materials[1]?.id})`)); // Log world's contact materials
        
        // Set up contact between ball and sand - extremely high friction to make it very difficult
        const ballSandContact = new CANNON.ContactMaterial(
            this.ballMaterial,
            this.sandMaterial,
            {
                friction: 2.0,           // Keep high friction for sand
                restitution: 0.01,       // Keep very low bounce
                contactEquationStiffness: 1e6,
                contactEquationRelaxation: 10,
                frictionEquationStiffness: 1e7,
                frictionEquationRelaxation: 20
            }
        );
        this.world.addContactMaterial(ballSandContact);
        
        // Set up contact between ball and hole cup
        const ballHoleCupContact = new CANNON.ContactMaterial(
            this.ballMaterial,
            this.holeCupMaterial,
            {
                friction: 0.3,      // Moderate friction
                restitution: 0.0,   // ZERO bounce (was 0.1)
                contactEquationStiffness: 1e7,
                contactEquationRelaxation: 3,
                frictionEquationStiffness: 1e7,
                frictionEquationRelaxation: 3
            }
        );
        this.world.addContactMaterial(ballHoleCupContact);
        console.log(`[PhysicsWorld] Added ballHoleCupContact.`);
        
        // Set up contact between ball and hole rim/funnel - low bounce
        const ballRimContact = new CANNON.ContactMaterial(
            this.ballMaterial,
            this.holeRimMaterial, 
            {
                friction: 0.6,          // Similar to ground friction
                restitution: 0.01,      // VERY low bounce
                contactEquationStiffness: 1e7,
                contactEquationRelaxation: 3,
                frictionEquationStiffness: 1e7,
                frictionEquationRelaxation: 1 
            }
        );
        this.world.addContactMaterial(ballRimContact);
        console.log(`[PhysicsWorld] Added ballRimContact.`);
        
        // Default contact material for everything else
        this.world.defaultContactMaterial.friction = 0.8;     // Increased default friction
        this.world.defaultContactMaterial.restitution = 0.1; // Restored original value
    }
    
    update() {
        const time = performance.now() / 1000;
        let dt = time - this.lastCallTime;
        
        // Cap the delta time to prevent large jumps
        if (dt > 0.1) dt = 0.1;
        
        this.lastCallTime = time;
        
        // Debug log much less frequently (approximately once every minute)
        const debugRate = 0.0005; 
        if (Math.random() < debugRate) {
            const bodyCount = this.world ? this.world.bodies.length : 0;
            console.log(`DEBUG PhysicsWorld.update: Physics update dt=${dt.toFixed(4)}, bodyCount=${bodyCount}`);
            
            // Check if there's a ball in the physics world
            const ballBody = this.world.bodies.find(body => 
                body.shapes && body.shapes[0] && body.shapes[0].type === CANNON.Shape.types.SPHERE);
                
            if (ballBody) {
                console.log(`DEBUG PhysicsWorld.update: Ball found in physics world. ` +
                            `Position: (${ballBody.position.x.toFixed(2)}, ${ballBody.position.y.toFixed(2)}, ${ballBody.position.z.toFixed(2)}), ` +
                            `Velocity: (${ballBody.velocity.x.toFixed(2)}, ${ballBody.velocity.y.toFixed(2)}, ${ballBody.velocity.z.toFixed(2)}), ` +
                            `Sleeping: ${ballBody.sleepState}`);
            }
        }
        
        // Step the physics world with safety checks
        if (this.world) {
            try {
                // Wake up all bodies before stepping to ensure they're in a valid state
                this.world.bodies.forEach(body => {
                    if (body && typeof body.wakeUp === 'function') {
                        body.wakeUp();
                    }
                });

                // Temporarily remove collision callback if it exists
                let tempCallback = null;
                if (this._collisionCallback) {
                    tempCallback = this._collisionCallback;
                    this.world.removeEventListener('beginContact', this._collisionCallback);
                }
                
                // Step the world
                this.world.step(this.fixedTimeStep, dt, this.maxSubSteps);
                
                // Re-add collision callback if it was removed
                if (tempCallback) {
                    this.world.addEventListener('beginContact', tempCallback);
                }
            } catch (error) {
                console.error('Error in physics update:', error);
                // If we get an error, try to recover by resetting all bodies
                this.world.bodies.forEach(body => {
                    if (body) {
                        body.velocity.set(0, 0, 0);
                        body.angularVelocity.set(0, 0, 0);
                        body.force.set(0, 0, 0);
                        body.torque.set(0, 0, 0);
                        if (typeof body.wakeUp === 'function') {
                            body.wakeUp();
                        }
                    }
                });
            }
        }
    }
    
    /**
     * Set up the collide event listener
     */
    setupCollideListener() {
        // Remove any existing listeners first to avoid duplicates
        this.world.removeEventListener('collide', this._collideCallback);
        
        // Create a new collide callback
        this._collideCallback = (event) => {
            // Check if we're still in the grace period
            const timeSinceCreation = Date.now() - this.creationTime;
            if (timeSinceCreation < this.collisionGracePeriod) {
                console.log(`[PhysicsWorld] Ignoring collide event during grace period (${timeSinceCreation}ms < ${this.collisionGracePeriod}ms)`);
                return;
            }
            
            // Get the bodies involved in the collision
            const bodyA = event.bodyA;
            const bodyB = event.bodyB;
            
            // REMOVED specific ball/hole check here - handled in Ball.js now
            // let ball = null;
            // let hole = null;
            // 
            // if (bodyA.userData && bodyA.userData.type === 'ball') {
            //     ball = bodyA;
            //     if (bodyB.userData && bodyB.userData.type === 'hole') {
            //         hole = bodyB;
            //     }
            // } else if (bodyB.userData && bodyB.userData.type === 'ball') {
            //     ball = bodyB;
            //     if (bodyA.userData && bodyA.userData.type === 'hole') {
            //         hole = bodyA;
            //     }
            // }
            // 
            // // If we found a ball and hole collision
            // if (ball && hole) {
            //     console.log(`[PhysicsWorld] Ball entered hole ${hole.userData.holeIndex + 1}`);
            //     
            //     // Check if we have a game object with onBallInHole method
            //     if (this.game && typeof this.game.onBallInHole === 'function') {
            //         this.game.onBallInHole(hole.userData.holeIndex);
            //     }
            // }
        };
        
        // Add the callback to the world
        this.world.addEventListener('collide', this._collideCallback);
    }
    
    // Store collision callback for re-adding after reset
    setCollisionCallback(callback) {
        // Wrap the callback with our own that includes grace period check
        const wrappedCallback = (event) => {
            // Check if we're still in the grace period
            const timeSinceCreation = Date.now() - this.creationTime;
            if (timeSinceCreation < this.collisionGracePeriod) {
                console.log(`[PhysicsWorld] Ignoring collision during grace period (${timeSinceCreation}ms < ${this.collisionGracePeriod}ms)`);
                return;
            }
            
            // Check what objects are colliding
            const bodyA = event.bodyA;
            const bodyB = event.bodyB;
            
            // Log collision details
            if (bodyA && bodyA.userData && bodyB && bodyB.userData) {
                console.log(`[PhysicsWorld] Collision detected between: 
                    - Type A: ${bodyA.userData.type || 'unknown'}, Index: ${bodyA.userData.holeIndex !== undefined ? bodyA.userData.holeIndex : 'N/A'}
                    - Type B: ${bodyB.userData.type || 'unknown'}, Index: ${bodyB.userData.holeIndex !== undefined ? bodyB.userData.holeIndex : 'N/A'}`);
            }
            
            // Call the original callback
            callback(event);
        };
        
        this._collisionCallback = wrappedCallback;
        if (this.world) {
            this.world.addEventListener('beginContact', wrappedCallback);
        }
    }
    
    addBody(body) {
        if (body) {
            // Ensure body is awake when added
            if (typeof body.wakeUp === 'function') {
                body.wakeUp();
            }
            
            // Add to world
            this.world.addBody(body);
            
            // Log body addition
            console.log(`[PhysicsWorld] Added body of type: ${body.userData ? body.userData.type : 'unknown'}`);
        }
    }
    
    removeBody(body) {
        if (this.world && body) {
            // Wake up the body before removal
            if (typeof body.wakeUp === 'function') {
                body.wakeUp();
            }
            
            // Reset all physics properties
            body.velocity.set(0, 0, 0);
            body.angularVelocity.set(0, 0, 0);
            body.force.set(0, 0, 0);
            body.torque.set(0, 0, 0);
            
            // Remove all constraints involving this body first
            const constraintsToRemove = this.world.constraints.filter(
                c => c.bodyA === body || c.bodyB === body
            );
            constraintsToRemove.forEach(c => this.world.removeConstraint(c));
            
            // Finally remove the body
            this.world.removeBody(body);
            
            // Log body removal
            console.log(`[PhysicsWorld] Removed body of type: ${body.userData ? body.userData.type : 'unknown'}`);
        }
    }
    
    // Helper to create a plane body for ground
    createGroundBody(material = this.groundMaterial) {
        const groundBody = new CANNON.Body({
            type: CANNON.Body.STATIC,
            material: material
        });
        
        // Add a plane shape - this is infinite in size
        const planeShape = new CANNON.Plane();
        groundBody.addShape(planeShape);
        
        // Rotate to be flat on XZ plane
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        
        return groundBody;
    }
    
    // Helper to create a box body
    createBoxBody(size, position, material = this.defaultMaterial, mass = 0) {
        const boxBody = new CANNON.Body({
            mass: mass,
            material: material,
            position: new CANNON.Vec3(position.x, position.y, position.z)
        });
        
        // Add a box shape
        const boxShape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
        boxBody.addShape(boxShape);
        
        return boxBody;
    }
    
    // Helper to create a sphere body
    createSphereBody(radius, position, material = this.ballMaterial, mass = 1) {
        const sphereBody = new CANNON.Body({
            mass: mass,
            material: material,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            linearDamping: 0.6,
            angularDamping: 0.6,
            allowSleep: true, // Let body sleep when stopped
            sleepSpeedLimit: 0.15, // Updated to match documentation (was 0.03)
            sleepTimeLimit: 0.2    // Updated to match documentation (was 0.5)
        });
        
        // Add a sphere shape
        const sphereShape = new CANNON.Sphere(radius);
        sphereBody.addShape(sphereShape);
        
        // Set initial velocity to zero
        sphereBody.velocity.set(0, 0, 0);
        sphereBody.angularVelocity.set(0, 0, 0);
        
        // Make sure the body is awake to start with
        sphereBody.wakeUp();
        
        return sphereBody;
    }
    
    // Helper to create a cylinder body (for holes)
    createCylinderBody(radius, height, position, material = this.defaultMaterial, mass = 0) {
        // Fix the cylinder orientation to match our hole geometry
        const cylinderBody = new CANNON.Body({
            mass: mass,
            shape: new CANNON.Cylinder(radius, radius, height, 16),
            material: material,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            collisionResponse: false // Doesn't physically interact but can detect collisions
        });
        // No rotation needed as the cylinder should be vertical
        return cylinderBody;
    }
    
    /**
     * Reset the physics world to its initial state
     */
    reset() {
        console.log('[PhysicsWorld] Resetting physics world');
        
        // Remove all bodies
        const bodies = [...this.world.bodies];
        bodies.forEach(body => {
            if (body) {
                // Wake up the body before removal
                if (typeof body.wakeUp === 'function') {
                    body.wakeUp();
                }
                
                // Reset all physics properties
                body.velocity.set(0, 0, 0);
                body.angularVelocity.set(0, 0, 0);
                body.force.set(0, 0, 0);
                body.torque.set(0, 0, 0);
                
                // Remove all shapes from the body first
                body.shapes.forEach(shape => {
                    body.removeShape(shape);
                });
                
                // Remove the body
                this.world.removeBody(body);
            }
        });
        
        // Reset the world's state
        this.world.gravity.set(0, -9.81, 0);
        this.world.solver.iterations = 30;
        this.world.solver.tolerance = 0.0001;
        this.world.allowSleep = true;
        this.world.defaultSleepSpeedLimit = 0.15;
        this.world.defaultSleepTimeLimit = 0.2;
        
        // Recreate contact materials
        this.createContactMaterials();
        
        // Reset grace period
        this.creationTime = Date.now();
        console.log(`[PhysicsWorld] Reset collision grace period at ${this.creationTime}`);
        
        // Reset collision listeners
        this.setupCollideListener();
        
        console.log('[PhysicsWorld] Physics world reset complete');
    }
} 