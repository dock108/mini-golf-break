import * as THREE from 'three';
import { InputController } from '../controls/InputController';
import { CameraController } from '../controls/CameraController';
import { ScoringSystem } from '../game/ScoringSystem';
import { TeeMarker } from '../objects/TeeMarker';
import { BasicCourse } from '../objects/BasicCourse';

// Import managers
import { StateManager } from '../managers/StateManager';
import { UIManager } from '../managers/UIManager';
import { PhysicsManager } from '../managers/PhysicsManager';
import { DebugManager } from '../managers/DebugManager';
import { AudioManager } from '../managers/AudioManager';
import { VisualEffectsManager } from '../managers/VisualEffectsManager';
import { BallManager } from '../managers/BallManager';
import { HazardManager } from '../managers/HazardManager';
import { HoleManager } from '../managers/HoleManager';
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
        this.holeManager = new HoleManager(this);
        this.gameLoopManager = new GameLoopManager(this);
        
        // Create camera controller
        this.cameraController = new CameraController(this);
        this.camera = this.cameraController.camera;
        
        // Create scoring system
        this.scoringSystem = new ScoringSystem(this);
        
        // Game objects (these aren't managers but specific game elements)
        this.course = null;
        this.teeMarker = null;
        
        // Lighting
        this.lights = {
            ambient: null,
            directionalLight: null
        };
        
        // Track last safe position for ball
        this.lastSafePosition = new THREE.Vector3(0, 0, 0);
        
        // Performance tracking
        this.clock = new THREE.Clock();
        this.deltaTime = 0;
    }

    /**
     * Initialize the game
     */
    init() {
        // Setup renderer first
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0x000000); // Black background for space
        
        // Initialize managers in appropriate order
        this.debugManager.init();
        this.eventManager.init();
        this.performanceManager.init();
        this.stateManager.resetState();
        this.uiManager.init();
        this.visualEffectsManager.init();
        this.physicsManager.init();
        this.audioManager.init();
        this.hazardManager.init();
        this.ballManager.init();
        this.holeManager.init();
        
        // Attach renderer to DOM via UI manager
        this.uiManager.attachRenderer(this.renderer);

        // Set the scene background to black for space environment
        this.scene.background = new THREE.Color(0x000000);
        
        // Create starfield for space environment
        this.createStarfield();

        // Initialize camera controller after renderer is created
        this.cameraController.setRenderer(this.renderer);
        this.cameraController.init();
        
        // Create tee marker
        if (!this.teeMarker) {
            this.teeMarker = new TeeMarker(this.scene);
        }
        
        // Setup lights
        this.setupLights();
        
        // Create course and ball
        this.createCourse();
        
        // Create input controller
        this.inputController = new InputController(this);
        
        // Add event listeners
        window.addEventListener('resize', () => this.handleResize());
        
        // Set up continue button action
        const continueButton = document.getElementById('continue-button');
        if (continueButton) {
            continueButton.addEventListener('click', () => this.nextHole());
        }
        
        // Start the game loop
        this.gameLoopManager.init();
        this.gameLoopManager.startLoop();
        
        // Debug log that game was initialized
        this.debugManager.log("Game initialized");
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
     * Create the course and necessary game objects
     */
    createCourse() {
        // Create the golf course
        this.course = new BasicCourse(this.scene, this.physicsManager.getWorld(), this);
        
        // Set course reference in camera controller
        this.cameraController.setCourse(this.course);
        
        // Set ball at starting position
        if (this.ballManager) {
            this.ballManager.createBall();
        }
        
        // Enable input
        if (this.inputController) {
            this.inputController.enableInput();
        }
        
        // Position camera to view the hole
        this.cameraController.positionCameraForHole();
        
        // Show hole number
        this.uiManager.updateHoleNumber();
        
        // Update UI
        this.uiManager.updateScore();
        
        // Show welcome message
        this.uiManager.showMessage("Welcome to Mini Golf Break!", 2000);
    }
    
    /**
     * Move to the next hole
     */
    nextHole() {
        // Use HoleManager to handle transitioning to next hole
        if (this.holeManager) {
            this.holeManager.nextHole();
        }
    }
    
    /**
     * Reset the current hole
     */
    resetHole() {
        // Set ball back to start position
        if (this.ballManager && this.ballManager.ball) {
            const startPosition = this.course.getHoleStartPosition();
            this.ballManager.ball.setPosition(startPosition.x, startPosition.y, startPosition.z);
            this.ballManager.ball.resetVelocity();
            
            // Update safe position
            if (this.hazardManager) {
                this.hazardManager.setLastSafePosition(startPosition);
            }
        }
        
        // Reset state
        this.stateManager.setHoleCompleted(false);
        this.stateManager.setBallInMotion(false);
        
        // Position camera directly
        this.cameraController.positionCameraForHole();
        
        // Show the tee marker at the start position
        if (this.teeMarker) {
            const safePosition = this.hazardManager ? this.hazardManager.getLastSafePosition() : new THREE.Vector3(0, 0, 0);
            this.teeMarker.setPosition(safePosition);
            this.teeMarker.show();
        }
        
        // Enable input
        if (this.inputController) {
            this.inputController.enableInput();
        }
        
        // Show welcome message
        this.uiManager.showMessage("Ready for another round!", 2000);
    }
    
    /**
     * Handle window resize event
     */
    handleResize() {
        // Update camera aspect ratio
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        // Update renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        // Stop the game loop first
        if (this.gameLoopManager) this.gameLoopManager.cleanup();
        if (this.holeManager) this.holeManager.cleanup();
        if (this.hazardManager) this.hazardManager.cleanup();
        if (this.ballManager) this.ballManager.cleanup();
        if (this.visualEffectsManager) this.visualEffectsManager.cleanup();
        if (this.audioManager) this.audioManager.cleanup();
        if (this.performanceManager) this.performanceManager.cleanup();
        if (this.debugManager) this.debugManager.cleanup();
        if (this.physicsManager) this.physicsManager.cleanup();
        if (this.uiManager) this.uiManager.cleanup();
        if (this.stateManager) this.stateManager.cleanup();
        if (this.eventManager) this.eventManager.cleanup();
        
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        
        // Clean up other resources
        if (this.inputController) {
            // Cleanup input controller events
            this.inputController = null;
        }
        
        if (this.course) {
            this.course.cleanup();
            this.course = null;
        }
        
        if (this.teeMarker) {
            this.teeMarker.cleanup();
            this.teeMarker = null;
        }
        
        // Dispose of Three.js scene and renderer
        if (this.scene) {
            // Properly dispose of all objects in the scene
            this.scene.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            
            // Clear the scene
            while(this.scene.children.length > 0) {
                this.scene.remove(this.scene.children[0]);
            }
        }
        
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
    }
} 