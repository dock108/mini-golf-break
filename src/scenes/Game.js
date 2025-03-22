import * as THREE from 'three';
import { InputController } from '../controls/InputController';
import { CameraController } from '../controls/CameraController';
import { ScoringSystem } from '../game/ScoringSystem';
import { Ball } from '../objects/Ball';
import { BasicCourse } from '../objects/BasicCourse';
import { TeeMarker } from '../objects/TeeMarker';

// Import managers
import { StateManager } from '../managers/StateManager';
import { UIManager } from '../managers/UIManager';
import { PhysicsManager } from '../managers/PhysicsManager';
import { DebugManager } from '../managers/DebugManager';
import { AudioManager } from '../managers/AudioManager';

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
        this.stateManager = new StateManager(this);
        this.uiManager = new UIManager(this);
        this.physicsManager = new PhysicsManager(this);
        this.debugManager = new DebugManager(this);
        this.audioManager = new AudioManager(this);
        
        // Create camera controller
        this.cameraController = new CameraController(this);
        this.camera = this.cameraController.camera;
        
        // Create scoring system
        this.scoringSystem = new ScoringSystem(this);
        
        // Game objects
        this.ball = null;
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
        
        // Initialize managers
        this.stateManager.resetState();
        this.uiManager.init();
        
        // Attach renderer to DOM via UI manager
        this.uiManager.attachRenderer(this.renderer);

        // Set the scene background to black for space environment
        this.scene.background = new THREE.Color(0x000000);
        
        // Create starfield for space environment
        this.createStarfield();

        // Initialize camera controller after renderer is created
        this.cameraController.setRenderer(this.renderer);
        this.cameraController.init();
        
        // Initialize physics 
        this.physicsManager.init();
        
        // Initialize debug manager
        this.debugManager.init();
        
        // Setup lights
        this.setupLights();
        
        // Create tee marker
        if (!this.teeMarker) {
            this.teeMarker = new TeeMarker(this.scene);
        }
        
        // Create space course
        this.course = new BasicCourse(this.scene, this.physicsManager.getWorld());
        
        // Load the single hole
        this.course.loadHole();
            
        // Set current hole explicitly
        this.scoringSystem.setCurrentHole();
        
        // Create ball last (so it appears on top of the course)
        this.createBall();
        
        // Update camera controller references
        this.cameraController.setReferences(this.ball, this.course);
        
        // Initialize input controller
        this.initInput();
        
        // Position camera 
        this.cameraController.positionCameraForHole();
        
        // Show welcome message
        this.uiManager.showMessage("Welcome to Space Golf!", 3000);
        
        // Start the game loop
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
        
        return this;
    }
    
    /**
     * Initialize input handling
     */
    initInput() {
        // Create input controller
        this.inputController = new InputController(this);
    }
    
    /**
     * Set up the lighting for the scene
     */
    setupLights() {
        // Ambient light for overall illumination
        this.lights.ambient = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(this.lights.ambient);
        
        // Directional light for shadows
        this.lights.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.lights.directionalLight.position.set(10, 10, 10);
        this.lights.directionalLight.castShadow = true;
        
        // Configure shadow properties
        this.lights.directionalLight.shadow.mapSize.width = 2048;
        this.lights.directionalLight.shadow.mapSize.height = 2048;
        this.lights.directionalLight.shadow.camera.near = 0.5;
        this.lights.directionalLight.shadow.camera.far = 50;
        this.lights.directionalLight.shadow.camera.left = -15;
        this.lights.directionalLight.shadow.camera.right = 15;
        this.lights.directionalLight.shadow.camera.top = 15;
        this.lights.directionalLight.shadow.camera.bottom = -15;
        
        this.scene.add(this.lights.directionalLight);
    }
    
    /**
     * Create a starfield background for the space environment
     */
    createStarfield() {
        const starCount = 2000;
        const starGeometry = new THREE.BufferGeometry();
        const starMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 0.1,
            transparent: true
        });
        
        // Generate random star positions
        const positions = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount * 3; i += 3) {
            // Create a sphere around the camera
            const radius = 100;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions[i] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i + 2] = radius * Math.cos(phi);
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const starField = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(starField);
    }
    
    /**
     * Main animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Run the update logic
        this.update();
    }
    
    /**
     * Update game state for a single frame
     */
    update() {
        // Calculate delta time for smooth animations
        this.deltaTime = this.clock.getDelta();
        
        // Skip update if core components aren't initialized
        if (!this.renderer || !this.scene || !this.camera) return;
        
        // Update physics
        this.physicsManager.update(this.deltaTime);
        
        // Check ball state and update game state accordingly
        this.updateBallState();
        
        // Check if ball is in hole
        this.checkBallInHole();
        
        // Update camera
        this.cameraController.update(this.deltaTime);
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
        
        // Update debug display if enabled
        if (this.debugManager.enabled) {
            this.uiManager.updateDebugDisplay(this.debugManager.getDebugInfo());
        }
    }
    
    /**
     * Update ball motion state
     */
    updateBallState() {
        if (!this.ball) return;
        
        // Previous state
        const wasMoving = this.stateManager.isBallInMotion();
        
        // Update state based on ball motion
        this.stateManager.setBallInMotion(this.ball.isMoving);
        
        // If ball has just stopped and hole not completed
        if (wasMoving && !this.stateManager.isBallInMotion()) {
            // Handle ball stopped event
            if (!this.stateManager.isHoleCompleted()) {
                // Create the tee marker at the current ball position
                this.updateTeeMarker();
                
                // Check for OB (out of bounds) or water hazards
                if (!this.stateManager.isHoleCompleted() && !this.stateManager.getState('resetBall')) {
                    this.checkHazards();
                }
            }
        }
        
        // Debug log for ball physics
        if (this.debugManager.enabled && this.ball.body) {
            const velocity = this.ball.body.velocity;
            this.debugManager.logBallVelocity(new THREE.Vector3(velocity.x, velocity.y, velocity.z));
        }
    }

    /**
     * Check if the ball is in the hole
     */
    checkBallInHole() {
        if (!this.ball || !this.course || this.stateManager.isHoleCompleted()) return false;
        
        // Get the current hole position
        const holePosition = this.course.getHolePosition();
        if (!holePosition) return false;
        
        // Update the ball's current hole position reference
        if (this.ball.currentHolePosition) {
            this.ball.currentHolePosition.copy(holePosition);
        } else {
            this.ball.currentHolePosition = holePosition.clone();
        }
        
        // Get ball position
        const ballPosition = this.ball.mesh.position.clone();
        
        // Calculate distance to hole
        const distanceToHole = ballPosition.distanceTo(holePosition);
        
        // Check if ball is hovering over the hole
        const isCloseToHole = distanceToHole < 0.3; // Slightly smaller than hole radius
        
        // Check if ball is at rest
        const isStopped = this.ball.isStopped();
        
        // Check if ball is at a lower position (inside the hole)
        const isLowerThanSurface = ballPosition.y < holePosition.y - 0.05;
        
        // Ball is in hole if it's close, stopped, and lower than the surface
        if ((isCloseToHole && isStopped) || (isCloseToHole && isLowerThanSurface)) {
            this.debugManager.log(`Ball in hole! Distance: ${distanceToHole.toFixed(2)}, Height: ${ballPosition.y.toFixed(2)}`);
            
            // Handle hole completion
            if (this.ball.handleHoleSuccess) {
                this.ball.handleHoleSuccess();
            }
            
            // Trigger the game's hole completed logic
            this.handleHoleCompleted();
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Handle hole completion
     */
    handleHoleCompleted() {
        // Mark the hole as completed in state manager
        this.stateManager.setHoleCompleted();
        
        // Play success sound using AudioManager
        // Note: The ball already plays its own success sound, so we don't duplicate it here
        
        // Update the score for the current hole
        const strokeCount = this.scoringSystem.getCurrentHoleStrokes();
        this.scoringSystem.completeHole(strokeCount);
        
        // Wait a moment and then show scorecard animation
                            setTimeout(() => {
            this.showScorecard();
        }, 1500);
    }
    
    /**
     * Display the end of hole scorecard
     */
    showScorecard() {
        // Get the score data to display
        const scoreData = {
            strokes: this.scoringSystem.getCurrentHoleStrokes()
        };
        
        // Show the scorecard using UI manager
        this.uiManager.showScorecard(scoreData, () => {
            // Reset and restart hole when user clicks to continue
            this.resetAndRestartHole();
        });
    }
    
    /**
     * Reset the current hole and place ball back at tee
     */
    resetAndRestartHole() {
        // Reset the current hole score
        this.scoringSystem.resetCurrentHoleScore();
        
        // Reset game state
        this.stateManager.resetState();
        
        // Clear current hole and reload
        if (this.course && this.course.loadHole) {
            this.course.loadHole();
        }
        
        // Reposition and reset the ball
        if (this.ball) {
            // Get the starting position for the hole
            const startPosition = this.course.getHoleStartPosition();
            this.ball.resetVelocity();
            this.ball.setPosition(startPosition.x, startPosition.y, startPosition.z);
            this.lastSafePosition.copy(startPosition);
            
            // Reset ball visual state (in case it was green from success)
            if (typeof this.ball.resetVisuals === 'function') {
                this.ball.resetVisuals();
            }
        } else {
            // Create a new ball if somehow it doesn't exist
            this.createBall();
        }
        
        // Position camera directly
        this.cameraController.positionCameraForHole();
        
        // Show the tee marker at the start position
        if (this.teeMarker) {
            this.teeMarker.setPosition(this.lastSafePosition);
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
     * Check for hazards like out of bounds or water
     */
    checkHazards() {
        // Check if ball is out of bounds (below the course)
        if (this.ball && this.ball.body && this.ball.body.position.y < -10) {
            this.debugManager.log("Ball fell too far, resetting position");
            this.handleBallOutOfBounds();
            return;
        }
        
        // Check if ball is in water
        if (this.course && this.course.isInWater && this.ball) {
            if (this.course.isInWater(this.ball.mesh.position)) {
                this.handleBallInWater();
                return;
            }
        }
        
        // Update the last safe position if the ball is on the ground and not in hazards
        if (this.ball && this.ball.body && this.ball.body.position.y <= this.ball.radius + 0.1) {
            this.updateLastSafePosition();
        }
    }
    
    /**
     * Handle ball out of bounds penalty
     */
    handleBallOutOfBounds() {
        // Increment stroke count as penalty
        this.scoringSystem.addStroke();
        
        // Set ball at last safe position
        if (this.ball) {
            this.ball.setPosition(
                this.lastSafePosition.x,
                this.lastSafePosition.y,
                this.lastSafePosition.z
            );
        }
        
        // Show message to player
        this.uiManager.showMessage("Out of bounds! +1 stroke penalty", 2000);
    }
    
    /**
     * Handle ball in water hazard penalty
     */
    handleBallInWater() {
        // Increment stroke count as penalty
        this.scoringSystem.addStroke();
        
        // Reset ball position to last safe spot
        if (this.ball) {
            this.ball.setPosition(
                this.lastSafePosition.x,
                this.lastSafePosition.y,
                this.lastSafePosition.z
            );
        }
        
        // Show message to player
        this.uiManager.showMessage("Water hazard! +1 stroke penalty", 2000);
    }
    
    /**
     * Update the last safe position based on current ball position
     */
    updateLastSafePosition() {
        if (this.ball && this.ball.mesh) {
            const ballPosition = this.ball.mesh.position.clone();
            
            // Only update safe position if the ball is not in water
            if (this.course && !this.course.isInWater(ballPosition)) {
                this.lastSafePosition.copy(ballPosition);
                this.debugManager.log(`Updated safe position to: ${ballPosition.x.toFixed(2)}, ${ballPosition.y.toFixed(2)}, ${ballPosition.z.toFixed(2)}`);
            }
        }
    }
    
    /**
     * Update tee marker position to current ball position
     */
    updateTeeMarker() {
        if (!this.teeMarker || !this.ball) return;
        
        // Get the ball position and hole position
        const ballPosition = this.ball.mesh.position.clone();
        const holePosition = this.course.getHolePosition();
        
        // Set the tee marker position to the ball position
        this.teeMarker.setPosition(ballPosition);
        
        // Calculate direction from ball to hole
        if (holePosition) {
            const direction = new THREE.Vector2(
                holePosition.x - ballPosition.x,
                holePosition.z - ballPosition.z
            );
            
            // Set rotation to point towards the hole
            const angle = Math.atan2(direction.x, direction.y);
            this.teeMarker.setRotation(angle);
        }
        
        // Show the tee marker
        this.teeMarker.show();
    }
    
    /**
     * Hit the ball with given direction and power
     * @param {THREE.Vector3} direction - Direction to hit the ball
     * @param {number} power - Power of the hit (0-1)
     */
    hitBall(direction, power) {
        if (this.ball && !this.stateManager.isBallInMotion()) {
            // Play hit sound using the AudioManager
            this.audioManager.playSound('hit', power);
            
            // Apply force to ball
            this.ball.applyForce(direction, power);
            
            // Increment the score (count this stroke)
            this.scoringSystem.addStroke();
            
            // Update game state
            this.stateManager.setBallInMotion(true);
            
            // Hide tee marker when ball is hit
            if (this.teeMarker) {
                this.teeMarker.hide();
            }
            
            // Disable input until ball stops
            if (this.inputController) {
                this.inputController.disableInput();
            }
        }
    }
    
    /**
     * Create the player's ball
     */
    createBall() {
        // Create the player's ball
        this.ball = new Ball(this.scene, this.physicsManager.getWorld(), this);
        
        // Place the ball at the start position for the hole
        const startPosition = this.course.getHoleStartPosition();
        this.ball.resetVelocity();
        this.ball.setPosition(startPosition.x, startPosition.y, startPosition.z);
        this.lastSafePosition.copy(startPosition);
        
        this.debugManager.log(`Ball positioned at tee: (${startPosition.x.toFixed(2)}, ${startPosition.y.toFixed(2)}, ${startPosition.z.toFixed(2)})`);
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
     * Clean up resources when the game is destroyed
     */
    cleanup() {
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        
        // Clean up managers
        this.stateManager.resetState();
        this.uiManager.cleanup();
        this.physicsManager.cleanup();
        this.debugManager.cleanup();
        this.audioManager.cleanup();
        
        // Clean up game objects
        if (this.ball && this.ball.cleanup) {
            this.ball.cleanup();
        }
        
        if (this.course && this.course.cleanup) {
            this.course.cleanup();
        }
        
        if (this.teeMarker && this.teeMarker.cleanup) {
            this.teeMarker.cleanup();
        }
        
        // Clean up scene
        while(this.scene.children.length > 0) { 
            this.scene.remove(this.scene.children[0]); 
        }
        
        // Dispose of renderer
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
    
    /**
     * Enable game input
     */
    enableGameInput() {
        if (this.inputController) {
            this.inputController.enableInput();
        }
    }
} 