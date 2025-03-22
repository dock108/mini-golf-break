import * as CANNON from 'cannon-es';

export class PhysicsWorld {
    constructor() {
        // Create the Cannon.js world with more iterations for stability
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.81, 0); // Earth gravity
        
        // Increase solver iterations for better stability
        this.world.solver.iterations = 30;
        this.world.solver.tolerance = 0.0001;
        
        // Use SAPBroadphase for better performance with many objects
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        
        // Allow sleeping bodies for better performance
        this.world.allowSleep = true;
        
        // Set default material properties
        this.defaultMaterial = new CANNON.Material('default');
        this.groundMaterial = new CANNON.Material('ground');
        this.ballMaterial = new CANNON.Material('ball');
        this.waterMaterial = new CANNON.Material('water');
        this.sandMaterial = new CANNON.Material('sand');
        this.bumperMaterial = new CANNON.Material('bumper'); // New material for obstacles
        
        // Create contact materials
        this.createContactMaterials();
        
        // Set the timestep (fixed at 60fps)
        this.fixedTimeStep = 1.0 / 60.0;
        this.maxSubSteps = 8; // Increased from 5 for smoother physics
        
        // Last time used for calculating elapsed time
        this.lastCallTime = performance.now() / 1000;
        
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
        const ballBumperContact = new CANNON.ContactMaterial(
            this.ballMaterial,
            this.bumperMaterial,
            {
                friction: 0.1,          // Keep low friction for bumpers
                restitution: 0.8,       // Keep high bounce
                contactEquationStiffness: 1e8,
                contactEquationRelaxation: 3,
                frictionEquationStiffness: 1e7,
                frictionEquationRelaxation: 2
            }
        );
        this.world.addContactMaterial(ballBumperContact);
        
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
        
        // Default contact material for everything else
        this.world.defaultContactMaterial.friction = 0.8;     // Increased default friction
        this.world.defaultContactMaterial.restitution = 0.1;
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
        
        // Step the physics world
        this.world.step(this.fixedTimeStep, dt, this.maxSubSteps);
    }
    
    addBody(body) {
        this.world.addBody(body);
    }
    
    removeBody(body) {
        this.world.removeBody(body);
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
            linearDamping: 0.6, // Updated to match Ball.js
            angularDamping: 0.6, // Updated to match Ball.js
            allowSleep: true, // Let body sleep when stopped
            sleepSpeedLimit: 0.03, // Lower threshold to sleep sooner
            sleepTimeLimit: 0.5 // Sleep more quickly
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
} 