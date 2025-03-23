import * as THREE from 'three';
import { InputController } from '../controls/InputController';
import { CameraController } from '../controls/CameraController';
import { ScoringSystem } from '../game/ScoringSystem';
import { TeeMarker } from '../objects/TeeMarker';
import { BasicCourse } from '../objects/BasicCourse';
import { EventTypes } from '../events/EventTypes';

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
            
            // Fourth tier - Game object managers that depend on physics and scene
            this.hazardManager.init();
            this.holeManager.init();
            this.ballManager.init();  // Ball depends on physics and scene
            
            // Create tee marker
            if (!this.teeMarker) {
                this.teeMarker = new TeeMarker(this.scene);
            }
            
            // Setup lights
            this.setupLights();
            
            // Create course 
            this.createCourse();
            
            // Create input controller - depends on camera and ball
            this.inputController = new InputController(this);
            this.inputController.init();
            
            // Add window resize listener
            try {
                window.addEventListener('resize', this.handleResize.bind(this));
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
    moveToNextHole() {
        // Try to advance to the next hole in the course
        if (this.course.nextHole()) {
            // Successful move to next hole
            
            // Reset ball at the new hole's starting position if it's not already there
            // (the ball might already be at the tee position if it fell through)
            if (this.ballManager && this.ballManager.ball) {
                const startPosition = this.course.getTeePosition();
                const currentPosition = this.ballManager.ball.getPosition();
                
                // Only reset the ball if it's not already close to the start position
                const distanceToStart = startPosition.distanceTo(currentPosition);
                if (distanceToStart > 1.0) {
                    this.ballManager.resetBall(startPosition);
                }
            }
            
            // Position camera for the new hole
            this.cameraController.positionCameraForHole();
            
            // Update UI for new hole
            this.uiManager.updateHoleNumber();
            this.uiManager.updateScore();
            
            // Show hole message
            const holeNumber = this.course.getCurrentHoleNumber();
            this.uiManager.showMessage(`Hole ${holeNumber}`, 2000);
            
            // Make sure the state is reset 
            this.stateManager.setHoleCompleted(false);
            this.stateManager.setBallInMotion(false);
            
            return true;
        } else {
            // All holes completed
            this.uiManager.showMessage("Course Complete!", 3000);
            return false;
        }
    }
    
    /**
     * Handle when ball enters a hole successfully
     */
    handleBallInHole() {
        try {
            // Make sure ball can fall through the hole by disabling collision with the ground surface
            if (this.ballManager && this.ballManager.ball) {
                const ball = this.ballManager.ball;
                
                // Play a success sound
                if (this.audioManager) {
                    this.audioManager.playSound('success', 0.7);
                }
                
                // Add a visual effect for success (using the ball's handleHoleSuccess method)
                if (ball.handleHoleSuccess) {
                    ball.handleHoleSuccess();
                }
            }
            
            // Mark the current hole as completed, which will disable input
            this.stateManager.setHoleCompleted(true);
            
            // Add small delay before showing a message
            setTimeout(() => {
                this.uiManager.showMessage("Great Shot!", 2000);
            }, 500);
            
            // Note: We don't call moveToNextHole() here anymore
            // The ball's landing pad collision will trigger that after the ball
            // has fallen through the hole and landed on the tee
            
        } catch (error) {
            console.error("Error in handleBallInHole:", error);
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
            window.removeEventListener('resize', this.handleResize);
            
            // Clean up managers in reverse order of initialization
            if (this.inputController) this.inputController.cleanup();
            if (this.ballManager) this.ballManager.cleanup();
            if (this.holeManager) this.holeManager.cleanup();
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
        // Subscribe to ball in hole events
        this.eventManager.subscribe(
            EventTypes.BALL_IN_HOLE,
            this.handleBallInHole,
            this
        );
        
        // Add other event subscriptions as needed
        window.addEventListener('resize', this.handleResize.bind(this));
    }
} 