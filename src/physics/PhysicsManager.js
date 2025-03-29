/**
 * Initialize the physics system
 */
init() {
    console.log('[PhysicsManager] Initializing physics system');
    
    // Create physics world
    this.world = new CANNON.World({
        gravity: new CANNON.Vec3(0, -9.82, 0)
    });
    
    // Set solver parameters
    this.world.solver.iterations = 10;
    this.world.solver.tolerance = 0.0001;
    
    // Use SAPBroadphase for better performance
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    
    // Allow sleeping bodies for better performance
    this.world.allowSleep = true;
    this.world.sleepSpeedLimit = 0.15;
    this.world.sleepTimeLimit = 0.2;
    
    // Create materials
    this.defaultMaterial = new CANNON.Material('default');
    this.ballMaterial = new CANNON.Material('ball');
    this.groundMaterial = new CANNON.Material('ground');
    this.wallMaterial = new CANNON.Material('wall');
    this.sandMaterial = new CANNON.Material('sand');
    
    // Create contact materials
    this.createContactMaterials();
    
    // Log initialization state
    console.log('[PhysicsManager] Physics world initialized:', {
        bodies: this.world.bodies.length,
        materials: {
            default: !!this.defaultMaterial,
            ball: !!this.ballMaterial,
            ground: !!this.groundMaterial,
            wall: !!this.wallMaterial,
            sand: !!this.sandMaterial
        },
        solver: {
            iterations: this.world.solver.iterations,
            tolerance: this.world.solver.tolerance
        }
    });
    
    return this;
}

/**
 * Create contact materials for physics interactions
 * @private
 */
createContactMaterials() {
    console.log('[PhysicsManager] Creating contact materials');
    
    // Ball-ground contact
    const ballGroundContact = new CANNON.ContactMaterial(
        this.ballMaterial,
        this.groundMaterial,
        {
            friction: 0.3,
            restitution: 0.7
        }
    );
    this.world.addContactMaterial(ballGroundContact);
    
    // Ball-wall contact
    const ballWallContact = new CANNON.ContactMaterial(
        this.ballMaterial,
        this.wallMaterial,
        {
            friction: 0.2,
            restitution: 0.8
        }
    );
    this.world.addContactMaterial(ballWallContact);
    
    // Ball-sand contact
    const ballSandContact = new CANNON.ContactMaterial(
        this.ballMaterial,
        this.sandMaterial,
        {
            friction: 0.5,
            restitution: 0.3
        }
    );
    this.world.addContactMaterial(ballSandContact);
    
    console.log('[PhysicsManager] Contact materials created');
}

/**
 * Reset the physics world to its initial state
 * This removes all bodies and reinitializes the world
 */
async resetWorld() {
    console.log('[PhysicsManager] Starting world reset');
    
    // Set resetting flag
    this.isResetting = true;
    
    try {
        // First disable debug visualization
        this.disableDebug();
        
        // Store all bodies in an array first
        const bodies = this.world ? [...this.world.bodies] : [];
        console.log(`[PhysicsManager] Removing ${bodies.length} bodies`);
        
        // Remove each body
        bodies.forEach(body => {
            if (body) {
                // Wake up the body before removal
                if (typeof body.wakeUp === 'function') {
                    body.wakeUp();
                }
                // Reset physics properties
                body.velocity.set(0, 0, 0);
                body.angularVelocity.set(0, 0, 0);
                body.force.set(0, 0, 0);
                body.torque.set(0, 0, 0);
                // Remove the body
                this.world.removeBody(body);
            }
        });
        
        // Clear references
        this.world = null;
        
        // Wait a frame to ensure cleanup is complete
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        // Create new physics world
        this.init();
        
        // Step the world a few times to ensure stability
        for (let i = 0; i < 5; i++) {
            this.world.step(1/60);
        }
        
        console.log('[PhysicsManager] World reset complete:', {
            bodies: this.world.bodies.length,
            gravity: this.world.gravity.toString(),
            solver: {
                iterations: this.world.solver.iterations,
                tolerance: this.world.solver.tolerance
            }
        });
    } finally {
        // Clear resetting flag
        this.isResetting = false;
    }
    
    return this;
}

/**
 * Update the physics simulation
 * @param {number} dt - Delta time in seconds
 */
update(dt) {
    // Step the physics world
    this.world.step(dt);
    
    // Log physics state if in debug mode
    if (this.game.debugManager.isDebugMode()) {
        console.log(`[PhysicsManager] Physics step: ${dt.toFixed(3)}s, Bodies: ${this.world.bodies.length}`);
    }
}

/**
 * Get the CANNON.World instance.
 * This is the preferred way to access the physics world.
 * @returns {CANNON.World} The physics world instance
 */
getWorld() {
    if (!this.world) {
        console.error('[PhysicsManager] Physics world not initialized');
        return null;
    }
    return this.world;
}

/**
 * @deprecated Use getWorld() instead
 */
get cannonWorld() {
    console.warn('[PhysicsManager] Direct cannonWorld access is deprecated. Use getWorld() instead');
    return this.world;
} 