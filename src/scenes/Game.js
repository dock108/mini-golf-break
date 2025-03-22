import * as THREE from 'three';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { InputController } from '../controls/InputController';
import { CameraController } from '../controls/CameraController';
import { ScoringSystem } from '../game/ScoringSystem';
import { Ball } from '../objects/Ball';
import { BasicCourse } from '../objects/BasicCourse';
import { TeeMarker } from '../objects/TeeMarker';

export class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.physicsWorld = null;
        this.inputController = null;
        
        // Create camera controller
        this.cameraController = new CameraController(this.scene, this.renderer);
        this.camera = this.cameraController.camera;
        
        // Create scoring system
        this.scoringSystem = new ScoringSystem();
        
        this.ball = null;
        this.course = null;
        this.teeMarker = null;
        
        // Game mode - now only course mode
        this.gameMode = 'course';
        
        // Lighting
        this.ambientLight = null;
        this.directionalLight = null;
        
        // Game state
        this.gameState = {
            ballInMotion: false,
            resetBall: false,
            holeCompleted: false
        };
        
        // Track last safe position
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

    init(mode = 'course') {
        // Always use course mode
        this.gameMode = 'course';
        
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0x000000); // Black background for space
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Set the scene background to black for space environment
        this.scene.background = new THREE.Color(0x000000);
        
        // Create starfield for space environment
        this.createStarfield();

        // Initialize camera controller
        this.cameraController.init();
        this.cameraController.setDebugMode(this.debugMode);
        
        // Setup lights
        this.setupLights();
        
        // Initialize physics first
        this.physicsWorld = new PhysicsWorld();
        
        // Create tee marker
        if (!this.teeMarker) {
            this.teeMarker = new TeeMarker(this.scene);
        }
        
        // Create space course
            this.course = new BasicCourse(this.scene, this.physicsWorld);
        this.currentHole = 1; // Always hole 1
        
        // Initialize scoring system
        this.scoringSystem.init('course', this.course.length);
        
        // Load the single hole
        this.course.loadHole(1);
            
        // Set current hole explicitly
        this.scoringSystem.setCurrentHole(1);
        
        // Create ball last (so it appears on top of the course)
        this.createBall();
        
        // Update camera controller references
        this.cameraController.setReferences(this.ball, this.course);
        this.cameraController.setCurrentHole(this.scoringSystem.currentHole);
        
        // IMPORTANT: Explicitly position camera correctly for the initial hole
            // Force camera setup with proper delay to ensure all objects are loaded
            setTimeout(() => {
            this.cameraController.positionCameraForHole(1);
                console.log("Initial camera position explicitly set");
            }, 100);
        
        // Initialize input controller after all game objects are created
        this.initInput();
        
        // Add debug helpers if needed
        if (this.debugMode) {
            this.setupDebugHelpers();
        }
        
        // Show welcome message
        this.showMessage("Welcome to Space Golf!", 3000);
        
        // Position tee marker for the current hole
        this.positionTeeMarker();
        
        console.log(`Game initialized successfully!`);
    }
    
    initInput() {
        // Create input controller
        this.inputController = new InputController(this, this.camera, this.renderer, this.ball);
        
        // No need to call any additional methods since the constructor already sets up everything
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
        
        // Initialize with appropriate game mode
        this.init(courseType);
    }
    
    setupLights() {
        // Add ambient light (dimmer for space environment)
        this.ambientLight = new THREE.AmbientLight(0x333333, 0.4);
        this.scene.add(this.ambientLight);
        
        // Add directional light (like distant sun)
        this.directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1.0);
        this.directionalLight.position.set(10, 20, 10);
        this.directionalLight.castShadow = true;
        
        // Set up shadow properties
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 50;
        this.directionalLight.shadow.camera.left = -15;
        this.directionalLight.shadow.camera.right = 15;
        this.directionalLight.shadow.camera.top = 15;
        this.directionalLight.shadow.camera.bottom = -15;
        
        this.scene.add(this.directionalLight);
        
        // Add colored accent lights for space environment
        // Blue light - adds cosmic glow
        const blueLight = new THREE.PointLight(0x4444FF, 0.6, 100);
        blueLight.position.set(20, 20, -20);
        this.scene.add(blueLight);
        
        // Purple light - adds contrast
        const purpleLight = new THREE.PointLight(0xCC44FF, 0.4, 100);
        purpleLight.position.set(-20, 15, 20);
        this.scene.add(purpleLight);
    }
    
    /**
     * Create a starfield background for space environment
     */
    createStarfield() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 0.1,
            sizeAttenuation: true
        });
        
        const starsVertices = [];
        const starsCount = 2000;
        
        // Create stars randomly positioned in a sphere around the scene
        for (let i = 0; i < starsCount; i++) {
            // Generate random positions in a large sphere around the scene
            const x = THREE.MathUtils.randFloatSpread(200);
            const y = THREE.MathUtils.randFloatSpread(200);
            const z = THREE.MathUtils.randFloatSpread(200);
            
            // Push vertices
            starsVertices.push(x, y, z);
        }
        
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(stars);
    }
    
    setupDebugHelpers() {
        // Clear existing debug helpers
        this.removeDebugHelpers();
        
        // Add axes helper
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);
        this.debugObjects.push(axesHelper);
        
        // Add grid helper
        const gridHelper = new THREE.GridHelper(20, 20, 0xff0000, 0xffffff);
        this.scene.add(gridHelper);
        this.debugObjects.push(gridHelper);
        
        // Add directional light helper if light exists
        if (this.directionalLight) {
            const lightHelper = new THREE.DirectionalLightHelper(this.directionalLight, 5);
            this.scene.add(lightHelper);
            this.debugObjects.push(lightHelper);
            
            // Add shadow camera helper
            const shadowHelper = new THREE.CameraHelper(this.directionalLight.shadow.camera);
            this.scene.add(shadowHelper);
            this.debugObjects.push(shadowHelper);
        }
    }
    
    removeDebugHelpers() {
        // Remove all debug objects from the scene
        this.debugObjects.forEach(obj => {
            if (obj && obj.parent) {
                obj.parent.remove(obj);
            }
        });
        
        // Clear the array
        this.debugObjects = [];
    }

    /**
     * Main update loop
     */
    update() {
        // Update camera controller
        this.cameraController.update();
        
        // Update physics
        if (this.physicsWorld) {
            this.physicsWorld.update();
        }
        
        // Update course objects (like animated flags)
        if (this.course && this.course.update) {
            this.course.update();
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
            if (this.ball.isMoving) {
                this.cameraController.updateCameraFollow(true);
            }
            
            // Track if ball was moving
            const wasMoving = this.gameState.ballInMotion;
            
            // Update ball motion state
            this.gameState.ballInMotion = this.ball.isMoving;
            
            // If the ball was moving but has now stopped
            if (wasMoving && !this.gameState.ballInMotion) {
                // Check for hole completion
                if (!this.gameState.holeCompleted) {
                    this.checkBallInHole();
                }
                
                // Re-enable input if the ball is stopped and no other game states are active
                if (!this.gameState.holeCompleted && !this.gameState.resetBall) {
                if (this.inputController) {
                    this.inputController.enableInput();
                    }
                    console.log("Ball stopped, input enabled");
                }
                
                // Check if ball is out of bounds
                if (this.ball.body.position.y < -10) {
                    console.log("Ball fell too far, resetting position");
                    this.handleBallOutOfBounds();
                }
                
                // Update the last safe position if the ball is on the ground
                if (this.ball.body.position.y <= this.ball.radius + 0.1) {
                    this.lastSafePosition.copy(this.ball.mesh.position);
                }
            }
            
            // Check if ball is in water
            if (this.course && this.course.isInWater && this.ball) {
                if (this.course.isInWater(this.ball.mesh.position)) {
                this.handleBallInWater();
                }
            }
        }
        
        // Handle UI updates
        this.updateUI();
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Display an animated scorecard when the hole is completed
     */
    displayScorecard() {
        // Create scorecard container
        const scorecardContainer = document.createElement('div');
        scorecardContainer.id = 'scorecard-container';
        scorecardContainer.style.position = 'absolute';
        scorecardContainer.style.top = '50%';
        scorecardContainer.style.left = '50%';
        scorecardContainer.style.transform = 'translate(-50%, -50%) scale(0.8)';
        scorecardContainer.style.width = '400px';
        scorecardContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        scorecardContainer.style.color = 'white';
        scorecardContainer.style.padding = '20px';
        scorecardContainer.style.borderRadius = '15px';
        scorecardContainer.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.3)';
        scorecardContainer.style.zIndex = '1000';
        scorecardContainer.style.textAlign = 'center';
        scorecardContainer.style.opacity = '0';
        scorecardContainer.style.transition = 'all 0.5s ease-in-out';
        scorecardContainer.style.border = '3px solid #4CAF50';

        // Create scorecard header
        const headerDiv = document.createElement('div');
        headerDiv.style.marginBottom = '15px';
        headerDiv.style.borderBottom = '2px solid #4CAF50';
        headerDiv.style.paddingBottom = '10px';

        const title = document.createElement('h2');
        title.innerText = 'HOLE COMPLETE!';
        title.style.margin = '0 0 5px 0';
        title.style.fontSize = '28px';
        title.style.color = '#4CAF50';
        title.style.textShadow = '0 0 10px rgba(76, 175, 80, 0.5)';

        headerDiv.appendChild(title);
        scorecardContainer.appendChild(headerDiv);

        // Create scorecard content
        const contentDiv = document.createElement('div');
        contentDiv.style.fontSize = '20px';
        contentDiv.style.lineHeight = '1.6';

        // Get score info
        const strokes = this.scoringSystem.getCurrentHoleStrokes();
        
        // Create a table for score details
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginBottom = '20px';
        table.style.color = 'white';
        
        // Add score row with animated count
        const scoreRow = document.createElement('tr');
        
        const scoreLabel = document.createElement('td');
        scoreLabel.innerText = 'Your Score:';
        scoreLabel.style.textAlign = 'left';
        scoreLabel.style.padding = '10px';
        scoreLabel.style.fontSize = '22px';
        
        const scoreValue = document.createElement('td');
        scoreValue.style.textAlign = 'right';
        scoreValue.style.padding = '10px';
        scoreValue.style.fontSize = '28px';
        scoreValue.style.color = '#4CAF50';
        scoreValue.style.fontWeight = 'bold';
        scoreValue.innerText = '0';
        
        scoreRow.appendChild(scoreLabel);
        scoreRow.appendChild(scoreValue);
        table.appendChild(scoreRow);
        
        contentDiv.appendChild(table);
        scorecardContainer.appendChild(contentDiv);
        
        // Add continue prompt
        const continuePrompt = document.createElement('div');
        continuePrompt.innerText = 'Click anywhere to continue';
        continuePrompt.style.marginTop = '20px';
        continuePrompt.style.fontSize = '16px';
        continuePrompt.style.opacity = '0';
        continuePrompt.style.transition = 'opacity 0.5s ease-in-out';
        continuePrompt.style.color = '#BBBBBB';
        scorecardContainer.appendChild(continuePrompt);

        // Add to DOM
        document.body.appendChild(scorecardContainer);
        
        // Animate in
        setTimeout(() => {
            scorecardContainer.style.transform = 'translate(-50%, -50%) scale(1)';
            scorecardContainer.style.opacity = '1';
            
            // Start score counter animation
            let currentScore = 0;
            const animateScore = () => {
                if (currentScore < strokes) {
                    currentScore++;
                    scoreValue.innerText = currentScore.toString();
                    
                    // Add sound effect
                    if (this.ball && this.ball.playSound) {
                        // Use an existing sound with lower volume for the counter tick
                        this.ball.playSound('hit', 0.1);
                    }
                    
                    setTimeout(animateScore, 300);
                } else {
                    // Show continue prompt after animation
                    setTimeout(() => {
                        continuePrompt.style.opacity = '1';
                        
                        // Add click handler to the entire document to restart
                        const clickHandler = () => {
                            // Remove event listener
                            document.removeEventListener('click', clickHandler);
                            
                            // Fade out scorecard
                            scorecardContainer.style.opacity = '0';
                            scorecardContainer.style.transform = 'translate(-50%, -50%) scale(0.8)';
                            
                            // Remove after animation
                            setTimeout(() => {
                                document.body.removeChild(scorecardContainer);
                                
                                // Reset and place ball back at tee
                                this.resetAndRestartHole();
                            }, 500);
                        };
                        
                        document.addEventListener('click', clickHandler);
                    }, 500);
                }
            };
            
            // Start animation after the card appears
            setTimeout(animateScore, 500);
        }, 100);
    }
    
    /**
     * Reset the current hole and place ball back at tee
     */
    resetAndRestartHole() {
        // Reset the current hole
        this.scoringSystem.resetCurrentHoleScore();
        
        // Clear current hole and reload
        if (this.course && this.course.loadHole) {
            this.course.loadHole(1);
        }
        
        // Place ball at the tee position
        this.placeBallAtTee();
        
        // Position camera appropriately
        setTimeout(() => {
            this.cameraController.positionCameraForHole(1);
        }, 100);
        
        // Reset game state
        this.gameState.holeCompleted = false;
        this.gameState.ballInMotion = false;
        this.gameState.resetBall = false;
        
        // Enable input
        if (this.inputController) {
            this.inputController.enableInput();
        }
        
        // Show welcome message
        this.showMessage("Ready for another round!", 2000);
    }
    
    handleHoleCompleted() {
        // Track that the hole is completed in game state
        this.gameState.holeCompleted = true;
        
        // Update the score for the current hole
        const strokeCount = this.scoringSystem.getCurrentHoleStrokes();
        this.scoringSystem.completeHole(strokeCount);
        
        // Wait a moment and then show scorecard animation
        setTimeout(() => {
            this.displayScorecard();
        }, 1500);
    }
    
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
        this.showMessage("Out of bounds! +1 stroke penalty", 2000);
    }
    
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
        this.showMessage("Water hazard! +1 stroke penalty", 2000);
    }
    
    placeBallAtLastSafePosition() {
        console.log("Placing ball at last safe position");
        
        if (this.ball) {
            this.ball.resetVelocity();
            
            // Add a small height offset to prevent collisions
            const safeY = this.lastSafePosition.y + 0.5;
            
            this.ball.setPosition(
                this.lastSafePosition.x,
                safeY,
                this.lastSafePosition.z
            );
            
            // Focus camera on the ball after placement
            setTimeout(() => {
                this.cameraController.focusCameraOnBall();
            }, 100);
        }
        
        // Show the tee marker at the last safe position
        if (this.teeMarker) {
            this.teeMarker.setPosition(this.lastSafePosition);
            this.teeMarker.show();
        }
    }
    
    placeBallAtRandomPosition() {
        console.log("Placing ball at random position");
        
        // Get a random position from the course if available
        let randomPosition;
        if (this.course && this.course.getRandomPosition) {
            randomPosition = this.course.getRandomPosition();
        } else {
            // Fallback to a hard-coded random position
            const range = 5;
            randomPosition = new THREE.Vector3(
                (Math.random() - 0.5) * range * 2,
                0.5, // Height above ground
                (Math.random() - 0.5) * range * 2
            );
        }
        
        if (this.ball) {
            this.ball.resetVelocity();
            this.ball.setPosition(randomPosition.x, randomPosition.y, randomPosition.z);
            
            // Update safe position to match
            this.lastSafePosition.copy(randomPosition);
        }
        
        // Show the tee marker at the random position
        if (this.teeMarker) {
            this.teeMarker.setPosition(randomPosition);
            this.teeMarker.show();
        }
    }
    
    updateLastSafePosition() {
        if (this.ball && this.ball.mesh) {
            const ballPosition = this.ball.mesh.position.clone();
            
            // Only update safe position if the ball is not in water
            if (this.course && !this.course.isInWater(ballPosition)) {
                this.lastSafePosition.copy(ballPosition);
                
                if (this.debugMode) {
                    console.log(`Updated safe position to: ${this.lastSafePosition.x.toFixed(2)}, ${this.lastSafePosition.y.toFixed(2)}, ${this.lastSafePosition.z.toFixed(2)}`);
                }
            }
        }
    }
    
    showMessage(text, duration = 2000) {
        // Find or create message element
        let messageElement = document.getElementById('game-message');
        if (!messageElement) {
            messageElement = document.createElement('div');
            messageElement.id = 'game-message';
            messageElement.style.position = 'absolute';
            messageElement.style.top = '30%';
            messageElement.style.left = '50%';
            messageElement.style.transform = 'translate(-50%, -50%)';
            messageElement.style.fontSize = '32px';
            messageElement.style.fontWeight = 'bold';
            messageElement.style.color = 'white';
            messageElement.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
            messageElement.style.textAlign = 'center';
            messageElement.style.zIndex = '1000';
            messageElement.style.opacity = '0';
            messageElement.style.transition = 'opacity 0.5s ease-in-out';
            document.body.appendChild(messageElement);
        }
        
        // Disable input during message display
        if (this.inputController) {
            this.inputController.disableInput();
        }
        
        // Update and show message
        messageElement.textContent = text;
        messageElement.style.opacity = '1';
        
        // Hide message after duration and reactivate input
        setTimeout(() => {
            messageElement.style.opacity = '0';
            
            // Re-enable input with a slight delay
                setTimeout(() => {
                if (this.inputController && !this.gameState.ballInMotion) {
                    this.inputController.enableInput();
            }
            }, 300);
        }, duration);
    }
    
    hitBall(direction, power) {
        if (this.ball && !this.gameState.ballInMotion) {
            // Play hit sound
            if (this.ball.playSound) {
                this.ball.playSound('hit', power);
            }
            
            // Apply force to ball
            this.ball.applyForce(direction, power);
            
            // Increment the score (count this stroke)
            this.scoringSystem.addStroke();
            
            // Set game state
            this.gameState.ballInMotion = true;
            
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
    
    createBall() {
        // Create the player's ball
        this.ball = new Ball(this.scene, this.physicsWorld, this);
        
        // Place the ball at the start position for the first hole
        const startPosition = this.course.getHoleStartPosition(1);
        this.ball.resetVelocity();
        this.ball.setPosition(startPosition.x, startPosition.y, startPosition.z);
        this.lastSafePosition.copy(startPosition);
        
        console.log(`Ball positioned at hole 1 tee: (${startPosition.x.toFixed(2)}, ${startPosition.y.toFixed(2)}, ${startPosition.z.toFixed(2)})`);
        
        // Ensure we have a valid last safe position right from the start
        if (this.ball && this.ball.mesh) {
            this.lastSafePosition.copy(this.ball.mesh.position);
            if (this.debugMode) {
                console.log(`Initial safe position set to: ${this.lastSafePosition.x.toFixed(2)}, ${this.lastSafePosition.y.toFixed(2)}, ${this.lastSafePosition.z.toFixed(2)})`);
            }
        }
    }
    
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        console.log("Debug mode:", this.debugMode ? "ON" : "OFF");
        
        // Update debug mode for camera controller
        this.cameraController.setDebugMode(this.debugMode);
        
        // Toggle debug visuals
        if (this.debugMode) {
            this.setupDebugHelpers();
        } else {
            this.removeDebugHelpers();
        }
    }
    
    enableGameInput() {
        // Enable input if we have an input controller
        if (this.inputController) {
            this.inputController.enableInput();
        }
    }
    
    positionTeeMarker() {
        if (!this.teeMarker) return;
        
        // Get the start position for the current hole
        const teePosition = this.course.getHoleStartPosition(this.currentHole);
        // Get the hole position
        const holePosition = this.course.getHolePosition(this.currentHole);
        
        // Set the tee marker position
        this.teeMarker.setPosition(teePosition);
        
        // Calculate direction from tee to hole
        if (holePosition) {
            const direction = new THREE.Vector2(
                holePosition.x - teePosition.x,
                holePosition.z - teePosition.z
            );
            
            // Set rotation to point towards the hole
            const angle = Math.atan2(direction.x, direction.y);
            this.teeMarker.setRotation(angle);
        }
        
        // Show the tee marker
        this.teeMarker.show();
        
        if (this.debugMode) {
            console.log(`Tee marker positioned at: (${teePosition.x.toFixed(2)}, ${teePosition.y.toFixed(2)}, ${teePosition.z.toFixed(2)})`);
        }
    }
    
    /**
     * Load the next hole in sequence - for single hole, just reset the current hole
     */
    loadNextHole() {
        // Reset the current hole
        this.scoringSystem.resetCurrentHoleScore();
        
        // Clear current hole and reload
        if (this.course && this.course.loadHole) {
            this.course.loadHole(1);
        }
        
        // Place ball at the tee position for this hole
        this.placeBallAtTee();
        
        // Position camera appropriately
        setTimeout(() => {
            this.cameraController.positionCameraForHole(1);
        }, 100);
        
        // Reset game state
        this.gameState.holeCompleted = false;
        this.gameState.ballInMotion = false;
        this.gameState.resetBall = false;
        
        // Enable input
        if (this.inputController) {
            this.inputController.enableInput();
        }
    }
    
    /**
     * Place ball at tee for the current hole
     */
    placeBallAtTee() {
        if (!this.ball || !this.course) return;
        
        // Get the starting position for the current hole
        const startPos = this.course.getHoleStartPosition(this.scoringSystem.currentHole);
        console.log(`Placing ball at tee for hole ${this.scoringSystem.currentHole}: (${startPos.x}, ${startPos.y}, ${startPos.z})`);
        
        // Reset ball velocity
        this.ball.resetVelocity();
        
        // Set ball position
        this.ball.setPosition(startPos.x, startPos.y, startPos.z);
        
        // Save this as the last safe position
        this.lastSafePosition.copy(startPos);
        
        // Show the tee marker at the start position
        if (this.teeMarker) {
            this.teeMarker.setPosition(startPos);
            this.teeMarker.show();
        }
    }
    
    /**
     * Check if the ball is in the hole
     */
    checkBallInHole() {
        if (!this.ball || !this.course || this.gameState.holeCompleted) return false;
        
        // Get the current hole position
        const holePosition = this.course.getHolePosition(this.scoringSystem.currentHole);
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
            console.log(`Ball in hole! Distance: ${distanceToHole.toFixed(2)}, Height: ${ballPosition.y.toFixed(2)}`);
            
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
     * Update game UI elements
     */
    updateUI() {
        // Update score display via scoring system
        if (this.scoringSystem) {
            this.scoringSystem.updateScoreDisplay();
        }
        
        // Update any other UI elements here
    }
} 