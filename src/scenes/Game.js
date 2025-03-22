import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { InputController } from '../controls/InputController';
import { Ball } from '../objects/Ball';
import { Course } from '../objects/Course';
import { BasicCourse } from '../objects/BasicCourse';

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
        this.currentHole = 0;
        this.holeScores = [];
        
        // Game mode
        this.gameMode = 'practice'; // 'practice' or 'course'
        
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
        this.cameraDebug = true; // Enable camera debugging information
        
        // Listen for debug key (press 'd' to toggle)
        window.addEventListener('keydown', (e) => {
            if (e.key === 'd') {
                this.toggleDebugMode();
            }
        });
    }

    init(mode = 'practice') {
        // Set game mode
        this.gameMode = mode;
        
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
        
        // Initialize appropriate course based on mode
        if (this.gameMode === 'course') {
            // Create basic 3-hole course
            this.course = new BasicCourse(this.scene, this.physicsWorld);
            this.currentHole = 1; // Start at hole 1
            this.holeScores = [0, 0, 0]; // Initialize scores for 3 holes
            this.updateHoleDisplay(1); // Show current hole
            
            // Load only the first hole
            this.course.loadHole(1);
        } else {
            // Create practice course (sandbox)
            this.course = new Course(this.scene, this.physicsWorld);
        }
        
        // Create ball last (so it appears on top of the course)
        this.createBall();
        
        // IMPORTANT: Explicitly position camera correctly for the initial hole
        // This fixes the issue where the camera starts in wrong position on first run
        if (this.gameMode === 'course') {
            // Force camera setup with proper delay to ensure all objects are loaded
            setTimeout(() => {
                this.positionCameraForHole(1);
                console.log("Initial camera position explicitly set");
            }, 100);
        }
        
        // Initialize input controller after all game objects are created
        this.initInput();
        
        // Add debug helpers if needed
        if (this.debugMode) {
            this.setupDebugHelpers();
        }
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Reset score display
        this.score = 0;
        this.updateScoreDisplay();
        
        // Show appropriate starting message based on mode
        if (this.gameMode === 'course') {
            this.showMessage("Welcome to Hole 1!", 3000);
        } else {
            this.showMessage("Practice Mode", 2000);
        }
        
        console.log(`Game initialized in ${this.gameMode} mode successfully!`);
    }
    
    setCourseMode(courseType) {
        // Clean up existing course
        if (this.course) {
            this.course.dispose();
            this.scene.remove(this.course);
        }
        
        // Disable input during course setup
        if (this.inputController) {
            this.inputController.disableInput();
        }
        
        // Set game mode
        this.gameMode = 'course';
        
        // Create new course based on type
        if (courseType === 'basic') {
            this.course = new BasicCourse(this.scene, this.physicsWorld);
            this.currentHole = 1; // Start at hole 1
            this.holeScores = [0, 0, 0]; // Initialize scores for 3 holes
            this.updateHoleDisplay(1); // Show current hole
            
            // Load only the first hole
            this.course.loadHole(1);
            
            // Add an extra camera positioning with delay to ensure everything is loaded
            setTimeout(() => {
                this.resetBallForHole(this.currentHole);
                
                // Force another camera positioning for reliability
                setTimeout(() => {
                    this.positionCameraForHole(1);
                    console.log("Course mode camera position explicitly set");
                }, 100);
                
                this.showMessage("Welcome to Hole 1!", 3000);
            }, 100);
        }
        
        // Reset score
        this.score = 0;
        this.updateScoreDisplay();
        
        // Note: We don't need to explicitly enable input here because showMessage 
        // will handle re-enabling input after its duration expires
    }
    
    resetBallForHole(holeNumber) {
        if (this.course && this.course.getHoleStartPosition) {
            const startPosition = this.course.getHoleStartPosition(holeNumber);
            if (startPosition && this.ball) {
                console.log(`Resetting ball for hole ${holeNumber} at position: (${startPosition.x.toFixed(2)}, ${startPosition.y.toFixed(2)}, ${startPosition.z.toFixed(2)})`);
                
                // Position the ball exactly at the tee position to match the visible tee marker
                this.ball.setPosition(
                    startPosition.x,
                    startPosition.y, 
                    startPosition.z
                );
                
                // Update last safe position
                this.lastSafePosition.copy(new THREE.Vector3(
                    startPosition.x,
                    startPosition.y,
                    startPosition.z
                ));
                
                // Ensure the ball appears white by explicitly setting the material
                if (this.ball.mesh && this.ball.defaultMaterial) {
                    this.ball.mesh.material = this.ball.defaultMaterial;
                }
                
                // Position camera behind the ball looking towards the hole
                // First reset camera to a clear position to avoid orientation issues
                this.camera.position.set(
                    startPosition.x,
                    startPosition.y + 8, // Higher up for a clearer view
                    startPosition.z + 5  // Behind the ball
                );
                this.controls.update();
                
                // Then position it properly
                this.positionCameraForHole(holeNumber);
            }
        }
    }
    
    /**
     * Position the camera optimally behind the ball looking towards the hole
     */
    positionCameraForHole(holeNumber) {
        if (!this.ball || !this.ball.mesh) {
            if (this.cameraDebug) console.log("Cannot position camera - ball not available");
            return;
        }
        
        // Get the current ball position
        const ballPosition = this.ball.mesh.position.clone();
        if (this.cameraDebug) console.log(`Ball position: (${ballPosition.x.toFixed(2)}, ${ballPosition.y.toFixed(2)}, ${ballPosition.z.toFixed(2)})`);
        
        // Get the hole position based on hole number
        let holePosition;
        
        // Get hole target position from course if available
        if (this.course && this.course.getHolePosition) {
            holePosition = this.course.getHolePosition(holeNumber);
            if (this.cameraDebug) console.log(`Got hole position from course: (${holePosition.x.toFixed(2)}, ${holePosition.y.toFixed(2)}, ${holePosition.z.toFixed(2)})`);
        } else {
            // Fallback positions if course doesn't provide hole positions
            holePosition = new THREE.Vector3(0, 0, 0); // All holes are now at origin
            if (this.cameraDebug) console.log("Using fallback hole position at origin");
        }
        
        if (this.cameraDebug) console.log(`Positioning camera for hole ${holeNumber}, hole at: (${holePosition.x.toFixed(2)}, ${holePosition.y.toFixed(2)}, ${holePosition.z.toFixed(2)})`);
        
        // Calculate direction from ball to hole (not hole to ball)
        const directionToHole = new THREE.Vector3()
            .subVectors(holePosition, ballPosition)
            .normalize();
        
        if (this.cameraDebug) console.log(`Direction to hole: (${directionToHole.x.toFixed(2)}, ${directionToHole.y.toFixed(2)}, ${directionToHole.z.toFixed(2)})`);
        
        // Disable controls temporarily during transition
        const controlsEnabled = this.controls.enabled;
        this.controls.enabled = false;
        
        // Set target to look at the hole or slightly in front of it
        this.controls.target.copy(holePosition);
        
        // Calculate optimal camera position
        const cameraDistance = 5; // Distance behind ball (reduced for better visibility)
        const cameraHeight = 3;   // Height above ground (reduced for better angle)
        
        // Position camera behind the ball in the direction opposite to the hole
        // We want camera -> ball -> hole to be the line of sight
        const cameraPosX = ballPosition.x - directionToHole.x * cameraDistance;
        const cameraPosZ = ballPosition.z - directionToHole.z * cameraDistance;
        
        if (this.cameraDebug) console.log(`Calculated camera position: (${cameraPosX.toFixed(2)}, ${(ballPosition.y + cameraHeight).toFixed(2)}, ${cameraPosZ.toFixed(2)})`);
        
        // Set camera position
        this.camera.position.set(
            cameraPosX,
            ballPosition.y + cameraHeight,
            cameraPosZ
        );
        
        if (this.cameraDebug) {
            console.log(`Final camera position: (${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)})`);
            console.log(`Camera is looking at: (${this.controls.target.x.toFixed(2)}, ${this.controls.target.y.toFixed(2)}, ${this.controls.target.z.toFixed(2)})`);
        }
        
        // Update controls
        this.controls.update();
        
        // Re-enable controls
        this.controls.enabled = controlsEnabled;
        
        if (this.cameraDebug) console.log("Camera positioning complete");
    }
    
    updateHoleDisplay(holeNumber) {
        // Update the score display to show the current hole and total score
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            // Current hole score is this.score
            
            // Calculate total score (sum of all completed holes plus current hole)
            let totalScore = this.score; // Current hole score
            
            // Add scores from completed holes
            for (let i = 0; i < this.holeScores.length; i++) {
                // Don't count the current hole twice if it's in the array
                if (i !== holeNumber - 1) {
                    totalScore += this.holeScores[i] || 0;
                }
            }
            
            scoreElement.innerHTML = `Hole: ${holeNumber}/${this.course.length} | Current: ${this.score} | Total: ${totalScore}`;
        }
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
                // Check if ball is in hole using more reliable method
                if (this.ball.isInHole && this.ball.isInHole()) {
                    console.log("Ball is in hole!");
                    this.handleHoleCompleted();
                } else if (this.course.isInHole && this.course.isInHole(this.ball.mesh.position, this.ball)) {
                    // Fallback to course method for backward compatibility
                    console.log("Ball is in hole (detected by course)!");
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
        
        // Get the hole position so we can always keep it in mind
        let holePosition;
        if (this.course && this.course.getHolePosition) {
            holePosition = this.course.getHolePosition(this.currentHole);
        } else {
            holePosition = new THREE.Vector3(0, 0, 0);
        }
        
        // Always try to keep the target focused somewhat on the hole direction
        // instead of just the ball, for better gameplay orientation
        if (isMoving) {
            // When moving, we update the target to follow the ball more closely
            this.controls.target.lerp(ballPosition, 0.2);
        } else {
            // When still, try to keep hole in frame by balancing ball and hole
            const targetPoint = new THREE.Vector3()
                .addVectors(
                    ballPosition.clone().multiplyScalar(0.7),
                    holePosition.clone().multiplyScalar(0.3)
                );
            this.controls.target.lerp(targetPoint, 0.1);
        }
        
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
                const cameraDistance = 5; // Reduced from 7 to match our other settings
                
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
        
        // Get the hole position
        let holePosition;
        if (this.course && this.course.getHolePosition) {
            holePosition = this.course.getHolePosition(this.currentHole);
        } else {
            holePosition = new THREE.Vector3(0, 0, 0);
        }
        
        // Calculate direction from ball to hole
        const directionToHole = new THREE.Vector3()
            .subVectors(holePosition, ballPosition)
            .normalize();
        
        // Position camera behind the ball looking towards the hole
        const cameraDistance = 5; // Distance behind ball
        const cameraHeight = 3;   // Height above ground
        
        // Disable controls temporarily during transition
        const controlsEnabled = this.controls.enabled;
        this.controls.enabled = false;
        
        // Set target to hole position for better aiming
        this.controls.target.copy(holePosition);
        
        // Calculate camera position behind the ball in direction opposite to hole
        const cameraPosX = ballPosition.x - directionToHole.x * cameraDistance;
        const cameraPosZ = ballPosition.z - directionToHole.z * cameraDistance;
        
        // Set camera position with safety checks
        this.camera.position.set(
            isFinite(cameraPosX) ? cameraPosX : ballPosition.x - cameraDistance,
            ballPosition.y + cameraHeight,
            isFinite(cameraPosZ) ? cameraPosZ : ballPosition.z - cameraDistance
        );
        
        // Update controls
        this.controls.update();
        
        // Re-enable controls
        this.controls.enabled = controlsEnabled;
        
        console.log(`Camera positioned at (${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)}), looking at hole`);
    }
    
    handleHoleCompleted() {
        // If we're already handling a completion, don't do it again
        if (this.gameState.holeCompleted) return;
        
        this.gameState.holeCompleted = true;
        console.log("Hole completed!");
        
        // Stop the ball
        if (this.ball && this.ball.body) {
            this.ball.body.velocity.set(0, 0, 0);
            this.ball.body.angularVelocity.set(0, 0, 0);
        }
        
        // Handle ball success animation if available
        if (this.ball && this.ball.handleHoleSuccess) {
            this.ball.handleHoleSuccess();
        }
        
        // Disable input during the transition
        if (this.inputController) {
            this.inputController.disableInput();
        }
        
        // Show completion message
        this.showMessage("Hole Complete!", 2000);
        
        // Handle different behavior based on game mode
        if (this.gameMode === 'course') {
            // Store score for the current hole
            this.holeScores[this.currentHole - 1] = this.score;
            
            // Check if we have completed all holes
            if (this.currentHole < 3) {
                // Move to the next hole
                setTimeout(() => {
                    this.currentHole++;
                    this.updateHoleDisplay(this.currentHole);
                    
                    // Clear current hole and load the next one
                    if (this.course && this.course.loadHole) {
                        this.course.loadHole(this.currentHole);
                    }
                    
                    this.resetBallForHole(this.currentHole);
                    this.score = 0; // Reset score for the new hole
                    this.updateScoreDisplay();
                    
                    // Show new hole message - showMessage handles input enabling/disabling
                    this.showMessage(`Hole ${this.currentHole}`, 2000);
                    
                    // Reset hole completed flag, but don't enable input yet
                    // (showMessage will handle input enabling after its duration)
                    this.gameState.holeCompleted = false;
                }, 2500);
            } else {
                // All holes completed - show final score
                const totalScore = this.holeScores.reduce((a, b) => a + b, 0);
                setTimeout(() => {
                    this.showMessage(`Course Complete! Total Score: ${totalScore}`, 5000);
                    // Reset to practice mode
                    setTimeout(() => {
                        this.gameMode = 'practice';
                        this.init('practice');
                    }, 5500);
                }, 2500);
            }
        } else {
            // In practice mode, just reset the ball to a random position
            setTimeout(() => {
                this.gameState.resetBall = true;
                // Input will be re-enabled in the update loop after ball is reset
            }, 2000);
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
        
        // Disable input while message is showing
        if (this.inputController) {
            this.inputController.disableInput();
        }
        
        // Set message and show
        messageElement.innerText = text;
        messageElement.style.display = 'block';
        
        // Determine if this is a "welcome" message (for hole announcements)
        const isWelcomeMessage = text.includes("Hole") && !text.includes("Complete");
        
        // Use longer delay for welcome messages to ensure camera is fully positioned
        const additionalDelay = isWelcomeMessage ? 800 : 300;
        
        // Hide after duration and re-enable input if appropriate
        setTimeout(() => {
            messageElement.style.display = 'none';
            
            // Only re-enable input if the game is in a state where input should be allowed
            // Don't re-enable if ball is in motion or in other states where input should be disabled
            if (this.inputController && !this.gameState.ballInMotion && !this.gameState.resetBall 
                && !this.gameState.holeCompleted) {
                // Add a delay to ensure camera is fully positioned
                setTimeout(() => {
                    this.inputController.enableInput();
                    console.log("Input enabled after message disappeared");
                }, additionalDelay);
            }
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
            
            // Increment the score (count this stroke)
            this.score++;
            this.updateScoreDisplay();
            
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
        
        // If we're in course mode, also update the hole display
        if (this.gameMode === 'course') {
            this.updateHoleDisplay(this.currentHole);
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