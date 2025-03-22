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
        this.ball = null;
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
     * Set references to game objects
     */
    setReferences(ball, course) {
        this.ball = ball;
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
        
        // Set camera position and look at midpoint
        const cameraPosition = new THREE.Vector3().addVectors(midpoint, cameraOffset);
        this.camera.position.copy(cameraPosition);
        
        // Set target to midpoint, slightly elevated
        if (this.controls) {
            this.controls.target.copy(midpoint);
            this.controls.update();
        } else {
            this.camera.lookAt(midpoint);
        }
        
        return this;
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
            holePosition = this.course.getHolePosition();
        } else {
            holePosition = new THREE.Vector3(0, 0, 0);
        }
        
        // Always try to keep the target focused somewhat on the hole direction
        const targetPosition = new THREE.Vector3()
            .addVectors(ballPosition, new THREE.Vector3(0, 0.5, 0))
            .lerp(holePosition, 0.2);
        
        // Set orbit controls target to the calculated target
        if (this.controls) {
            this.controls.target.copy(targetPosition);
            this.controls.update();
        }
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
            holePosition = this.course.getHolePosition();
        } else {
            holePosition = new THREE.Vector3(0, 0, 0);
        }
        
        // Calculate direction from ball to hole
        const direction = new THREE.Vector3()
            .subVectors(holePosition, ballPosition)
            .normalize();
        
        // Set camera position behind the ball, looking toward the hole
        const cameraOffset = new THREE.Vector3(
            direction.x * -5,
            5, // Height above ball
            direction.z * -5
        );
        
        const newCameraPosition = new THREE.Vector3().addVectors(ballPosition, cameraOffset);
        this.camera.position.copy(newCameraPosition);
        
        // Look at ball position
        if (this.controls) {
            this.controls.target.copy(ballPosition);
            this.controls.update();
        } else {
            this.camera.lookAt(ballPosition);
        }
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