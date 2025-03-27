/**
 * Initialize the physics manager
 */
init() {
    console.log('[PhysicsManager] Initializing physics system');
    
    // Create physics world
    this.world = new CANNON.World({
        gravity: new CANNON.Vec3(0, -9.82, 0)
    });
    
    // Create materials
    this.defaultMaterial = new CANNON.Material('default');
    this.ballMaterial = new CANNON.Material('ball');
    this.groundMaterial = new CANNON.Material('ground');
    this.wallMaterial = new CANNON.Material('wall');
    this.sandMaterial = new CANNON.Material('sand');
    
    // Create contact materials
    this.createContactMaterials();
    
    console.log('[PhysicsManager] Physics world initialized with materials');
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
 * Reset the physics world
 */
reset() {
    console.log('[PhysicsManager] Resetting physics world');
    
    // Remove all bodies
    this.world.bodies.forEach(body => {
        this.world.removeBody(body);
    });
    
    // Recreate contact materials
    this.createContactMaterials();
    
    console.log('[PhysicsManager] Physics world reset complete');
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