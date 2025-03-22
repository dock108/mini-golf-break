import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * CameraController class
 * Handles camera initialization, positioning, and behavior for Mini Golf Break
 */
export class CameraController {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.renderer = null;
        
        // Setup camera and controls
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.controls = null;
        
        // Game references
        this.course = null;
        
        // Debug mode
        this.debugMode = false;
    }
    
    /**
     * Set the renderer after it's initialized
     * @param {THREE.WebGLRenderer} renderer - The renderer
     */
    setRenderer(renderer) {
        this.renderer = renderer;
        return this;
    }
    
    /**
     * Initialize camera and controls
     */
    init() {
        // Ensure we have a renderer
        if (!this.renderer) {
            console.warn("CameraController initialized without renderer, orbit controls will be disabled");
        }
        
        // Setup camera initial position - higher up for better space view
        this.camera.position.set(0, 15, 15);
        this.camera.lookAt(0, 0, 0);
        
        // Initialize orbit controls if we have a renderer
        if (this.renderer) {
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            
            // Configure controls
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.1;
            this.controls.rotateSpeed = 0.7;
            this.controls.zoomSpeed = 1.2;
            this.controls.minDistance = 2;
            this.controls.maxDistance = 30;
            this.controls.maxPolarAngle = Math.PI / 2; // Limit vertical rotation
            
            // Enable target movement with middle mouse
            this.controls.enablePan = true;
            this.controls.panSpeed = 0.8;
            this.controls.screenSpacePanning = true;
        } else {
            console.warn("Orbit controls disabled - no renderer available");
        }
        
        // Setup resize listener
        window.addEventListener('resize', () => this.onWindowResize());
        
        return this;
    }
    
    /**
     * Set reference to game course
     * @param {Course} course - The course object
     */
    setCourse(course) {
        this.course = course;
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
     * Update camera position and controls
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Update controls if they exist
        if (this.controls) {
            this.controls.update();
        }
        
        // Update camera to follow the ball if it exists and is moving
        this.updateCameraFollowBall();
    }
    
    /**
     * Handle window resize
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        return this;
    }
    
    /**
     * Position camera to view the current hole
     */
    positionCameraForHole() {
        if (!this.course) {
            console.warn("Cannot position camera: Course not available");
            return this;
        }
        
        // Get the hole position
        const holePosition = this.course.getHolePosition();
        if (!holePosition) {
            console.warn("Cannot position camera: Hole position not available");
            return this;
        }
        
        // Get the start position
        const startPosition = this.course.getHoleStartPosition();
        if (!startPosition) {
            console.warn("Cannot position camera: Start position not available");
            return this;
        }
        
        console.log(`Positioning camera for hole at ${holePosition.x.toFixed(2)}, ${holePosition.y.toFixed(2)}, ${holePosition.z.toFixed(2)}`);
        
        // Calculate midpoint between tee and hole
        const midpoint = new THREE.Vector3().addVectors(startPosition, holePosition).multiplyScalar(0.5);
        
        // Calculate direction from tee to hole
        const direction = new THREE.Vector3().subVectors(holePosition, startPosition).normalize();
        
        // Position camera at an angle to see both tee and hole
        const distance = startPosition.distanceTo(holePosition);
        const cameraOffset = new THREE.Vector3(
            direction.z * distance * 0.7, // Offset perpendicular to hole direction
            distance * 0.8,               // Height based on distance
            -direction.x * distance * 0.7  // Offset perpendicular to hole direction
        );
        
        // Set camera position relative to midpoint
        this.camera.position.copy(midpoint.clone().add(cameraOffset));
        
        // Look at midpoint
        this.camera.lookAt(midpoint);
        
        // Update orbit controls target if they exist
        if (this.controls) {
            this.controls.target.copy(midpoint);
            this.controls.update();
        }
        
        return this;
    }
    
    /**
     * Update camera position to follow the ball
     */
    updateCameraFollowBall() {
        // Get the ball reference from the ball manager
        const ball = this.game.ballManager ? this.game.ballManager.ball : null;
        if (!ball || !ball.mesh) return;
        
        // Get the ball's position
        const ballPosition = ball.mesh.position.clone();
        
        // Only follow the ball if it's moving
        if (this.game.stateManager && this.game.stateManager.isBallInMotion()) {
            if (this.controls) {
                // Update the orbit controls target to follow the ball
                this.controls.target.lerp(ballPosition, 0.2);
                this.controls.update();
            } else {
                // If no controls, update camera position directly to follow the ball
                const cameraTargetPosition = ballPosition.clone().add(new THREE.Vector3(10, 10, 10));
                this.camera.position.lerp(cameraTargetPosition, 0.1);
                this.camera.lookAt(ballPosition);
            }
        }
    }
    
    /**
     * Position camera behind ball pointing toward hole
     */
    positionCameraBehindBall() {
        // Get the ball reference from the ball manager
        const ball = this.game.ballManager ? this.game.ballManager.ball : null;
        if (!ball || !ball.mesh) return;
        
        // Get the ball's position
        const ballPosition = ball.mesh.position.clone();
        
        // Get hole position
        const holePosition = this.course ? this.course.getHolePosition() : null;
        if (!holePosition) return;
        
        // Calculate direction from ball to hole
        const direction = new THREE.Vector3().subVectors(holePosition, ballPosition).normalize();
        
        // Determine camera position behind the ball
        const cameraPosition = ballPosition.clone().sub(direction.clone().multiplyScalar(4));
        cameraPosition.y += 2; // Raise the camera a bit for better view
        
        // Set camera position and look at the ball
        this.camera.position.copy(cameraPosition);
        this.camera.lookAt(ballPosition);
        
        // Update orbit controls if they exist
        if (this.controls) {
            this.controls.target.copy(ballPosition);
            this.controls.update();
        }
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        // Remove window resize event listener
        window.removeEventListener('resize', this.onWindowResize);
        
        // Dispose of orbit controls if they exist
        if (this.controls) {
            this.controls.dispose();
            this.controls = null;
        }
        
        // Clear references
        this.renderer = null;
        this.course = null;
    }
} 