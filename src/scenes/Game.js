import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { InputController } from '../controls/InputController';
import { Ball } from '../objects/Ball';
import { Course } from '../objects/Course';

export class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.physicsWorld = null;
        this.controls = null;
        this.inputController = null;
        
        this.ball = null;
        this.course = null;
        
        this.scoreElement = document.getElementById('score-value');
        this.score = 0;
        
        // Lighting
        this.ambientLight = null;
        this.directionalLight = null;
        
        // Game state
        this.gameState = {
            ballInMotion: false,
            resetBall: false,
            holeCompleted: false
        };
        
        // Track last safe ball position
        this.lastSafePosition = new THREE.Vector3(0, 0, 0);
        
        // Debug helpers
        this.debugMode = false;
        this.debugObjects = [];
        
        // Listen for debug key (press 'd' to toggle)
        window.addEventListener('keydown', (e) => {
            if (e.key === 'd') {
                this.toggleDebugMode();
            }
        });
    }

    init() {
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0x87CEEB); // Sky blue background
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Setup camera
        this.camera.position.set(0, 10, 10);
        this.camera.lookAt(0, 0, 0);
        
        // Setup controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 30;
        this.controls.maxPolarAngle = Math.PI / 2.1; // Slightly above ground level
        
        // Setup lights
        this.setupLights();
        
        // Initialize physics first
        this.physicsWorld = new PhysicsWorld();
        
        // Initialize course (this adds physics bodies to the world)
        this.course = new Course(this.scene, this.physicsWorld);
        
        // Create ball last (so it appears on top of the course)
        this.createBall();
        
        // Initialize input controller after all game objects are created
        this.initInput();
        
        // Add debug helpers if needed
        if (this.debugMode) {
            this.setupDebugHelpers();
        }
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        console.log("Game initialized successfully!");
    }
    
    setupLights() {
        // Ambient light
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(this.ambientLight);
        
        // Directional light (sun)
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.directionalLight.position.set(10, 20, 10);
        this.directionalLight.castShadow = true;
        
        // Configure shadow properties
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 50;
        this.directionalLight.shadow.camera.left = -20;
        this.directionalLight.shadow.camera.right = 20;
        this.directionalLight.shadow.camera.top = 20;
        this.directionalLight.shadow.camera.bottom = -20;
        
        this.scene.add(this.directionalLight);
    }
    
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        console.log(`Debug mode ${this.debugMode ? 'enabled' : 'disabled'}`);
        
        if (this.debugMode) {
            this.setupDebugHelpers();
        } else {
            this.removeDebugHelpers();
        }
    }
    
    setupDebugHelpers() {
        // Clear existing helpers
        this.removeDebugHelpers();
        
        // Add axes helper
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);
        this.debugObjects.push(axesHelper);
        
        // Add grid helper
        const gridHelper = new THREE.GridHelper(50, 50);
        this.scene.add(gridHelper);
        this.debugObjects.push(gridHelper);
        
        // Add debug info display
        const debugInfo = document.createElement('div');
        debugInfo.id = 'debug-info';
        debugInfo.className = 'debug-info';
        debugInfo.innerHTML = 'Debug Mode Enabled';
        document.body.appendChild(debugInfo);
        this.debugObjects.push(debugInfo);
    }
    
    removeDebugHelpers() {
        // Remove all debug objects
        this.debugObjects.forEach(obj => {
            if (obj instanceof THREE.Object3D) {
                this.scene.remove(obj);
            } else if (obj instanceof HTMLElement) {
                document.body.removeChild(obj);
            }
        });
        
        this.debugObjects = [];
    }

    update() {
        // Update orbit controls
        if (this.controls) {
            this.controls.update();
        }
        
        // Update physics
        if (this.physicsWorld) {
            this.physicsWorld.update();
        }
        
        // Update game objects
        if (this.ball) {
            this.ball.update();
            
            // Debug log for ball physics
            if (this.debugMode && this.ball.body) {
                const vel = this.ball.body.velocity;
                if (vel.length() > 0.1) {
                    console.log(`Ball velocity: ${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}, ${vel.z.toFixed(2)}`);
                }
            }
            
            // Follow ball with camera during motion
            if (this.ball.body) {
                // Always update camera target to follow the ball, whether moving or not
                this.updateCameraFollow(this.gameState.ballInMotion);
            }
            
            // Check if ball is stopped after being in motion
            if (this.gameState.ballInMotion && this.ball.isStopped()) {
                console.log("Ball stopped");
                this.gameState.ballInMotion = false;
                
                // Update last safe position when ball comes to rest
                this.updateLastSafePosition();
                
                // Don't reset camera position - just keep targeting the ball
                // The updateCameraFollow method already updated the camera target
                
                if (this.inputController) {
                    this.inputController.enableInput();
                }
                
                // Reset state for the next shot
                this.gameState.holeCompleted = false;
            }
            
            // Check if ball is in a hole
            if (!this.gameState.holeCompleted && this.course && this.ball) {
                // Check using the ball's position and pass the ball object for physics checks
                if (this.course.isInHole(this.ball.mesh.position, this.ball)) {
                    console.log("Ball is in hole!");
                    this.handleHoleCompleted();
                }
            }
            
            // Check if ball is in water or out of bounds
            if (!this.gameState.resetBall && this.course && this.ball && 
                this.course.isInWater(this.ball.mesh.position)) {
                this.handleBallInWater();
            }
            
            // Reset ball if needed
            if (this.gameState.resetBall) {
                if (this.gameState.holeCompleted) {
                    // If hole completed, place at random position
                    this.placeBallAtRandomPosition();
                } else {
                    // If water hazard, place at last safe position
                    this.placeBallAtLastSafePosition();
                }
                
                this.gameState.resetBall = false;
                this.gameState.holeCompleted = false;
                
                if (this.inputController) {
                    this.inputController.enableInput();
                }
            }
        }
        
        // Update course
        if (this.course) {
            this.course.update();
        }
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
    
    updateCameraFollow(isMoving = false) {
        if (!this.ball || !this.ball.mesh) return;
        
        const ballPosition = this.ball.mesh.position.clone();
        
        // Always update the target to look at the ball
        this.controls.target.lerp(ballPosition, 0.2);
        
        // Only move the camera position if the ball is in motion or parameter is true
        if (isMoving) {
            // Get ball velocity to determine movement direction
            const ballVelocity = this.ball.body.velocity;
            
            // Only update if the ball is moving with enough speed
            if (ballVelocity.length() > 0.5) {
                // Calculate the camera position based on ball's movement direction
                // Position camera BEHIND the ball relative to its motion
                const movementDirection = new THREE.Vector3(
                    ballVelocity.x,
                    0, // Keep y component zero for horizontal direction
                    ballVelocity.z
                ).normalize().multiplyScalar(-1); // Negative to position behind ball
                
                // Current camera height relative to target
                const currentHeight = this.camera.position.y - this.controls.target.y;
                
                // Desired distance from ball
                const cameraDistance = 7;
                
                // Calculate new camera position
                const newCameraPosition = ballPosition.clone()
                    .add(movementDirection.multiplyScalar(cameraDistance))
                    .add(new THREE.Vector3(0, currentHeight, 0));
                
                // Smooth transition to new position
                this.camera.position.lerp(newCameraPosition, 0.05);
                
                if (this.debugMode) {
                    console.log(`Camera following ball, velocity: (${ballVelocity.x.toFixed(2)}, ${ballVelocity.z.toFixed(2)})`);
                }
            }
        }
        
        // Update the controls
        this.controls.update();
    }
    
    focusCameraOnBall() {
        if (!this.ball || !this.ball.mesh) return;
        
        const ballPosition = this.ball.mesh.position.clone();
        
        // Position camera in a better angle for viewing and hitting the ball
        const cameraDistance = 7; // Distance from ball
        const cameraHeight = 5;   // Height above ground
        const cameraAngle = Math.PI / 4; // 45 degrees behind ball
        
        // Disable controls temporarily during transition
        const controlsEnabled = this.controls.enabled;
        this.controls.enabled = false;
        
        // Set target to ball position
        this.controls.target.copy(ballPosition);
        
        // Calculate camera position with safety checks to avoid NaN
        let cameraX = ballPosition.x - Math.cos(cameraAngle) * cameraDistance;
        let cameraZ = ballPosition.z - Math.sin(cameraAngle) * cameraDistance;
        
        // Verify values are valid numbers
        if (isNaN(cameraX) || !isFinite(cameraX)) cameraX = ballPosition.x - cameraDistance;
        if (isNaN(cameraZ) || !isFinite(cameraZ)) cameraZ = ballPosition.z - cameraDistance;
        
        // Set camera position
        this.camera.position.set(
            cameraX,
            ballPosition.y + cameraHeight,
            cameraZ
        );
        
        // Update controls
        this.controls.update();
        
        // Re-enable controls
        this.controls.enabled = controlsEnabled;
        
        console.log(`Camera positioned at (${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)})`);
    }
    
    handleHoleCompleted() {
        if (!this.gameState.holeCompleted) {
            this.score++;
            this.updateScoreDisplay();
            this.gameState.holeCompleted = true;
            this.gameState.resetBall = true;
            
            // Show success message with appropriate text based on strokes
            let message = 'Hole in One!';
            if (this.score > 1) {
                message = `Hole completed in ${this.score} strokes!`;
            }
            this.showMessage(message, 2000);
            
            // Disable input until ball is reset
            if (this.inputController) {
                this.inputController.disableInput();
            }
            
            console.log('Hole completed! Score: ' + this.score);
        }
    }
    
    showMessage(text, duration = 2000) {
        // Find or create message element
        let messageElement = document.getElementById('game-message');
        if (!messageElement) {
            messageElement = document.createElement('div');
            messageElement.id = 'game-message';
            messageElement.style.position = 'absolute';
            messageElement.style.top = '50%';
            messageElement.style.left = '50%';
            messageElement.style.transform = 'translate(-50%, -50%)';
            messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            messageElement.style.color = 'white';
            messageElement.style.padding = '20px';
            messageElement.style.borderRadius = '10px';
            messageElement.style.fontFamily = 'Arial, sans-serif';
            messageElement.style.fontSize = '24px';
            messageElement.style.zIndex = '1000';
            messageElement.style.textAlign = 'center';
            document.body.appendChild(messageElement);
        }
        
        // Set message and show
        messageElement.innerText = text;
        messageElement.style.display = 'block';
        
        // Hide after duration
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, duration);
    }
    
    handleBallInWater() {
        if (!this.gameState.resetBall) {
            this.gameState.resetBall = true;
            
            // Increment score (penalty stroke)
            this.score++;
            this.updateScoreDisplay();
            
            // Show penalty message
            this.showMessage('Water hazard! +1 stroke penalty', 2000);
            
            // Disable input until ball is reset
            if (this.inputController) {
                this.inputController.disableInput();
            }
            
            console.log('Ball in water! Resetting to last position...');
        }
    }
    
    updateLastSafePosition() {
        if (this.ball && this.ball.mesh) {
            // Store the current position as last safe position
            this.lastSafePosition.copy(this.ball.mesh.position);
            if (this.debugMode) {
                console.log(`Saved safe position: ${this.lastSafePosition.x.toFixed(2)}, ${this.lastSafePosition.y.toFixed(2)}, ${this.lastSafePosition.z.toFixed(2)}`);
            }
        }
    }
    
    placeBallAtRandomPosition() {
        // Get a random start position from the course
        const randomPosition = this.course.getRandomStartPosition();
        
        console.log(`Placing ball at position: ${randomPosition.x.toFixed(2)}, ${randomPosition.y.toFixed(2)}, ${randomPosition.z.toFixed(2)}`);
        
        // Place the ball at the random position
        this.ball.setPosition(randomPosition.x, randomPosition.y, randomPosition.z);
        
        // Reset ball velocity
        this.ball.resetVelocity();
        
        // Reset game state
        this.gameState.ballInMotion = false;
        
        // Set this position as the initial safe position
        this.lastSafePosition.copy(new THREE.Vector3(randomPosition.x, randomPosition.y, randomPosition.z));
        
        // Don't explicitly move camera - let the updateCameraFollow take care of it
        // Just keep the target updated
        if (this.controls) {
            this.controls.target.copy(randomPosition);
            this.controls.update();
        }
    }
    
    placeBallAtLastSafePosition() {
        if (!this.ball) return;
        
        console.log(`Placing ball at last safe position: ${this.lastSafePosition.x.toFixed(2)}, ${this.lastSafePosition.y.toFixed(2)}, ${this.lastSafePosition.z.toFixed(2)}`);
        
        // Place the ball at the last safe position
        this.ball.setPosition(
            this.lastSafePosition.x, 
            this.lastSafePosition.y, 
            this.lastSafePosition.z
        );
        
        // Reset ball velocity
        this.ball.resetVelocity();
        
        // Reset game state
        this.gameState.ballInMotion = false;
        
        // Don't explicitly move camera - let the updateCameraFollow take care of it
        // Just keep the target updated
        if (this.controls) {
            this.controls.target.copy(this.lastSafePosition);
            this.controls.update();
        }
    }
    
    initInput() {
        // Create input controller
        this.inputController = new InputController(this, this.camera, this.renderer, this.ball);
        
        // Disable input initially (will be enabled when game starts)
        this.inputController.disableInput();
    }
    
    enableGameInput() {
        if (this.inputController) {
            this.inputController.enableInput();
        }
    }
    
    hitBall(direction, power) {
        if (this.ball && !this.gameState.ballInMotion) {
            // Apply force to ball
            this.ball.applyForce(direction, power);
            
            // Set game state
            this.gameState.ballInMotion = true;
            
            // Disable input until ball stops
            if (this.inputController) {
                this.inputController.disableInput();
            }
        }
    }
    
    updateScoreDisplay() {
        if (this.scoreElement) {
            this.scoreElement.textContent = this.score.toString();
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    createBall() {
        // Create the player's ball
        this.ball = new Ball(this.scene, this.physicsWorld, this);
        
        // Set initial position
        this.placeBallAtRandomPosition();
        
        // Ensure we have a valid last safe position right from the start
        if (this.ball && this.ball.mesh) {
            this.lastSafePosition.copy(this.ball.mesh.position);
            if (this.debugMode) {
                console.log(`Initial safe position set to: ${this.lastSafePosition.x.toFixed(2)}, ${this.lastSafePosition.y.toFixed(2)}, ${this.lastSafePosition.z.toFixed(2)}`);
            }
        }
    }
} 