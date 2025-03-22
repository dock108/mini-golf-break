import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * CameraController class
 * Handles camera initialization, positioning, and behavior for Mini Golf Break
 */
export class CameraController {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        
        // Setup camera and controls
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.controls = null;
        
        // Game references
        this.ball = null;
        this.course = null;
        this.currentHole = 1;
        
        // Debug mode
        this.debugMode = false;
    }
    
    /**
     * Initialize camera and controls
     */
    init() {
        // Setup camera initial position - higher up for better space view
        this.camera.position.set(0, 15, 15);
        this.camera.lookAt(0, 0, 0);
        
        // Setup controls - allow for more dramatic viewing angles
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 40; // Increased to allow viewing from further out
        this.controls.maxPolarAngle = Math.PI / 1.8; // Allow slightly more overhead view
        
        // Setup resize listener
        window.addEventListener('resize', () => this.onWindowResize());
        
        return this;
    }
    
    /**
     * Set references to game objects
     */
    setReferences(ball, course) {
        this.ball = ball;
        this.course = course;
        return this;
    }
    
    /**
     * Set current hole number
     */
    setCurrentHole(holeNumber) {
        this.currentHole = holeNumber;
        return this;
    }
    
    /**
     * Set debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        return this;
    }
    
    /**
     * Update method to be called in the animation loop
     */
    update() {
        if (this.controls) {
            this.controls.update();
        }
    }
    
    /**
     * Handle window resize
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    /**
     * Position the camera optimally behind the ball looking towards the hole
     */
    positionCameraForHole(holeNumber) {
        if (!this.ball || !this.ball.mesh) {
            if (this.debugMode) console.log("Cannot position camera - ball not available");
            return;
        }
        
        // Get the current ball position
        const ballPosition = this.ball.mesh.position.clone();
        if (this.debugMode) console.log(`Ball position: (${ballPosition.x.toFixed(2)}, ${ballPosition.y.toFixed(2)}, ${ballPosition.z.toFixed(2)})`);
        
        // Get the hole position based on hole number
        let holePosition;
        
        // Get hole target position from course if available
        if (this.course && this.course.getHolePosition) {
            holePosition = this.course.getHolePosition(holeNumber);
            if (this.debugMode) console.log(`Got hole position from course: (${holePosition.x.toFixed(2)}, ${holePosition.y.toFixed(2)}, ${holePosition.z.toFixed(2)})`);
        } else {
            // Fallback positions if course doesn't provide hole positions
            holePosition = new THREE.Vector3(0, 0, -8); // Hole position at negative Z (updated)
            if (this.debugMode) console.log(`Using fallback hole position at (0, 0, -8)`);
        }
        
        if (this.debugMode) console.log(`Positioning camera for hole ${holeNumber}, hole at: (${holePosition.x.toFixed(2)}, ${holePosition.y.toFixed(2)}, ${holePosition.z.toFixed(2)})`);
        
        // Calculate direction from ball to hole (not hole to ball)
        const directionToHole = new THREE.Vector3()
            .subVectors(holePosition, ballPosition)
            .normalize();
        
        if (this.debugMode) console.log(`Direction to hole: (${directionToHole.x.toFixed(2)}, ${directionToHole.y.toFixed(2)}, ${directionToHole.z.toFixed(2)})`);
        
        // Disable controls temporarily during transition
        const controlsEnabled = this.controls.enabled;
        this.controls.enabled = false;
        
        // Set target to look at the midpoint between the ball and hole
        const targetPoint = new THREE.Vector3().addVectors(ballPosition, holePosition).multiplyScalar(0.5);
        this.controls.target.copy(targetPoint);
        
        // Calculate optimal camera position - with higher y for more dramatic space view
        const cameraDistance = 6; // Slightly farther horizontally
        const cameraHeight = 10;  // Higher for more dramatic view looking down at the course
        
        // Position camera behind the ball in the direction opposite to the hole
        // We want camera -> ball -> hole to be the line of sight
        const cameraPosX = ballPosition.x - directionToHole.x * cameraDistance;
        const cameraPosZ = ballPosition.z - directionToHole.z * cameraDistance;
        
        if (this.debugMode) console.log(`Calculated camera position: (${cameraPosX.toFixed(2)}, ${(ballPosition.y + cameraHeight).toFixed(2)}, ${cameraPosZ.toFixed(2)})`);
        
        // Set camera position
        this.camera.position.set(
            cameraPosX,
            ballPosition.y + cameraHeight,
            cameraPosZ
        );
        
        if (this.debugMode) {
            console.log(`Final camera position: (${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)})`);
            console.log(`Camera is looking at: (${this.controls.target.x.toFixed(2)}, ${this.controls.target.y.toFixed(2)}, ${this.controls.target.z.toFixed(2)})`);
        }
        
        // Update controls
        this.controls.update();
        
        // Re-enable controls
        this.controls.enabled = controlsEnabled;
        
        if (this.debugMode) console.log("Camera positioning complete");
    }
    
    /**
     * Update camera to follow the ball during movement
     */
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
    
    /**
     * Focus camera on the ball, useful for after ball placement
     */
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
        
        // Set camera position
        this.camera.position.set(
            cameraPosX,
            ballPosition.y + cameraHeight,
            cameraPosZ
        );
        
        // Update controls
        this.controls.update();
        
        // Re-enable controls
        this.controls.enabled = controlsEnabled;
    }
    
    /**
     * Disable camera controls
     */
    disableControls() {
        if (this.controls) {
            this.controls.enabled = false;
        }
    }
    
    /**
     * Enable camera controls
     */
    enableControls() {
        if (this.controls) {
            this.controls.enabled = true;
        }
    }
} 