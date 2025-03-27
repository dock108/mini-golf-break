/**
 * Handle hole transition
 * @param {number} fromHole - The hole number we're transitioning from
 * @param {number} toHole - The hole number we're transitioning to
 */
onHoleTransition(fromHole, toHole) {
    console.log(`[Game] Handling transition from hole ${fromHole} to ${toHole}`);
    
    // Reset ball state
    this.ballManager.resetBall();
    
    // Update camera for new hole
    this.cameraController.updateCameraForHole();
    
    // Update UI
    this.uiManager.updateHoleNumber(toHole);
    
    // Reset transition state
    this.resetTransitionState();
    
    // Notify managers of transition
    this.holeCompletionManager.onHoleTransition(fromHole, toHole);
    this.holeTransitionManager.onHoleTransition(fromHole, toHole);
    
    console.log(`[Game] Transition to hole ${toHole} complete`);
}

/**
 * Reset transition-related state
 */
resetTransitionState() {
    console.log('[Game] Resetting transition state');
    
    // Reset any transition flags
    this.isTransitioning = false;
    this.transitionStartTime = 0;
    
    // Reset ball state
    if (this.ballManager) {
        this.ballManager.resetBall();
    }
    
    // Reset camera state
    if (this.cameraController) {
        this.cameraController.resetState();
    }
    
    // Reset UI state
    if (this.uiManager) {
        this.uiManager.resetTransitionState();
    }
    
    // Reset managers
    if (this.holeTransitionManager) {
        this.holeTransitionManager.resetTransitionState();
    }
    
    if (this.holeCompletionManager) {
        this.holeCompletionManager.resetCompletionState();
    }
    
    console.log('[Game] Transition state reset complete');
}

/**
 * Update loop for the game
 * @param {number} dt - Delta time in seconds
 */
update(dt) {
    // Update physics
    this.physicsManager.update(dt);
    
    // Update ball
    this.ballManager.update(dt);
    
    // Update camera
    this.cameraController.update(dt);
    
    // Update UI
    this.uiManager.update(dt);
    
    // Update hole completion check
    this.holeCompletionManager.update(dt);
    
    // Update hole transition
    this.holeTransitionManager.update(dt);
    
    // Update course
    if (this.course) {
        this.course.update(dt);
    }
}

/**
 * Initialize the game
 */
init() {
    try {
        // Initialize managers
        this.physicsManager = new PhysicsManager(this);
        this.ballManager = new BallManager(this);
        this.cameraController = new CameraController(this);
        this.uiManager = new UIManager(this);
        this.holeCompletionManager = new HoleCompletionManager(this);
        this.holeTransitionManager = new HoleTransitionManager(this);
        this.stateManager = new StateManager(this);
        this.scoringSystem = new ScoringSystem(this);
        this.eventManager = new EventManager(this);
        this.debugManager = new DebugManager(this);

        // Initialize managers
        this.physicsManager.init();
        this.ballManager.init();
        this.cameraController.init();
        this.uiManager.init();
        this.holeCompletionManager.init();
        this.holeTransitionManager.init();
        this.stateManager.init();
        this.scoringSystem.init();
        this.eventManager.init();
        this.debugManager.init();

        // Create course
        this.createCourse();

        // Reset transition state
        this.resetTransitionState();

        return this;
    } catch (error) {
        console.error('[ERROR] Game.init: Failed to initialize game –', error);
        throw error;
    }
} 