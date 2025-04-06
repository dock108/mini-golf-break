import * as THREE from 'three';
import { InputController } from '../controls/InputController';
import { CameraController } from '../controls/CameraController';
import { ScoringSystem } from '../game/ScoringSystem';
// Both course types are available for debug mode
import { BasicCourse } from '../objects/BasicCourse';
import { NineHoleCourse } from '../objects/NineHoleCourse';
import { EventTypes } from '../events/EventTypes';
import { CannonDebugRenderer } from '../utils/CannonDebugRenderer';

// Import managers
import { StateManager } from '../managers/StateManager';
import { UIManager } from '../managers/UIManager';
import { PhysicsManager } from '../managers/PhysicsManager';
import { DebugManager } from '../managers/DebugManager';
import { AudioManager } from '../managers/AudioManager';
import { VisualEffectsManager } from '../managers/VisualEffectsManager';
import { BallManager } from '../managers/BallManager';
import { HazardManager } from '../managers/HazardManager';
import { HoleStateManager } from '../managers/HoleStateManager';
import { HoleTransitionManager } from '../managers/HoleTransitionManager';
import { HoleCompletionManager } from '../managers/HoleCompletionManager';
import { GameLoopManager } from '../managers/GameLoopManager';
import { EventManager } from '../managers/EventManager';
import { PerformanceManager } from '../managers/PerformanceManager';

/**
 * Game - Main class that orchestrates the mini-golf game
 * Uses a component-based architecture with dedicated managers for different concerns
 */
export class Game {
    constructor() {
        // Core Three.js components
        this.scene = new THREE.Scene();
        this.renderer = null;  // Will be initialized in init()
        
        // Create managers
        this.debugManager = new DebugManager(this);
        this.eventManager = new EventManager(this);
        this.performanceManager = new PerformanceManager(this);
        this.stateManager = new StateManager(this);
        this.uiManager = new UIManager(this);
        this.physicsManager = new PhysicsManager(this);
        this.audioManager = new AudioManager(this);
        this.visualEffectsManager = new VisualEffectsManager(this);
        this.ballManager = new BallManager(this);
        this.hazardManager = new HazardManager(this);
        this.holeStateManager = new HoleStateManager(this);
        this.holeTransitionManager = new HoleTransitionManager(this);
        this.holeCompletionManager = new HoleCompletionManager(this);
        this.gameLoopManager = new GameLoopManager(this);
        
        this.cannonDebugRenderer = null;
        
        // Create camera controller
        this.cameraController = new CameraController(this);
        this.camera = this.cameraController.camera;
        
        // Create scoring system
        this.scoringSystem = new ScoringSystem(this);
        
        // Game objects (these aren't managers but specific game elements)
        this.course = null;
        // this.teeMarker = null; // Removed
        
        // Lighting
        this.lights = {
            ambient: null,
            directionalLight: null
        };
        
        // Performance tracking
        this.clock = new THREE.Clock();
        this.deltaTime = 0;

        // Store bound event handlers
        this.boundHandleResize = null;
    }

    /**
     * Initialize the game
     */
    async init() {
        try {
            // Setup renderer first
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.setClearColor(0x000000); // Black background for space
            
            // Initialize managers in appropriate order with proper dependency management
            
            // First tier - Core systems that don't depend on others
            this.debugManager.init();
            this.eventManager.init();
            
            // Second tier - Systems that depend only on core systems
            this.performanceManager.init();
            this.stateManager.resetState();
            
            // Attach renderer to DOM via UI manager
            this.uiManager.init();
            this.uiManager.attachRenderer(this.renderer);
            
            // Set the scene background to black for space environment
            this.scene.background = new THREE.Color(0x000000);
            
            // Create starfield for space environment
            this.createStarfield();
            
            // Initialize camera controller after renderer is created
            this.cameraController.setRenderer(this.renderer);
            this.cameraController.init();
            
            // Third tier - Game systems that may depend on UI and rendering
            this.visualEffectsManager.init();
            this.physicsManager.init();
            this.audioManager.init();
            
            // Initialize the CannonDebugRenderer after physics manager
            this.cannonDebugRenderer = new CannonDebugRenderer(this.scene, this.physicsManager.cannonWorld);
            
            // Fourth tier - Game object managers that depend on physics and scene
            this.holeCompletionManager.init();
            this.hazardManager.init();
            this.visualEffectsManager.init();
            
            console.log('[Game.init] Awaiting createCourse...');
            await this.createCourse();
            console.log('[Game.init] createCourse finished.');
            
            // Initialize the ball manager after the course is created
            this.ballManager.init();
            
            // Setup lights
            this.setupLights();
            
            // Create input controller - depends on camera and ball
            this.inputController = new InputController(this);
            this.inputController.init();
            
            // Update UI with initial state
            this.uiManager.updateHoleInfo();
            this.uiManager.updateScore();
            this.uiManager.updateStrokes();
            
            // Add window resize listener
            try {
                this.boundHandleResize = this.handleResize.bind(this); // Store bound function
                window.addEventListener('resize', this.boundHandleResize);
            } catch (error) {
                this.debugManager.warn('Game.init', 'Failed to add resize event listener', error);
            }
            
            // Start the game loop last, after everything is initialized
            this.gameLoopManager.init();
            this.gameLoopManager.startLoop();
            
            // Publish game started event
            this.eventManager.publish(EventTypes.GAME_STARTED, { timestamp: Date.now() }, this);
            
            // Debug log that game was initialized
            this.debugManager.log("Game initialized");
            
            // Set up event listeners
            this.setupEventListeners();
        } catch (error) {
            this.debugManager.error('Game.init', 'Failed to initialize game', error, true);
            console.error('CRITICAL: Failed to initialize game:', error);
        }
    }
    
    /**
     * Enable game input, used after unpausing
     */
    enableGameInput() {
        if (this.inputController) {
            this.inputController.enableInput();
        }
    }
    
    /**
     * Create starfield background
     */
    createStarfield() {
        // Create star points for background starfield
        const starGeometry = new THREE.BufferGeometry();
        const starMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 0.1,
            transparent: true
        });
        
        const starVertices = [];
        for (let i = 0; i < 10000; i++) {
            const x = (Math.random() - 0.5) * 2000;
            const y = (Math.random() - 0.5) * 2000;
            const z = (Math.random() - 0.5) * 2000;
            starVertices.push(x, y, z);
        }
        
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        const stars = new THREE.Points(starGeometry, starMaterial);
        
        // Add userData to identify this as a starfield object
        stars.userData.type = 'starfield';
        
        this.scene.add(stars);
    }
    
    /**
     * Set up scene lights
     */
    setupLights() {
        // Add ambient light
        this.lights.ambient = new THREE.AmbientLight(0x404040, 1);
        this.scene.add(this.lights.ambient);
        
        // Add directional light for shadows
        this.lights.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        this.lights.directionalLight.position.set(10, 20, 15);
        this.lights.directionalLight.castShadow = true;
        
        // Configure shadow settings
        this.lights.directionalLight.shadow.mapSize.width = 2048;
        this.lights.directionalLight.shadow.mapSize.height = 2048;
        this.lights.directionalLight.shadow.camera.near = 0.5;
        this.lights.directionalLight.shadow.camera.far = 50;
        this.lights.directionalLight.shadow.camera.left = -20;
        this.lights.directionalLight.shadow.camera.right = 20;
        this.lights.directionalLight.shadow.camera.top = 20;
        this.lights.directionalLight.shadow.camera.bottom = -20;
        
        this.scene.add(this.lights.directionalLight);
    }
    
    /**
     * Create the golf course environment
     */
    async createCourse() {
        try {
            console.log('[Game.createCourse] Attempting to create the course...');

            // Ensure PhysicsManager is ready before creating the course
            if (!this.physicsManager || !this.physicsManager.getWorld()) {
                console.error('[Game.createCourse] PhysicsManager not ready. Aborting course creation.');
                throw new Error('PhysicsManager must be initialized before creating the course.');
            }

            const useNineHoleCourse = true; // Or based on a setting
            if (useNineHoleCourse) {
                this.course = await NineHoleCourse.create(this);
            } else {
                this.course = await BasicCourse.create(this);
            }

            if (!this.course || !this.course.currentHoleEntity) {
                throw new Error('Course or initial HoleEntity failed to initialize.');
            }

            // Set course ref in CameraController
            if (this.cameraController) {
                this.cameraController.setCourse(this.course);
            }
            
            // Create ball using WORLD start position from course config
            const worldStartPosition = this.course.getHoleStartPosition(); // Returns WORLD coords now
            if (worldStartPosition) {
                this.ballManager.createBall(worldStartPosition); 
            } else {
                 throw new Error('Failed to get world start position for ball creation.');
            }
            
            // Position camera for the initial hole
            if (this.cameraController) {
                this.cameraController.positionCameraForHole();
            }

            this.eventManager.publish(EventTypes.COURSE_CREATED, { course: this.course }, this);

        } catch (error) {
            this.debugManager.error('Game.createCourse', 'Failed to create course', error, true);
            console.error('CRITICAL: Failed to create course:', error);
        }
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        if (this.renderer && this.camera) {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            
            // The camera aspect ratio update is handled by the CameraController
        }
    }
    
    /**
     * Cleanup the game and all its components
     */
    cleanup() {
        try {
            // Stop the game loop first
            if (this.gameLoopManager) {
                this.gameLoopManager.stopLoop();
                this.gameLoopManager.cleanup();
            }
            
            // Remove event listeners
            if (this.boundHandleResize) { // Check if it was successfully added
                window.removeEventListener('resize', this.boundHandleResize);
                this.boundHandleResize = null; // Clear reference
            }
            
            // Clean up managers in reverse order of initialization
            if (this.inputController) this.inputController.cleanup();
            if (this.ballManager) this.ballManager.cleanup();
            if (this.holeCompletionManager) this.holeCompletionManager.cleanup();
            if (this.holeTransitionManager) this.holeTransitionManager.cleanup();
            if (this.holeStateManager) this.holeStateManager.cleanup();
            if (this.hazardManager) this.hazardManager.cleanup();
            if (this.audioManager) this.audioManager.cleanup();
            if (this.physicsManager) this.physicsManager.cleanup();
            if (this.visualEffectsManager) this.visualEffectsManager.cleanup();
            if (this.cameraController) this.cameraController.cleanup();
            if (this.uiManager) this.uiManager.cleanup();
            if (this.stateManager) this.stateManager.cleanup();
            if (this.performanceManager) this.performanceManager.cleanup();
            
            // Core systems last
            if (this.eventManager) this.eventManager.cleanup();
            if (this.debugManager) this.debugManager.cleanup();
            
            // Remove objects from scene
            if (this.scene) {
                while (this.scene.children.length > 0) {
                    const object = this.scene.children[0];
                    this.scene.remove(object);
                    
                    // Dispose of geometries and materials
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(material => material.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                }
            }
            
            // Dispose of renderer
            if (this.renderer) {
                this.renderer.dispose();
                this.renderer = null;
            }
            
            // Clear references
            this.camera = null;
            this.scene = null;
            this.clock = null;
            
            console.log('Game cleaned up');
        } catch (error) {
            if (this.debugManager) {
                this.debugManager.error('Game.cleanup', 'Error during cleanup', error);
            } else {
                console.error('Error during cleanup:', error);
            }
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Subscribe to ball in hole events - REMOVED
        // this.eventManager.subscribe(
        //     EventTypes.BALL_IN_HOLE,
        //     this.handleBallInHole,
        //     this
        // );
        
        // Add other event subscriptions as needed
        window.addEventListener('resize', this.handleResize.bind(this));
    }
} 