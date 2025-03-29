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
 * Create the course
 */
async createCourse() {
    console.log('[Game] Creating course');
    try {
        // Create the course instance using the static factory method
        this.course = await BasicCourse.create(this);
        console.log('[Game] Course created successfully');
    } catch (error) {
        console.error('[Game] Failed to create course:', error);
        throw error;
    }
}

/**
 * Initialize the game
 */
async init() {
    try {
        console.log('[Game.init] Starting initialization...');
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
        console.log('[Game.init] Managers instantiated.');

        // Initialize managers in order
        console.log('[Game.init] Initializing PhysicsManager...');
        await this.physicsManager.init();
        console.log('[Game.init] Initializing BallManager...');
        this.ballManager.init();
        console.log('[Game.init] Initializing CameraController...');
        this.cameraController.init();
        console.log('[Game.init] Initializing UIManager...');
        this.uiManager.init();
        console.log('[Game.init] Initializing HoleCompletionManager...');
        this.holeCompletionManager.init();
        console.log('[Game.init] Initializing HoleTransitionManager...');
        this.holeTransitionManager.init();
        console.log('[Game.init] Initializing StateManager...');
        this.stateManager.init();
        console.log('[Game.init] Initializing ScoringSystem...');
        this.scoringSystem.init();
        console.log('[Game.init] Initializing EventManager...');
        this.eventManager.init();
        console.log('[Game.init] Initializing DebugManager...');
        this.debugManager.init();
        console.log('[Game.init] Managers initialized.');

        // Create course (which initializes hole 0 and creates ball)
        console.log('[Game.init] Creating course...');
        await this.createCourse();
        console.log('[Game.init] Course created.');

        // --- Setup AFTER course/hole 0 is ready --- 
        console.log('[Game.init] Setting up initial camera position...');
        this.cameraController.setupInitialCameraPosition();
        console.log('[Game.init] Setting up initial UI...');
        this.uiManager.setupInitialUI(); // Assuming a similar method needed for UI
        // --- End setup ---

        console.log('[Game.init] Resetting transition state...');
        this.resetTransitionState();
        console.log('[Game.init] Initialization complete.');

        return this;
    } catch (error) {
        console.error('[ERROR] Game.init: Failed to initialize game –', error);
        throw error;
    }
} 