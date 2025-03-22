import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Course } from './Course';
import { CourseElementFactory } from './CourseElementFactory';

/**
 * BasicCourse - A single-hole mini golf course in space
 * Simplified implementation using CourseElementFactory
 */
export class BasicCourse extends Course {
    constructor(scene, physicsWorld) {
        // Define course data before calling super()
        const courseData = {
            holePosition: new THREE.Vector3(0, 0, -8),
            startPosition: new THREE.Vector3(0, 0.2, 8),
            fairwayWidth: 4,
            fairwayLength: 16
        };
        
        // Pass the start position to the parent constructor
        super(scene, physicsWorld, {
            startPosition: courseData.startPosition.clone()
        });
        
        // Object tracking for the single hole
        this.currentHoleObjects = []; // Track meshes for the hole
        this.currentHolePhysicsBodies = []; // Track physics bodies for the hole
        
        // Store hole elements
        this.holeElements = {
            hole: null,
            flag: null,
            fairway: null
        };
        
        // Store course data as instance property
        this.courseData = courseData;
    }
    
    /**
     * Override createCourse to build only the shared elements
     */
    createCourse() {
        // Create base ground
        this.createGround();
        
        // No need to set start positions here as we passed them to the parent constructor
    }
    
    /**
     * Load the hole
     */
    loadHole() {
        // Clear any existing hole
        this.clearHole();
        
        console.log("Loading hole");
        
        // Create the hole
        this.createHole();
        
        return true;
    }
    
    /**
     * Clear all objects and physics bodies for the current hole
     */
    clearHole() {
        // Remove meshes from scene
        this.currentHoleObjects.forEach(object => {
            if (object && this.scene) {
                this.scene.remove(object);
            }
        });
        
        // Remove physics bodies
        this.currentHolePhysicsBodies.forEach(body => {
            if (body && this.physicsWorld) {
                this.physicsWorld.removeBody(body);
            }
        });
        
        // Clear tracking arrays
        this.currentHoleObjects = [];
        this.currentHolePhysicsBodies = [];
        
        // Clear hole elements
        this.holeElements = {
            hole: null,
            flag: null,
            fairway: null
        };
    }
    
    /**
     * Track objects and bodies for later removal
     */
    trackHoleObject(object, body = null) {
        if (object) {
            this.currentHoleObjects.push(object);
        }
        
        if (body) {
            this.currentHolePhysicsBodies.push(body);
        }
    }
    
    /**
     * Create ground with safety floor
     */
    createGround() {
        // Use simplified ground creation - no visual mesh since we're in space
        
        // Create invisible safety floor far below to prevent infinite falling
        if (this.physicsWorld) {
            const safetyFloorBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(0, -20, 0),
                shape: new CANNON.Plane(),
                material: this.physicsWorld.groundMaterial
            });
            safetyFloorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
            this.physicsWorld.addBody(safetyFloorBody);
        }
    }
    
    /**
     * Create a single hole for the space golf course
     */
    createHole() {
        const { holePosition, startPosition, fairwayWidth, fairwayLength } = this.courseData;
        
        // 1. Create fairway using factory
        const fairwayElements = CourseElementFactory.createFairway(
            this.scene, 
            startPosition, 
            holePosition, 
            fairwayWidth, 
            fairwayLength
        );
        
        // Track fairway elements
        this.trackHoleObject(fairwayElements.fairway);
        this.trackHoleObject(fairwayElements.border);
        this.holeElements.fairway = fairwayElements;
        
        // 2. Create hole using factory
        const holeElements = CourseElementFactory.createHole(
            this.scene,
            this.physicsWorld,
            holePosition,
            { radius: 0.35, depth: 0.3 }
        );
        
        // Track hole elements
        Object.values(holeElements).forEach(element => {
            if (element && !(element instanceof Object && 'bodies' in element)) {
                this.trackHoleObject(element);
            }
        });
        
        // Track physics bodies
        if (holeElements.bodies) {
            Object.values(holeElements.bodies).forEach(body => {
                this.trackHoleObject(null, body);
            });
            
            // Add hole body to the holeBodies array for collision detection
            this.holeBodies.push(holeElements.bodies.trigger);
        }
        
        this.holeElements.hole = holeElements;
        
        // 3. Create flag using factory
        const flagElements = CourseElementFactory.createFlag(
            this.scene,
            holePosition,
            { height: 1.8 }
        );
        
        // Track flag elements
        this.trackHoleObject(flagElements.pole);
        this.trackHoleObject(flagElements.flag);
        this.trackHoleObject(flagElements.light);
        
        // Store flag for animation
        this.flag = flagElements.flag;
        
        this.holeElements.flag = flagElements;
        
        // 4. Create walls for the hole using factory
        this.createHoleEnclosure(holePosition, startPosition, fairwayWidth);
        
        // 5. Create start marker
        const marker = this.createStartMarker(startPosition);
        this.trackHoleObject(marker);
        
        // Save hole position for the game to use
        const holeInfo = {
            position: holePosition.clone(),
            radius: 0.35,
            body: this.holeBodies[this.holeBodies.length - 1]
        };
        
        // Save to the game's hole positions map if one exists
        if (this.holePositions) {
            this.holePositions.set(1, holeInfo);
        }
    }
    
    /**
     * Create walls for the hole
     */
    createHoleEnclosure(holePosition, startPosition, width) {
        const wallHeight = 1.0;
        const wallThickness = 0.5;
        
        // Calculate distance between hole and start
        const length = Math.abs(holePosition.z - startPosition.z) + 2; // Add buffer
        
        // Calculate positions for walls - center between start and hole
        const centerZ = (holePosition.z + startPosition.z) / 2;
        const halfWidth = width / 2 + wallThickness / 2;
        
        // Define wall configurations
        const walls = [
            // Left wall
            { 
                size: [wallThickness, wallHeight, length], 
                position: [holePosition.x - halfWidth, wallHeight/2, centerZ] 
            },
            // Right wall
            { 
                size: [wallThickness, wallHeight, length], 
                position: [holePosition.x + halfWidth, wallHeight/2, centerZ] 
            },
            // Back wall (behind hole)
            { 
                size: [width + wallThickness*2, wallHeight, wallThickness], 
                position: [holePosition.x, wallHeight/2, holePosition.z - 1] 
            },
            // Front wall (behind tee)
            { 
                size: [width + wallThickness*2, wallHeight, wallThickness], 
                position: [holePosition.x, wallHeight/2, startPosition.z + 1] 
            }
        ];
        
        // Create walls using factory
        const wallElements = CourseElementFactory.createWalls(this.scene, this.physicsWorld, walls);
        
        // Track wall elements
        wallElements.forEach(element => {
            this.trackHoleObject(element.mesh);
            if (element.body) {
                this.trackHoleObject(null, element.body);
            }
            this.obstacles.push(element.mesh);
            if (element.body) {
                this.obstacleBodies.push(element.body);
            }
        });
        
        // Add invisible floor beneath the course
        this.createSafetyFloor(holePosition, centerZ, width + wallThickness*2, length);
    }
    
    /**
     * Create safety floor to prevent balls from falling into space
     */
    createSafetyFloor(holePosition, centerZ, width, length) {
        const floorGeometry = new THREE.BoxGeometry(width, 0.1, length);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000, // Black to match space background
            transparent: true,
            opacity: 0.0 // Invisible
        });
        
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.position.set(holePosition.x, -0.05, centerZ);
        this.scene.add(floor);
        this.trackHoleObject(floor);
        
        // Create floor physics body
        if (this.physicsWorld) {
            const floorBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(holePosition.x, -0.05, centerZ),
                shape: new CANNON.Box(new CANNON.Vec3(width/2, 0.05, length/2)),
                material: this.physicsWorld.groundMaterial
            });
            
            this.physicsWorld.addBody(floorBody);
            this.trackHoleObject(null, floorBody);
        }
    }
    
    /**
     * Create a start marker (tee) for the hole
     */
    createStartMarker(position) {
        // Create a simple glowing tee marker
        const teeGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.02, 16);
        const teeMaterial = new THREE.MeshStandardMaterial({
            color: 0x00BFFF, // Deep Sky Blue
            roughness: 0.3,
            metalness: 0.7,
            emissive: 0x0080FF,
            emissiveIntensity: 0.8
        });
        
        const teeMarker = new THREE.Mesh(teeGeometry, teeMaterial);
        teeMarker.position.set(position.x, 0.01, position.z); // Just above ground level
        
        this.scene.add(teeMarker);
        return teeMarker;
    }
    
    /**
     * Get the position of the hole
     */
    getHolePosition() {
        return this.courseData.holePosition.clone();
    }
    
    /**
     * Get the starting position for the current hole
     */
    getHoleStartPosition() {
        return this.courseData.startPosition.clone();
    }
    
    /**
     * Update method (called each frame)
     */
    update() {
        // Animate the flag if it exists
        if (this.flag) {
                const time = Date.now() * 0.003;
            CourseElementFactory.animateFlag(this.flag, time);
        }
        
        // Call original update method if defined in parent class
        if (super.update) {
            super.update();
        }
    }
} 